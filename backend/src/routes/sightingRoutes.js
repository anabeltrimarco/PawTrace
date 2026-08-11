// ==========================================
// PAWTRACE - SIGHTING ROUTES
//
// Sprint 1.4.4.2
// Avistamientos + Fotos
// ==========================================

const express =
  require("express");

const router =
  express.Router();


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
// UPLOAD FOTOS
// ==========================================

const {
  uploadSightingPhoto,
} = require(
  "../middleware/sightingUpload"
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
// Estas rutas deben estar ANTES de /:id
// ==========================================


// GET
// Fotos de un avistamiento

router.get(
  "/:id/photos",
  photoController.listar
);


// POST
// Subir foto de un avistamiento

router.post(
  "/:id/photos",

  uploadSightingPhoto.single(
    "photo"
  ),

  photoController.crear
);


// ==========================================
// GET
// Avistamiento individual
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
// Actualizar avistamiento
// ==========================================

router.put(
  "/:id",
  actualizar
);


// ==========================================
// DELETE
// Eliminar avistamiento
//
// Sighting usa paranoid=true,
// por lo que realiza soft delete.
// ==========================================

router.delete(
  "/:id",
  eliminar
);


// ==========================================
// EXPORT
// ==========================================

module.exports =
  router;