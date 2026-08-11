// ==========================================
// PAWTRACE - SIGHTING PHOTO CONTROLLER
// Sprint 1.4.4.2
// ==========================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  Sighting,
  SightingPhoto,
} = require("../models");

const {
  getOrCreateEmbedding,
} = require(
  "../services/imageEmbeddingService"
);

// ==========================================
// URL PÚBLICA
// ==========================================

function buildPublicUrl(
  req,
  filename
) {
  return (
    `${req.protocol}://` +
    `${req.get("host")}` +
    `/uploads/sightings/${filename}`
  );
}

// ==========================================
// BORRAR ARCHIVO
// ==========================================

function deleteUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);

      console.log(
        "🗑️ Foto de avistamiento eliminada:",
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
// SHA-256
// ==========================================

function calculateFileHash(
  filePath
) {
  return new Promise(
    (resolve, reject) => {
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
          hash.update(chunk);
        }
      );

      stream.on(
        "end",
        () => {
          resolve(
            hash.digest("hex")
          );
        }
      );

      stream.on(
        "error",
        reject
      );
    }
  );
}

// ==========================================
// PATH DE FOTO EXISTENTE
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
// DETECTAR DUPLICADO
// ==========================================

async function findDuplicatePhoto({
  sightingId,
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

  const newHash =
    await calculateFileHash(
      uploadedFile.path
    );

  console.log(
    "🔐 SHA-256 foto avistamiento:",
    newHash
  );

  const existingPhotos =
    await SightingPhoto.findAll({
      where: {
        sightingId,
      },
    });

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

    const existingHash =
      await calculateFileHash(
        existingPath
      );

    if (
      existingHash ===
      newHash
    ) {
      return existingPhoto;
    }
  }

  return null;
}

// ==========================================
// GET /api/sightings/:id/photos
// ==========================================

async function listar(
  req,
  res,
  next
) {
  try {
    const sighting =
      await Sighting.findByPk(
        req.params.id
      );

    if (!sighting) {
      return res
        .status(404)
        .json({
          error:
            "Avistamiento no encontrado.",
        });
    }

    const photos =
      await SightingPhoto.findAll({
        where: {
          sightingId:
            sighting.id,
        },

        order: [
          [
            "isMain",
            "DESC",
          ],
          [
            "createdAt",
            "ASC",
          ],
        ],
      });

    return res.json(
      photos
    );

  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/sightings/:id/photos
// ==========================================

async function crear(
  req,
  res,
  next
) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          error:
            "Tenés que seleccionar una imagen.",
        });
    }

    // ======================================
    // AVISTAMIENTO
    // ======================================

    const sighting =
      await Sighting.findByPk(
        req.params.id
      );

    if (!sighting) {
      deleteUploadedFile(
        req.file
      );

      return res
        .status(404)
        .json({
          error:
            "Avistamiento no encontrado.",
        });
    }

    // ======================================
    // DUPLICADO
    // ======================================

    let duplicatePhoto =
      null;

    try {
      duplicatePhoto =
        await findDuplicatePhoto({
          sightingId:
            sighting.id,

          uploadedFile:
            req.file,
        });
    } catch (error) {
      console.error(
        "⚠️ Error verificando duplicado:",
        error.message
      );
    }

    if (duplicatePhoto) {
      deleteUploadedFile(
        req.file
      );

      return res
        .status(200)
        .json({
          ...duplicatePhoto.toJSON(),

          duplicate:
            true,

          message:
            "Esta foto ya estaba cargada para el avistamiento.",
        });
    }

    // ======================================
    // FOTO PRINCIPAL
    // ======================================

    const photosCount =
      await SightingPhoto.count({
        where: {
          sightingId:
            sighting.id,
        },
      });

    const isMain =
      photosCount === 0;

    // ======================================
    // URL
    // ======================================

    const imageUrl =
      buildPublicUrl(
        req,
        req.file.filename
      );

    // ======================================
    // GUARDAR
    // ======================================

    const photo =
      await SightingPhoto.create({
        sightingId:
          sighting.id,

        imageUrl,

        storageKey:
          req.file.filename,

        isMain,
      });

    console.log(
      "📷 Foto de avistamiento guardada:",
      {
        sightingId:
          sighting.id,

        photoId:
          photo.id,

        imageUrl,
      }
    );

    // ======================================
    // EMBEDDING
    // ======================================

    try {
      const embedding =
        await getOrCreateEmbedding({
          entityType:
            "sighting_photo",

          entityId:
            photo.id,

          imageUrl:
            photo.imageUrl,
        });

      console.log(
        "🧠 Embedding SightingPhoto listo:",
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
      // La foto queda guardada aunque
      // el servicio de IA falle.
      console.error(
        "⚠️ No se pudo generar embedding SightingPhoto:",
        embeddingError.message
      );
    }

    return res
      .status(201)
      .json({
        ...photo.toJSON(),

        duplicate:
          false,
      });

  } catch (error) {
    deleteUploadedFile(
      req.file
    );

    next(error);
  }
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  listar,
  crear,
};