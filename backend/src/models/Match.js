const {
  DataTypes,
  Model,
} = require("sequelize");

const sequelize =
  require("../config/db");

class Match extends Model {}

Match.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue:
        DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ==========================================
    // REPORTE PERDIDO
    // Siempre obligatorio
    // ==========================================

    lostReportId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "lost_report_id",
    },

    // ==========================================
    // REPORTE ENCONTRADO
    // Opcional
    // ==========================================

    foundReportId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "found_report_id",
    },

    // ==========================================
    // AVISTAMIENTO
    // Opcional
    // ==========================================

    sightingId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "sighting_id",
    },

    // ==========================================
    // SCORE
    // ==========================================

    score: {
      type: DataTypes.DECIMAL(
        5,
        2
      ),
      allowNull: true,
    },

    // ==========================================
    // ESTADO
    // ==========================================

    status: {
      type: DataTypes.STRING(
        40
      ),
      allowNull: false,
      defaultValue:
        "pending",
    },

    // ==========================================
    // EXPLICACIÓN IA
    // ==========================================

    aiReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "ai_reason",
    },

    // ==========================================
    // FECHAS
    // ==========================================

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue:
        DataTypes.NOW,
      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue:
        DataTypes.NOW,
      field: "updated_at",
    },
  },

  {
    sequelize,

    modelName:
      "Match",

    tableName:
      "matches",

    timestamps: false,

    // ==========================================
    // VALIDACIÓN
    //
    // Un Match debe apuntar:
    //
    // perdida + encontrada
    //          O
    // perdida + avistamiento
    //
    // Nunca a ambos.
    // ==========================================

    validate: {
      targetRequired() {
        const hasFound =
          Boolean(
            this.foundReportId
          );

        const hasSighting =
          Boolean(
            this.sightingId
          );

        if (
          !hasFound &&
          !hasSighting
        ) {
          throw new Error(
            "El match debe tener un reporte encontrado o un avistamiento."
          );
        }

        if (
          hasFound &&
          hasSighting
        ) {
          throw new Error(
            "El match no puede apuntar simultáneamente a un reporte encontrado y a un avistamiento."
          );
        }
      },
    },

    indexes: [
      {
        unique: true,
        name:
          "matches_lost_found_unique",

        fields: [
          "lost_report_id",
          "found_report_id",
        ],
      },

      {
        unique: true,
        name:
          "matches_lost_sighting_unique",

        fields: [
          "lost_report_id",
          "sighting_id",
        ],
      },
    ],
  }
);

module.exports = Match;