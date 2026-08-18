const jwt = require("jsonwebtoken");
const {
  validationResult,
} = require("express-validator");

const {
  User,
} = require("../models");

const {
  generarToken,
} = require("../utils/jwt");

const {
  uploadBuffer,
} = require("../services/cloudinaryStorageService");

// ==========================================
// REGISTRO
// ==========================================

async function registrar(req, res, next) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errores: errors.array(),
      });
    }

    const {
      nombre,
      email,
      password,
      telefono,
      phone,
    } = req.body;

    const emailNormalizado =
      email.trim().toLowerCase();

    const existente = await User.findOne({
      where: {
        email: emailNormalizado,
      },
    });

    if (existente) {
      return res.status(409).json({
        error:
          "Ya existe un usuario con ese email.",
      });
    }

    const usuario = await User.create({
      fullName: nombre.trim(),

      email: emailNormalizado,

      phone:
        phone ||
        telefono ||
        null,

      passwordHash: password,

      role: "user",

      isActive: true,
    });

    const token = generarToken({
      id: usuario.id,
      role: usuario.role,
    });

    return res.status(201).json({
      usuario: usuario.toSafeJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// LOGIN
// ==========================================

async function login(req, res, next) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errores: errors.array(),
      });
    }

    const {
      email,
      password,
    } = req.body;

    const emailNormalizado =
      email.trim().toLowerCase();

    const usuario = await User.findOne({
      where: {
        email: emailNormalizado,
      },
    });

    if (
      !usuario ||
      !(await usuario.isValidPassword(password))
    ) {
      return res.status(401).json({
        error: "Credenciales inválidas.",
      });
    }

    if (!usuario.isActive) {
      return res.status(403).json({
        error:
          "Usuario inactivo. Contactá a un administrador.",
      });
    }

    const token = generarToken({
      id: usuario.id,
      role: usuario.role,
    });

    return res.json({
      usuario: usuario.toSafeJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// PERFIL
// ==========================================

async function perfil(req, res) {
  return res.json({
    usuario: req.usuario.toSafeJSON(),
  });
}

// ==========================================
// ACTUALIZAR PERFIL
// ==========================================

async function actualizarPerfil(
  req,
  res,
  next
) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errores: errors.array(),
      });
    }

    const usuario = await User.findByPk(
      req.usuario.id
    );

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado.",
      });
    }

    const {
      fullName,
      nombre,
      phone,
      telefono,
      avatarUrl,
    } = req.body;

    const nuevoNombre =
      fullName !== undefined
        ? fullName
        : nombre;

    if (nuevoNombre !== undefined) {
      usuario.fullName =
        nuevoNombre.trim();
    }

    const nuevoTelefono =
      phone !== undefined
        ? phone
        : telefono;

    if (nuevoTelefono !== undefined) {
      usuario.phone =
        nuevoTelefono
          ? nuevoTelefono.trim()
          : null;
    }

    if (avatarUrl !== undefined) {
      usuario.avatarUrl =
        avatarUrl
          ? avatarUrl.trim()
          : null;
    }

    await usuario.save();

    return res.json({
      mensaje:
        "Perfil actualizado correctamente.",

      usuario:
        usuario.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// SUBIR AVATAR
// ==========================================

async function subirAvatar(
  req,
  res,
  next
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error:
          "Seleccioná una imagen para el perfil.",
      });
    }

    const usuario = await User.findByPk(
      req.usuario.id
    );

    if (!usuario) {
      return res.status(404).json({
        error:
          "Usuario no encontrado.",
      });
    }

    const resultado = await uploadBuffer({
      buffer: req.file.buffer,

      folder: "pawtrace/avatars",

      publicId: `avatar-${usuario.id}-${Date.now()}`,
    });

    if (!resultado?.secure_url) {
      throw new Error(
        "Cloudinary no devolvió la URL de la imagen."
      );
    }

    usuario.avatarUrl =
      resultado.secure_url;

    await usuario.save();

    return res.status(200).json({
      mensaje:
        "Foto de perfil actualizada correctamente.",

      avatarUrl:
        usuario.avatarUrl,

      usuario:
        usuario.toSafeJSON(),
    });
  } catch (error) {
    console.error(
      "Error subiendo avatar:",
      error
    );

    next(error);
  }
}
// ==========================================
// OLVIDÉ MI CONTRASEÑA
// ==========================================

async function olvidePassword(
  req,
  res,
  next
) {
  try {
    const {
      email,
    } = req.body;

    if (
      !email ||
      !String(email).trim()
    ) {
      return res.status(400).json({
        error:
          "Ingresá tu email.",
      });
    }

    const emailNormalizado =
      String(email)
        .trim()
        .toLowerCase();

    const usuario =
      await User.findOne({
        where: {
          email:
            emailNormalizado,
        },
      });

    // IMPORTANTE:
    // No revelamos si el email existe o no.
    if (
      !usuario ||
      !usuario.isActive
    ) {
      return res.json({
        mensaje:
          "Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.",
      });
    }

    if (
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET no está configurado."
      );
    }

    // El passwordHash forma parte del secreto.
    // Cuando cambia la contraseña,
    // todos los tokens anteriores quedan inválidos.
    const resetSecret =
      `${process.env.JWT_SECRET}:${usuario.passwordHash}`;

    const resetToken =
      jwt.sign(
        {
          id: usuario.id,
          purpose:
            "password-reset",
        },
        resetSecret,
        {
          expiresIn: "15m",
        }
      );

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:3000";

    const resetLink =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(
        resetToken
      )}`;

    // ======================================
    // DESARROLLO
    // ======================================
    //
    // Por ahora imprimimos el enlace.
    // En el siguiente paso lo mandamos
    // realmente por email.
    // ======================================

    console.log(
      "🔐 LINK RECUPERACIÓN PAWTRACE:"
    );

    console.log(
      resetLink
    );

    return res.json({
      mensaje:
        "Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña.",

      // SOLO DEVELOPMENT.
      // Nunca devolver esto en producción.
      ...(process.env.NODE_ENV !==
      "production"
        ? {
            resetLink,
          }
        : {}),
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// RESTABLECER CONTRASEÑA
// ==========================================

async function restablecerPassword(
  req,
  res,
  next
) {
  try {
    const {
      token,
      password,
    } = req.body;

    if (!token) {
      return res.status(400).json({
        error:
          "El token de recuperación es obligatorio.",
      });
    }

    if (
      !password ||
      String(password).length <
        6
    ) {
      return res.status(400).json({
        error:
          "La nueva contraseña debe tener al menos 6 caracteres.",
      });
    }

    // Primero leemos el ID.
    // Esto NO valida todavía el token.
    const decoded =
      jwt.decode(token);

    if (
      !decoded ||
      typeof decoded !==
        "object" ||
      !decoded.id ||
      decoded.purpose !==
        "password-reset"
    ) {
      return res.status(400).json({
        error:
          "El enlace de recuperación no es válido.",
      });
    }

    const usuario =
      await User.findByPk(
        decoded.id
      );

    if (
      !usuario ||
      !usuario.isActive ||
      !usuario.passwordHash
    ) {
      return res.status(400).json({
        error:
          "El enlace de recuperación no es válido.",
      });
    }

    if (
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET no está configurado."
      );
    }

    const resetSecret =
      `${process.env.JWT_SECRET}:${usuario.passwordHash}`;

    try {
      jwt.verify(
        token,
        resetSecret
      );
    } catch (error) {
      return res.status(400).json({
        error:
          error?.name ===
          "TokenExpiredError"
            ? "El enlace de recuperación venció. Solicitá uno nuevo."
            : "El enlace de recuperación no es válido.",
      });
    }

    // El hook beforeUpdate de User
    // lo convierte en bcrypt automáticamente.
    usuario.passwordHash =
      String(password);

    await usuario.save();

    return res.json({
      mensaje:
        "Contraseña actualizada correctamente. Ya podés iniciar sesión.",
    });
  } catch (error) {
    next(error);
  }
}
// ==========================================
// EXPORT
// ==========================================

module.exports = {
  registrar,
  login,
  perfil,
  actualizarPerfil,
  subirAvatar,
};
module.exports = {
  registrar,
  login,
  perfil,
  actualizarPerfil,
  subirAvatar,
  olvidePassword,
  restablecerPassword,
};