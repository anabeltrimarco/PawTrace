const { Router } = require('express');
const { body } = require('express-validator');
const { listar, obtener, actualizar, eliminar } = require('../controllers/userController');
const { autenticar, autorizar } = require('../middleware/auth');

const router = Router();

router.use(autenticar);

router.get('/', autorizar('admin'), listar);
router.get('/:id', obtener);

router.put(
  '/:id',
  [
    body('nombre').optional().trim().notEmpty(),
    body('password').optional().isLength({ min: 6 }),
    body('rol').optional().isIn(['usuario', 'admin']),
  ],
  actualizar
);

router.delete('/:id', eliminar);

module.exports = router;
