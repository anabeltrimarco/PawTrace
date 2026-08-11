const { Router } = require('express');
const { body } = require('express-validator');
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/reporteController');
const { autenticar, autenticarOpcional } = require('../middlewares/auth');
const { uploadReporte } = require('../middlewares/upload');

const router = Router();

router.get('/', listar);
router.get('/:id', obtener);

// Crear reporte: público (MVP sin login), igual que mascotas.
router.post(
  '/',
  autenticarOpcional,
  uploadReporte.single('foto'),
  [
    body('mascotaId').isUUID().withMessage('mascotaId debe ser un UUID válido.'),
    body('tipo').isIn(['perdido', 'encontrado', 'avistamiento']).withMessage('Tipo de reporte inválido.'),
    body('descripcion').trim().notEmpty().withMessage('La descripción es obligatoria.'),
  ],
  crear
);

router.put('/:id', autenticar, uploadReporte.single('foto'), actualizar);
router.delete('/:id', autenticar, eliminar);

module.exports = router;
