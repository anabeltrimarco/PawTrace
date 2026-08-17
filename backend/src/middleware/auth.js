const {
  verificarToken,
} = require("../utils/jwt");

const {
  User,
} = require("../models");

// ==========================================
// AUTENTICACIÓN OBLIGATORIA
// ==========================================
// Verifica:
// Authorization: Bearer <token>
// ==========================================

async function autenticar(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res
        .status(401)
        .json({
          error:
            "Token no proporcionado.",
        });
    }

    const token =
      authHeader.split(" ")[1];

    const payload =
      verificarToken(token);

    const usuario =
      await User.findByPk(
        payload.id
      );

    if (
      !usuario ||
      !usuario.isActive
    ) {
      return res
        .status(401)
        .json({
          error:
            "Usuario no válido o inactivo.",
        });
    }

    req.usuario =
      usuario;

    next();
  } catch (error) {
    return res
      .status(401)
      .json({
        error:
          "Token inválido o expirado.",
      });
  }
}

// ==========================================
// AUTENTICACIÓN OPCIONAL
// ==========================================

async function autenticarOpcional(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return next();
    }

    const token =
      authHeader.split(" ")[1];

    const payload =
      verificarToken(token);

    const usuario =
      await User.findByPk(
        payload.id
      );

    if (
      usuario &&
      usuario.isActive
    ) {
      req.usuario =
        usuario;
    }

    next();
  } catch (error) {
    // En endpoints opcionales,
    // un token inválido simplemente
    // continúa como usuario anónimo.
    next();
  }
}

// ==========================================
// AUTORIZACIÓN POR ROLES
// Ejemplo:
// autorizar("admin")
// ==========================================

function autorizar(
  ...rolesPermitidos
) {
  return (
    req,
    res,
    next
  ) => {
    if (
      !req.usuario ||
      !rolesPermitidos.includes(
        req.usuario.role
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "No tenés permisos para esta acción.",
        });
    }

    next();
  };
}

module.exports = {
  autenticar,
  autenticarOpcional,
  autorizar,
};