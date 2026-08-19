const multer =
  require("multer");

const path =
  require("path");

// ==========================================
// STORAGE
// ==========================================

const storage =
  multer.memoryStorage();

// ==========================================
// FORMATOS PERMITIDOS
// ==========================================

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

// ==========================================
// FILTRO
// ==========================================

function fileFilter(
  req,
  file,
  cb
) {
  const extension =
    path
      .extname(
        file.originalname
      )
      .toLowerCase();

  const mimeOk =
    allowedMimeTypes.includes(
      file.mimetype
    );

  const extensionOk =
    allowedExtensions.includes(
      extension
    );

  if (
    mimeOk &&
    extensionOk
  ) {
    return cb(
      null,
      true
    );
  }

  return cb(
    new Error(
      "Formato de imagen no permitido. Usá JPG, JPEG, PNG o WEBP."
    ),
    false
  );
}

// ==========================================
// MULTER
// ==========================================

const avatarUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      // Máximo 5 MB.
      fileSize:
        5 *
        1024 *
        1024,

      // Solo un archivo.
      files: 1,

      // Evita formularios multipart
      // con cantidades absurdas de campos.
      fields: 10,
    },
  });

module.exports =
  avatarUpload;