const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// CARPETA DE DESTINO
// ==========================================

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "found-reports"
);

// Crear la carpeta automáticamente
// si todavía no existe.
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// ==========================================
// STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (
    req,
    file,
    cb
  ) => {
    cb(null, uploadDir);
  },

  filename: (
    req,
    file,
    cb
  ) => {
    const extension =
      path
        .extname(file.originalname)
        .toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(
      null,
      uniqueName
    );
  },
});

// ==========================================
// FILTRO DE ARCHIVOS
// ==========================================

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function fileFilter(
  req,
  file,
  cb
) {
  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      "Solo se permiten imágenes JPG, PNG o WEBP."
    )
  );
}

// ==========================================
// MULTER
// ==========================================

const uploadFoundReportPhoto =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

module.exports = {
  uploadFoundReportPhoto,
};