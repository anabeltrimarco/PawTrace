// ==========================================
// PAWTRACE - SIGHTING ROUTES
// Avistamientos + Cloudinary
// ==========================================

const express = require("express");

const router = express.Router();


// ==========================================
// CONTROLLER AVISTAMIENTOS
// ==========================================

const {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
} = require(
  "../controllers/sightingController"
);


// ==========================================
// CONTROLLER FOTOS
// ==========================================

const photoController =
  require(
    "../controllers/sightingPhotoController"
  );


// ==========================================
// CLOUDINARY UPLOAD
// ==========================================

const {
  uploadImage,
} = require(
  "../middleware/cloudinaryUpload"
);


// ==========================================
// GET
// Todos los avistamientos
// ==========================================

router.get(
  "/",
  listar
);


// ==========================================
// FOTOS
//
// IMPORTANTE:
// Antes de /:id
// ==========================================

router.get(
  "/:id/photos",
  photoController.listar
);


router.post(
  "/:id/photos",

  uploadImage.single("photo"),

  photoController.crear
);


// ==========================================
// GET INDIVIDUAL
// ==========================================

router.get(
  "/:id",
  obtener
);


// ==========================================
// POST
// Crear avistamiento
// ==========================================

router.post(
  "/",
  crear
);


// ==========================================
// PUT
// ==========================================

router.put(
  "/:id",
  actualizar
);


// ==========================================
// DELETE
// ==========================================

router.delete(
  "/:id",
  eliminar
);


// ==========================================
// EXPORT
// ==========================================

module.exports = router;