const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Mascota extends Model {}

Mascota.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    especie: {
      type: DataTypes.STRING(50),
      allowNull: false, // ej: perro, gato, ave, otro
    },
    raza: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    edad: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tamano: {
      type: DataTypes.ENUM('chico', 'mediano', 'grande'),
      allowNull: true,
      field: 'tamano',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto: {
      type: DataTypes.STRING, // ruta/URL de la imagen
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('activa', 'perdida', 'encontrada'),
      allowNull: false,
      defaultValue: 'activa',
    },
    // Dueño registrado (opcional). Si no hay cuenta, se usan los campos de contacto de abajo.
    propietarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'propietario_id',
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
    // Contacto directo para reportes sin cuenta de usuario (flujo público del MVP).
    contactoNombre: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'contacto_nombre',
    },
    contactoTelefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'contacto_telefono',
    },
  },
  {
    sequelize,
    modelName: 'Mascota',
    tableName: 'mascotas',
  }
);

module.exports = Mascota;
