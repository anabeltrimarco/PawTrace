const {
  DataTypes,
  Model,
} = require("sequelize");

const sequelize =
  require("../config/db");

class SightingPhoto extends Model {}

SightingPhoto.init(
  {
    // ========================================
    // ID
    // ========================================

    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    // ========================================
    // AVISTAMIENTO
    // ========================================

    sightingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "sighting_id",
    },

    // ========================================
    // URL PÚBLICA
    // ========================================

    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "image_url",
    },

    // ========================================
    // NOMBRE DEL ARCHIVO
    // ========================================

    storageKey: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "storage_key",
    },

    // ========================================
    // FOTO PRINCIPAL
    // ========================================

    isMain: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_main",
    },

    // ========================================
    // SOFT DELETE
    // ========================================

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },

  {
    sequelize,

    modelName:
      "SightingPhoto",

    tableName:
      "sighting_photos",

    timestamps:
      true,

    createdAt:
      "created_at",

    updatedAt:
      "updated_at",

    paranoid:
      true,

    deletedAt:
      "deleted_at",

    indexes: [
      {
        fields: [
          "sighting_id",
        ],
      },

      {
        fields: [
          "is_main",
        ],
      },
    ],
  }
);

module.exports =
  SightingPhoto;