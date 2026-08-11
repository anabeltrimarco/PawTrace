const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class Pet extends Model {}

Pet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    ownerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "owner_id",
    },

    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ENUM pet_species
    species: {
      type: DataTypes.ENUM("dog", "cat", "other"),
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

    // ENUM pet_size
    size: {
      type: DataTypes.ENUM(
        "small",
        "medium",
        "large",
        "unknown"
      ),
      allowNull: true,
    },

    // ENUM pet_gender
    gender: {
      type: DataTypes.ENUM(
        "male",
        "female",
        "unknown"
      ),
      allowNull: true,
    },

    ageText: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "age_text",
    },

    distinctiveFeatures: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "distinctive_features",
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    microchipNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "microchip_number",
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    sequelize,

    modelName: "Pet",

    tableName: "pets",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: "updated_at",

    paranoid: true,

    deletedAt: "deleted_at",
  }
);

module.exports = Pet;