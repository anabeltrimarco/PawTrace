// Script para crear/actualizar las tablas en PostgreSQL a partir de los modelos.
// Uso: npm run db:sync
const sequelize = require('./db');
require('../models'); // registra todos los modelos y asociaciones

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL exitosa.');

    // alter: true actualiza las tablas existentes sin borrarlas.
    // Usar { force: true } SOLO en desarrollo para recrear todo desde cero.
    await sequelize.sync({ alter: true });
    console.log('Modelos sincronizados con la base de datos.');
    process.exit(0);
  } catch (error) {
    console.error('Error al sincronizar la base de datos:', error);
    process.exit(1);
  }
})();
