const express =
  require("express");

const {
  listarCandidatos,
  listarGuardados,
  cambiarEstado,
} = require(
  "../controllers/matchController"
);

const router =
  express.Router();

// ==========================================
// CANDIDATOS IA
// ==========================================

router.get(
  "/candidates",
  listarCandidatos
);

// ==========================================
// MATCHES GUARDADOS
// ==========================================

router.get(
  "/",
  listarGuardados
);

// ==========================================
// CAMBIAR ESTADO
// ==========================================

router.patch(
  "/:id/status",
  cambiarEstado
);

module.exports =
  router;