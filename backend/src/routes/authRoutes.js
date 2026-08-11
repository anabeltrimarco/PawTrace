const { Router } = require('express');
const { body } = require('express-validator');
const { registrar, login, perfil } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

const router = Router();

router.post(
  '/registro',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
    body('email').isEmail().withMessage('Email inválido.'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  ],
  registrar
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido.'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
  ],
  login
);

router.get('/perfil', autenticar, perfil);

module.exports = router;
