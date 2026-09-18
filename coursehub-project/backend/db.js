require("dotenv").config();

const mysql = require("mysql2");

const databaseName =
  process.env.NODE_ENV === "test" && process.env.DB_NAME_TEST
    ? process.env.DB_NAME_TEST
    : process.env.DB_NAME;

if (process.env.NODE_ENV === "test" && !process.env.DB_NAME_TEST) {
  console.warn(
    "DB_NAME_TEST não definido: testes usarão DB_NAME (risco de poluir o banco de desenvolvimento)."
  );
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((error, connection) => {
  if (error) {
    console.log("Erro ao conectar no MySQL:", error.message);
    return;
  }

  console.log("Conectado ao MySQL!");
  connection.release();
});

module.exports = db;