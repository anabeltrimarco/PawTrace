"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FormEvent,
  useState,
} from "react";

import {
  register,
} from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  function getNextPath() {
    if (
      typeof window ===
      "undefined"
    ) {
      return "/";
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const next =
      params.get("next");

    if (
      next &&
      next.startsWith("/")
    ) {
      return next;
    }

    return "/";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const nombreLimpio =
      fullName.trim();

    const emailLimpio =
      email.trim();

    const telefonoLimpio =
      phone.trim();

    if (
      !nombreLimpio ||
      !emailLimpio ||
      !password
    ) {
      setError(
        "Completá nombre, email y contraseña."
      );

      return;
    }

    if (
      password.length < 6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    try {
      setIsSubmitting(true);

      const response =
        await register({
            nombre: nombreLimpio,
            email: emailLimpio,
            password,
            phone: telefonoLimpio || null,
        });
       

      if (!response.token) {
        throw new Error(
          response.message ||
            "No se pudo crear la cuenta."
        );
      }

      router.replace(
        getNextPath()
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Error registrando usuario:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No pudimos crear la cuenta."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        padding: "24px",
        background:
          "#f7faf9",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "440px",
          background:
            "#ffffff",
          border:
            "1px solid #e2ebe7",
          borderRadius:
            "22px",
          padding:
            "30px 28px",
          boxShadow:
            "0 18px 50px rgba(15, 60, 45, 0.08)",
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            marginBottom:
              "26px",
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              margin:
                "0 auto 12px",
              borderRadius:
                "18px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "#e9f8f1",
              fontSize:
                "30px",
            }}
          >
            🐾
          </div>

          <h1
            style={{
              margin: 0,
              fontSize:
                "27px",
              color:
                "#163d34",
            }}
          >
            Crear cuenta
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color:
                "#64748b",
              fontSize:
                "14px",
              lineHeight:
                1.5,
            }}
          >
            Registrate en PawTrace para
            publicar y administrar tus
            reportes.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom:
                "18px",
              padding:
                "12px 14px",
              borderRadius:
                "11px",
              background:
                "#fff5f5",
              border:
                "1px solid #fecaca",
              color:
                "#b91c1c",
              fontSize:
                "14px",
              fontWeight:
                600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div
            style={{
              marginBottom:
                "17px",
            }}
          >
            <label
              htmlFor="fullName"
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                fontSize:
                  "14px",
                fontWeight:
                  700,
                color:
                  "#334155",
              }}
            >
              Nombre y apellido
            </label>

            <input
              id="fullName"
              type="text"
              value={
                fullName
              }
              onChange={(
                event
              ) =>
                setFullName(
                  event.target
                    .value
                )
              }
              placeholder="Ej: Ana Pérez"
              required
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                border:
                  "1px solid #d6e1dd",
                borderRadius:
                  "11px",
                fontSize:
                  "15px",
              }}
            />
          </div>

          <div
            style={{
              marginBottom:
                "17px",
            }}
          >
            <label
              htmlFor="email"
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                fontSize:
                  "14px",
                fontWeight:
                  700,
                color:
                  "#334155",
              }}
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
              placeholder="tu@email.com"
              required
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                border:
                  "1px solid #d6e1dd",
                borderRadius:
                  "11px",
                fontSize:
                  "15px",
              }}
            />
          </div>

          <div
            style={{
              marginBottom:
                "17px",
            }}
          >
            <label
              htmlFor="phone"
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                fontSize:
                  "14px",
                fontWeight:
                  700,
                color:
                  "#334155",
              }}
            >
              Teléfono
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(
                event
              ) =>
                setPhone(
                  event.target
                    .value
                )
              }
              placeholder="Ej: 11 3248 3391"
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                border:
                  "1px solid #d6e1dd",
                borderRadius:
                  "11px",
                fontSize:
                  "15px",
              }}
            />
          </div>

          <div
            style={{
              marginBottom:
                "17px",
            }}
          >
            <label
              htmlFor="password"
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                fontSize:
                  "14px",
                fontWeight:
                  700,
                color:
                  "#334155",
              }}
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              placeholder="Mínimo 6 caracteres"
              required
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                border:
                  "1px solid #d6e1dd",
                borderRadius:
                  "11px",
                fontSize:
                  "15px",
              }}
            />
          </div>

          <div
            style={{
              marginBottom:
                "20px",
            }}
          >
            <label
              htmlFor="confirmPassword"
              style={{
                display:
                  "block",
                marginBottom:
                  "7px",
                fontSize:
                  "14px",
                fontWeight:
                  700,
                color:
                  "#334155",
              }}
            >
              Repetir contraseña
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={
                confirmPassword
              }
              onChange={(
                event
              ) =>
                setConfirmPassword(
                  event.target
                    .value
                )
              }
              placeholder="Repetí la contraseña"
              required
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "12px 14px",
                border:
                  "1px solid #d6e1dd",
                borderRadius:
                  "11px",
                fontSize:
                  "15px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            style={{
              width: "100%",
              padding:
                "12px 16px",
              border:
                "none",
              borderRadius:
                "11px",
              background:
                "#147d64",
              color:
                "#ffffff",
              fontSize:
                "15px",
              fontWeight:
                700,
              cursor:
                isSubmitting
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isSubmitting
                  ? 0.7
                  : 1,
            }}
          >
            {isSubmitting
              ? "Creando cuenta..."
              : "Crear cuenta"}
          </button>
        </form>

        <div
          style={{
            marginTop:
              "22px",
            paddingTop:
              "18px",
            borderTop:
              "1px solid #edf2f0",
            textAlign:
              "center",
            fontSize:
              "14px",
            color:
              "#64748b",
          }}
        >
          ¿Ya tenés cuenta?{" "}

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
        </div>

        <div
          style={{
            marginTop:
              "16px",
            textAlign:
              "center",
          }}
        >
          <Link
            href="/"
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              textDecoration:
                "none",
            }}
          >
            ← Volver a PawTrace
          </Link>
        </div>
      </section>
    </main>
  );
}