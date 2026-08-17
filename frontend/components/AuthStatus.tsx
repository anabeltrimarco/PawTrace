"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Usuario = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

export default function AuthStatus() {
  const pathname = usePathname();

  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [cargando, setCargando] =
    useState(true);

  useEffect(() => {
    let activo = true;

    async function cargarUsuario() {
      try {
        setCargando(true);

        const token =
          localStorage.getItem("token");

        if (!token) {
          if (activo) {
            setUsuario(null);
          }

          return;
        }

        const response =
          await fetch(
            `${API_URL}/auth/perfil`,
            {
              cache: "no-store",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (!response.ok) {
          console.error(
            "Perfil rechazado:",
            response.status
          );

          localStorage.removeItem(
            "token"
          );

          if (activo) {
            setUsuario(null);
          }

          return;
        }

        const data =
          await response.json();

        if (activo) {
          setUsuario(
            data.usuario || null
          );
        }
      } catch (error) {
        console.error(
          "Error obteniendo usuario:",
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

    cargarUsuario();

    return () => {
      activo = false;
    };
  }, [pathname]);

  function cerrarSesion() {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "usuario"
    );

    localStorage.removeItem(
      "user"
    );

    setUsuario(null);

    window.location.href = "/";
  }

  if (cargando) {
    return (
      <div
        style={{
          padding: "9px 18px",
          textAlign: "right",
          color: "#64748b",
          fontSize: "13px",
          background: "#ffffff",
          borderBottom:
            "1px solid #e7eeeb",
        }}
      >
        Verificando sesión...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "flex-end",
        flexWrap: "wrap",
        gap: "12px",
        padding: "9px 18px",
        background: "#ffffff",
        borderBottom:
          "1px solid #e7eeeb",
        fontSize: "14px",
      }}
    >
      {usuario ? (
        <>
          <span
            style={{
              color: "#334155",
            }}
          >
            👤{" "}
            <strong>
              {usuario.fullName ||
                usuario.email ||
                "Usuario"}
            </strong>
          </span>

          <button
            type="button"
            onClick={
              cerrarSesion
            }
            style={{
              border:
                "1px solid #d6e1dd",
              background:
                "#ffffff",
              color:
                "#475569",
              borderRadius:
                "8px",
              padding:
                "6px 11px",
              fontSize:
                "13px",
              fontWeight:
                600,
              cursor:
                "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <>
          <span
            style={{
              color: "#64748b",
            }}
          >
            No has iniciado sesión
          </span>

          <Link
            href="/login"
            style={{
              color:
                "#147d64",
              fontWeight:
                700,
              textDecoration:
                "none",
            }}
          >
            Iniciar sesión
          </Link>

          <Link
            href="/register"
            style={{
              color:
                "#147d64",
              fontWeight:
                700,
              textDecoration:
                "none",
            }}
          >
            Registrarse
          </Link>
        </>
      )}
    </div>
  );
}