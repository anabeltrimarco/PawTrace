const {
  DataTypes,
  Model,
} = require("sequelize");

const sequelize =
  require("../config/db");

class Sighting extends Model {}

Sighting.init(
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
    // USUARIO
    // Puede ser null para permitir
    // avistamientos públicos.
    // ========================================

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
    },

    // ========================================
    // UBICACIÓN
    // ========================================

    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "location_id",
    },

    // ========================================
    // ESPECIE
    // ========================================

    species: {
      type: DataTypes.ENUM(
        "dog",
        "cat",
        "other"
      ),
      allowNull: false,
    },

    // ========================================
    // RAZA
    // Puede desconocerse.
    // ========================================

    breed: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ========================================
    // COLOR
    // ========================================

    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ========================================
    // TAMAÑO
    // ========================================

    size: {
      type: DataTypes.ENUM(
        "small",
        "medium",
        "large",
        "unknown"
      ),
      allowNull: true,
      defaultValue: "unknown",
    },

    // ========================================
    // SEXO
    // ========================================

    gender: {
      type: DataTypes.ENUM(
        "male",
        "female",
        "unknown"
      ),
      allowNull: true,
      defaultValue: "unknown",
    },

    // ========================================
    // FECHA/HORA DEL AVISTAMIENTO
    // ========================================

    sightedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sighted_at",
    },

    // ========================================
    // DESCRIPCIÓN
    // ========================================

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ========================================
    // DATOS DE CONTACTO
    // ========================================

    contactName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contact_name",
    },

    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contact_phone",
    },

    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contact_email",
    },

    // ========================================
    // ESTADO
    // ========================================

    status: {
      type: DataTypes.ENUM(
        "active",
        "resolved",
        "closed",
        "rejected"
      ),
      allowNull: false,
      defaultValue: "active",
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
      "Sighting",

    tableName:
      "sightings",

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
  }
);

module.exports =
  Sighting;