const {
  Match,
} = require("../models");

const {
  generateCandidates,
} = require(
  "../services/matchCandidateService"
);

// ==========================================
// GET /api/matches/candidates
// ==========================================

async function listarCandidatos(
  req,
  res,
  next
) {
  try {
    const candidates =
      await generateCandidates();

    return res.json({
      total:
        candidates.length,

      candidates,
    });
  } catch (error) {
    console.error(
      "❌ Error generando candidatos:",
      error
    );

    next(error);
  }
}

// ==========================================
// GET /api/matches
// ==========================================

async function listarGuardados(
  req,
  res,
  next
) {
  try {
    const matches =
      await Match.findAll({
        order: [
          [
            "updated_at",
            "DESC",
          ],
        ],
      });

    return res.json(
      matches
    );
  } catch (error) {
    console.error(
      "❌ Error listando matches:",
      error
    );

    next(error);
  }
}

// ==========================================
// PATCH /api/matches/:id/status
// ==========================================

async function cambiarEstado(
  req,
  res,
  next
) {
  try {
    const {
      status,
    } = req.body;

    const allowedStatuses = [
      "pending",
      "possible",
      "rejected",
      "confirmed",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            "Estado de coincidencia inválido.",
        });
    }

    const match =
      await Match.findByPk(
        req.params.id
      );

    if (!match) {
      return res
        .status(404)
        .json({
          error:
            "Coincidencia no encontrada.",
        });
    }

    match.status =
      status;

    match.updatedAt =
      new Date();

    await match.save();

    console.log(
      "✅ Estado de coincidencia actualizado:",
      {
        matchId:
          match.id,

        status:
          match.status,
      }
    );

    return res.json({
      success: true,

      match,
    });
  } catch (error) {
    console.error(
      "❌ Error cambiando estado:",
      error
    );

    next(error);
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  listarCandidatos,
  listarGuardados,
  cambiarEstado,
};