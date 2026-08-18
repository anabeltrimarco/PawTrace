"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { API_URL } from "../../lib/api";

type ForgotPasswordResponse = {
  mensaje?: string;
  resetLink?: string;
  error?: string;
  errores?: Array<{
    msg?: string;
  }>;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (enviando) return;

    setMensaje("");
    setError("");
    setResetLink("");

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio) {
      setError("Ingresá tu email.");
      return;
    }

    try {
      setEnviando(true);

      const response = await fetch(
        `${API_URL}/auth/olvide-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: emailLimpio,
          }),
        }
      );

      const data =
        (await response.json()) as ForgotPasswordResponse;

      if (!response.ok) {
        let mensajeError =
          data.error ||
          "No se pudo procesar la solicitud.";

        if (Array.isArray(data.errores)) {
          const validaciones = data.errores
            .map((item) => item.msg)
            .filter(Boolean)
            .join(" ");

          if (validaciones) {
            mensajeError = validaciones;
          }
        }

        throw new Error(mensajeError);
      }

      setMensaje(
        data.mensaje ||
          "Si existe una cuenta con ese email, recibirás instrucciones para restablecer tu contraseña."
      );

      // Durante desarrollo el backend nos devuelve
      // el enlace para poder probar sin email real.
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
    } catch (err) {
      console.error(
        "Error recuperando contraseña:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo procesar la solicitud."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f7faf9",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          border: "1px solid #e2ebe7",
          borderRadius: "22px",
          padding: "30px 28px",
          boxShadow:
            "0 18px 50px rgba(15, 60, 45, 0.08)",
        }}
      >
        {/* LOGO */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              margin: "0 auto 12px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e9f8f1",
              fontSize: "28px",
            }}
          >
            🔐
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "26px",
              color: "#163d34",
            }}
          >
            Recuperar contraseña
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            Ingresá el email asociado a tu cuenta de
            PawTrace.
          </p>
        </div>

        {/* MENSAJE CORRECTO */}

        {mensaje && (
          <div
            style={{
              marginBottom: "18px",
              padding: "13px 14px",
              borderRadius: "11px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#047857",
              fontSize: "14px",
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            ✅ {mensaje}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "13px 14px",
              borderRadius: "11px",
              background: "#fff5f5",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* FORMULARIO */}

        <form onSubmit={handleSubmit}>
          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={enviando}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="tu@email.com"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                border: "1px solid #d6e1dd",
                borderRadius: "11px",
                outline: "none",
                fontSize: "15px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              borderRadius: "11px",
              background: "#147d64",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: enviando
                ? "not-allowed"
                : "pointer",
              opacity: enviando ? 0.7 : 1,
            }}
          >
            {enviando
              ? "Enviando..."
              : "Enviar instrucciones"}
          </button>
        </form>

        {/* ENLACE DE PRUEBA */}

        {resetLink && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              borderRadius: "12px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
            }}
          >
            <div
              style={{
                marginBottom: "6px",
                color: "#92400e",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              🧪 Prueba de recuperación
            </div>

            <p
              style={{
                margin: "0 0 12px",
                color: "#78350f",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              El envío real por email todavía no está
              conectado. Podés continuar la prueba
              usando este enlace.
            </p>

            <a
              href={resetLink}
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px",
                borderRadius: "9px",
                background: "#ffffff",
                border: "1px solid #f5c84c",
                color: "#8a4b08",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Crear nueva contraseña →
            </a>
          </div>
        )}

        {/* VOLVER */}

        <div
          style={{
            marginTop: "22px",
            paddingTop: "18px",
            borderTop: "1px solid #edf2f0",
            textAlign: "center",
            fontSize: "14px",
            color: "#64748b",
          }}
        >
          ¿Recordaste tu contraseña?{" "}

          <Link
            href="/login"
            style={{
              color: "#147d64",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Iniciar sesión
          </Link>
        </div>

        <div
          style={{
            marginTop: "15px",
            textAlign: "center",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#64748b",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            ← Volver a PawTrace
          </Link>
        </div>
      </section>
    </main>
  );
}