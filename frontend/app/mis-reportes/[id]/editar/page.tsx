"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  LostReport,
  actualizarLostReport,
  listarMisLostReports,
} from "../../../../lib/api";

function convertirFecha(value?: string | null) {
  if (!value) return "";

  const fecha = new Date(value);

  if (Number.isNaN(fecha.getTime())) {
    return "";
  }

  return fecha.toISOString().slice(0, 10);
}

export default function EditarReportePage() {
  const router = useRouter();
  const params = useParams();

  const reportId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [reporte, setReporte] = useState<LostReport | null>(null);

  const [fecha, setFecha] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [recompensa, setRecompensa] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // ==========================================
  // CARGAR REPORTE
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function cargarReporte() {
      try {
        setCargando(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          router.replace("/login?next=/mis-reportes");
          return;
        }

        if (!reportId) {
          setError("No se encontró el reporte.");
          return;
        }

        const reportes = await listarMisLostReports();

        const encontrado = reportes.find(
          (item) => item.id === reportId
        );

        if (!encontrado) {
          setError(
            "El reporte no existe o no pertenece a tu usuario."
          );
          return;
        }

        if (!activo) return;

        setReporte(encontrado);

        setFecha(convertirFecha(encontrado.lastSeenAt));

        setNombreContacto(
          encontrado.contactName || ""
        );

        setTelefono(
          encontrado.contactPhone || ""
        );

        setEmail(
          encontrado.contactEmail || ""
        );

        setRecompensa(
          encontrado.rewardAmount !== null &&
            encontrado.rewardAmount !== undefined
            ? String(encontrado.rewardAmount)
            : ""
        );

        setDescripcion(
          encontrado.publicNotes || ""
        );
      } catch (err) {
        console.error(
          "Error cargando reporte:",
          err
        );

        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el reporte."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarReporte();

    return () => {
      activo = false;
    };
  }, [reportId, router]);

  // ==========================================
  // GUARDAR CAMBIOS
  // ==========================================

  async function guardarCambios(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reporte) return;

    setError("");
    setMensaje("");

    let rewardAmount: number | null = null;

    if (recompensa.trim() !== "") {
      const numero = Number(recompensa);

      if (!Number.isFinite(numero) || numero < 0) {
        setError(
          "Ingresá un importe de recompensa válido."
        );
        return;
      }

      rewardAmount = numero;
    }

    try {
      setGuardando(true);

      await actualizarLostReport(
        reporte.id,
        {
          lastSeenAt: fecha
            ? `${fecha}T12:00:00`
            : null,

          contactName:
            nombreContacto.trim() || null,

          contactPhone:
            telefono.trim() || null,

          contactEmail:
            email.trim() || null,

          rewardAmount,

          publicNotes:
            descripcion.trim() || null,
        }
      );

      // Mensaje visible de confirmación
      setMensaje(
        "Reporte actualizado correctamente."
      );

      // Volver automáticamente a Mis reportes
      setTimeout(() => {
        router.push("/mis-reportes");
      }, 1200);
    } catch (err) {
      console.error(
        "Error actualizando reporte:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios."
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
          padding: "50px 20px",
          textAlign: "center",
          color: "#64748b",
        }}
      >
        Cargando reporte...
      </main>
    );
  }

  // ==========================================
  // REPORTE NO ENCONTRADO
  // ==========================================

  if (!reporte) {
    return (
      <main
        className="container"
        style={{
          paddingTop: "40px",
          paddingBottom: "50px",
        }}
      >
        <Link
          href="/mis-reportes"
          style={{
            color: "#147d64",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Volver a Mis reportes
        </Link>

        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "12px",
            background: "#fff5f5",
            border: "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          ⚠️ {error || "No se encontró el reporte."}
        </div>
      </main>
    );
  }

  const nombreMascota =
    reporte.pet?.name || "Mascota";

  const raza =
    reporte.pet?.breed || "";

  const ubicacion =
    reporte.location?.address ||
    reporte.location?.neighborhood ||
    "Sin ubicación registrada";

  // ==========================================
  // PANTALLA
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
        href="/mis-reportes"
        style={{
          color: "#147d64",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        ← Volver a Mis reportes
      </Link>

      <div
        style={{
          marginTop: "20px",
          marginBottom: "25px",
        }}
      >
        <h1
          style={{
            margin: "0 0 7px",
            color: "#163d34",
          }}
        >
          Editar reporte
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
          }}
        >
          Actualizá la información del reporte de{" "}
          <strong>{nombreMascota}</strong>.
        </p>
      </div>

      {/* RESUMEN */}

      <div
        style={{
          background: "#f4fbf8",
          border: "1px solid #d9ebe5",
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <strong
          style={{
            color: "#163d34",
            fontSize: "18px",
          }}
        >
          🐾 {nombreMascota}
        </strong>

        {raza && (
          <div
            style={{
              marginTop: "5px",
              color: "#64748b",
            }}
          >
            {raza}
          </div>
        )}

        <div
          style={{
            marginTop: "6px",
            color: "#64748b",
          }}
        >
          📍 {ubicacion}
        </div>
      </div>

      {/* MENSAJE DE ÉXITO */}

      {mensaje && (
        <div
          role="status"
          style={{
            padding: "15px 17px",
            marginBottom: "18px",
            borderRadius: "12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#047857",
            fontWeight: 700,
          }}
        >
          ✅ {mensaje}
          <div
            style={{
              marginTop: "4px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Volviendo a Mis reportes...
          </div>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            marginBottom: "18px",
            borderRadius: "12px",
            background: "#fff5f5",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* FORMULARIO */}

      <form
        onSubmit={guardarCambios}
        style={{
          background: "#ffffff",
          border: "1px solid #e2ebe7",
          borderRadius: "18px",
          padding: "24px",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <label
            htmlFor="fecha"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Fecha de pérdida
          </label>

          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) =>
              setFecha(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label
            htmlFor="nombreContacto"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Nombre de contacto
          </label>

          <input
            id="nombreContacto"
            type="text"
            value={nombreContacto}
            onChange={(e) =>
              setNombreContacto(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label
            htmlFor="telefono"
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
            id="telefono"
            type="tel"
            value={telefono}
            onChange={(e) =>
              setTelefono(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
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
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label
            htmlFor="recompensa"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Recompensa
          </label>

          <input
            id="recompensa"
            type="number"
            min="0"
            value={recompensa}
            onChange={(e) =>
              setRecompensa(e.target.value)
            }
            placeholder="Ej: 50000"
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d6e1dd",
              borderRadius: "10px",
            }}
          />
        </div>

        <div style={{ marginBottom: "22px" }}>
          <label
            htmlFor="descripcion"
            style={{
              display: "block",
              marginBottom: "7px",
              fontWeight: 700,
              color: "#163d34",
            }}
          >
            Descripción
          </label>

          <textarea
            id="descripcion"
            rows={5}
            value={descripcion}
            onChange={(e) =>
              setDescripcion(e.target.value)
            }
            placeholder="Información útil sobre la mascota..."
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d6e1dd",
              borderRadius: "10px",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            disabled={guardando || Boolean(mensaje)}
            style={{
              border: "none",
              padding: "11px 18px",
              borderRadius: "10px",
              background: "#147d64",
              color: "#ffffff",
              fontWeight: 700,
              cursor:
                guardando || mensaje
                  ? "not-allowed"
                  : "pointer",
              opacity:
                guardando || mensaje
                  ? 0.65
                  : 1,
            }}
          >
            {guardando
              ? "Guardando..."
              : mensaje
                ? "✓ Guardado"
                : "Guardar cambios"}
          </button>

          <Link
            href="/mis-reportes"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid #d6e1dd",
              color: "#475569",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}