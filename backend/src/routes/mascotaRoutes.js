const { Router } = require('express');
const { body } = require('express-validator');
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/mascotaController');
const { autenticar, autenticarOpcional } = require('../middlewares/auth');
const { uploadMascota } = require('../middlewares/upload');

const router = Router();

router.get('/', listar);
router.get('/:id', obtener);

// Crear mascota: público (MVP sin login). Si viene un JWT válido, se usa como
// propietario registrado; si no, se exige nombre/teléfono de contacto.
router.post(
  '/',
  autenticarOpcional,
  uploadMascota.single('foto'),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
    body('especie').trim().notEmpty().withMessage('La especie es obligatoria.'),
  ],
  crear
);

// Editar/eliminar sigue requiriendo cuenta (dueño o admin).
router.put('/:id', autenticar, uploadMascota.single('foto'), actualizar);
router.delete('/:id', autenticar, eliminar);

module.exports = router;
