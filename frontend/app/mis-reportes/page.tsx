"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LostReport,
  listarMisLostReports,
  actualizarLostReport,
  eliminarLostReport,
} from "../../lib/api";

type Filtro =
  | "all"
  | "active"
  | "resolved";

// ==========================================
// FOTO PRINCIPAL
// ==========================================

function getPetImage(
  report: LostReport
) {
  const photos =
    report.pet?.photos || [];

  const main =
    photos.find(
      (photo) =>
        photo.isMain === true
    ) || photos[0];

  return main?.imageUrl || null;
}

// ==========================================
// RECOMPENSA
// ==========================================

function formatReward(
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const amount =
    Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}

// ==========================================
// FECHA
// ==========================================

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Sin fecha";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "es-AR"
  );
}

// ==========================================
// PÁGINA
// ==========================================

export default function MisReportesPage() {
  const router =
    useRouter();

  const [
    reportes,
    setReportes,
  ] =
    useState<LostReport[]>(
      []
    );

  const [
    filtro,
    setFiltro,
  ] =
    useState<Filtro>(
      "all"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(null);

  // ==========================================
  // CARGAR REPORTES DEL USUARIO
  // ==========================================

  const cargarReportes =
    useCallback(
      async () => {
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

        if (!token) {
          router.replace(
            "/login?next=/mis-reportes"
          );

          return;
        }

        try {
          setLoading(true);
          setError("");

          const data =
            await listarMisLostReports();

          setReportes(
            data
          );
        } catch (err) {
          console.error(
            "Error cargando mis reportes:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar tus reportes."
          );
        } finally {
          setLoading(false);
        }
      },
      [router]
    );

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const activos =
    useMemo(
      () =>
        reportes.filter(
          (report) =>
            report.status ===
            "active"
        ),
      [reportes]
    );

  const resueltos =
    useMemo(
      () =>
        reportes.filter(
          (report) =>
            report.status ===
            "resolved"
        ),
      [reportes]
    );

  // ==========================================
  // FILTRO
  // ==========================================

  const visibles =
    useMemo(() => {
      if (
        filtro ===
        "active"
      ) {
        return activos;
      }

      if (
        filtro ===
        "resolved"
      ) {
        return resueltos;
      }

      return reportes;
    }, [
      filtro,
      reportes,
      activos,
      resueltos,
    ]);

  // ==========================================
  // MARCAR COMO ENCONTRADA
  // ==========================================

  async function marcarComoEncontrada(
    report: LostReport
  ) {
    const nombre =
      report.pet?.name ||
      "esta mascota";

    const confirmado =
      window.confirm(
        `¿Confirmás que ${nombre} ya apareció?\n\nEl reporte pasará a Resuelto.`
      );

    if (!confirmado) {
      return;
    }

    try {
      setProcessingId(
        report.id
      );

      setError("");

      await actualizarLostReport(
        report.id,
        {
          status:
            "resolved",
        }
      );

      setReportes(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id ===
              report.id
                ? {
                    ...item,
                    status:
                      "resolved",
                  }
                : item
          )
      );
    } catch (err) {
      console.error(
        "Error cerrando reporte:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el reporte."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }

  // ==========================================
  // ELIMINAR
  // ==========================================

  async function eliminar(
    report: LostReport
  ) {
    const nombre =
      report.pet?.name ||
      "esta mascota";

    const confirmado =
      window.confirm(
        `¿Seguro que querés eliminar el reporte de ${nombre}?\n\nEsta acción no se puede deshacer.`
      );

    if (!confirmado) {
      return;
    }

    try {
      setProcessingId(
        report.id
      );

      setError("");

      await eliminarLostReport(
        report.id
      );

      setReportes(
        (actuales) =>
          actuales.filter(
            (item) =>
              item.id !==
              report.id
          )
      );
    } catch (err) {
      console.error(
        "Error eliminando reporte:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el reporte."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main
        className="container"
        style={{
          minHeight:
            "60vh",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          color:
            "#64748b",
        }}
      >
        Cargando tus reportes...
      </main>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <main
      className="container"
      style={{
        paddingTop:
          "32px",
        paddingBottom:
          "50px",
      }}
    >
      {/* CABECERA */}

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: "16px",
          flexWrap:
            "wrap",
          marginBottom:
            "28px",
        }}
      >
        <div>
          <Link
            href="/"
            style={{
              color:
                "#64748b",
              textDecoration:
                "none",
              fontSize:
                "14px",
            }}
          >
            ← Volver
          </Link>

          <h1
            style={{
              margin:
                "12px 0 6px",
              color:
                "#163d34",
            }}
          >
            Mis reportes
          </h1>

          <p
            style={{
              margin: 0,
              color:
                "#64748b",
            }}
          >
            Administrá las mascotas
            perdidas que publicaste.
          </p>
        </div>

        <Link
          href="/report-lost"
          style={{
            display:
              "inline-flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "10px 16px",
            background:
              "#147d64",
            color:
              "#ffffff",
            borderRadius:
              "10px",
            textDecoration:
              "none",
            fontWeight:
              700,
          }}
        >
          + Publicar pérdida
        </Link>
      </div>

      {/* ESTADÍSTICAS */}

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom:
            "22px",
        }}
      >
        <div
          style={{
            padding:
              "16px",
            background:
              "#ffffff",
            border:
              "1px solid #e2ebe7",
            borderRadius:
              "14px",
          }}
        >
          <strong>
            {reportes.length}
          </strong>

          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              marginTop:
                "3px",
            }}
          >
            Publicados
          </div>
        </div>

        <div
          style={{
            padding:
              "16px",
            background:
              "#ffffff",
            border:
              "1px solid #e2ebe7",
            borderRadius:
              "14px",
          }}
        >
          <strong>
            {activos.length}
          </strong>

          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              marginTop:
                "3px",
            }}
          >
            Activos
          </div>
        </div>

        <div
          style={{
            padding:
              "16px",
            background:
              "#ffffff",
            border:
              "1px solid #e2ebe7",
            borderRadius:
              "14px",
          }}
        >
          <strong>
            {resueltos.length}
          </strong>

          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "13px",
              marginTop:
                "3px",
            }}
          >
            Reencuentros ❤️
          </div>
        </div>
      </div>

      {/* FILTROS */}

      <div
        style={{
          display:
            "flex",
          gap: "8px",
          flexWrap:
            "wrap",
          marginBottom:
            "22px",
        }}
      >
        {[
          {
            key:
              "all",
            label:
              `Todos (${reportes.length})`,
          },
          {
            key:
              "active",
            label:
              `Activos (${activos.length})`,
          },
          {
            key:
              "resolved",
            label:
              `Resueltos (${resueltos.length})`,
          },
        ].map(
          (item) => (
            <button
              key={
                item.key
              }
              type="button"
              onClick={() =>
                setFiltro(
                  item.key as Filtro
                )
              }
              style={{
                padding:
                  "8px 13px",
                borderRadius:
                  "999px",
                border:
                  filtro ===
                  item.key
                    ? "1px solid #147d64"
                    : "1px solid #dce6e2",
                background:
                  filtro ===
                  item.key
                    ? "#eaf8f3"
                    : "#ffffff",
                color:
                  filtro ===
                  item.key
                    ? "#0f6b55"
                    : "#64748b",
                fontWeight:
                  700,
                cursor:
                  "pointer",
              }}
            >
              {item.label}
            </button>
          )
        )}
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom:
              "18px",
            padding:
              "13px 15px",
            borderRadius:
              "12px",
            background:
              "#fff5f5",
            border:
              "1px solid #fecaca",
            color:
              "#b91c1c",
            fontWeight:
              600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* SIN REPORTES */}

      {visibles.length ===
        0 && (
        <div
          style={{
            padding:
              "45px 20px",
            textAlign:
              "center",
            background:
              "#ffffff",
            border:
              "1px solid #e2ebe7",
            borderRadius:
              "18px",
            color:
              "#64748b",
          }}
        >
          <div
            style={{
              fontSize:
                "38px",
              marginBottom:
                "10px",
            }}
          >
            🐾
          </div>

          <strong
            style={{
              color:
                "#334155",
            }}
          >
            No hay reportes en esta
            sección.
          </strong>
        </div>
      )}

      {/* REPORTES */}

      <div
        style={{
          display:
            "grid",
          gap: "16px",
        }}
      >
        {visibles.map(
          (report) => {
            const image =
              getPetImage(
                report
              );

            const reward =
              formatReward(
                report.rewardAmount
              );

            const activo =
              report.status ===
              "active";

            const processing =
              processingId ===
              report.id;

            return (
              <article
                key={
                  report.id
                }
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "120px 1fr",
                  gap: "18px",
                  padding:
                    "18px",
                  background:
                    "#ffffff",
                  border:
                    "1px solid #e2ebe7",
                  borderRadius:
                    "18px",
                }}
              >
                {/* FOTO */}

                <div
                  style={{
                    width:
                      "120px",
                    height:
                      "120px",
                    borderRadius:
                      "15px",
                    overflow:
                      "hidden",
                    background:
                      "#f1f5f4",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize:
                      "36px",
                  }}
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        image
                      }
                      alt={
                        report
                          .pet
                          ?.name ||
                        "Mascota"
                      }
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        objectFit:
                          "cover",
                      }}
                    />
                  ) : (
                    "🐾"
                  )}
                </div>

                {/* DATOS */}

                <div>
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                      flexWrap:
                        "wrap",
                      alignItems:
                        "center",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        color:
                          "#163d34",
                        fontSize:
                          "21px",
                      }}
                    >
                      {report
                        .pet
                        ?.name ||
                        "Mascota"}
                    </h2>

                    <span
                      style={{
                        padding:
                          "5px 10px",
                        borderRadius:
                          "999px",
                        fontSize:
                          "12px",
                        fontWeight:
                          800,
                        background:
                          activo
                            ? "#fff1f2"
                            : "#ecfdf5",
                        color:
                          activo
                            ? "#be123c"
                            : "#047857",
                      }}
                    >
                      {activo
                        ? "PERDIDO · ACTIVO"
                        : "✅ REENCONTRADO"}
                    </span>
                  </div>

                  {/* INFORMACIÓN */}

                  <div
                    style={{
                      marginTop:
                        "10px",
                      color:
                        "#64748b",
                      fontSize:
                        "14px",
                      lineHeight:
                        1.7,
                    }}
                  >
                    {report
                      .pet
                      ?.breed && (
                      <div>
                        🐶{" "}
                        {
                          report
                            .pet
                            .breed
                        }
                      </div>
                    )}

                    {report
                      .location
                      ?.address && (
                      <div>
                        📍{" "}
                        {
                          report
                            .location
                            .address
                        }
                      </div>
                    )}

                    <div>
                      📅{" "}
                      {formatDate(
                        report.lastSeenAt
                      )}
                    </div>

                    {reward && (
                      <div>
                        💰 Recompensa:{" "}
                        <strong>
                          {reward}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* ACCIONES */}

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "9px",
                      flexWrap:
                        "wrap",
                      marginTop:
                        "16px",
                    }}
                  >
                    {/* EDITAR */}

                    <Link
                      href={`/mis-reportes/${report.id}/editar`}
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        padding:
                          "9px 13px",
                        borderRadius:
                          "9px",
                        background:
                          "#ffffff",
                        color:
                          "#147d64",
                        border:
                          "1px solid #b8d8cf",
                        fontWeight:
                          700,
                        textDecoration:
                          "none",
                      }}
                    >
                      ✏️ Editar
                    </Link>

                    {/* YA APARECIÓ */}

                    {activo && (
                      <button
                        type="button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          marcarComoEncontrada(
                            report
                          )
                        }
                        style={{
                          border:
                            "none",
                          padding:
                            "9px 13px",
                          borderRadius:
                            "9px",
                          background:
                            "#147d64",
                          color:
                            "#ffffff",
                          fontWeight:
                            700,
                          cursor:
                            processing
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            processing
                              ? 0.65
                              : 1,
                        }}
                      >
                        {processing
                          ? "Actualizando..."
                          : "🐾 ¡Ya apareció!"}
                      </button>
                    )}

                    {/* ELIMINAR */}

                    <button
                      type="button"
                      disabled={
                        processing
                      }
                      onClick={() =>
                        eliminar(
                          report
                        )
                      }
                      style={{
                        padding:
                          "9px 13px",
                        borderRadius:
                          "9px",
                        background:
                          "#ffffff",
                        color:
                          "#b91c1c",
                        border:
                          "1px solid #fecaca",
                        fontWeight:
                          700,
                        cursor:
                          processing
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          processing
                            ? 0.65
                            : 1,
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          }
        )}
      </div>
    </main>
  );
}