const {
  validationResult,
} = require("express-validator");

const {
  FoundReport,
  FoundReportPhoto,
  User,
  Location,
  sequelize,
} = require("../models");

// ==========================================
// INCLUDE COMÚN
// ==========================================

const reportIncludes = [
  {
    model: FoundReportPhoto,
    as: "photos",
    required: false,
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

// ==========================================
// GET /api/found-reports
// ==========================================

async function listar(
  req,
  res,
  next
) {
  try {
    const where = {};

    if (req.query.status) {
      where.status =
        req.query.status;
    }

    if (req.query.species) {
      where.species =
        req.query.species;
    }

    const reports =
      await FoundReport.findAll({
        where,

        include:
          reportIncludes,

        order: [
          [
            "created_at",
            "DESC",
          ],
        ],
      });

    return res.json(
      reports
    );
  } catch (error) {
    console.error(
      "Error listando found reports:",
      error
    );

    next(error);
  }
}

// ==========================================
// GET /api/found-reports/:id
// ==========================================

async function obtener(
  req,
  res,
  next
) {
  try {
    const report =
      await FoundReport.findByPk(
        req.params.id,
        {
          include:
            reportIncludes,
        }
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota encontrada no encontrado.",
        });
    }

    return res.json(
      report
    );
  } catch (error) {
    console.error(
      "Error obteniendo found report:",
      error
    );

    next(error);
  }
}

// ==========================================
// POST /api/found-reports
// ==========================================

async function crear(
  req,
  res,
  next
) {
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
      // MASCOTA ENCONTRADA
      species,
      breed,
      color,
      size,
      gender,
      description,

      // UBICACIÓN
      address,
      neighborhood,
      latitude,
      longitude,

      // REPORTE
      foundAt,
      contactName,
      contactPhone,
      contactEmail,
    } = req.body;

    // ======================================
    // VALIDACIONES
    // ======================================

    if (!species) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "La especie es obligatoria.",
        });
    }

    if (!address) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "La ubicación es obligatoria.",
        });
    }

    // ======================================
    // PASO 1
    // CREAR LOCATION
    // ======================================

    const location =
      await Location.create(
        {
          address,

          neighborhood:
            neighborhood ||
            null,

          latitude:
            latitude !==
              undefined &&
            latitude !==
              null &&
            latitude !== ""
              ? latitude
              : null,

          longitude:
            longitude !==
              undefined &&
            longitude !==
              null &&
            longitude !== ""
              ? longitude
              : null,
        },
        {
          transaction,
        }
      );

    // ======================================
    // PASO 2
    // CREAR FOUND REPORT
    // ======================================

    const report =
      await FoundReport.create(
        {
          userId:
            req.usuario
              ? req.usuario.id
              : null,

          locationId:
            location.id,

          species,

          breed:
            breed || null,

          color:
            color || null,

          size:
            size || null,

          gender:
            gender ||
            "unknown",

          foundAt:
            foundAt || null,

          contactName:
            contactName ||
            null,

          contactPhone:
            contactPhone ||
            null,

          contactEmail:
            contactEmail ||
            null,

          description:
            description ||
            null,

          status:
            "active",
        },
        {
          transaction,
        }
      );

    await transaction.commit();

    committed = true;

    // ======================================
    // DEVOLVER REPORTE COMPLETO
    // ======================================

    const completeReport =
      await FoundReport.findByPk(
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
      } catch (
        rollbackError
      ) {
        console.error(
          "Error haciendo rollback:",
          rollbackError
        );
      }
    }

    console.error(
      "Error creando found report:",
      error
    );

    next(error);
  }
}

// ==========================================
// PERMISOS
// ==========================================

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
    report.userId !==
      null &&
    report.userId ===
      req.usuario.id
  );
}

// ==========================================
// PUT /api/found-reports/:id
// ==========================================

async function actualizar(
  req,
  res,
  next
) {
  try {
    const report =
      await FoundReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota encontrada no encontrado.",
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
      "species",
      "breed",
      "color",
      "size",
      "gender",
      "description",
      "foundAt",
      "contactName",
      "contactPhone",
      "contactEmail",
      "status",
    ];

    campos.forEach(
      (campo) => {
        if (
          req.body[
            campo
          ] !==
          undefined
        ) {
          report[
            campo
          ] =
            req.body[
              campo
            ];
        }
      }
    );

    await report.save();

    const completeReport =
      await FoundReport.findByPk(
        report.id,
        {
          include:
            reportIncludes,
        }
      );

    return res.json(
      completeReport
    );
  } catch (error) {
    console.error(
      "Error actualizando found report:",
      error
    );

    next(error);
  }
}

// ==========================================
// DELETE /api/found-reports/:id
// ==========================================

async function eliminar(
  req,
  res,
  next
) {
  try {
    const report =
      await FoundReport.findByPk(
        req.params.id
      );

    if (!report) {
      return res
        .status(404)
        .json({
          error:
            "Reporte de mascota encontrada no encontrado.",
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
    console.error(
      "Error eliminando found report:",
      error
    );

    next(error);
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};