"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import FilterBar from "../../components/FilterBar";

import {
  actualizarLostReport,
  listarReportes,
  Reporte,
} from "../../lib/api";

import "./reportes.css";

type TipoFiltro =
  | ""
  | "perdido"
  | "encontrado"
  | "avistamiento";

const etiquetaTipo: Record<
  string,
  string
> = {
  perdido: "Perdida",
  encontrado: "Encontrada",
  avistamiento: "Avistamiento",
};

const claseTipo: Record<
  string,
  string
> = {
  perdido:
    "badge-tipo perdido",

  encontrado:
    "badge-tipo encontrado",

  avistamiento:
    "badge-tipo avistamiento",
};

export default function ReportesPage() {
  // ==========================================
  // REPORTES VISIBLES
  // ==========================================

  const [reportes, setReportes] =
    useState<Reporte[]>([]);

  // Reportes sin filtro de tipo.
  // Los usamos para mantener los KPIs completos.

  const [
    reportesEstadisticas,
    setReportesEstadisticas,
  ] = useState<Reporte[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  // ==========================================
  // ACTUALIZAR REPORTE PERDIDO
  // ==========================================

  const [
    actualizandoId,
    setActualizandoId,
  ] = useState<string | null>(
    null
  );

  const [
    mensaje,
    setMensaje,
  ] = useState<string | null>(
    null
  );

  // ==========================================
  // FILTROS
  // ==========================================

  const [tipo, setTipo] =
    useState<TipoFiltro>("");

  const [especie, setEspecie] =
    useState("");

  const [q, setQ] =
    useState("");

  const [
    qDebounced,
    setQDebounced,
  ] = useState("");

  // ==========================================
  // DEBOUNCE BUSCADOR
  // ==========================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        setQDebounced(q);
      }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [q]);

  // ==========================================
  // CARGAR REPORTES VISIBLES
  // ==========================================

  useEffect(() => {
    let activo = true;

    setCargando(true);
    setError(null);

    listarReportes({
      tipo,
      especie,
      q: qDebounced,
    })
      .then((data) => {
        if (activo) {
          setReportes(data);
        }
      })
      .catch((err) => {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos cargar los reportes."
          );
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [
    tipo,
    especie,
    qDebounced,
  ]);

  // ==========================================
  // CARGAR DATOS PARA ESTADÍSTICAS
  //
  // Importante:
  // NO enviamos "tipo".
  //
  // Así los contadores continúan mostrando
  // todos los tipos aunque el usuario pulse
  // Perdidos o Encontrados.
  // ==========================================

  useEffect(() => {
    let activo = true;

    listarReportes({
      especie,
      q: qDebounced,
    })
      .then((data) => {
        if (activo) {
          setReportesEstadisticas(
            data
          );
        }
      })
      .catch((err) => {
        console.error(
          "Error cargando estadísticas:",
          err
        );
      });

    return () => {
      activo = false;
    };
  }, [
    especie,
    qDebounced,
  ]);

  // ==========================================
  // MARCAR MASCOTA COMO ENCONTRADA
  // ==========================================

  async function marcarComoEncontrada(
    reporte: Reporte
  ) {
    if (
      reporte.tipo !==
        "perdido" ||
      reporte.estado !==
        "active"
    ) {
      return;
    }

    const nombre =
      reporte.mascota
        ?.nombre ||
      "esta mascota";

    const confirmar =
      window.confirm(
        `¿Confirmás que ${nombre} ya apareció?\n\nEl reporte dejará de estar activo como mascota perdida.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setActualizandoId(
        reporte.id
      );

      setError(null);
      setMensaje(null);

      await actualizarLostReport(
        reporte.id,
        {
          status:
            "resolved",
        }
      );

      // Actualizamos la tarjeta sin
      // tener que recargar toda la página.

      setReportes(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id ===
              reporte.id
                ? {
                    ...item,
                    estado:
                      "resolved",
                  }
                : item
          )
      );

      // También actualizamos los datos
      // utilizados por los KPIs.

      setReportesEstadisticas(
        (actuales) =>
          actuales.map(
            (item) =>
              item.id ===
              reporte.id
                ? {
                    ...item,
                    estado:
                      "resolved",
                  }
                : item
          )
      );

      setMensaje(
        `${nombre} fue marcada como encontrada.`
      );
    } catch (err) {
      console.error(
        "Error marcando reporte como encontrado:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No pudimos actualizar el reporte."
      );
    } finally {
      setActualizandoId(
        null
      );
    }
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  const estadisticas =
    useMemo(() => {
      // Solo contamos como "perdidas"
      // las que siguen activas.

      const perdidos =
        reportesEstadisticas.filter(
          (reporte) =>
            reporte.tipo ===
              "perdido" &&
            reporte.estado ===
              "active"
        ).length;

      const encontrados =
        reportesEstadisticas.filter(
          (reporte) =>
            reporte.tipo ===
              "encontrado"
        ).length;

      const avistamientos =
        reportesEstadisticas.filter(
          (reporte) =>
            reporte.tipo ===
              "avistamiento"
        ).length;

      return {
        total:
          reportesEstadisticas
            .length,

        perdidos,

        encontrados,

        avistamientos,
      };
    }, [
      reportesEstadisticas,
    ]);

  // ==========================================
  // KPI CLICK
  // ==========================================

  function seleccionarTipo(
    nuevoTipo: TipoFiltro
  ) {
    setTipo(nuevoTipo);
  }

  // ==========================================
  // RESET
  // ==========================================

  function limpiarFiltros() {
    setTipo("");
    setEspecie("");
    setQ("");
  }

  // ==========================================
  // FORMATEAR RECOMPENSA
  // ==========================================

  function formatearRecompensa(
    valor:
      | string
      | number
      | null
  ) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return null;
    }

    const numero =
      Number(valor);

    if (
      !Number.isFinite(
        numero
      ) ||
      numero <= 0
    ) {
      return null;
    }

    return numero.toLocaleString(
      "es-AR",
      {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits:
          0,
      }
    );
  }

  return (
    <main className="container reportes-page">
      {/* ======================================
          CABECERA
      ====================================== */}

      <header className="reportes-header">
        <Link
          href="/"
          className="reportes-back"
        >
          ← Volver al inicio
        </Link>

        <h1>
          Reportes
        </h1>

        <p>
          Mascotas perdidas,
          encontradas y
          avistamientos publicados
          por la comunidad.
        </p>
      </header>

      {/* ======================================
          MENSAJE DE ÉXITO
      ====================================== */}

      {mensaje && (
        <div
          className="form-alert success"
          role="status"
        >
          ✅ {mensaje}
        </div>
      )}

      {/* ======================================
          KPIs INTERACTIVOS
      ====================================== */}

      <section
        className="reportes-stats"
        aria-label="Filtros rápidos de reportes"
      >
        {/* TODOS */}

        <button
          type="button"
          className={`reporte-stat-card total ${
            tipo === ""
              ? "activo"
              : ""
          }`}
          onClick={() =>
            seleccionarTipo("")
          }
          aria-pressed={
            tipo === ""
          }
        >
          <div className="reporte-stat-icon-wrap">
            🐾
          </div>

          <strong>
            {
              estadisticas.total
            }
          </strong>

          <span className="reporte-stat-label">
            Reportes
          </span>

          <span className="reporte-stat-hint">
            Ver todos
          </span>
        </button>

        {/* PERDIDOS */}

        <button
          type="button"
          className={`reporte-stat-card perdido ${
            tipo ===
            "perdido"
              ? "activo"
              : ""
          }`}
          onClick={() =>
            seleccionarTipo(
              "perdido"
            )
          }
          aria-pressed={
            tipo ===
            "perdido"
          }
        >
          <div className="reporte-stat-icon-wrap">
            🔴
          </div>

          <strong>
            {
              estadisticas.perdidos
            }
          </strong>

          <span className="reporte-stat-label">
            Perdidos
          </span>

          <span className="reporte-stat-hint">
            Ver perdidos
          </span>
        </button>

        {/* ENCONTRADOS */}

        <button
          type="button"
          className={`reporte-stat-card encontrado ${
            tipo ===
            "encontrado"
              ? "activo"
              : ""
          }`}
          onClick={() =>
            seleccionarTipo(
              "encontrado"
            )
          }
          aria-pressed={
            tipo ===
            "encontrado"
          }
        >
          <div className="reporte-stat-icon-wrap">
            🟢
          </div>

          <strong>
            {
              estadisticas.encontrados
            }
          </strong>

          <span className="reporte-stat-label">
            Encontrados
          </span>

          <span className="reporte-stat-hint">
            Ver encontrados
          </span>
        </button>

        {/* AVISTAMIENTOS */}

        <button
          type="button"
          className={`reporte-stat-card avistamiento ${
            tipo ===
            "avistamiento"
              ? "activo"
              : ""
          }`}
          onClick={() =>
            seleccionarTipo(
              "avistamiento"
            )
          }
          aria-pressed={
            tipo ===
            "avistamiento"
          }
        >
          <div className="reporte-stat-icon-wrap">
            👀
          </div>

          <strong>
            {
              estadisticas
                .avistamientos
            }
          </strong>

          <span className="reporte-stat-label">
            Avistamientos
          </span>

          <span className="reporte-stat-hint">
            Ver avistamientos
          </span>
        </button>
      </section>
            {/* ======================================
          FILTROS
      ====================================== */}

      <section className="reportes-filters">
        <FilterBar
          tipo={tipo}
          especie={especie}
          q={q}
          onTipoChange={(value) =>
            setTipo(
              value as TipoFiltro
            )
          }
          onEspecieChange={
            setEspecie
          }
          onQChange={
            setQ
          }
        />

        {(tipo ||
          especie ||
          q) && (
          <button
            type="button"
            className="reportes-clear-button"
            onClick={
              limpiarFiltros
            }
          >
            ✕ Limpiar filtros
          </button>
        )}
      </section>

      {/* ======================================
          FILTRO ACTIVO
      ====================================== */}

      {tipo && (
        <div className="reportes-active-filter">
          {tipo ===
            "perdido" &&
            "🔴 Mostrando mascotas perdidas"}

          {tipo ===
            "encontrado" &&
            "🟢 Mostrando mascotas encontradas"}

          {tipo ===
            "avistamiento" &&
            "👀 Mostrando avistamientos"}
        </div>
      )}

      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div className="form-alert error">
          ⚠️ {error}
        </div>
      )}

      {/* ======================================
          LOADING
      ====================================== */}

      {cargando && (
        <div className="reportes-loading">
          <div className="reportes-spinner" />

          <span>
            Cargando reportes...
          </span>
        </div>
      )}

      {/* ======================================
          VACÍO
      ====================================== */}

      {!cargando &&
        !error &&
        reportes.length ===
          0 && (
          <div className="reportes-empty">
            <span>
              🐾
            </span>

            <h3>
              No encontramos reportes
            </h3>

            <p>
              Probá cambiando los
              filtros o la búsqueda.
            </p>

            {(tipo ||
              especie ||
              q) && (
              <button
                type="button"
                className="reportes-empty-clear"
                onClick={
                  limpiarFiltros
                }
              >
                Ver todos los reportes
              </button>
            )}
          </div>
        )}

      {/* ======================================
          RESULTADOS
      ====================================== */}

      {!cargando &&
        !error &&
        reportes.length >
          0 && (
          <>
            <div className="reportes-results-header">
              <strong>
                {
                  reportes.length
                }{" "}
                reporte
                {reportes.length ===
                1
                  ? ""
                  : "s"}
              </strong>

              <span>
                Resultados encontrados
              </span>
            </div>

            <div className="reportes-grid">
              {reportes.map(
                (reporte) => {
                  const fotoReporte =
                    reporte.foto ||
                    reporte.mascota
                      ?.foto ||
                    null;

                  const recompensa =
                    formatearRecompensa(
                      reporte.rewardAmount
                    );

                  const esPerdidoActivo =
                    reporte.tipo ===
                      "perdido" &&
                    reporte.estado ===
                      "active";

                  const estaActualizando =
                    actualizandoId ===
                    reporte.id;

                  return (
                    <article
                      className="reporte-card"
                      key={
                        reporte.id
                      }
                    >
                      {/* FOTO */}

                      <div className="reporte-foto">
                        {fotoReporte ? (
                          <Image
                            src={
                              fotoReporte
                            }
                            alt={
                              reporte
                                .mascota
                                ?.nombre ??
                              "Mascota"
                            }
                            width={
                              420
                            }
                            height={
                              260
                            }
                            className="reporte-img"
                            unoptimized
                          />
                        ) : (
                          <div className="reporte-foto-placeholder">
                            🐾
                          </div>
                        )}
                      </div>

                      {/* INFORMACIÓN */}

                      <div className="reporte-info">
                        <div className="reporte-card-top">
                          <span
                            className={
                              claseTipo[
                                reporte
                                  .tipo
                              ]
                            }
                          >
                            {
                              etiquetaTipo[
                                reporte
                                  .tipo
                              ]
                            }
                          </span>

                          {reporte.estado ===
                            "resolved" &&
                            reporte.tipo ===
                              "perdido" && (
                              <span className="badge-tipo encontrado">
                                Ya apareció
                              </span>
                            )}
                        </div>

                        <h3>
                          {reporte
                            .mascota
                            ?.nombre ??
                            "Mascota"}
                        </h3>

                        <p className="reporte-meta">
                          {
                            reporte
                              .mascota
                              ?.especie
                          }

                          {reporte
                            .mascota
                            ?.raza
                            ? ` · ${reporte.mascota.raza}`
                            : ""}

                          {reporte
                            .mascota
                            ?.color
                            ? ` · ${reporte.mascota.color}`
                            : ""}
                        </p>

                        {reporte.ubicacion && (
                          <p className="reporte-ubicacion">
                            <span>
                              📍
                            </span>

                            {
                              reporte.ubicacion
                            }
                          </p>
                        )}

                        {/* RECOMPENSA */}

                        {reporte.tipo ===
                          "perdido" &&
                          recompensa && (
                            <div
                              className="reporte-recompensa"
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "10px",
                                marginTop:
                                  "10px",
                                marginBottom:
                                  "10px",
                                padding:
                                  "10px 12px",
                                borderRadius:
                                  "12px",
                                background:
                                  "#fff8e7",
                                border:
                                  "1px solid #f2d48a",
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  fontSize:
                                    "20px",
                                }}
                              >
                                💰
                              </span>

                              <div>
                                <small
                                  style={{
                                    display:
                                      "block",
                                    color:
                                      "#8a6d1d",
                                    fontWeight:
                                      600,
                                  }}
                                >
                                  Recompensa ofrecida
                                </small>

                                <strong
                                  style={{
                                    display:
                                      "block",
                                    marginTop:
                                      "2px",
                                  }}
                                >
                                  {
                                    recompensa
                                  }
                                </strong>
                              </div>
                            </div>
                          )}

                        <p className="reporte-descripcion">
                          {
                            reporte.descripcion ||
                            "Sin descripción disponible."
                          }
                        </p>

                        <div className="reporte-card-footer">
                          {reporte
                            .mascota
                            ?.contactoTelefono ? (
                            <a
                              className="reporte-contacto"
                              href={`tel:${reporte.mascota.contactoTelefono}`}
                            >
                              ☎{" "}
                              {
                                reporte
                                  .mascota
                                  .contactoTelefono
                              }
                            </a>
                          ) : (
                            <span className="reporte-sin-contacto">
                              Sin teléfono informado
                            </span>
                          )}
                        </div>

                        {/* YA APARECIÓ */}

                        {esPerdidoActivo && (
                          <div
                            style={{
                              marginTop:
                                "14px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                marcarComoEncontrada(
                                  reporte
                                )
                              }
                              disabled={
                                estaActualizando
                              }
                              style={{
                                width:
                                  "100%",
                                border:
                                  "none",
                                borderRadius:
                                  "12px",
                                padding:
                                  "11px 14px",
                                fontWeight:
                                  700,
                                cursor:
                                  estaActualizando
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  estaActualizando
                                    ? 0.65
                                    : 1,
                                background:
                                  "#e8f7ee",
                                color:
                                  "#16794a",
                              }}
                            >
                              {estaActualizando
                                ? "Actualizando..."
                                : "🐾 ¡Ya apareció!"}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}
    </main>
  );
}