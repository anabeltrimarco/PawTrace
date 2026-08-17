const {
  validationResult,
} = require("express-validator");

const {
  User,
} = require("../models");

const {
  generarToken,
} = require("../utils/jwt");

// ==========================================
// REGISTRO
// ==========================================

async function registrar(req, res, next) {
  try {
    const errors =
      validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({
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

    const existente =
      await User.findOne({
        where: {
          email: emailNormalizado,
        },
      });

    if (existente) {
      return res
        .status(409)
        .json({
          error:
            "Ya existe un usuario con ese email.",
        });
    }

    const usuario =
      await User.create({
        fullName: nombre.trim(),

        email: emailNormalizado,

        phone:
          phone ||
          telefono ||
          null,

        // El modelo aplica bcrypt
        // automáticamente en beforeCreate.
        passwordHash: password,

        role: "user",

        isActive: true,
      });

    const token =
      generarToken({
        id: usuario.id,
        role: usuario.role,
      });

    return res
      .status(201)
      .json({
        usuario:
          usuario.toSafeJSON(),

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
    const errors =
      validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({
          errores: errors.array(),
        });
    }

    const {
      email,
      password,
    } = req.body;

    const emailNormalizado =
      email.trim().toLowerCase();

    const usuario =
      await User.findOne({
        where: {
          email: emailNormalizado,
        },
      });

    if (
      !usuario ||
      !(await usuario.isValidPassword(
        password
      ))
    ) {
      return res
        .status(401)
        .json({
          error:
            "Credenciales inválidas.",
        });
    }

    if (!usuario.isActive) {
      return res
        .status(403)
        .json({
          error:
            "Usuario inactivo. Contactá a un administrador.",
        });
    }

    const token =
      generarToken({
        id: usuario.id,
        role: usuario.role,
      });

    return res.json({
      usuario:
        usuario.toSafeJSON(),

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
    usuario:
      req.usuario.toSafeJSON(),
  });
}

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  registrar,
  login,
  perfil,
};