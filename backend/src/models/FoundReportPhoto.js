const {
  DataTypes,
  Model,
} = require("sequelize");

const sequelize =
  require("../config/db");

class FoundReportPhoto extends Model {}

FoundReportPhoto.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue:
        DataTypes.UUIDV4,
      primaryKey: true,
    },

    foundReportId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "found_report_id",
    },

    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "image_url",
    },

    storageKey: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "storage_key",
    },

    isMain: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: "is_main",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue:
        DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,

    modelName:
      "FoundReportPhoto",

    tableName:
      "found_report_photos",

    timestamps: false,
  }
);

module.exports =
  FoundReportPhoto;