c// ==========================================
// PAWTRACE
// MIGRACIÓN DE FOTOS LOCALES A CLOUDINARY
//
// Migra:
// - PetPhoto
// - FoundReportPhoto
// - SightingPhoto
//
// Ejecutar UNA SOLA VEZ.
// ==========================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  sequelize,
  PetPhoto,
  FoundReportPhoto,
  SightingPhoto,
} = require("../src/models");

const {
  uploadBuffer,
} = require(
  "../src/services/cloudinaryStorageService"
);


// ==========================================
// CONFIGURACIÓN DE CARPETAS
// ==========================================

const backendRoot =
  path.resolve(
    __dirname,
    ".."
  );

const folders = [
  {
    label:
      "mascotas",

    directory:
      path.join(
        backendRoot,
        "uploads",
        "mascotas"
      ),

    model:
      PetPhoto,

    cloudinaryFolder:
      "pawtrace/pets",
  },

  {
    label:
      "found-reports",

    directory:
      path.join(
        backendRoot,
        "uploads",
        "found-reports"
      ),

    model:
      FoundReportPhoto,

    cloudinaryFolder:
      "pawtrace/found-reports",
  },

  {
    label:
      "sightings",

    directory:
      path.join(
        backendRoot,
        "uploads",
        "sightings"
      ),

    model:
      SightingPhoto,

    cloudinaryFolder:
      "pawtrace/sightings",
  },
];


// ==========================================
// DETECTAR URL CLOUDINARY
// ==========================================

function isAlreadyCloudinary(
  imageUrl
) {
  return Boolean(
    imageUrl &&
    imageUrl.includes(
      "res.cloudinary.com"
    )
  );
}


// ==========================================
// LISTAR ARCHIVOS
// ==========================================

function listFiles(
  directory
) {
  if (
    !fs.existsSync(
      directory
    )
  ) {
    return [];
  }

  return fs
    .readdirSync(
      directory
    )
    .filter(
      (filename) =>
        filename !==
          ".gitkeep" &&
        fs
          .statSync(
            path.join(
              directory,
              filename
            )
          )
          .isFile()
    );
}


// ==========================================
// MIGRAR UNA CATEGORÍA
// ==========================================

async function migrateCategory(
  config
) {
  console.log(
    "\n=========================================="
  );

  console.log(
    `📁 Migrando ${config.label}`
  );

  console.log(
    "=========================================="
  );

  const files =
    listFiles(
      config.directory
    );

  console.log(
    `Archivos locales encontrados: ${files.length}`
  );

  let migrated = 0;
  let skipped = 0;
  let missingRecord = 0;
  let errors = 0;

  for (
    const filename of
    files
  ) {
    try {
      // ======================================
      // BUSCAR REGISTRO POR STORAGE KEY VIEJO
      // ======================================

      const photo =
        await config
          .model
          .findOne({
            where: {
              storageKey:
                filename,
            },
          });

      if (!photo) {
        console.log(
          `⚠️ Sin registro en DB: ${filename}`
        );

        missingRecord += 1;

        continue;
      }


      // ======================================
      // YA MIGRADO
      // ======================================

      if (
        isAlreadyCloudinary(
          photo.imageUrl
        )
      ) {
        console.log(
          `⏭️ Ya está en Cloudinary: ${filename}`
        );

        skipped += 1;

        continue;
      }


      // ======================================
      // LEER ARCHIVO
      // ======================================

      const filePath =
        path.join(
          config.directory,
          filename
        );

      const buffer =
        fs.readFileSync(
          filePath
        );


      // ======================================
      // PUBLIC ID
      // ======================================

      const baseName =
        path
          .parse(
            filename
          )
          .name;

      console.log(
        `☁️ Subiendo ${filename}...`
      );


      // ======================================
      // SUBIR CLOUDINARY
      // ======================================

      const uploadResult =
        await uploadBuffer({
          buffer,

          folder:
            config
              .cloudinaryFolder,

          publicId:
            baseName,
        });


      if (
        !uploadResult
          ?.secure_url ||
        !uploadResult
          ?.public_id
      ) {
        throw new Error(
          "Cloudinary no devolvió secure_url/public_id."
        );
      }


      // ======================================
      // ACTUALIZAR DB
      // ======================================

      photo.imageUrl =
        uploadResult
          .secure_url;

      photo.storageKey =
        uploadResult
          .public_id;

      await photo.save();


      migrated += 1;


      console.log(
        "✅ Migrada:",
        {
          photoId:
            photo.id,

          oldFilename:
            filename,

          newUrl:
            uploadResult
              .secure_url,

          newStorageKey:
            uploadResult
              .public_id,
        }
      );

    } catch (error) {
      errors += 1;

      console.error(
        `❌ Error con ${filename}:`,
        error.message
      );
    }
  }


  console.log(
    "\n📊 Resultado:"
  );

  console.log(
    `✅ Migradas: ${migrated}`
  );

  console.log(
    `⏭️ Ya migradas: ${skipped}`
  );

  console.log(
    `⚠️ Sin registro DB: ${missingRecord}`
  );

  console.log(
    `❌ Errores: ${errors}`
  );

  return {
    migrated,
    skipped,
    missingRecord,
    errors,
  };
}


// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log(
    "\n🐾 PawTrace - Migración a Cloudinary\n"
  );

  try {
    await sequelize
      .authenticate();

    console.log(
      "✅ Conectado a PostgreSQL"
    );


    const totals = {
      migrated: 0,
      skipped: 0,
      missingRecord: 0,
      errors: 0,
    };


    for (
      const config of
      folders
    ) {
      const result =
        await migrateCategory(
          config
        );

      totals.migrated +=
        result.migrated;

      totals.skipped +=
        result.skipped;

      totals.missingRecord +=
        result.missingRecord;

      totals.errors +=
        result.errors;
    }


    console.log(
      "\n=========================================="
    );

    console.log(
      "🎉 MIGRACIÓN FINALIZADA"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `Migradas: ${totals.migrated}`
    );

    console.log(
      `Ya migradas: ${totals.skipped}`
    );

    console.log(
      `Sin registro DB: ${totals.missingRecord}`
    );

    console.log(
      `Errores: ${totals.errors}`
    );

  } catch (error) {
    console.error(
      "\n❌ Error general de migración:",
      error
    );

    process.exitCode = 1;

  } finally {
    await sequelize
      .close();
  }
}


// ==========================================
// EJECUTAR
// ==========================================

main();