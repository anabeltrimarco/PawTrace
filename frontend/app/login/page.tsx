"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  login,
} from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  // ==========================================
  // DESTINO DESPUÉS DEL LOGIN
  // ==========================================

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

  // ==========================================
  // SI YA ESTÁ LOGUEADO
  // ==========================================

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      router.replace(
        getNextPath()
      );
    }
  }, [router]);

  // ==========================================
  // LOGIN
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");

    const emailLimpio =
      email.trim();

    if (
      !emailLimpio ||
      !password
    ) {
      setError(
        "Ingresá tu email y contraseña."
      );

      return;
    }

    try {
      setIsSubmitting(true);

      const response =
        await login({
          email:
            emailLimpio,

          password,
        });

      if (!response.token) {
        throw new Error(
          response.message ||
            "No se pudo iniciar sesión."
        );
      }
     
      window.dispatchEvent(
      new Event("auth-changed")
      );

      router.replace(
        getNextPath()
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Error iniciando sesión:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No pudimos iniciar sesión."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // UI
  // ==========================================

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

          maxWidth: "420px",

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
        {/* LOGO / MARCA */}

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
            Iniciar sesión
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
            Ingresá a PawTrace para
            publicar y administrar tus
            reportes.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
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

        {/* FORMULARIO */}

        <form
          onSubmit={
            handleSubmit
          }
        >
          {/* EMAIL */}

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
              disabled={
                isSubmitting
              }
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
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "12px 14px",

                border:
                  "1px solid #d6e1dd",

                borderRadius:
                  "11px",

                outline:
                  "none",

                fontSize:
                  "15px",

                background:
                  isSubmitting
                    ? "#f8faf9"
                    : "#ffffff",
              }}
            />
          </div>

          {/* PASSWORD */}

          <div
            style={{
              marginBottom:
                "10px",
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
              autoComplete="current-password"
              value={password}
              disabled={
                isSubmitting
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              placeholder="Tu contraseña"
              required
              style={{
                width:
                  "100%",

                boxSizing:
                  "border-box",

                padding:
                  "12px 14px",

                border:
                  "1px solid #d6e1dd",

                borderRadius:
                  "11px",

                outline:
                  "none",

                fontSize:
                  "15px",

                background:
                  isSubmitting
                    ? "#f8faf9"
                    : "#ffffff",
              }}
            />
          </div>

          {/* OLVIDÉ CONTRASEÑA */}

          <div
            style={{
              textAlign:
                "right",

              marginBottom:
                "18px",
            }}
          >
            <Link
              href="/forgot-password"
              style={{
                color:
                  "#147d64",

                fontSize:
                  "13px",

                fontWeight:
                  700,

                textDecoration:
                  "none",
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* BOTÓN */}

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            style={{
              width:
                "100%",

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
              ? "Ingresando..."
              : "Iniciar sesión"}
          </button>
        </form>

        {/* REGISTRO */}

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
          ¿Todavía no tenés cuenta?{" "}

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
            Registrate
          </Link>
        </div>

        {/* VOLVER */}

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