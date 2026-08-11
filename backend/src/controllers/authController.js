const { validationResult } = require('express-validator');
const { User } = require('../models');
const { generarToken } = require('../utils/jwt');

async function registrar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { nombre, email, password, telefono } = req.body;

    const existente = await User.findOne({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    const usuario = await User.create({ nombre, email, password, telefono });
    const token = generarToken({ id: usuario.id, rol: usuario.rol });

    return res.status(201).json({ usuario: usuario.toSafeJSON(), token });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { email, password } = req.body;

    const usuario = await User.findOne({ where: { email } });
    if (!usuario || !usuario.isValidPassword(password)) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario inactivo. Contactá a un administrador.' });
    }

    const token = generarToken({ id: usuario.id, rol: usuario.rol });
    return res.json({ usuario: usuario.toSafeJSON(), token });
  } catch (error) {
    next(error);
  }
}

async function perfil(req, res) {
  return res.json({ usuario: req.usuario.toSafeJSON() });
}

module.exports = { registrar, login, perfil };
