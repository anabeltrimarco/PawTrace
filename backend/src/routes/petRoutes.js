const express =
  require("express");

const {
  body,
} = require(
  "express-validator"
);

const controller =
  require(
    "../controllers/petController"
  );

// ==========================================
// CLOUDINARY UPLOAD
// ==========================================

const {
  uploadImage,
} = require(
  "../middleware/cloudinaryUpload"
);

const {
  uploadPetPhoto,
} = require(
  "../controllers/photoController"
);

const router =
  express.Router();


// ==========================================
// GET
// ==========================================

router.get(
  "/",
  controller.listar
);

router.get(
  "/:id",
  controller.obtener
);


// ==========================================
// POST - CREAR MASCOTA
// ==========================================

router.post(
  "/",
  [
    body("species")
      .notEmpty()
      .withMessage(
        "La especie es obligatoria."
      ),
  ],
  controller.crear
);


// ==========================================
// POST - FOTO DE MASCOTA
//
// La imagen:
// navegador
//   ↓
// Multer memoryStorage
//   ↓
// req.file.buffer
//   ↓
// Cloudinary
//   ↓
// PostgreSQL guarda URL HTTPS
// ==========================================

router.post(
  "/:id/photos",

  uploadImage.single(
    "photo"
  ),

  uploadPetPhoto
);


// ==========================================
// PUT
// ==========================================

router.put(
  "/:id",
  controller.actualizar
);


// ==========================================
// DELETE
// ==========================================

router.delete(
  "/:id",
  controller.eliminar
);


// ==========================================
// EXPORT
// ==========================================

module.exports =
  router;