const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { Mascota, User } = require('../models');

function rutaPublica(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/mascotas/${filename}`;
}

// GET /api/mascotas?estado=&propietarioId=&especie=&q=
async function listar(req, res, next) {
  try {
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.propietarioId) where.propietarioId = req.query.propietarioId;
    if (req.query.especie) where.especie = req.query.especie;

    if (req.query.q) {
      const texto = `%${req.query.q}%`;
      where[Op.or] = [
        { nombre: { [Op.iLike]: texto } },
        { raza: { [Op.iLike]: texto } },
        { color: { [Op.iLike]: texto } },
        { descripcion: { [Op.iLike]: texto } },
      ];
    }

    const mascotas = await Mascota.findAll({
      where,
      include: [{ model: User, as: 'propietario', attributes: ['id', 'nombre', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    const data = mascotas.map((m) => ({
      ...m.toJSON(),
      foto: m.foto ? rutaPublica(req, m.foto) : null,
    }));

    return res.json(data);
  } catch (error) {
    next(error);
  }
}

// GET /api/mascotas/:id
async function obtener(req, res, next) {
  try {
    const mascota = await Mascota.findByPk(req.params.id, {
      include: [{ model: User, as: 'propietario', attributes: ['id', 'nombre', 'email'] }],
    });
    if (!mascota) return res.status(404).json({ error: 'Mascota no encontrada.' });

    return res.json({ ...mascota.toJSON(), foto: mascota.foto ? rutaPublica(req, mascota.foto) : null });
  } catch (error) {
    next(error);
  }
}

// POST /api/mascotas
// Público: si hay JWT válido (req.usuario, ver autenticarOpcional) se usa como dueño registrado.
// Si no hay sesión, se exige nombre y teléfono de contacto para poder ubicar al reportante.
async function crear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { nombre, especie, raza, color, edad, tamano, descripcion, estado, contactoNombre, contactoTelefono } =
      req.body;

    if (!req.usuario && !contactoTelefono) {
      return res.status(400).json({
        error: 'Falta el teléfono de contacto (obligatorio si no iniciaste sesión).',
      });
    }

    const mascota = await Mascota.create({
      nombre,
      especie,
      raza,
      color,
      edad: edad || null,
      tamano: tamano || null,
      descripcion,
      estado: estado || 'activa',
      propietarioId: req.usuario ? req.usuario.id : null,
      contactoNombre: req.usuario ? null : contactoNombre || null,
      contactoTelefono: req.usuario ? null : contactoTelefono,
      foto: req.file ? req.file.filename : null,
    });

    return res.status(201).json({ ...mascota.toJSON(), foto: mascota.foto ? rutaPublica(req, mascota.foto) : null });
  } catch (error) {
    next(error);
  }
}

function verificarPropietario(req, mascota) {
  if (req.usuario.rol === 'admin') return true;
  // Las mascotas creadas sin cuenta (propietarioId null) no se pueden editar/eliminar
  // desde este endpoint protegido: solo un admin puede hacerlo.
  return mascota.propietarioId !== null && mascota.propietarioId === req.usuario.id;
}

// PUT /api/mascotas/:id
async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const mascota = await Mascota.findByPk(req.params.id);
    if (!mascota) return res.status(404).json({ error: 'Mascota no encontrada.' });

    if (!(await verificarPropietario(req, mascota))) {
      return res.status(403).json({ error: 'No podés editar una mascota que no es tuya.' });
    }

    const campos = [
      'nombre',
      'especie',
      'raza',
      'color',
      'edad',
      'tamano',
      'descripcion',
      'estado',
      'contactoNombre',
      'contactoTelefono',
    ];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) mascota[campo] = req.body[campo];
    });

    if (req.file) {
      // Borra la imagen anterior si existía.
      if (mascota.foto) {
        const anterior = path.join(__dirname, '..', '..', 'uploads', 'mascotas', mascota.foto);
        fs.unlink(anterior, () => {});
      }
      mascota.foto = req.file.filename;
    }

    await mascota.save();
    return res.json({ ...mascota.toJSON(), foto: mascota.foto ? rutaPublica(req, mascota.foto) : null });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/mascotas/:id
async function eliminar(req, res, next) {
  try {
    const mascota = await Mascota.findByPk(req.params.id);
    if (!mascota) return res.status(404).json({ error: 'Mascota no encontrada.' });

    if (!(await verificarPropietario(req, mascota))) {
      return res.status(403).json({ error: 'No podés eliminar una mascota que no es tuya.' });
    }

    if (mascota.foto) {
      const rutaFoto = path.join(__dirname, '..', '..', 'uploads', 'mascotas', mascota.foto);
      fs.unlink(rutaFoto, () => {});
    }

    await mascota.destroy();
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
