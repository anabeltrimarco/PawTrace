require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
require('./models'); // registra asociaciones

const PORT = process.env.PORT || 5000;

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida correctamente.');

    const [dbInfo] = await sequelize.query(`
  SELECT
    current_database() AS database,
    current_schema() AS schema
`);

console.log(
  "🗄️ Backend conectado a:",
  dbInfo
);

    app.listen(PORT, () => {
      console.log(`Servidor PowTrace corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    process.exit(1);
  }
}

iniciar();
