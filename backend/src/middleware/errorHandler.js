const multer = require('multer');

// Middleware central de manejo de errores (incluye errores de Multer y validaciones).
function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error al subir el archivo: ${err.message}` });
  }

  if (err.message && err.message.includes('Formato de imagen')) {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);
  const status = err.status || 500;
  return res.status(status).json({ error: err.message || 'Error interno del servidor.' });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

module.exports = { errorHandler, notFound };
