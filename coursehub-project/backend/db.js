const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "18082005",
  database: "coursehub_escola",
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