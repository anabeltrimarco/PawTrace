const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// PAWTRACE - SIGHTING UPLOAD
// Sprint 1.4.4.2
// ==========================================

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "sightings"
);

// Crear carpeta automáticamente
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// ==========================================
// STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  },
});

// ==========================================
// FORMATOS PERMITIDOS
// ==========================================

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function fileFilter(req, file, cb) {
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

const uploadSightingPhoto =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

module.exports = {
  uploadSightingPhoto,
};