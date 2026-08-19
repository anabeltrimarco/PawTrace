const express = require("express");

const {
  body,
} = require("express-validator");

const controller =
  require("../controllers/foundReportController");

const photoController =
  require("../controllers/foundReportPhotoController");

const {
  uploadImage,
} = require("../middleware/cloudinaryUpload");

const {
  autenticar,
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// GET REPORTES
// PÚBLICO
// ==========================================

router.get(
  "/",
  controller.listar
);

// ==========================================
// FOTOS
//
// IMPORTANTE:
// Estas rutas tienen que estar antes de /:id
// ==========================================

// Ver fotos:
// público
router.get(
  "/:id/photos",
  photoController.listar
);

// Subir foto:
// requiere usuario autenticado
router.post(
  "/:id/photos",
  autenticar,
  uploadImage.single("photo"),
  photoController.crear
);

// ==========================================
// GET UN REPORTE
// PÚBLICO
// ==========================================

router.get(
  "/:id",
  controller.obtener
);

// ==========================================
// CREAR REPORTE
// PRIVADO
// ==========================================

router.post(
  "/",

  autenticar,

  [
    body("species")
      .trim()
      .notEmpty()
      .withMessage(
        "La especie es obligatoria."
      )
      .isLength({
        max: 100,
      })
      .withMessage(
        "La especie es demasiado larga."
      ),

    body("address")
      .trim()
      .notEmpty()
      .withMessage(
        "La ubicación es obligatoria."
      )
      .isLength({
        max: 500,
      })
      .withMessage(
        "La ubicación es demasiado larga."
      ),

    body("breed")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 100,
      })
      .withMessage(
        "La raza es demasiado larga."
      ),

    body("color")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 100,
      })
      .withMessage(
        "El color es demasiado largo."
      ),

    body("description")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 2000,
      })
      .withMessage(
        "La descripción es demasiado larga."
      ),

    body("contactName")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 100,
      })
      .withMessage(
        "El nombre de contacto es demasiado largo."
      ),

    body("contactPhone")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 30,
      })
      .withMessage(
        "El teléfono es demasiado largo."
      ),

    body("contactEmail")
      .optional({
        nullable: true,
      })
      .trim()
      .isEmail()
      .withMessage(
        "El email de contacto no es válido."
      )
      .normalizeEmail(),

    body("latitude")
      .optional({
        nullable: true,
        checkFalsy: true,
      })
      .isFloat({
        min: -90,
        max: 90,
      })
      .withMessage(
        "La latitud no es válida."
      ),

    body("longitude")
      .optional({
        nullable: true,
        checkFalsy: true,
      })
      .isFloat({
        min: -180,
        max: 180,
      })
      .withMessage(
        "La longitud no es válida."
      ),
  ],

  controller.crear
);

// ==========================================
// ACTUALIZAR REPORTE
// PRIVADO
//
// El controller comprobará además
// propietario / admin / moderador.
// ==========================================

router.put(
  "/:id",
  autenticar,
  controller.actualizar
);

// ==========================================
// ELIMINAR REPORTE
// PRIVADO
//
// El controller comprobará además
// propietario / admin / moderador.
// ==========================================

router.delete(
  "/:id",
  autenticar,
  controller.eliminar
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;