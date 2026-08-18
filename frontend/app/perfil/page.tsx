"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  API_URL,
  User,
  getAuthHeaders,
} from "../../lib/api";

type PerfilResponse = {
  usuario: User;
};

type ActualizarPerfilResponse = {
  mensaje?: string;
  usuario: User;
};

type AvatarResponse = {
  mensaje?: string;
  avatarUrl?: string;
  usuario: User;
};

export default function PerfilPage() {
  const [usuario, setUsuario] =
    useState<User | null>(null);

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [archivoAvatar, setArchivoAvatar] =
    useState<File | null>(null);

  const [previewAvatar, setPreviewAvatar] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [subiendoAvatar, setSubiendoAvatar] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  // ==========================================
  // CARGAR PERFIL
  // ==========================================

  useEffect(() => {
    async function cargarPerfil() {
      try {
        setCargando(true);
        setError("");

        const token =
          localStorage.getItem("token");

        if (!token) {
          window.location.href =
            "/login?next=/perfil";
          return;
        }

        const response = await fetch(
          `${API_URL}/auth/perfil`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as
            PerfilResponse & {
              error?: string;
            };

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudo cargar el perfil."
          );
        }

        setUsuario(data.usuario);

        setFullName(
          data.usuario.fullName || ""
        );

        setPhone(
          data.usuario.phone || ""
        );

        setAvatarUrl(
          data.usuario.avatarUrl || ""
        );
      } catch (err) {
        console.error(
          "Error cargando perfil:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el perfil."
        );
      } finally {
        setCargando(false);
      }
    }

    cargarPerfil();
  }, []);

  // ==========================================
  // LIMPIAR PREVIEW
  // ==========================================

  useEffect(() => {
    return () => {
      if (previewAvatar) {
        URL.revokeObjectURL(
          previewAvatar
        );
      }
    };
  }, [previewAvatar]);

  // ==========================================
  // ELEGIR AVATAR
  // ==========================================

  function elegirAvatar(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setMensaje("");

    const archivo =
      event.target.files?.[0];

    if (!archivo) {
      return;
    }

    const formatosPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !formatosPermitidos.includes(
        archivo.type
      )
    ) {
      setError(
        "La foto debe ser JPG, PNG o WEBP."
      );

      event.target.value = "";
      return;
    }

    const maximo =
      5 * 1024 * 1024;

    if (archivo.size > maximo) {
      setError(
        "La foto no puede superar los 5 MB."
      );

      event.target.value = "";
      return;
    }

    if (previewAvatar) {
      URL.revokeObjectURL(
        previewAvatar
      );
    }

    const preview =
      URL.createObjectURL(archivo);

    setArchivoAvatar(archivo);
    setPreviewAvatar(preview);
  }

  // ==========================================
  // SUBIR AVATAR
  // ==========================================

  async function subirAvatar() {
    if (!archivoAvatar) {
      setError(
        "Primero seleccioná una foto."
      );
      return;
    }

    try {
      setSubiendoAvatar(true);
      setError("");
      setMensaje("");

      const token =
        localStorage.getItem("token");

      if (!token) {
        window.location.href =
          "/login?next=/perfil";
        return;
      }

      const formData =
        new FormData();

      // IMPORTANTE:
      // "avatar" debe coincidir con:
      // avatarUpload.single("avatar")
      formData.append(
        "avatar",
        archivoAvatar
      );

      const response =
        await fetch(
          `${API_URL}/auth/perfil/avatar`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body: formData,
          }
        );

      const data =
        (await response.json()) as
          AvatarResponse & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo subir la foto."
        );
      }

      setUsuario(data.usuario);

      setAvatarUrl(
        data.usuario.avatarUrl ||
          data.avatarUrl ||
          ""
      );

      setArchivoAvatar(null);

      if (previewAvatar) {
        URL.revokeObjectURL(
          previewAvatar
        );
      }

      setPreviewAvatar("");

      setMensaje(
        data.mensaje ||
          "Foto de perfil actualizada correctamente."
      );

      // Actualizar AuthStatus.
      window.dispatchEvent(
        new CustomEvent(
          "pawtrace:perfil-actualizado",
          {
            detail: data.usuario,
          }
        )
      );
    } catch (err) {
      console.error(
        "Error subiendo avatar:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo subir la foto."
      );
    } finally {
      setSubiendoAvatar(false);
    }
  }

  // ==========================================
  // GUARDAR DATOS
  // ==========================================

  async function guardarPerfil(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (guardando) {
      return;
    }

    setError("");
    setMensaje("");

    const nombreLimpio =
      fullName.trim();

    if (!nombreLimpio) {
      setError(
        "El nombre no puede estar vacío."
      );
      return;
    }

    try {
      setGuardando(true);

      const response =
        await fetch(
          `${API_URL}/auth/perfil`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              ...getAuthHeaders(),
            },

            body: JSON.stringify({
              fullName:
                nombreLimpio,

              phone:
                phone.trim() ||
                null,

              // Conservamos el avatar
              // actualmente guardado.
              avatarUrl:
                avatarUrl || null,
            }),
          }
        );

      const data =
        (await response.json()) as
          ActualizarPerfilResponse & {
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo actualizar el perfil."
        );
      }

      setUsuario(
        data.usuario
      );

      setFullName(
        data.usuario.fullName ||
          ""
      );

      setPhone(
        data.usuario.phone ||
          ""
      );

      setAvatarUrl(
        data.usuario.avatarUrl ||
          ""
      );

      setMensaje(
        data.mensaje ||
          "Perfil actualizado correctamente."
      );

      window.dispatchEvent(
        new CustomEvent(
          "pawtrace:perfil-actualizado",
          {
            detail:
              data.usuario,
          }
        )
      );

      setTimeout(() => {
        window.location.href =
          "/";
      }, 1200);
    } catch (err) {
      console.error(
        "Error actualizando perfil:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el perfil."
      );
    } finally {
      setGuardando(false);
    }
  }

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <main
        className="container"
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
        }}
      >
        Cargando perfil...
      </main>
    );
  }

  // ==========================================
  // SIN USUARIO
  // ==========================================

  if (!usuario) {
    return (
      <main
        className="container"
        style={{
          paddingTop: "40px",
          paddingBottom: "50px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#147d64",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Volver
        </Link>

        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "12px",
            background: "#fff5f5",
            border:
              "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          ⚠️{" "}
          {error ||
            "No se pudo cargar el perfil."}
        </div>
      </main>
    );
  }

  const inicial =
    usuario.fullName
      ?.trim()
      ?.[0]
      ?.toUpperCase() ||
    "U";

  const imagenMostrada =
    previewAvatar ||
    avatarUrl;

  // ==========================================
  // UI
  // ==========================================

  return (
    <main
      className="container"
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        paddingTop: "32px",
        paddingBottom: "60px",
      }}
    >
      <Link
        href="/"
        style={{
          color: "#64748b",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        ← Volver
      </Link>

      <div
        style={{
          marginTop: "18px",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            margin: "0 0 6px",
            color: "#163d34",
          }}
        >
          Mi perfil
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
          }}
        >
          Administrá tus datos
          personales y de contacto.
        </p>
      </div>

      {/* PERFIL */}

      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          padding: "18px",
          marginBottom: "22px",
          background: "#f4fbf8",
          border:
            "1px solid #d9ebe5",
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#dcefe8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "34px",
            fontWeight: 800,
            color: "#147d64",
            flexShrink: 0,
          }}
        >
          {imagenMostrada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenMostrada}
              alt="Foto de perfil"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            inicial
          )}
        </div>

        <div>
          <h2
            style={{
              margin: "0 0 5px",
              color: "#163d34",
              fontSize: "21px",
            }}
          >
            {usuario.fullName}
          </h2>

          <div
            style={{
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            {usuario.email}
          </div>

          {usuario.phone && (
            <div
              style={{
                marginTop: "4px",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              📞 {usuario.phone}
            </div>
          )}
        </div>
      </section>

      {/* MENSAJES */}

      {mensaje && (
        <div
          role="status"
          style={{
            marginBottom: "18px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "#f0fdf4",
            border:
              "1px solid #bbf7d0",
            color: "#047857",
            fontWeight: 700,
          }}
        >
          ✅ {mensaje}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "18px",
            padding: "14px 16px",
            borderRadius: "12px",
            background: "#fff5f5",
            border:
              "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* FOTO */}

      <section
        style={{
          background: "#ffffff",
          border:
            "1px solid #e2ebe7",
          borderRadius: "18px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            margin: "0 0 6px",
            color: "#163d34",
          }}
        >
          📷 Foto de perfil
        </h3>

        <p
          style={{
            margin:
              "0 0 18px",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          Elegí una foto JPG, PNG o
          WEBP de hasta 5 MB.
        </p>

        <input
          id="avatar"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={elegirAvatar}
          disabled={subiendoAvatar}
        />

        {archivoAvatar && (
          <div
            style={{
              marginTop: "14px",
              color: "#475569",
              fontSize: "14px",
            }}
          >
            Archivo:{" "}
            <strong>
              {archivoAvatar.name}
            </strong>
          </div>
        )}

        {previewAvatar && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                overflow: "hidden",
                border:
                  "2px solid #d9ebe5",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewAvatar}
                alt="Vista previa"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            <span
              style={{
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Vista previa
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={subirAvatar}
          disabled={
            !archivoAvatar ||
            subiendoAvatar
          }
          style={{
            marginTop: "18px",
            border: "none",
            padding: "10px 16px",
            borderRadius: "10px",
            background: "#147d64",
            color: "#ffffff",
            fontWeight: 700,
            cursor:
              !archivoAvatar ||
              subiendoAvatar
                ? "not-allowed"
                : "pointer",
            opacity:
              !archivoAvatar ||
              subiendoAvatar
                ? 0.6
                : 1,
          }}
        >
          {subiendoAvatar
            ? "Subiendo foto..."
            : "Subir foto"}
        </button>
      </section>

      {/* DATOS PERSONALES */}

      <form
        onSubmit={guardarPerfil}
        style={{
          background: "#ffffff",
          border:
            "1px solid #e2ebe7",
          borderRadius: "18px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px",
            color: "#163d34",
          }}
        >
          Datos personales
        </h3>

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            htmlFor="fullName"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Nombre completo
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            disabled={guardando}
            onChange={(event) =>
              setFullName(
                event.target.value
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

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
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            value={usuario.email}
            disabled
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #d6e1dd",
              borderRadius: "10px",
              background: "#f8faf9",
              color: "#64748b",
            }}
          />

          <small
            style={{
              display: "block",
              marginTop: "6px",
              color: "#64748b",
            }}
          >
            El email no se modifica
            desde esta pantalla.
          </small>
        </div>

        <div
          style={{
            marginBottom: "22px",
          }}
        >
          <label
            htmlFor="phone"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Teléfono
          </label>

          <input
            id="phone"
            type="tel"
            value={phone}
            disabled={guardando}
            onChange={(event) =>
              setPhone(
                event.target.value
              )
            }
            placeholder="Ej: 11 1234 5678"
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={guardando}
          style={{
            border: "none",
            padding: "11px 18px",
            borderRadius: "10px",
            background: "#147d64",
            color: "#ffffff",
            fontWeight: 700,
            cursor: guardando
              ? "not-allowed"
              : "pointer",
            opacity:
              guardando
                ? 0.65
                : 1,
          }}
        >
          {guardando
            ? "Guardando..."
            : "Guardar cambios"}
        </button>
      </form>
    </main>
  );
}