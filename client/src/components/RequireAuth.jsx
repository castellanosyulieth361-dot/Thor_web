import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function RequireAuth({ children, onlyRole }) {
  const { isAuthed, user } = useContext(AuthContext);

  if (!isAuthed) return <Navigate to="/login" replace />;

  if (onlyRole && user?.rol !== onlyRole) {
    return <Navigate to={user?.rol === "admin" ? "/admin/dashboard" : "/colaborador/dashboard"} replace />;
  }

  return children;
}