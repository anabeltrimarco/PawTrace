const express = require("express");
const { body } = require("express-validator");

const controller = require("../controllers/lostReportController");
const {
  autenticar,
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// CONSULTAS PÚBLICAS
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
// CREAR REPORTE
// Usuario obligatorio
// ==========================================

router.post(
  "/",
  autenticar,
  [
    body("petId")
      .notEmpty()
      .withMessage(
        "petId es obligatorio."
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
// ACTUALIZAR REPORTE
// Solo propietario/admin/moderador
// ==========================================

router.put(
  "/:id",
  autenticar,
  controller.actualizar
);

// ==========================================
// ELIMINAR REPORTE
// Solo propietario/admin/moderador
// ==========================================

router.delete(
  "/:id",
  autenticar,
  controller.eliminar
);

module.exports = router;