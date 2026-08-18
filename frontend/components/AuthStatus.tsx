"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

export default function AuthStatus() {
  const router = useRouter();

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [cargando, setCargando] =
    useState(true);

  // ==========================================
  // CARGAR USUARIO LOGUEADO
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function cargarUsuario() {
      try {
        const token =
          localStorage.getItem("token");

        if (!token) {
          if (activo) {
            setUsuario(null);
            setCargando(false);
          }

          return;
        }

        const response = await fetch(
          `${API_URL}/auth/perfil`,
          {
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

          if (activo) {
            setUsuario(null);
          }

          return;
        }

        const data: PerfilResponse =
          await response.json();

        if (activo) {
          setUsuario(data.usuario);
        }
      } catch (error) {
        console.error(
          "Error cargando usuario:",
          error
        );

        if (activo) {
          setUsuario(null);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    // Carga inicial
    cargarUsuario();

    // ==========================================
    // LOGIN / LOGOUT CAMBIÓ
    // ==========================================

    function handleAuthChanged() {
      if (!activo) {
        return;
      }

      setCargando(true);
      cargarUsuario();
    }

    // ==========================================
    // PERFIL CAMBIÓ
    // ==========================================

    function handlePerfilActualizado(
      event: Event
    ) {
      if (!activo) {
        return;
      }

      const customEvent =
        event as CustomEvent<Usuario>;

      if (customEvent.detail) {
        setUsuario(
          customEvent.detail
        );

        setCargando(false);

        return;
      }

      cargarUsuario();
    }

    // Escuchamos cambios de sesión.
    window.addEventListener(
      "auth-changed",
      handleAuthChanged
    );

    // Escuchamos cambios de perfil/avatar.
    window.addEventListener(
      "pawtrace:perfil-actualizado",
      handlePerfilActualizado
    );

    // También reaccionamos si el token cambia
    // desde otra pestaña del navegador.
    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key === "token"
      ) {
        handleAuthChanged();
      }
    }

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      activo = false;

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
    };
  }, []);

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  function cerrarSesion() {
    localStorage.removeItem(
      "token"
    );

    setUsuario(null);

    // Avisamos al resto de la app.
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
  // USUARIO NO LOGUEADO
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
  // USUARIO LOGUEADO
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
      {/* USUARIO */}

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

      {/* MI PERFIL */}

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

      {/* MIS REPORTES */}

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

      {/* CERRAR SESIÓN */}

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