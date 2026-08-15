// ==========================================
// PAWTRACE - FOUND REPORT PHOTO CONTROLLER
// Cloudinary + SHA-256 + Animal Re-ID
// ==========================================

const crypto = require("crypto");

const {
  FoundReport,
  FoundReportPhoto,
} = require("../models");

const {
  getOrCreateEmbedding,
} = require("../services/imageEmbeddingService");

const {
  uploadBuffer,
  deleteImage,
} = require("../services/cloudinaryStorageService");


// ==========================================
// SHA-256 DEL BUFFER
// ==========================================

function calculateBufferHash(buffer) {
  if (!buffer) return null;

  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}


// ==========================================
// BUSCAR DUPLICADO
// ==========================================

async function findDuplicatePhoto({
  foundReportId,
  fileHash,
}) {
  if (!fileHash) return null;

  const photos =
    await FoundReportPhoto.findAll({
      where: {
        foundReportId,
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
// /api/found-reports/:id/photos
// ==========================================

async function listar(req, res, next) {
  try {
    const report =
      await FoundReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res.status(404).json({
        error:
          "Reporte de mascota encontrada no encontrado.",
      });
    }

    const photos =
      await FoundReportPhoto.findAll({
        where: {
          foundReportId: report.id,
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
// /api/found-reports/:id/photos
// ==========================================

async function crear(req, res, next) {
  let cloudinaryPublicId = null;

  try {

    // ======================================
    // VALIDAR ARCHIVO
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
    // REPORTE
    // ======================================

    const report =
      await FoundReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res.status(404).json({
        error:
          "Reporte de mascota encontrada no encontrado.",
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
      "🔐 SHA-256 foto encontrada:",
      fileHash
    );


    // ======================================
    // DUPLICADO
    // ======================================

    const duplicatePhoto =
      await findDuplicatePhoto({
        foundReportId:
          report.id,

        fileHash,
      });

    if (duplicatePhoto) {
      console.log(
        "♻️ Foto duplicada FoundReport:",
        duplicatePhoto.id
      );

      return res.status(200).json({
        ...duplicatePhoto.toJSON(),

        duplicate: true,

        message:
          "Esta foto ya estaba cargada para el reporte.",
      });
    }


    // ======================================
    // CLOUDINARY
    // ======================================

    console.log(
      "☁️ Subiendo foto encontrada a Cloudinary..."
    );

    const uploadResult =
      await uploadBuffer({
        buffer:
          req.file.buffer,

        folder:
          `pawtrace/found-reports/${report.id}`,

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
      "☁️ FoundReport subida:",
      uploadResult.secure_url
    );


    // ======================================
    // FOTO PRINCIPAL
    // ======================================

    const photosCount =
      await FoundReportPhoto.count({
        where: {
          foundReportId:
            report.id,
        },
      });

    const isMain =
      photosCount === 0;


    // ======================================
    // POSTGRESQL
    // ======================================

    const photo =
      await FoundReportPhoto.create({
        foundReportId:
          report.id,

        imageUrl:
          uploadResult.secure_url,

        storageKey:
          uploadResult.public_id,

        isMain,
      });


    // Ya quedó persistida.
    cloudinaryPublicId = null;


    console.log(
      "✅ FoundReportPhoto guardada:",
      {
        photoId: photo.id,
        imageUrl: photo.imageUrl,
        storageKey: photo.storageKey,
      }
    );


    // ======================================
    // ANIMAL RE-ID
    // ======================================

    try {
      const embedding =
        await getOrCreateEmbedding({
          entityType:
            "found_report_photo",

          entityId:
            photo.id,

          imageUrl:
            photo.imageUrl,
        });

      console.log(
        "🧠 Embedding FoundReportPhoto listo:",
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
        "⚠️ No se pudo generar embedding FoundReportPhoto:",
        embeddingError.message
      );
    }


    return res.status(201).json({
      ...photo.toJSON(),

      duplicate: false,

      storage: "cloudinary",
    });

  } catch (error) {

    // Cloudinary recibió la foto pero DB falló.
    if (cloudinaryPublicId) {
      await deleteImage(
        cloudinaryPublicId
      );
    }

    console.error(
      "❌ Error subiendo FoundReportPhoto:",
      error
    );

    next(error);
  }
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  listar,
  crear,
};