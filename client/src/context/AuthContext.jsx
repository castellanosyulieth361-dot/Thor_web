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
    if (token) {
      localStorage.setItem("token", token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  async function login(numero_documento, password) {
    try {
      const res = await api.post("/auth/login", {
        numero_documento,
        password,
      });

      const token = res.data.token;
      
      // ✅ Usa token manual para /auth/me
      const profileRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setToken(token);
      setUser(profileRes.data.user);

      return profileRes.data.user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
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