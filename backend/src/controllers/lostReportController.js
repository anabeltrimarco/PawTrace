const { validationResult } = require("express-validator");

const {
  LostReport,
  Pet,
  PetPhoto,
  User,
  Location,
  sequelize,
} = require("../models");

// ======================================================
// INCLUDE COMÚN
// ======================================================

const reportIncludes = [
  {
    model: Pet,
    as: "pet",
    include: [
      {
        model: PetPhoto,
        as: "photos",
        required: false,
      },
    ],
  },
  {
    model: User,
    as: "user",
    attributes: [
      "id",
      "fullName",
      "email",
      "phone",
      "avatarUrl",
    ],
    required: false,
  },
  {
    model: Location,
    as: "location",
    required: false,
  },
];

// ======================================================
// GET /api/lost-reports
// ======================================================

async function listar(req, res, next) {
  try {
    const where = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.petId) {
      where.petId = req.query.petId;
    }

    const reports = await LostReport.findAll({
      where,

      include: reportIncludes,

      order: [
        ["created_at", "DESC"],
      ],
    });

    return res.json(reports);
  } catch (error) {
    next(error);
  }
}

// ======================================================
// GET /api/lost-reports/:id
// ======================================================

async function obtener(req, res, next) {
  try {
    const report =
      await LostReport.findByPk(
        req.params.id,
        {
          include: reportIncludes,
        }
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota perdida no encontrado.",
        });
    }

    return res.json(report);
  } catch (error) {
    next(error);
  }
}

// ======================================================
// POST /api/lost-reports
// ======================================================

async function crear(req, res, next) {
  const transaction =
    await sequelize.transaction();

  let committed = false;

  try {
    const errors =
      validationResult(req);

    if (!errors.isEmpty()) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          errores:
            errors.array(),
        });
    }

    const {
      petId,

      // UBICACIÓN
      address,
      neighborhood,
      latitude,
      longitude,

      // REPORTE
      lastSeenAt,
      contactName,
      contactPhone,
      contactEmail,
      rewardAmount,
      publicNotes,
      internalNotes,
    } = req.body;

    // ==================================================
    // VALIDACIONES
    // ==================================================

    if (!petId) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "petId es obligatorio.",
        });
    }

    if (!address) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "La dirección es obligatoria.",
        });
    }

    // ==================================================
    // COMPROBAR MASCOTA
    // ==================================================

    const pet =
      await Pet.findByPk(
        petId,
        {
          transaction,
        }
      );

    if (!pet) {
      await transaction.rollback();

      return res
        .status(404)
        .json({
          error:
            "La mascota indicada no existe.",
        });
    }

    // ==================================================
    // PASO 1: CREAR LOCATION
    // ==================================================

    const location =
      await Location.create(
        {
          address,

          neighborhood:
            neighborhood || null,

          latitude:
            latitude !==
              undefined &&
            latitude !== null &&
            latitude !== ""
              ? latitude
              : null,

          longitude:
            longitude !==
              undefined &&
            longitude !== null &&
            longitude !== ""
              ? longitude
              : null,
        },
        {
          transaction,
        }
      );

    // ==================================================
    // PASO 2: CREAR LOST REPORT
    // ==================================================

    const report =
      await LostReport.create(
        {
          petId:
            pet.id,

          userId:
            req.usuario
              ? req.usuario.id
              : null,

          locationId:
            location.id,

          lastSeenAt:
            lastSeenAt || null,

          contactName:
            contactName || null,

          contactPhone:
            contactPhone || null,

          contactEmail:
            contactEmail || null,

          rewardAmount:
            rewardAmount || null,

          publicNotes:
            publicNotes || null,

          internalNotes:
            internalNotes || null,

          status:
            "active",
        },
        {
          transaction,
        }
      );

    await transaction.commit();

    committed = true;

    // ==================================================
    // DEVOLVER REPORTE COMPLETO
    // INCLUYE PET + PHOTOS + USER + LOCATION
    // ==================================================

    const completeReport =
      await LostReport.findByPk(
        report.id,
        {
          include:
            reportIncludes,
        }
      );

    return res
      .status(201)
      .json(
        completeReport
      );
  } catch (error) {
    if (!committed) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          "Error haciendo rollback:",
          rollbackError
        );
      }
    }

    next(error);
  }
}

// ======================================================
// PERMISOS
// ======================================================

function puedeModificar(
  req,
  report
) {
  if (!req.usuario) {
    return false;
  }

  if (
    req.usuario.role ===
      "admin" ||
    req.usuario.role ===
      "ADMIN" ||
    req.usuario.role ===
      "moderator"
  ) {
    return true;
  }

  return (
     report.userId !== null &&
    String(report.userId) === String(req.usuario.id)
  );
}

// ======================================================
// PUT /api/lost-reports/:id
// ======================================================

async function actualizar(
  req,
  res,
  next
) {
  try {
    const report =
      await LostReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota perdida no encontrado.",
        });
    }

    if (
      !puedeModificar(
        req,
        report
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "No podés editar este reporte.",
        });
    }

    const campos = [
      "lastSeenAt",
      "contactName",
      "contactPhone",
      "contactEmail",
      "rewardAmount",
      "publicNotes",
      "internalNotes",
      "status",
    ];

    campos.forEach(
      (campo) => {
        if (
          req.body[campo] !==
          undefined
        ) {
          report[campo] =
            req.body[campo];
        }
      }
    );

    await report.save();

    // Devolvemos también las relaciones
    // para mantener la respuesta consistente.

    const updatedReport =
      await LostReport.findByPk(
        report.id,
        {
          include:
            reportIncludes,
        }
      );

    return res.json(
      updatedReport
    );
  } catch (error) {
    next(error);
  }
}

// ======================================================
// DELETE /api/lost-reports/:id
// ======================================================

async function eliminar(
  req,
  res,
  next
) {
  try {
    const report =
      await LostReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota perdida no encontrado.",
        });
    }

    if (
      !puedeModificar(
        req,
        report
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "No podés eliminar este reporte.",
        });
    }

    await report.destroy();

    return res
      .status(204)
      .send();
  } catch (error) {
    next(error);
  }
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};