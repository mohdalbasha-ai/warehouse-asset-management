```tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "../api/client";

interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  roles: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");

    if (!raw || raw === "undefined" || raw === "null") {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem("user");
      return null;
    }

    return parsed as AuthUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  async function login(username: string, password: string) {
    const { data } = await api.post("/auth/login", {
      username,
      password,
    });

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    setUser(null);

    window.location.href = "/login";
  }

  function hasRole(role: string) {
    return (
      user?.roles?.includes(role) ||
      user?.roles?.includes("Super Admin") ||
      false
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
```
