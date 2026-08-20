"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Usuario = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

type PerfilResponse = {
  usuario: Usuario;
};

const RAW_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const API_URL = RAW_API_URL.endsWith("/api")
  ? RAW_API_URL
  : `${RAW_API_URL}/api`;

export default function AuthStatus() {
  const router = useRouter();
  const pathname = usePathname();

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [cargando, setCargando] =
    useState(true);

  // ==========================================
  // CARGAR USUARIO ACTUAL
  // ==========================================

  const cargarUsuario = useCallback(async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setUsuario(null);
        setCargando(false);
        return;
      }

      setCargando(true);

      const response = await fetch(
        `${API_URL}/auth/perfil`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          cache: "no-store",
        }
      );

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem("token");
        }

        setUsuario(null);
        return;
      }

      const data: PerfilResponse =
        await response.json();

      setUsuario(data.usuario);
    } catch (error) {
      console.error(
        "Error cargando usuario:",
        error
      );

      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  // ==========================================
  // CARGA INICIAL + CAMBIO DE RUTA
  // ==========================================

  useEffect(() => {
    cargarUsuario();
  }, [pathname, cargarUsuario]);

  // ==========================================
  // EVENTOS DE AUTENTICACIÓN
  // ==========================================

  useEffect(() => {
    function handleAuthChanged() {
      cargarUsuario();
    }

    function handlePerfilActualizado(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<Usuario>;

      if (customEvent.detail) {
        setUsuario(customEvent.detail);
        setCargando(false);
      } else {
        cargarUsuario();
      }
    }

    function handleStorage(
      event: StorageEvent
    ) {
      if (event.key === "token") {
        cargarUsuario();
      }
    }

    function handleFocus() {
      cargarUsuario();
    }

    window.addEventListener(
      "auth-changed",
      handleAuthChanged
    );

    window.addEventListener(
      "pawtrace:perfil-actualizado",
      handlePerfilActualizado
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "auth-changed",
        handleAuthChanged
      );

      window.removeEventListener(
        "pawtrace:perfil-actualizado",
        handlePerfilActualizado
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [cargarUsuario]);

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  function cerrarSesion() {
    localStorage.removeItem("token");

    setUsuario(null);

    window.dispatchEvent(
      new Event("auth-changed")
    );

    router.push("/");
    router.refresh();
  }

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return null;
  }

  // ==========================================
  // NO LOGUEADO
  // ==========================================

  if (!usuario) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/login"
          style={{
            color: "#334155",
            textDecoration: "none",
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          Iniciar sesión
        </Link>

        <Link
          href="/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 14px",
            borderRadius: "9px",
            background: "#147d64",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  // ==========================================
  // LOGUEADO
  // ==========================================

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "14px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "#334155",
          fontWeight: 700,
        }}
      >
        {usuario.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usuario.avatarUrl}
            alt=""
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        ) : (
          <span aria-hidden="true">
            👤
          </span>
        )}

        <span>
          {usuario.fullName ||
            usuario.email ||
            "Usuario"}
        </span>
      </span>

      <Link
        href="/perfil"
        style={{
          color: "#147d64",
          fontWeight: 700,
          textDecoration: "none",
          padding: "6px 2px",
          whiteSpace: "nowrap",
        }}
      >
        Mi perfil
      </Link>

      <Link
        href="/mis-reportes"
        style={{
          color: "#147d64",
          fontWeight: 700,
          textDecoration: "none",
          padding: "6px 2px",
          whiteSpace: "nowrap",
        }}
      >
        🐾 Mis reportes
      </Link>

      <button
        type="button"
        onClick={cerrarSesion}
        style={{
          padding: "8px 14px",
          borderRadius: "9px",
          border: "1px solid #d5dfdc",
          background: "#ffffff",
          color: "#334155",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}