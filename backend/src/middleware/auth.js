const { verificarToken } = require('../utils/jwt');
const { User } = require('../models');

// Verifica que la petición traiga un JWT válido en el header Authorization: Bearer <token>
async function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verificarToken(token);

    const usuario = await User.findByPk(payload.id);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo.' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// Igual que autenticar, pero no bloquea si no hay token: para endpoints públicos
// que se comportan distinto si el usuario está logueado (ej: crear reportes sin cuenta).
async function autenticarOpcional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const payload = verificarToken(token);
    const usuario = await User.findByPk(payload.id);

    if (usuario && usuario.activo) {
      req.usuario = usuario;
    }
    next();
  } catch (error) {
    // Token inválido en un endpoint opcional: seguimos como anónimo.
    next();
  }
}

// Restringe el acceso solo a ciertos roles, ej: autorizar('admin')
function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
    }
    next();
  };
}

module.exports = { autenticar, autenticarOpcional, autorizar };
