// ==========================================
// PAWTRACE - FOUND REPORT PHOTO CONTROLLER
//
// Sprint 1.4.3.6
//
// Fotos de mascotas encontradas.
//
// Incluye:
// - Prevención de fotos duplicadas
// - Hash SHA-256
// - Eliminación automática del archivo duplicado
// - Generación persistente de embedding
// ==========================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  FoundReport,
  FoundReportPhoto,
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
    `/uploads/found-reports/${filename}`
  );
}


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
// CALCULAR SHA-256
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
// OBTENER PATH DE FOTO EXISTENTE
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
// BUSCAR FOTO DUPLICADA
// ==========================================

async function findDuplicatePhoto({
  foundReportId,
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
    "🔐 SHA-256 foto encontrada nueva:",
    newHash
  );

  const existingPhotos =
    await FoundReportPhoto.findAll({
      where: {
        foundReportId,
      },
    });

  if (
    existingPhotos.length ===
    0
  ) {
    return null;
  }

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
          "♻️ Foto duplicada detectada en FoundReport:",
          {
            foundReportId,

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
// GET
//
// /api/found-reports/:id/photos
// ==========================================

async function listar(
  req,
  res,
  next
) {
  try {
    const report =
      await FoundReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota encontrada no encontrado.",
        });
    }

    const photos =
      await FoundReportPhoto.findAll({
        where: {
          foundReportId:
            report.id,
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
// POST
//
// /api/found-reports/:id/photos
// ==========================================

async function crear(
  req,
  res,
  next
) {
  try {
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
    // BUSCAR REPORTE
    // ======================================

    const report =
      await FoundReport.findByPk(
        req.params.id
      );

    if (!report) {
      deleteUploadedFile(
        req.file
      );

      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota encontrada no encontrado.",
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
          foundReportId:
            report.id,

          uploadedFile:
            req.file,
        });
    } catch (hashError) {
      console.error(
        "⚠️ Error verificando foto duplicada:",
        hashError.message
      );
    }


    // ======================================
    // SI YA EXISTE:
    //
    // - borramos la copia recién subida
    // - no creamos FoundReportPhoto
    // - no generamos otro embedding
    // ======================================

    if (duplicatePhoto) {
      deleteUploadedFile(
        req.file
      );

      console.log(
        "♻️ Se reutiliza foto existente de FoundReport:",
        {
          foundReportId:
            report.id,

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
            "Esta foto ya estaba cargada para el reporte.",
        });
    }


    // ======================================
    // ¿YA HAY FOTOS?
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
    // URL
    // ======================================

    const imageUrl =
      buildPublicUrl(
        req,
        req.file.filename
      );


    // ======================================
    // GUARDAR FOTO NUEVA
    // ======================================

    const photo =
      await FoundReportPhoto.create({
        foundReportId:
          report.id,

        imageUrl,

        storageKey:
          req.file.filename,

        isMain,
      });


    console.log(
      "✅ Foto de FoundReport guardada:",
      {
        reportId:
          report.id,

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
    // Si falla la IA:
    // la foto sigue guardada.
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
        "⚠️ No se pudo generar embedding FoundReportPhoto:",
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
    // SI FALLA LA OPERACIÓN PRINCIPAL,
    // ELIMINAMOS EL ARCHIVO RECIÉN SUBIDO
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
  listar,
  crear,
};