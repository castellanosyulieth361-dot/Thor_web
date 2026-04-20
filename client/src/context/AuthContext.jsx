import { createContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/axios";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const isAuthed = Boolean(token);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  async function login(numero_documento, password) {
    const res = await api.post("/auth/login", {
      numero_documento,
      password,
    });

    setToken(res.data.token);
    setUser(res.data.user);

    return res.data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, isAuthed, login, logout, setUser }),
    [user, token, isAuthed]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}