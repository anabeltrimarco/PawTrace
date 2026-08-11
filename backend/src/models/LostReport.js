const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class LostReport extends Model {}

LostReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    petId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "pet_id",
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

    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_seen_at",
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

    rewardAmount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      field: "reward_amount",
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

    publicNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "public_notes",
    },

    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "internal_notes",
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    sequelize,

    modelName: "LostReport",

    tableName: "lost_reports",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    paranoid: true,

    deletedAt: "deleted_at",
  }
);

module.exports = LostReport;