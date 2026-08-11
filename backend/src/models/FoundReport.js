const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class FoundReport extends Model {}

FoundReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
    },

    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "location_id",
    },

    species: {
      type: DataTypes.ENUM(
        "dog",
        "cat",
        "other"
      ),
      allowNull: false,
    },

    breed: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    size: {
      type: DataTypes.ENUM(
        "small",
        "medium",
        "large",
        "unknown"
      ),
      allowNull: true,
    },

    gender: {
      type: DataTypes.ENUM(
        "male",
        "female",
        "unknown"
      ),
      allowNull: true,
    },

    foundAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "found_at",
    },

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

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

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

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    sequelize,

    modelName: "FoundReport",

    tableName: "found_reports",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    paranoid: true,

    deletedAt: "deleted_at",
  }
);

module.exports = FoundReport;