const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/db");

class Location extends Model {}

Location.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    neighborhood: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    cityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "city_id",
    },

    provinceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "province_id",
    },

    latitude: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },

    longitude: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Location",
    tableName: "locations",

    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = Location;