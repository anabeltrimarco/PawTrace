const express =
  require("express");

const {
  body,
} =
  require("express-validator");

const controller =
  require("../controllers/foundReportController");

const photoController =
  require("../controllers/foundReportPhotoController");

const {
  uploadFoundReportPhoto,
} =
  require("../middleware/foundReportUpload");

const router =
  express.Router();

// ==========================================
// GET REPORTES
// ==========================================

router.get(
  "/",
  controller.listar
);

// ==========================================
// FOTOS
//
// IMPORTANTE:
// Estas rutas deben estar antes de
// cualquier ruta genérica que pueda
// interferir.
// ==========================================

router.get(
  "/:id/photos",
  photoController.listar
);

router.post(
  "/:id/photos",
  uploadFoundReportPhoto.single(
    "photo"
  ),
  photoController.crear
);

// ==========================================
// GET UN REPORTE
// ==========================================

router.get(
  "/:id",
  controller.obtener
);

// ==========================================
// POST REPORTE
// ==========================================

router.post(
  "/",
  [
    body("species")
      .notEmpty()
      .withMessage(
        "La especie es obligatoria."
      ),

    body("address")
      .trim()
      .notEmpty()
      .withMessage(
        "La ubicación es obligatoria."
      ),
  ],
  controller.crear
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

module.exports =
  router;