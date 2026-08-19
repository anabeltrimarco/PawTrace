const {
  validationResult,
} = require("express-validator");

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

    // Nunca devolver datos sensibles
    // como passwordHash.
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
// HELPERS
// ======================================================

function esAdminOModerador(usuario) {
  if (!usuario) {
    return false;
  }

  const role =
    String(usuario.role || "")
      .toLowerCase();

  return (
    role === "admin" ||
    role === "moderator"
  );
}

function puedeModificar(
  req,
  report
) {
  if (!req.usuario) {
    return false;
  }

  // Administradores y moderadores.
  if (
    esAdminOModerador(
      req.usuario
    )
  ) {
    return true;
  }

  // Propietario del reporte.
  return (
    report.userId !== null &&
    String(report.userId) ===
      String(req.usuario.id)
  );
}

function puedeUsarMascota(
  req,
  pet
) {
  if (
    !req.usuario ||
    !pet
  ) {
    return false;
  }

  // Admin / moderador pueden operar
  // sobre cualquier mascota.
  if (
    esAdminOModerador(
      req.usuario
    )
  ) {
    return true;
  }

  // Usuario normal:
  // la mascota tiene que ser suya.
  return (
    pet.ownerId !== null &&
    pet.ownerId !== undefined &&
    String(pet.ownerId) ===
      String(req.usuario.id)
  );
}

// ======================================================
// GET /api/lost-reports
// PÚBLICO
// ======================================================

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

    if (req.query.petId) {
      where.petId =
        req.query.petId;
    }

    const reports =
      await LostReport.findAll({
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
    next(error);
  }
}

// ======================================================
// GET /api/lost-reports/mine
// SOLO REPORTES DEL USUARIO LOGUEADO
// ======================================================

async function listarMios(
  req,
  res,
  next
) {
  try {
    if (!req.usuario) {
      return res
        .status(401)
        .json({
          error:
            "Debés iniciar sesión para ver tus reportes.",
        });
    }

    const where = {
      userId:
        req.usuario.id,
    };

    // /mine?status=active
    // /mine?status=resolved
    if (req.query.status) {
      where.status =
        req.query.status;
    }

    const reports =
      await LostReport.findAll({
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
    next(error);
  }
}

// ======================================================
// GET /api/lost-reports/:id
// PÚBLICO
// ======================================================

async function obtener(
  req,
  res,
  next
) {
  try {
    const report =
      await LostReport.findByPk(
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
            "Reporte de mascota perdida no encontrado.",
        });
    }

    return res.json(
      report
    );
  } catch (error) {
    next(error);
  }
}

// ======================================================
// POST /api/lost-reports
// USUARIO LOGUEADO OBLIGATORIO
// ======================================================

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

    // ==========================================
    // AUTENTICACIÓN
    // ==========================================

    if (!req.usuario) {
      await transaction.rollback();

      return res
        .status(401)
        .json({
          error:
            "Debés iniciar sesión para publicar una mascota perdida.",
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

    // ==========================================
    // VALIDACIONES BÁSICAS
    // ==========================================

    if (!petId) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "petId es obligatorio.",
        });
    }

    if (
      !address ||
      !String(address).trim()
    ) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "La dirección es obligatoria.",
        });
    }

    // ==========================================
    // COMPROBAR MASCOTA
    // ==========================================

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

    // ==========================================
    // SEGURIDAD:
    // COMPROBAR PROPIETARIO DE LA MASCOTA
    // ==========================================

    if (
      !puedeUsarMascota(
        req,
        pet
      )
    ) {
      await transaction.rollback();

      return res
        .status(403)
        .json({
          error:
            "No podés crear un reporte para una mascota que no te pertenece.",
        });
    }

    // ==========================================
    // CREAR LOCATION
    // ==========================================

    const location =
      await Location.create(
        {
          address:
            String(
              address
            ).trim(),

          neighborhood:
            neighborhood
              ? String(
                  neighborhood
                ).trim()
              : null,

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

    // ==========================================
    // CREAR LOST REPORT
    // ==========================================

    const report =
      await LostReport.create(
        {
          petId:
            pet.id,

          // Nunca aceptamos userId
          // enviado por el frontend.
          // Siempre viene del JWT.
          userId:
            req.usuario.id,

          locationId:
            location.id,

          lastSeenAt:
            lastSeenAt ||
            null,

          contactName:
            contactName
              ? String(
                  contactName
                ).trim()
              : null,

          contactPhone:
            contactPhone
              ? String(
                  contactPhone
                ).trim()
              : null,

          contactEmail:
            contactEmail
              ? String(
                  contactEmail
                ).trim()
              : null,

          rewardAmount:
            rewardAmount !==
              undefined &&
            rewardAmount !==
              null &&
            rewardAmount !== ""
              ? rewardAmount
              : null,

          publicNotes:
            publicNotes
              ? String(
                  publicNotes
                ).trim()
              : null,

          internalNotes:
            internalNotes
              ? String(
                  internalNotes
                ).trim()
              : null,

          status:
            "active",
        },
        {
          transaction,
        }
      );

    await transaction.commit();

    committed = true;

    // ==========================================
    // DEVOLVER REPORTE COMPLETO
    // ==========================================

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
      } catch (
        rollbackError
      ) {
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

    // ==========================================
    // SEGURIDAD:
    // PROPIETARIO / ADMIN / MODERADOR
    // ==========================================

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

    // ==========================================
    // CAMPOS PERMITIDOS
    //
    // IMPORTANTE:
    // NO incluimos:
    // - id
    // - userId
    // - petId
    // - locationId
    //
    // Evita cambiar propietario/mascota
    // mediante mass assignment.
    // ==========================================

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

    // ==========================================
    // SEGURIDAD:
    // PROPIETARIO / ADMIN / MODERADOR
    // ==========================================

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
  listarMios,
  obtener,
  crear,
  actualizar,
  eliminar,
};