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
  listarReportes,
  Reporte,
} from "../../lib/api";

import "./reportes.css";

type TipoFiltro =
  | ""
  | "perdido"
  | "encontrado"
  | "avistamiento";

const etiquetaTipo: Record<string, string> = {
  perdido: "Perdida",
  encontrado: "Encontrada",
  avistamiento: "Avistamiento",
};

const claseTipo: Record<string, string> = {
  perdido: "badge-tipo perdido",
  encontrado: "badge-tipo encontrado",
  avistamiento: "badge-tipo avistamiento",
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
    useState<string | null>(null);

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
  // Así los 4 contadores continúan mostrando
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
  // ESTADÍSTICAS
  // ==========================================

  const estadisticas =
    useMemo(() => {
      const perdidos =
        reportesEstadisticas.filter(
          (reporte) =>
            reporte.tipo ===
            "perdido"
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
          reportesEstadisticas.length,

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
            {estadisticas.total}
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
            tipo === "perdido"
              ? "activo"
              : ""
          }`}
          onClick={() =>
            seleccionarTipo(
              "perdido"
            )
          }
          aria-pressed={
            tipo === "perdido"
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
              estadisticas.avistamientos
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
          onTipoChange={(
            value
          ) =>
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
                (reporte) => (
                  <article
                    className="reporte-card"
                    key={
                      reporte.id
                    }
                  >
                    {/* FOTO */}

                    <div className="reporte-foto">
                      {reporte
                        .mascota
                        ?.foto ? (
                        <Image
                          src={
                            reporte
                              .mascota
                              .foto
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
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}
    </main>
  );
}
