const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { Pet, User } = require("../models");

// ==========================================
// GET /api/pets
// ==========================================

async function listar(req, res, next) {
  try {
    const where = {};

    if (req.query.species) {
      where.species = req.query.species;
    }

    if (req.query.ownerId) {
      where.ownerId = req.query.ownerId;
    }

    if (req.query.q) {
      const texto = `%${req.query.q}%`;

      where[Op.or] = [
        { name: { [Op.iLike]: texto } },
        { breed: { [Op.iLike]: texto } },
        { color: { [Op.iLike]: texto } },
        { distinctiveFeatures: { [Op.iLike]: texto } },
        { description: { [Op.iLike]: texto } },
        { microchipNumber: { [Op.iLike]: texto } },
      ];
    }

    const pets = await Pet.findAll({
      where,
      include: [
        {
          model: User,
          as: "owner",
          attributes: [
            "id",
            "fullName",
            "email",
            "phone",
            "avatarUrl",
          ],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json(pets);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/pets/:id
// ==========================================

async function obtener(req, res, next) {
  try {
    const pet = await Pet.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "owner",
          attributes: [
            "id",
            "fullName",
            "email",
            "phone",
            "avatarUrl",
          ],
          required: false,
        },
      ],
    });

    if (!pet) {
      return res.status(404).json({
        error: "Mascota no encontrada.",
      });
    }

    return res.json(pet);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/pets
// ==========================================

async function crear(req, res, next) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errores: errors.array(),
      });
    }

    const {
      name,
      species,
      breed,
      color,
      size,
      gender,
      ageText,
      distinctiveFeatures,
      description,
      microchipNumber,
    } = req.body;

    if (!species) {
      return res.status(400).json({
        error: "La especie es obligatoria.",
      });
    }

    const pet = await Pet.create({
      ownerId: req.usuario ? req.usuario.id : null,

      name: name || null,
      species,
      breed: breed || null,
      color: color || null,
      size: size || null,
      gender: gender || null,
      ageText: ageText || null,
      distinctiveFeatures:
        distinctiveFeatures || null,
      description: description || null,
      microchipNumber: microchipNumber || null,
    });

    return res.status(201).json(pet);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// PERMISOS
// ==========================================

function puedeModificar(req, pet) {
  if (!req.usuario) {
    return false;
  }

  if (
    req.usuario.role === "admin" ||
    req.usuario.role === "ADMIN"
  ) {
    return true;
  }

  return (
    pet.ownerId !== null &&
    pet.ownerId === req.usuario.id
  );
}

// ==========================================
// PUT /api/pets/:id
// ==========================================

async function actualizar(req, res, next) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errores: errors.array(),
      });
    }

    const pet = await Pet.findByPk(req.params.id);

    if (!pet) {
      return res.status(404).json({
        error: "Mascota no encontrada.",
      });
    }

    if (!puedeModificar(req, pet)) {
      return res.status(403).json({
        error: "No podés editar esta mascota.",
      });
    }

    const campos = [
      "name",
      "species",
      "breed",
      "color",
      "size",
      "gender",
      "ageText",
      "distinctiveFeatures",
      "description",
      "microchipNumber",
    ];

    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        pet[campo] = req.body[campo];
      }
    });

    await pet.save();

    return res.json(pet);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// DELETE /api/pets/:id
// ==========================================

async function eliminar(req, res, next) {
  try {
    const pet = await Pet.findByPk(req.params.id);

    if (!pet) {
      return res.status(404).json({
        error: "Mascota no encontrada.",
      });
    }

    if (!puedeModificar(req, pet)) {
      return res.status(403).json({
        error: "No podés eliminar esta mascota.",
      });
    }

    await pet.destroy();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};