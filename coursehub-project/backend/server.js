/* ==========================================================
   COURSEHUB API
   Configuração inicial, middlewares globais e montagem de rotas.
   Toda a lógica de negócio vive em routes/ + services/.
   ========================================================== */

require("dotenv").config();

if (
  process.env.NODE_ENV === "production" &&
  process.env.PAYMENT_GATEWAY === "simulated"
) {
  throw new Error(
    "O gateway de pagamento simulado não pode ser utilizado em produção."
  );
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const publicCourseRoutes = require("./routes/publicCourseRoutes");
const publicUserRoutes = require("./routes/publicUserRoutes");

const studentCourseRoutes = require("./routes/studentCourseRoutes");
const studentProgressRoutes = require("./routes/studentProgressRoutes");
const studentFinanceRoutes = require("./routes/studentFinanceRoutes");
const studentContentRoutes = require("./routes/studentContentRoutes");
const studentActivityRoutes = require("./routes/studentActivityRoutes");
const studentCalendarRoutes = require("./routes/studentCalendarRoutes");

const teacherCourseRoutes = require("./routes/teacherCourseRoutes");
const teacherClassRoutes = require("./routes/teacherClassRoutes");
const teacherSessionRoutes = require("./routes/teacherSessionRoutes");
const teacherAttendanceRoutes = require("./routes/teacherAttendanceRoutes");
const teacherContentRoutes = require("./routes/teacherContentRoutes");
const teacherActivityRoutes = require("./routes/teacherActivityRoutes");
const teacherCalendarRoutes = require("./routes/teacherCalendarRoutes");
const teacherAttendanceHistoryRoutes = require("./routes/teacherAttendanceHistoryRoutes");
const teacherGradeRoutes = require("./routes/teacherGradeRoutes");
const teacherDashboardRoutes = require("./routes/teacherDashboardRoutes");

const adminStudentRoutes = require("./routes/adminStudentRoutes");
const adminTeacherRoutes = require("./routes/adminTeacherRoutes");
const adminCourseRoutes = require("./routes/adminCourseRoutes");
const adminClassRoutes = require("./routes/adminClassRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminEnrollmentRoutes = require("./routes/adminEnrollmentRoutes");
const adminContentRoutes = require("./routes/adminContentRoutes");
const adminActivityRoutes = require("./routes/adminActivityRoutes");
const adminGradeRoutes = require("./routes/adminGradeRoutes");
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes");
const adminFinancialRoutes = require("./routes/adminFinancialRoutes");
const adminCalendarRoutes = require("./routes/adminCalendarRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

/* ==========================================================
   MIDDLEWARES GLOBAIS
   ========================================================== */

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* ==========================================================
   ROTAS
   ========================================================== */

app.use("/api", authRoutes);
app.use("/api", profileRoutes);
app.use("/api", publicCourseRoutes);
app.use("/api", publicUserRoutes);

app.use("/api", studentCourseRoutes);
app.use("/api", studentProgressRoutes);
app.use("/api", studentFinanceRoutes);
app.use("/api", studentContentRoutes);
app.use("/api", studentActivityRoutes);
app.use("/api", studentCalendarRoutes);

app.use("/api", teacherCourseRoutes);
app.use("/api", teacherClassRoutes);
app.use("/api", teacherSessionRoutes);
app.use("/api", teacherAttendanceRoutes);
app.use("/api", teacherContentRoutes);
app.use("/api", teacherActivityRoutes);
app.use("/api", teacherCalendarRoutes);
app.use("/api", teacherAttendanceHistoryRoutes);
app.use("/api", teacherGradeRoutes);
app.use("/api", teacherDashboardRoutes);

app.use("/api", adminStudentRoutes);
app.use("/api", adminTeacherRoutes);
app.use("/api", adminCourseRoutes);
app.use("/api", adminClassRoutes);
app.use("/api", adminUserRoutes);
app.use("/api", adminEnrollmentRoutes);
app.use("/api", adminContentRoutes);
app.use("/api", adminActivityRoutes);
app.use("/api", adminGradeRoutes);
app.use("/api", adminAttendanceRoutes);
app.use("/api/admin/financial", adminFinancialRoutes);
app.use("/api/admin/calendar", adminCalendarRoutes);
app.use("/api", adminDashboardRoutes);

/* ==========================================================
   INICIALIZAÇÃO DA API
   ========================================================== */

app.listen(PORT, () => {
  console.log(`Servidor CourseHub rodando em http://localhost:${PORT}`);
});