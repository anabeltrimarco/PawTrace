const express = require("express");
const { body } = require("express-validator");

const controller = require("../controllers/petController");

const upload = require("../middleware/upload");

const {
  uploadPetPhoto,
} = require("../controllers/photoController");

const router = express.Router();

// =========================
// GET
// =========================

router.get("/", controller.listar);

router.get("/:id", controller.obtener);

// =========================
// POST
// =========================

router.post(
  "/",
  [
    body("species")
      .notEmpty()
      .withMessage("La especie es obligatoria."),
  ],
  controller.crear
);

// =========================
// POST FOTO
// =========================

router.post(
  "/:id/photos",
  upload.single("photo"),
  uploadPetPhoto
);

// =========================
// PUT
// =========================

router.put(
  "/:id",
  controller.actualizar
);

// =========================
// DELETE
// =========================

router.delete(
  "/:id",
  controller.eliminar
);

module.exports = router;