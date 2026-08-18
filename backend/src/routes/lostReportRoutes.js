const express =
  require("express");

const {
  body,
} = require(
  "express-validator"
);

const controller =
  require(
    "../controllers/lostReportController"
  );

const {
  autenticar,
} = require(
  "../middleware/auth"
);

const router =
  express.Router();

// ======================================================
// GET /api/lost-reports
// PÚBLICO
// ======================================================

router.get(
  "/",
  controller.listar
);

// ======================================================
// GET /api/lost-reports/mine
// PRIVADO
//
// IMPORTANTE:
// Tiene que estar ANTES de /:id,
// porque Express podría interpretar "mine"
// como si fuera un ID.
// ======================================================

router.get(
  "/mine",
  autenticar,
  controller.listarMios
);

// ======================================================
// GET /api/lost-reports/:id
// PÚBLICO
// ======================================================

router.get(
  "/:id",
  controller.obtener
);

// ======================================================
// POST /api/lost-reports
// PRIVADO
// ======================================================

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

// ======================================================
// PUT /api/lost-reports/:id
// PRIVADO
// Propietario / Admin / Moderador
// ======================================================

router.put(
  "/:id",
  autenticar,
  controller.actualizar
);

// ======================================================
// DELETE /api/lost-reports/:id
// PRIVADO
// Propietario / Admin / Moderador
// ======================================================

router.delete(
  "/:id",
  autenticar,
  controller.eliminar
);

module.exports =
  router;