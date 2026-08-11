const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

require("dotenv").config();

// ==========================================
// ROUTES
// ==========================================

const authRoutes =
  require("./routes/authRoutes");

const userRoutes =
  require("./routes/userRoutes");

const petRoutes =
  require("./routes/petRoutes");

const lostReportRoutes =
  require("./routes/lostReportRoutes");

const foundReportRoutes =
  require("./routes/foundReportRoutes");

// AVISTAMIENTOS
const sightingRoutes =
  require("./routes/sightingRoutes");

// MOTOR DE COINCIDENCIAS
const matchRoutes =
  require("./routes/matchRoutes");

// ==========================================
// ERROR HANDLERS
// ==========================================

const {
  errorHandler,
  notFound,
} = require(
  "./middleware/errorHandler"
);

// ==========================================
// APP
// ==========================================

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

if (
  process.env.NODE_ENV !==
  "test"
) {
  app.use(morgan("dev"));
}

// ==========================================
// ARCHIVOS PÚBLICOS
// ==========================================

app.use(
  "/uploads",
  express.static(
    path.join(
      __dirname,
      "..",
      "uploads"
    )
  )
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",
      service:
        "powtrace-backend",
    });
  }
);

// ==========================================
// AUTENTICACIÓN / USUARIOS
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/usuarios",
  userRoutes
);

// ==========================================
// PAWTRACE
// ==========================================

app.use(
  "/api/pets",
  petRoutes
);

app.use(
  "/api/lost-reports",
  lostReportRoutes
);

app.use(
  "/api/found-reports",
  foundReportRoutes
);

// ==========================================
// AVISTAMIENTOS
// Sprint 1.4.4.1
// ==========================================

app.use(
  "/api/sightings",
  sightingRoutes
);

// ==========================================
// COINCIDENCIAS
// ==========================================

app.use(
  "/api/matches",
  matchRoutes
);

// ==========================================
// MANEJO DE ERRORES
// IMPORTANTE: SIEMPRE AL FINAL
// ==========================================

app.use(notFound);

app.use(errorHandler);

// ==========================================
// EXPORT
// ==========================================

module.exports = app;