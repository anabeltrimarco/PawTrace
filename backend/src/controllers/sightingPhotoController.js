// ==========================================
// PAWTRACE - SIGHTING PHOTO CONTROLLER
// Cloudinary + SHA-256 + Animal Re-ID
// ==========================================

const crypto = require("crypto");

const {
  Sighting,
  SightingPhoto,
} = require("../models");

const {
  getOrCreateEmbedding,
} = require("../services/imageEmbeddingService");

const {
  uploadBuffer,
  deleteImage,
} = require("../services/cloudinaryStorageService");


// ==========================================
// SHA-256
// ==========================================

function calculateBufferHash(buffer) {
  if (!buffer) return null;

  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}


// ==========================================
// DUPLICADOS
// ==========================================

async function findDuplicatePhoto({
  sightingId,
  fileHash,
}) {
  if (!fileHash) return null;

  const photos =
    await SightingPhoto.findAll({
      where: {
        sightingId,
      },
    });

  return (
    photos.find((photo) =>
      photo.storageKey?.includes(fileHash)
    ) || null
  );
}


// ==========================================
// GET
// /api/sightings/:id/photos
// ==========================================

async function listar(req, res, next) {
  try {
    const sighting =
      await Sighting.findByPk(
        req.params.id
      );

    if (!sighting) {
      return res.status(404).json({
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
          ["isMain", "DESC"],
          ["createdAt", "ASC"],
        ],
      });

    return res.json(photos);

  } catch (error) {
    next(error);
  }
}


// ==========================================
// POST
// /api/sightings/:id/photos
// ==========================================

async function crear(req, res, next) {
  let cloudinaryPublicId = null;

  try {

    // ======================================
    // ARCHIVO
    // ======================================

    if (
      !req.file ||
      !req.file.buffer
    ) {
      return res.status(400).json({
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
      return res.status(404).json({
        error:
          "Avistamiento no encontrado.",
      });
    }


    // ======================================
    // HASH
    // ======================================

    const fileHash =
      calculateBufferHash(
        req.file.buffer
      );

    console.log(
      "🔐 SHA-256 foto avistamiento:",
      fileHash
    );


    // ======================================
    // DUPLICADO
    // ======================================

    const duplicatePhoto =
      await findDuplicatePhoto({
        sightingId:
          sighting.id,

        fileHash,
      });

    if (duplicatePhoto) {
      return res.status(200).json({
        ...duplicatePhoto.toJSON(),

        duplicate: true,

        message:
          "Esta foto ya estaba cargada para el avistamiento.",
      });
    }


    // ======================================
    // CLOUDINARY
    // ======================================

    console.log(
      "☁️ Subiendo avistamiento a Cloudinary..."
    );

    const uploadResult =
      await uploadBuffer({
        buffer:
          req.file.buffer,

        folder:
          `pawtrace/sightings/${sighting.id}`,

        publicId:
          fileHash,
      });


    if (
      !uploadResult?.secure_url ||
      !uploadResult?.public_id
    ) {
      throw new Error(
        "Cloudinary no devolvió una URL válida."
      );
    }


    cloudinaryPublicId =
      uploadResult.public_id;


    console.log(
      "☁️ Sighting subida:",
      uploadResult.secure_url
    );


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
    // POSTGRESQL
    // ======================================

    const photo =
      await SightingPhoto.create({
        sightingId:
          sighting.id,

        imageUrl:
          uploadResult.secure_url,

        storageKey:
          uploadResult.public_id,

        isMain,
      });


    cloudinaryPublicId = null;


    console.log(
      "✅ SightingPhoto guardada:",
      {
        photoId:
          photo.id,

        imageUrl:
          photo.imageUrl,

        storageKey:
          photo.storageKey,
      }
    );


    // ======================================
    // ANIMAL RE-ID
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
            embedding?.embeddingSize ??
            null,

          processingMode:
            embedding?.processingMode ??
            null,
        }
      );

    } catch (embeddingError) {
      console.error(
        "⚠️ No se pudo generar embedding SightingPhoto:",
        embeddingError.message
      );
    }


    return res.status(201).json({
      ...photo.toJSON(),

      duplicate: false,

      storage: "cloudinary",
    });

  } catch (error) {

    if (cloudinaryPublicId) {
      await deleteImage(
        cloudinaryPublicId
      );
    }

    console.error(
      "❌ Error subiendo SightingPhoto:",
      error
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