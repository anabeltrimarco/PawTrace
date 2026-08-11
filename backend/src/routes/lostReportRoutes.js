const express = require("express");
const { body } = require("express-validator");

const controller = require("../controllers/lostReportController");

const router = express.Router();

router.get("/", controller.listar);

router.get("/:id", controller.obtener);

router.post(
  "/",
  [
    body("petId")
      .notEmpty()
      .withMessage("petId es obligatorio."),

    body("address")
      .trim()
      .notEmpty()
      .withMessage("La ubicación es obligatoria."),
  ],
  controller.crear
);

router.put("/:id", controller.actualizar);

router.delete("/:id", controller.eliminar);

module.exports = router;