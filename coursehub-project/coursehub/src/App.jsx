import { RouterProvider } from "react-router-dom";
import { Router } from "./routes/Router";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={Router} />
    </AuthProvider>
  );
}