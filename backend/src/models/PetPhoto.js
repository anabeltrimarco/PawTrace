const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class PetPhoto extends Model {}

PetPhoto.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    petId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "pet_id",
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
  },
  {
    sequelize,
    modelName: "PetPhoto",
    tableName: "pet_photos",

    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,

    freezeTableName: true,
  }
);

module.exports = PetPhoto;