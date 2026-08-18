const {
  Router,
} = require("express");

const {
  body,
} = require("express-validator");

const {
  listar,
  obtener,
  actualizar,
  eliminar,
} = require("../controllers/userController");

const {
  autenticar,
  autorizar,
} = require("../middleware/auth");

const router =
  Router();

// Todas las rutas requieren login.
router.use(autenticar);

// ==========================================
// LISTAR TODOS
// Solo administrador
// ==========================================

router.get(
  "/",
  autorizar("admin"),
  listar
);

// ==========================================
// OBTENER USUARIO
// ==========================================

router.get(
  "/:id",
  obtener
);

// ==========================================
// ACTUALIZAR USUARIO
// ==========================================

router.put(
  "/:id",
  [
    body("fullName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage(
        "El nombre no puede estar vacío."
      ),

    body("nombre")
      .optional()
      .trim()
      .notEmpty()
      .withMessage(
        "El nombre no puede estar vacío."
      ),

    body("phone")
      .optional({
        nullable: true,
      })
      .trim(),

    body("telefono")
      .optional({
        nullable: true,
      })
      .trim(),

    body("avatarUrl")
      .optional({
        nullable: true,
      })
      .trim(),

    body("role")
      .optional()
      .isIn([
        "user",
        "admin",
        "moderator",
      ])
      .withMessage(
        "Rol inválido."
      ),

    body("isActive")
      .optional()
      .isBoolean()
      .withMessage(
        "isActive debe ser booleano."
      ),
  ],

  actualizar
);

// ==========================================
// DESACTIVAR USUARIO
// ==========================================

router.delete(
  "/:id",
  eliminar
);

module.exports =
  router;