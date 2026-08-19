const multer = require("multer");

// ==========================================
// ERROR 404
// ==========================================

function notFound(req, res) {
  return res.status(404).json({
    error: "Ruta no encontrada.",
  });
}

// ==========================================
// MANEJO CENTRAL DE ERRORES
// ==========================================

function errorHandler(
  err,
  req,
  res,
  next
) {
  const esProduccion =
    process.env.NODE_ENV ===
    "production";

  // ========================================
  // MULTER
  // ========================================

  if (
    err instanceof
    multer.MulterError
  ) {
    let mensaje =
      "Error al subir el archivo.";

    if (
      err.code ===
      "LIMIT_FILE_SIZE"
    ) {
      mensaje =
        "El archivo supera el tamaño permitido.";
    }

    if (
      err.code ===
      "LIMIT_FILE_COUNT"
    ) {
      mensaje =
        "Se enviaron demasiados archivos.";
    }

    if (
      err.code ===
      "LIMIT_UNEXPECTED_FILE"
    ) {
      mensaje =
        "El archivo enviado no es válido.";
    }

    return res
      .status(400)
      .json({
        error: mensaje,
      });
  }

  // ========================================
  // FORMATO DE IMAGEN
  // ========================================

  if (
    err.message &&
    err.message.includes(
      "Formato de imagen"
    )
  ) {
    return res
      .status(400)
      .json({
        error: err.message,
      });
  }

  // ========================================
  // CORS
  // ========================================

  if (
    err.message ===
    "Origen no permitido por CORS."
  ) {
    console.warn(
      "CORS bloqueado:",
      req.headers.origin ||
        "sin origin"
    );

    return res
      .status(403)
      .json({
        error:
          "Origen no autorizado.",
      });
  }

  // ========================================
  // JSON INVÁLIDO
  // ========================================

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res
      .status(400)
      .json({
        error:
          "El cuerpo de la solicitud contiene JSON inválido.",
      });
  }

  // ========================================
  // PAYLOAD DEMASIADO GRANDE
  // ========================================

  if (
    err.type ===
    "entity.too.large"
  ) {
    return res
      .status(413)
      .json({
        error:
          "La solicitud supera el tamaño permitido.",
      });
  }

  // ========================================
  // SEQUELIZE - VALIDACIÓN
  // ========================================

  if (
    err.name ===
    "SequelizeValidationError"
  ) {
    return res
      .status(400)
      .json({
        error:
          "Los datos enviados no son válidos.",
      });
  }

  // ========================================
  // SEQUELIZE - DATO DUPLICADO
  // ========================================

  if (
    err.name ===
    "SequelizeUniqueConstraintError"
  ) {
    return res
      .status(409)
      .json({
        error:
          "Ya existe un registro con esos datos.",
      });
  }

  // ========================================
  // STATUS
  // ========================================

  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : 500;

  // ========================================
  // LOG DEL SERVIDOR
  // ========================================

  if (status >= 500) {
    console.error(
      "Error interno:",
      err
    );
  } else if (
    !esProduccion
  ) {
    console.error(
      "Error de solicitud:",
      err
    );
  }

  // ========================================
  // ERROR INTERNO
  // ========================================

  if (status >= 500) {
    return res
      .status(status)
      .json({
        error:
          "Error interno del servidor.",
      });
  }

  // ========================================
  // ERRORES CONTROLADOS 4XX
  // ========================================

  return res
    .status(status)
    .json({
      error:
        err.message ||
        "No se pudo procesar la solicitud.",
    });
}

module.exports = {
  errorHandler,
  notFound,
};