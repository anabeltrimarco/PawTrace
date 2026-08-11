const { validationResult } = require('express-validator');
const { User } = require('../models');

// GET /api/usuarios
async function listar(req, res, next) {
  try {
    const usuarios = await User.findAll({ attributes: { exclude: ['password'] } });
    return res.json(usuarios);
  } catch (error) {
    next(error);
  }
}

// GET /api/usuarios/:id
async function obtener(req, res, next) {
  try {
    const usuario = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.json(usuario);
  } catch (error) {
    next(error);
  }
}

// PUT /api/usuarios/:id
async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    // Un usuario solo puede editarse a sí mismo, salvo que sea admin.
    if (req.usuario.rol !== 'admin' && req.usuario.id !== req.params.id) {
      return res.status(403).json({ error: 'No podés editar otro usuario.' });
    }

    const usuario = await User.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const { nombre, telefono, password, rol, activo } = req.body;

    if (nombre !== undefined) usuario.nombre = nombre;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (password) usuario.password = password;

    // Solo un admin puede cambiar rol o estado activo de un usuario.
    if (req.usuario.rol === 'admin') {
      if (rol !== undefined) usuario.rol = rol;
      if (activo !== undefined) usuario.activo = activo;
    }

    await usuario.save();
    return res.json(usuario.toSafeJSON());
  } catch (error) {
    next(error);
  }
}

// DELETE /api/usuarios/:id
async function eliminar(req, res, next) {
  try {
    if (req.usuario.rol !== 'admin' && req.usuario.id !== req.params.id) {
      return res.status(403).json({ error: 'No podés eliminar otro usuario.' });
    }

    const usuario = await User.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    await usuario.destroy();
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener, actualizar, eliminar };
