const jwt = require("jsonwebtoken");

// ==========================================
// CONFIGURACIÓN JWT
// ==========================================

function obtenerJwtSecret() {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET no está configurado."
    );
  }

  if (
    process.env.NODE_ENV ===
      "production" &&
    secret.length < 32
  ) {
    throw new Error(
      "JWT_SECRET debe tener al menos 32 caracteres en producción."
    );
  }

  return secret;
}

// ==========================================
// GENERAR TOKEN
// ==========================================

function generarToken(payload) {
  return jwt.sign(
    payload,
    obtenerJwtSecret(),
    {
      expiresIn:
        process.env
          .JWT_EXPIRES_IN ||
        "7d",

      algorithm: "HS256",
    }
  );
}

// ==========================================
// VERIFICAR TOKEN
// ==========================================

function verificarToken(token) {
  return jwt.verify(
    token,
    obtenerJwtSecret(),
    {
      algorithms: [
        "HS256",
      ],
    }
  );
}

module.exports = {
  generarToken,
  verificarToken,
};