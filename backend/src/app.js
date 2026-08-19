const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
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

const sightingRoutes =
  require("./routes/sightingRoutes");

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
// RAILWAY / PROXY
// ==========================================

// Railway trabaja detrás de un proxy.
// Esto permite obtener correctamente
// la IP del cliente, especialmente para
// rate limiting.
app.set("trust proxy", 1);

// ==========================================
// HEADERS DE SEGURIDAD
// ==========================================

app.use(
  helmet({
    // Permitimos que imágenes públicas
    // puedan ser cargadas desde el frontend.
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// Oculta que usamos Express.
app.disable("x-powered-by");

// ==========================================
// CORS
// ==========================================

function obtenerOrigenesPermitidos() {
  const origenes = new Set();

  // URL principal del frontend.
  if (process.env.FRONTEND_URL) {
    origenes.add(
      process.env.FRONTEND_URL
        .trim()
        .replace(/\/$/, "")
    );
  }

  // Opcional:
  // permite varias URLs separadas por coma.
  //
  // Ejemplo:
  // FRONTEND_URLS=https://pawtrace.vercel.app,https://www.pawtrace.com
  if (process.env.FRONTEND_URLS) {
    process.env.FRONTEND_URLS
      .split(",")
      .map((url) =>
        url.trim().replace(/\/$/, "")
      )
      .filter(Boolean)
      .forEach((url) =>
        origenes.add(url)
      );
  }

  // Desarrollo local.
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    origenes.add(
      "http://localhost:3000"
    );

    origenes.add(
      "http://127.0.0.1:3000"
    );
  }

  return Array.from(origenes);
}

const origenesPermitidos =
  obtenerOrigenesPermitidos();

console.log(
  "🌐 CORS permitido para:",
  origenesPermitidos
);

const corsOptions = {
  origin(origin, callback) {
    // Requests sin Origin:
    // Postman, health checks,
    // llamadas servidor-servidor, etc.
    if (!origin) {
      return callback(
        null,
        true
      );
    }

    const origenNormalizado =
      origin.replace(/\/$/, "");

    if (
      origenesPermitidos.includes(
        origenNormalizado
      )
    ) {
      return callback(
        null,
        true
      );
    }

    console.warn(
      "⚠️ Origen CORS bloqueado:",
      origin
    );

    return callback(
      new Error(
        "Origen no permitido por CORS."
      )
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: false,

  optionsSuccessStatus: 204,
};

app.use(
  cors(corsOptions)
);

// ==========================================
// BODY PARSERS
// ==========================================

// Evita recibir JSON gigantes.
// Las imágenes se manejan mediante Multer,
// no mediante JSON.
app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// ==========================================
// LOGGING
// ==========================================

if (
  process.env.NODE_ENV ===
  "development"
) {
  app.use(
    morgan("dev")
  );
} else {
  // En producción usamos formato más corto
  // y no mostramos bodies ni secretos.
  app.use(
    morgan("combined")
  );
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
    ),
    {
      dotfiles: "deny",

      index: false,

      maxAge:
        process.env.NODE_ENV ===
        "production"
          ? "1d"
          : 0,
    }
  )
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (req, res) => {
    return res.status(200).json({
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
// MASCOTAS
// ==========================================

app.use(
  "/api/pets",
  petRoutes
);

// ==========================================
// REPORTES PERDIDOS
// ==========================================

app.use(
  "/api/lost-reports",
  lostReportRoutes
);

// ==========================================
// REPORTES ENCONTRADOS
// ==========================================

app.use(
  "/api/found-reports",
  foundReportRoutes
);

// ==========================================
// AVISTAMIENTOS
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

app.use(
  notFound
);

app.use(
  errorHandler
);

// ==========================================
// EXPORT
// ==========================================

module.exports = app;