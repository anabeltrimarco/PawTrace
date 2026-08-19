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
// AUTENTICACIÓN
// ==========================================

const {
  autenticar,
} = require(
  "../middleware/auth"
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
// GET - LISTAR MASCOTAS
// PÚBLICO
// ==========================================

router.get(
  "/",
  controller.listar
);

// ==========================================
// GET - OBTENER MASCOTA
// PÚBLICO
// ==========================================

router.get(
  "/:id",
  controller.obtener
);

// ==========================================
// POST - CREAR MASCOTA
// PRIVADO
//
// IMPORTANTE:
// autenticar carga req.usuario.
// petController usa req.usuario.id
// para guardar ownerId.
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

    body("name")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 100,
      })
      .withMessage(
        "El nombre es demasiado largo."
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

    body("size")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 50,
      })
      .withMessage(
        "El tamaño es demasiado largo."
      ),

    body("gender")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 50,
      })
      .withMessage(
        "El género es demasiado largo."
      ),

    body("ageText")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 100,
      })
      .withMessage(
        "La edad es demasiado larga."
      ),

    body("distinctiveFeatures")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 1000,
      })
      .withMessage(
        "Las características distintivas son demasiado largas."
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

    body("microchipNumber")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 100,
      })
      .withMessage(
        "El número de microchip es demasiado largo."
      ),
  ],

  controller.crear
);

// ==========================================
// POST - FOTO DE MASCOTA
// PRIVADO
//
// Usuario autenticado obligatorio.
// ==========================================

router.post(
  "/:id/photos",

  autenticar,

  uploadImage.single(
    "photo"
  ),

  uploadPetPhoto
);

// ==========================================
// PUT - EDITAR MASCOTA
// PRIVADO
//
// petController comprueba además
// que la mascota pertenezca al usuario.
// ==========================================

router.put(
  "/:id",

  autenticar,

  controller.actualizar
);

// ==========================================
// DELETE - ELIMINAR MASCOTA
// PRIVADO
//
// petController comprueba además
// que la mascota pertenezca al usuario.
// ==========================================

router.delete(
  "/:id",

  autenticar,

  controller.eliminar
);

// ==========================================
// EXPORT
// ==========================================

module.exports =
  router;