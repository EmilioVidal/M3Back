// src/db.js
const sql    = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server:   process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port:     parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: true,            // si tu servidor lo requiere (Azure)
    trustServerCertificate: true // true para entornos de desarrollo
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function connectDB() {
  try {
    await sql.connect(config);
    console.log('✅ Conectado a SQL Server');
  } catch (err) {
    console.error('❌ Error al conectar con SQL Server:', err);
    process.exit(1);
  }
}

module.exports = { sql, connectDB };
