const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
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

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const mimeOk = allowedMimeTypes.includes(
    file.mimetype
  );

  const extensionOk =
    allowedExtensions.includes(extension);

  if (mimeOk && extensionOk) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      "Formato no permitido. Usá JPG, JPEG, PNG o WEBP."
    ),
    false
  );
};

const avatarUpload = multer({
  storage,

  fileFilter,

  limits: {
    // 5 MB máximo para avatar.
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = avatarUpload;