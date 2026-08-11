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

    lostReportId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "lost_report_id",
    },

    foundReportId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "found_report_id",
    },

    score: {
      type: DataTypes.DECIMAL(
        5,
        2
      ),
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING(
        40
      ),
      allowNull: false,
      defaultValue:
        "pending",
    },

    aiReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "ai_reason",
    },

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

    indexes: [
      {
        unique: true,
        fields: [
          "lost_report_id",
          "found_report_id",
        ],
      },
    ],
  }
);

module.exports = Match;