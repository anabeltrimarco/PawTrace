// ==========================================
// PAWTRACE - PHOTO CONTROLLER
//
// Sprint 1.4.3.6
//
// Fotos de mascotas registradas.
//
// Incluye:
// - Prevención de fotos duplicadas
// - Hash SHA-256
// - Eliminación automática del archivo duplicado
// - Generación persistente de embedding
//
// Las fotos de FoundReport se manejan en:
// foundReportPhotoController.js
// ==========================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  Pet,
  PetPhoto,
} = require("../models");

const {
  getOrCreateEmbedding,
} = require(
  "../services/imageEmbeddingService"
);


// ==========================================
// BORRAR ARCHIVO
// ==========================================

function deleteUploadedFile(
  file
) {
  if (!file?.path) {
    return;
  }

  try {
    if (
      fs.existsSync(
        file.path
      )
    ) {
      fs.unlinkSync(
        file.path
      );

      console.log(
        "🗑️ Archivo eliminado:",
        file.path
      );
    }
  } catch (error) {
    console.error(
      "⚠️ No se pudo borrar archivo:",
      error.message
    );
  }
}


// ==========================================
// CALCULAR SHA-256 DE ARCHIVO
// ==========================================

function calculateFileHash(
  filePath
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const hash =
        crypto.createHash(
          "sha256"
        );

      const stream =
        fs.createReadStream(
          filePath
        );

      stream.on(
        "data",
        (chunk) => {
          hash.update(
            chunk
          );
        }
      );

      stream.on(
        "end",
        () => {
          resolve(
            hash.digest(
              "hex"
            )
          );
        }
      );

      stream.on(
        "error",
        (error) => {
          reject(
            error
          );
        }
      );
    }
  );
}


// ==========================================
// OBTENER PATH FÍSICO DE FOTO EXISTENTE
// ==========================================

function getExistingPhotoPath(
  uploadedFile,
  photo
) {
  if (
    !uploadedFile?.path ||
    !photo?.storageKey
  ) {
    return null;
  }

  // req.file.path apunta a:
  //
  // backend/uploads/mascotas/NOMBRE.jpeg
  //
  // Tomamos la misma carpeta y buscamos
  // el storageKey de la foto ya guardada.

  const uploadDirectory =
    path.dirname(
      uploadedFile.path
    );

  return path.join(
    uploadDirectory,
    photo.storageKey
  );
}


// ==========================================
// BUSCAR FOTO DUPLICADA
// ==========================================

async function findDuplicatePhoto({
  petId,
  uploadedFile,
}) {
  if (
    !uploadedFile?.path ||
    !fs.existsSync(
      uploadedFile.path
    )
  ) {
    return null;
  }

  // ========================================
  // HASH DEL ARCHIVO NUEVO
  // ========================================

  const newHash =
    await calculateFileHash(
      uploadedFile.path
    );

  console.log(
    "🔐 SHA-256 foto nueva:",
    newHash
  );

  // ========================================
  // FOTOS EXISTENTES DE ESA MASCOTA
  // ========================================

  const existingPhotos =
    await PetPhoto.findAll({
      where: {
        petId,
      },
    });

  if (
    existingPhotos.length ===
    0
  ) {
    return null;
  }

  // ========================================
  // COMPARAR CONTENIDO REAL
  // ========================================

  for (
    const existingPhoto of
    existingPhotos
  ) {
    const existingPath =
      getExistingPhotoPath(
        uploadedFile,
        existingPhoto
      );

    if (
      !existingPath ||
      !fs.existsSync(
        existingPath
      )
    ) {
      continue;
    }

    try {
      const existingHash =
        await calculateFileHash(
          existingPath
        );

      if (
        existingHash ===
        newHash
      ) {
        console.log(
          "♻️ Foto duplicada detectada:",
          {
            petId,
            existingPhotoId:
              existingPhoto.id,

            storageKey:
              existingPhoto.storageKey,
          }
        );

        return existingPhoto;
      }
    } catch (error) {
      console.error(
        "⚠️ No se pudo calcular hash de foto existente:",
        {
          photoId:
            existingPhoto.id,

          error:
            error.message,
        }
      );
    }
  }

  return null;
}


// ==========================================
// URL PÚBLICA PET
// ==========================================

function buildPetPhotoUrl(
  req,
  filename
) {
  return (
    `${req.protocol}://` +
    `${req.get("host")}` +
    `/uploads/mascotas/${filename}`
  );
}


// ==========================================
// SUBIR FOTO DE PET
//
// POST /api/pets/:id/photos
// ==========================================

async function uploadPetPhoto(
  req,
  res,
  next
) {
  try {
    const { id } =
      req.params;


    // ======================================
    // VALIDAR ARCHIVO
    // ======================================

    if (!req.file) {
      return res
        .status(400)
        .json({
          error:
            "Tenés que seleccionar una imagen.",
        });
    }


    // ======================================
    // BUSCAR MASCOTA
    // ======================================

    const pet =
      await Pet.findByPk(
        id
      );

    if (!pet) {
      deleteUploadedFile(
        req.file
      );

      return res
        .status(404)
        .json({
          error:
            "Mascota no encontrada.",
        });
    }


    // ======================================
    // DETECTAR FOTO DUPLICADA
    // ======================================

    let duplicatePhoto =
      null;

    try {
      duplicatePhoto =
        await findDuplicatePhoto({
          petId:
            id,

          uploadedFile:
            req.file,
        });
    } catch (hashError) {
      // Si falla el chequeo del hash,
      // no bloqueamos la subida.

      console.error(
        "⚠️ Error verificando foto duplicada:",
        hashError.message
      );
    }


    // ======================================
    // SI YA EXISTE:
    //
    // 1. Borramos la copia recién subida.
    // 2. No creamos PetPhoto.
    // 3. No generamos otro embedding.
    // ======================================

    if (duplicatePhoto) {
      deleteUploadedFile(
        req.file
      );

      console.log(
        "♻️ Se reutiliza foto existente:",
        {
          petId:
            id,

          photoId:
            duplicatePhoto.id,
        }
      );

      return res
        .status(200)
        .json({
          ...duplicatePhoto.toJSON(),

          duplicate:
            true,

          message:
            "Esta foto ya estaba cargada para la mascota.",
        });
    }


    // ======================================
    // URL PÚBLICA
    // ======================================

    const imageUrl =
      buildPetPhotoUrl(
        req,
        req.file.filename
      );


    // ======================================
    // FOTO PRINCIPAL
    // ======================================

    const existingMain =
      await PetPhoto.findOne({
        where: {
          petId:
            id,

          isMain:
            true,
        },
      });


    // ======================================
    // GUARDAR FOTO NUEVA
    // ======================================

    const photo =
      await PetPhoto.create({
        petId:
          id,

        imageUrl,

        storageKey:
          req.file.filename,

        isMain:
          existingMain
            ? false
            : true,
      });


    console.log(
      "✅ Foto de mascota guardada:",
      {
        petId:
          id,

        photoId:
          photo.id,

        imageUrl,

        filename:
          req.file.filename,
      }
    );


    // ======================================
    // GENERAR EMBEDDING
    //
    // Si la IA falla:
    // - la foto permanece guardada
    // - la petición sigue siendo válida
    // ======================================

    try {
      const embedding =
        await getOrCreateEmbedding({
          entityType:
            "pet_photo",

          entityId:
            photo.id,

          imageUrl:
            photo.imageUrl,
        });

      console.log(
        "🧠 Embedding PetPhoto listo:",
        {
          photoId:
            photo.id,

          embeddingSize:
            embedding
              ?.embeddingSize ??
            null,

          processingMode:
            embedding
              ?.processingMode ??
            null,
        }
      );

    } catch (
      embeddingError
    ) {
      console.error(
        "⚠️ No se pudo generar embedding PetPhoto:",
        embeddingError.message
      );
    }


    // ======================================
    // RESPONSE
    // ======================================

    return res
      .status(201)
      .json({
        ...photo.toJSON(),

        duplicate:
          false,
      });

  } catch (error) {

    // ======================================
    // Si ocurrió un error antes de completar
    // correctamente la operación,
    // eliminamos el archivo subido.
    // ======================================

    deleteUploadedFile(
      req.file
    );

    next(error);
  }
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  uploadPetPhoto,
};