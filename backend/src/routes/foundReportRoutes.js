const express = require("express");

const {
  body,
} = require("express-validator");

const controller =
  require("../controllers/foundReportController");

const photoController =
  require("../controllers/foundReportPhotoController");

// ==========================================
// CLOUDINARY UPLOAD
// ==========================================

const {
  uploadImage,
} = require("../middleware/cloudinaryUpload");

const router = express.Router();


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
// Estas rutas deben estar antes de /:id
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


// ==========================================
// EXPORT
// ==========================================

module.exports = router;