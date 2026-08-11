const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { Reporte, Mascota, User } = require('../models');

function rutaPublica(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get('host')}/uploads/reportes/${filename}`;
}

const includeRelaciones = [
  { model: Mascota, as: 'mascota' },
  { model: User, as: 'usuario', attributes: ['id', 'nombre', 'email'] },
];

// GET /api/reportes?tipo=&estado=&mascotaId=&especie=&q=
async function listar(req, res, next) {
  try {
    const where = {};
    if (req.query.tipo) where.tipo = req.query.tipo;
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.mascotaId) where.mascotaId = req.query.mascotaId;

    if (req.query.q) {
      const texto = `%${req.query.q}%`;
      where[Op.or] = [{ descripcion: { [Op.iLike]: texto } }, { ubicacion: { [Op.iLike]: texto } }];
    }

    const includeConFiltroEspecie = req.query.especie
      ? [
          { ...includeRelaciones[0], where: { especie: req.query.especie }, required: true },
          includeRelaciones[1],
        ]
      : includeRelaciones;

    const reportes = await Reporte.findAll({
      where,
      include: includeConFiltroEspecie,
      order: [['createdAt', 'DESC']],
    });

    const data = reportes.map((r) => ({ ...r.toJSON(), foto: r.foto ? rutaPublica(req, r.foto) : null }));
    return res.json(data);
  } catch (error) {
    next(error);
  }
}

// GET /api/reportes/:id
async function obtener(req, res, next) {
  try {
    const reporte = await Reporte.findByPk(req.params.id, { include: includeRelaciones });
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado.' });

    return res.json({ ...reporte.toJSON(), foto: reporte.foto ? rutaPublica(req, reporte.foto) : null });
  } catch (error) {
    next(error);
  }
}

// POST /api/reportes
async function crear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const { mascotaId, tipo, descripcion, ubicacion, latitud, longitud, fecha } = req.body;

    const mascota = await Mascota.findByPk(mascotaId);
    if (!mascota) return res.status(404).json({ error: 'La mascota indicada no existe.' });

    const reporte = await Reporte.create({
      mascotaId,
      tipo,
      descripcion,
      ubicacion,
      latitud: latitud || null,
      longitud: longitud || null,
      fecha: fecha || new Date(),
      usuarioId: req.usuario ? req.usuario.id : null,
      foto: req.file ? req.file.filename : null,
    });

    const reporteCompleto = await Reporte.findByPk(reporte.id, { include: includeRelaciones });
    return res.status(201).json({
      ...reporteCompleto.toJSON(),
      foto: reporteCompleto.foto ? rutaPublica(req, reporteCompleto.foto) : null,
    });
  } catch (error) {
    next(error);
  }
}

function puedeModificar(req, reporte) {
  if (req.usuario.rol === 'admin') return true;
  // Los reportes públicos (usuarioId null) solo los puede tocar un admin.
  return reporte.usuarioId !== null && reporte.usuarioId === req.usuario.id;
}

// PUT /api/reportes/:id
async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }

    const reporte = await Reporte.findByPk(req.params.id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado.' });

    if (!puedeModificar(req, reporte)) {
      return res.status(403).json({ error: 'No podés editar un reporte que no es tuyo.' });
    }

    const campos = ['tipo', 'descripcion', 'ubicacion', 'latitud', 'longitud', 'fecha', 'estado'];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) reporte[campo] = req.body[campo];
    });

    if (req.file) {
      if (reporte.foto) {
        const anterior = path.join(__dirname, '..', '..', 'uploads', 'reportes', reporte.foto);
        fs.unlink(anterior, () => {});
      }
      reporte.foto = req.file.filename;
    }

    await reporte.save();
    const actualizado = await Reporte.findByPk(reporte.id, { include: includeRelaciones });
    return res.json({ ...actualizado.toJSON(), foto: actualizado.foto ? rutaPublica(req, actualizado.foto) : null });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/reportes/:id
async function eliminar(req, res, next) {
  try {
    const reporte = await Reporte.findByPk(req.params.id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado.' });

    if (!puedeModificar(req, reporte)) {
      return res.status(403).json({ error: 'No podés eliminar un reporte que no es tuyo.' });
    }

    if (reporte.foto) {
      const rutaFoto = path.join(__dirname, '..', '..', 'uploads', 'reportes', reporte.foto);
      fs.unlink(rutaFoto, () => {});
    }

    await reporte.destroy();
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
