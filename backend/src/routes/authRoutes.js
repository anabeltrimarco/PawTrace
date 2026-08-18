const {
  Router,
} = require("express");

const {
  body,
} = require("express-validator");

const {
  registrar,
  login,
  perfil,
  actualizarPerfil,
  subirAvatar,
  olvidePassword,
  restablecerPassword,
} = require("../controllers/authController");

const {
  autenticar,
} = require("../middleware/auth");

const avatarUpload =
  require("../middleware/avatarUpload");

const router =
  Router();

// ==========================================
// REGISTRO
// ==========================================

router.post(
  "/registro",
  [
    body("nombre")
      .trim()
      .notEmpty()
      .withMessage(
        "El nombre es obligatorio."
      ),

    body("email")
      .isEmail()
      .withMessage(
        "Email inválido."
      ),

    body("password")
      .isLength({
        min: 6,
      })
      .withMessage(
        "La contraseña debe tener al menos 6 caracteres."
      ),
  ],
  registrar
);

// ==========================================
// LOGIN
// ==========================================

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage(
        "Email inválido."
      ),

    body("password")
      .notEmpty()
      .withMessage(
        "La contraseña es obligatoria."
      ),
  ],
  login
);

// ==========================================
// OLVIDÉ MI CONTRASEÑA
// ==========================================

router.post(
  "/olvide-password",
  [
    body("email")
      .isEmail()
      .withMessage(
        "Ingresá un email válido."
      ),
  ],
  olvidePassword
);

// ==========================================
// RESTABLECER CONTRASEÑA
// ==========================================

router.post(
  "/restablecer-password",
  [
    body("token")
      .notEmpty()
      .withMessage(
        "El token es obligatorio."
      ),

    body("password")
      .isLength({
        min: 6,
      })
      .withMessage(
        "La contraseña debe tener al menos 6 caracteres."
      ),
  ],
  restablecerPassword
);

// ==========================================
// OBTENER PERFIL
// ==========================================

router.get(
  "/perfil",
  autenticar,
  perfil
);

// ==========================================
// ACTUALIZAR PERFIL
// ==========================================

router.put(
  "/perfil",

  autenticar,

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
  ],

  actualizarPerfil
);

// ==========================================
// SUBIR AVATAR
// ==========================================

router.post(
  "/perfil/avatar",

  autenticar,

  avatarUpload.single(
    "avatar"
  ),

  subirAvatar
);

module.exports =
  router;