const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Reporte extends Model {}

Reporte.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.ENUM('perdido', 'encontrado', 'avistamiento'),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ubicacion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    latitud: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitud: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    foto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.ENUM('abierto', 'cerrado'),
      allowNull: false,
      defaultValue: 'abierto',
    },
    mascotaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'mascota_id',
      references: {
        model: 'mascotas',
        key: 'id',
      },
    },
    // Autor registrado (opcional). Los reportes públicos sin login quedan en null;
    // el contacto se obtiene de la mascota asociada.
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'usuario_id',
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Reporte',
    tableName: 'reportes',
  }
);

module.exports = Reporte;
