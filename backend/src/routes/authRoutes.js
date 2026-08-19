const {
  Router,
} = require("express");

const {
  body,
} = require("express-validator");

const rateLimit =
  require("express-rate-limit");

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
// RATE LIMITERS
// ==========================================

// ------------------------------------------
// REGISTRO
// Evita creación masiva de cuentas.
// ------------------------------------------

const registroLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      error:
        "Demasiados intentos de registro. Intentá nuevamente en unos minutos.",
    },
  });

// ------------------------------------------
// LOGIN
// Protege contra fuerza bruta.
// ------------------------------------------

const loginLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      error:
        "Demasiados intentos de inicio de sesión. Esperá unos minutos e intentá nuevamente.",
    },
  });

// ------------------------------------------
// OLVIDÉ CONTRASEÑA
// Evita abuso del envío de recuperación.
// ------------------------------------------

const olvidePasswordLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 5,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      error:
        "Demasiadas solicitudes de recuperación. Esperá unos minutos e intentá nuevamente.",
    },
  });

// ------------------------------------------
// RESTABLECER CONTRASEÑA
// Limita intentos con tokens.
// ------------------------------------------

const restablecerPasswordLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      error:
        "Demasiados intentos para cambiar la contraseña. Esperá unos minutos.",
    },
  });

// ------------------------------------------
// AVATAR
// Evita abuso de Cloudinary.
// ------------------------------------------

const avatarLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 15,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    message: {
      error:
        "Demasiadas cargas de imagen. Esperá unos minutos antes de volver a intentarlo.",
    },
  });

// ==========================================
// REGISTRO
// ==========================================

router.post(
  "/registro",

  registroLimiter,

  [
    body("nombre")
      .trim()
      .notEmpty()
      .withMessage(
        "El nombre es obligatorio."
      )
      .isLength({
        min: 2,
        max: 100,
      })
      .withMessage(
        "El nombre debe tener entre 2 y 100 caracteres."
      ),

    body("email")
      .trim()
      .isEmail()
      .withMessage(
        "Email inválido."
      )
      .normalizeEmail(),

    body("password")
      .isLength({
        min: 8,
        max: 128,
      })
      .withMessage(
        "La contraseña debe tener entre 8 y 128 caracteres."
      ),

    body("phone")
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

    body("telefono")
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
  ],

  registrar
);

// ==========================================
// LOGIN
// ==========================================

router.post(
  "/login",

  loginLimiter,

  [
    body("email")
      .trim()
      .isEmail()
      .withMessage(
        "Email inválido."
      )
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage(
        "La contraseña es obligatoria."
      )
      .isLength({
        max: 128,
      })
      .withMessage(
        "La contraseña es demasiado larga."
      ),
  ],

  login
);

// ==========================================
// OLVIDÉ MI CONTRASEÑA
// ==========================================

router.post(
  "/olvide-password",

  olvidePasswordLimiter,

  [
    body("email")
      .trim()
      .isEmail()
      .withMessage(
        "Ingresá un email válido."
      )
      .normalizeEmail(),
  ],

  olvidePassword
);

// ==========================================
// RESTABLECER CONTRASEÑA
// ==========================================

router.post(
  "/restablecer-password",

  restablecerPasswordLimiter,

  [
    body("token")
      .notEmpty()
      .withMessage(
        "El token es obligatorio."
      )
      .isLength({
        max: 4096,
      })
      .withMessage(
        "El token no es válido."
      ),

    body("password")
      .isLength({
        min: 8,
        max: 128,
      })
      .withMessage(
        "La contraseña debe tener entre 8 y 128 caracteres."
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
      )
      .isLength({
        min: 2,
        max: 100,
      })
      .withMessage(
        "El nombre debe tener entre 2 y 100 caracteres."
      ),

    body("nombre")
      .optional()
      .trim()
      .notEmpty()
      .withMessage(
        "El nombre no puede estar vacío."
      )
      .isLength({
        min: 2,
        max: 100,
      })
      .withMessage(
        "El nombre debe tener entre 2 y 100 caracteres."
      ),

    body("phone")
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

    body("telefono")
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

    body("avatarUrl")
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 2048,
      })
      .withMessage(
        "La URL del avatar es demasiado larga."
      ),
  ],

  actualizarPerfil
);

// ==========================================
// SUBIR AVATAR
// ==========================================

router.post(
  "/perfil/avatar",

  autenticar,

  avatarLimiter,

  avatarUpload.single(
    "avatar"
  ),

  subirAvatar
);

module.exports =
  router;