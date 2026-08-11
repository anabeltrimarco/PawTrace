const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// CARPETAS
// ==========================================

const baseUploadsDir = path.join(
  process.cwd(),
  "uploads"
);

const petsDir = path.join(
  baseUploadsDir,
  "mascotas"
);

const reportsDir = path.join(
  baseUploadsDir,
  "reportes"
);

[petsDir, reportsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true,
    });
  }
});

// ==========================================
// STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isFoundReport =
      req.baseUrl.includes(
        "found-reports"
      );

    cb(
      null,
      isFoundReport
        ? reportsDir
        : petsDir
    );
  },

  filename: (req, file, cb) => {
    const extension =
      path.extname(
        file.originalname
      ).toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  },
});

// ==========================================
// VALIDACIÓN
// ==========================================

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  const extension =
    path.extname(
      file.originalname
    ).toLowerCase();

  const mimeOk =
    allowedMimeTypes.includes(
      file.mimetype
    );

  const extensionOk =
    allowedExtensions.includes(
      extension
    );

  if (mimeOk || extensionOk) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Formato no permitido. Archivo: ${file.originalname}, tipo recibido: ${file.mimetype}`
      ),
      false
    );
  }
};

// ==========================================
// MULTER
// ==========================================

const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },
});

module.exports = upload;