const multer =
  require("multer");

const path =
  require("path");

// ==========================================
// PAWTRACE - CLOUDINARY UPLOAD
// Multer en memoria
// ==========================================

const storage =
  multer.memoryStorage();

// ==========================================
// VALIDACIÓN DE ARCHIVOS
// ==========================================

function fileFilter(
  req,
  file,
  cb
) {
  const allowedMimeTypes =
    new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);

  const allowedExtensions =
    new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ]);

  const extension =
    path
      .extname(
        file.originalname
      )
      .toLowerCase();

  const mimeOk =
    allowedMimeTypes.has(
      file.mimetype
    );

  const extensionOk =
    allowedExtensions.has(
      extension
    );

  if (
    mimeOk &&
    extensionOk
  ) {
    cb(
      null,
      true
    );

    return;
  }

  cb(
    new Error(
      "Solo se permiten imágenes JPG, JPEG, PNG o WEBP."
    ),
    false
  );
}

// ==========================================
// MULTER
// ==========================================

const uploadImage =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        10 *
        1024 *
        1024,
    },
  });

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  uploadImage,
};