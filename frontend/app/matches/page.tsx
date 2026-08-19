"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

// ==========================================
// TIPOS
// ==========================================

interface MatchLocation {
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}

interface MatchPet {
  id: string;
  petId?: string;

  name?: string | null;

  species?: string | null;
  breed?: string | null;
  color?: string | null;
  size?: string | null;

  description?: string | null;

  photo?: string | null;

  location?: MatchLocation | null;

  date?: string | null;
}

type MatchStatus =
  | "pending"
  | "possible"
  | "rejected"
  | "confirmed";

interface MatchCandidate {
  lostReportId: string;
  foundReportId: string;

  matchId: string;

  status: MatchStatus;

  candidateScore: number;

  imageSimilarity:
    | number
    | null;

  finalScore: number;

  reasons: string[];

  distanceKm:
    | number
    | null;

  lost: MatchPet;

  found: MatchPet;
}

interface MatchResponse {
  total: number;

  candidates:
    MatchCandidate[];
}

// ==========================================
// API
// ==========================================

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

const API_URL =
  RAW_API_URL.endsWith("/api")
    ? RAW_API_URL
    : `${RAW_API_URL.replace(/\/$/, "")}/api`;

// ==========================================
// DISTANCIA
// ==========================================

function formatDistance(
  distance:
    | number
    | null
) {
  if (
    distance === null
  ) {
    return "No disponible";
  }

  if (distance < 1) {
    return `${Math.round(
      distance * 1000
    )} metros`;
  }

  return `${distance.toFixed(
    2
  )} km`;
}

// ==========================================
// NIVEL DE COINCIDENCIA
// ==========================================

function getMatchLevel(
  score: number
) {
  if (score >= 85) {
    return "Coincidencia muy alta";
  }

  if (score >= 70) {
    return "Coincidencia alta";
  }

  if (score >= 55) {
    return "Coincidencia posible";
  }

  return "Coincidencia baja";
}

// ==========================================
// COMPONENTE
// ==========================================

export default function MatchesPage() {
  const [
    candidates,
    setCandidates,
  ] = useState<
    MatchCandidate[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    updatingMatchId,
    setUpdatingMatchId,
  ] = useState<
    string | null
  >(null);

  // ========================================
  // CARGAR COINCIDENCIAS IA
  // ========================================

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            `${API_URL}/matches/candidates`,
            {
              cache:
                "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            `Error ${response.status} cargando coincidencias.`
          );
        }

        const data:
          MatchResponse =
          await response.json();

        if (!active) {
          return;
        }

        setCandidates(
          Array.isArray(
            data.candidates
          )
            ? data.candidates
            : []
        );
      } catch (err) {
        console.error(
          "Error cargando coincidencias IA:",
          err
        );

        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No pudimos cargar las coincidencias."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMatches();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // CAMBIAR ESTADO DEL MATCH
  // ========================================

  async function changeMatchStatus(
    matchId: string,
    status: MatchStatus
  ) {
    try {
      setUpdatingMatchId(
        matchId
      );

      setError(null);

      const response =
        await fetch(
          `${API_URL}/matches/${matchId}/status`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                status,
              }),
          }
        );

      if (!response.ok) {
        let message =
          `Error ${response.status} actualizando la coincidencia.`;

        try {
          const data =
            await response.json();

          if (data?.error) {
            message =
              data.error;
          }
        } catch {
          // Ignorar body no JSON
        }

        throw new Error(
          message
        );
      }

      // Actualizar pantalla sin recargar.
      setCandidates(
        (current) =>
          current.map(
            (candidate) =>
              candidate.matchId ===
              matchId
                ? {
                    ...candidate,
                    status,
                  }
                : candidate
          )
      );
    } catch (err) {
      console.error(
        "Error actualizando coincidencia:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No pudimos actualizar la coincidencia."
      );
    } finally {
      setUpdatingMatchId(
        null
      );
    }
  }

  // ========================================
  // UI
  // ========================================

  return (
    <main className="container form-page">
      <Link href="/">
        ← Volver
      </Link>

      <h1>
        Coincidencias sugeridas
      </h1>

      <p className="lead">
        Comparamos características,
        ubicación y similitud visual
        con inteligencia artificial
        para encontrar posibles
        coincidencias entre mascotas
        perdidas y encontradas.
      </p>

      {/* ==================================
          CARGANDO
      ================================== */}

      {loading && (
        <div
          className="card"
          style={{
            padding:
              "24px",

            marginTop:
              "28px",
          }}
        >
          <strong>
            🤖 Analizando coincidencias...
          </strong>

          <p
            style={{
              marginBottom: 0,
            }}
          >
            Estamos comparando datos,
            ubicación y fotografías.
          </p>
        </div>
      )}

      {/* ==================================
          ERROR
      ================================== */}

      {error && (
        <div
          className="form-alert error"
          style={{
            marginTop:
              "20px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ==================================
          SIN RESULTADOS
      ================================== */}

      {!loading &&
        !error &&
        candidates.length ===
          0 && (
          <div
            className="card"
            style={{
              padding:
                "24px",

              marginTop:
                "28px",
            }}
          >
            <h3>
              No encontramos coincidencias
            </h3>

            <p>
              Todavía no hay mascotas
              encontradas suficientemente
              compatibles con los reportes
              de mascotas perdidas.
            </p>
          </div>
        )}

      {/* ==================================
          COINCIDENCIAS
      ================================== */}

      {!loading &&
        candidates.map(
          (candidate) => {
            const {
              lost,
              found,
              candidateScore,
              imageSimilarity,
              finalScore,
              distanceKm,
              reasons,
              status,
              matchId,
            } = candidate;

            const updating =
              updatingMatchId ===
              matchId;

            return (
              <article
                className="card"
                key={matchId}
                style={{
                  marginTop:
                    "28px",

                  padding:
                    "28px",

                  borderRadius:
                    "24px",

                  opacity:
                    status ===
                    "rejected"
                      ? 0.75
                      : 1,
                }}
              >
                {/* ========================
                    CABECERA
                ======================== */}

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "center",

                    gap:
                      "20px",

                    flexWrap:
                      "wrap",

                    marginBottom:
                      "26px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize:
                          "14px",

                        fontWeight:
                          800,

                        color:
                          "#047857",

                        textTransform:
                          "uppercase",

                        letterSpacing:
                          ".08em",
                      }}
                    >
                      ✨ Coincidencia IA
                    </div>

                    <h2
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {getMatchLevel(
                        finalScore
                      )}
                    </h2>
                  </div>

                  <div
                    style={{
                      minWidth:
                        "130px",

                      padding:
                        "18px 24px",

                      borderRadius:
                        "20px",

                      background:
                        "#e5faf6",

                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "38px",

                        fontWeight:
                          900,

                        color:
                          "#007f73",

                        lineHeight:
                          1,
                      }}
                    >
                      {finalScore}%
                    </div>

                    <div
                      style={{
                        marginTop:
                          "7px",

                        fontSize:
                          "13px",

                        fontWeight:
                          700,

                        color:
                          "#536b67",
                      }}
                    >
                      similitud final
                    </div>
                  </div>
                </div>

                {/* ========================
                    FOTOS
                ======================== */}

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",

                    gap:
                      "24px",
                  }}
                >
                  {/* PERDIDA */}

                  <section>
                    <div
                      style={{
                        marginBottom:
                          "10px",

                        fontWeight:
                          800,

                        color:
                          "#dc2626",
                      }}
                    >
                      🔴 MASCOTA PERDIDA
                    </div>

                    {lost.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          lost.photo
                        }
                        alt={
                          lost.name ||
                          "Mascota perdida"
                        }
                        style={{
                          width:
                            "100%",

                          height:
                            "300px",

                          objectFit:
                            "cover",

                          borderRadius:
                            "18px",

                          display:
                            "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height:
                            "300px",

                          borderRadius:
                            "18px",

                          background:
                            "#f1f5f4",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          fontSize:
                            "70px",
                        }}
                      >
                        🐶
                      </div>
                    )}

                    <h2>
                      {lost.name ||
                        "Mascota perdida"}
                    </h2>

                    <p>
                      <strong>
                        Raza:
                      </strong>{" "}
                      {lost.breed ||
                        "No especificada"}
                    </p>

                    <p>
                      <strong>
                        Color:
                      </strong>{" "}
                      {lost.color ||
                        "No especificado"}
                    </p>

                    <p>
                      <strong>
                        Ubicación:
                      </strong>{" "}
                      {lost.location
                        ?.address ||
                        "No disponible"}
                    </p>
                  </section>

                  {/* ENCONTRADA */}

                  <section>
                    <div
                      style={{
                        marginBottom:
                          "10px",

                        fontWeight:
                          800,

                        color:
                          "#059669",
                      }}
                    >
                      🟢 MASCOTA ENCONTRADA
                    </div>

                    {found.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          found.photo
                        }
                        alt="Mascota encontrada"
                        style={{
                          width:
                            "100%",

                          height:
                            "300px",

                          objectFit:
                            "cover",

                          borderRadius:
                            "18px",

                          display:
                            "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height:
                            "300px",

                          borderRadius:
                            "18px",

                          background:
                            "#f1f5f4",

                          display:
                            "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          fontSize:
                            "70px",
                        }}
                      >
                        🐕
                      </div>
                    )}

                    <h2>
                      Mascota encontrada
                    </h2>

                    <p>
                      <strong>
                        Raza:
                      </strong>{" "}
                      {found.breed ||
                        "No especificada"}
                    </p>

                    <p>
                      <strong>
                        Color:
                      </strong>{" "}
                      {found.color ||
                        "No especificado"}
                    </p>

                    <p>
                      <strong>
                        Ubicación:
                      </strong>{" "}
                      {found.location
                        ?.address ||
                        "No disponible"}
                    </p>
                  </section>
                </div>

                {/* ========================
                    ANÁLISIS IA
                ======================== */}

                <div
                  style={{
                    marginTop:
                      "28px",

                    padding:
                      "22px",

                    borderRadius:
                      "18px",

                    background:
                      "#f8fbfa",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                    }}
                  >
                    🤖 Análisis de coincidencia
                  </h3>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",

                      gap:
                        "14px",

                      marginTop:
                        "18px",
                    }}
                  >
                    <ScoreBox
                      label="Similitud visual IA"
                      value={
                        imageSimilarity ===
                        null
                          ? "Sin foto"
                          : `${imageSimilarity}%`
                      }
                    />

                    <ScoreBox
                      label="Coincidencia de datos"
                      value={`${candidateScore}%`}
                    />

                    <ScoreBox
                      label="Distancia"
                      value={formatDistance(
                        distanceKm
                      )}
                    />

                    <ScoreBox
                      label="Resultado final"
                      value={`${finalScore}%`}
                    />
                  </div>

                  {reasons.length >
                    0 && (
                    <div
                      style={{
                        marginTop:
                          "22px",
                      }}
                    >
                      <strong>
                        ¿Por qué se sugiere?
                      </strong>

                      <ul
                        style={{
                          marginBottom:
                            0,

                          paddingLeft:
                            "22px",
                        }}
                      >
                        {reasons.map(
                          (
                            reason,
                            index
                          ) => (
                            <li
                              key={`${reason}-${index}`}
                              style={{
                                marginTop:
                                  "7px",
                              }}
                            >
                              ✓{" "}
                              {reason}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* ========================
                    GESTIÓN DEL MATCH
                ======================== */}

                <div
                  style={{
                    marginTop:
                      "24px",

                    padding:
                      "22px",

                    borderRadius:
                      "18px",

                    background:
                      "#f8fbfa",

                    border:
                      "1px solid #e2ebe8",
                  }}
                >
                  <h3
                    style={{
                      margin:
                        "0 0 8px",
                    }}
                  >
                    ¿Podría ser tu mascota?
                  </h3>

                  <p
                    style={{
                      margin:
                        "0 0 18px",

                      color:
                        "#64748b",
                    }}
                  >
                    Revisá las fotos,
                    características y
                    ubicación antes de
                    decidir.
                  </p>

                  {/* POSIBLE */}

                  {status ===
                    "possible" && (
                    <div
                      style={{
                        padding:
                          "14px 16px",

                        marginBottom:
                          "16px",

                        borderRadius:
                          "12px",

                        background:
                          "#dcfce7",

                        color:
                          "#166534",

                        fontWeight:
                          700,
                      }}
                    >
                      💚 Marcaste esta
                      coincidencia como
                      posible.
                    </div>
                  )}

                  {/* DESCARTADA */}

                  {status ===
                    "rejected" && (
                    <div
                      style={{
                        padding:
                          "14px 16px",

                        marginBottom:
                          "16px",

                        borderRadius:
                          "12px",

                        background:
                          "#fef2f2",

                        color:
                          "#991b1b",

                        fontWeight:
                          700,
                      }}
                    >
                      ✕ Descartaste esta
                      coincidencia.
                    </div>
                  )}

                  {/* CONFIRMADA */}

                  {status ===
                    "confirmed" && (
                    <div
                      style={{
                        padding:
                          "14px 16px",

                        marginBottom:
                          "16px",

                        borderRadius:
                          "12px",

                        background:
                          "#dcfce7",

                        color:
                          "#166534",

                        fontWeight:
                          700,
                      }}
                    >
                      🎉 Coincidencia
                      confirmada.
                    </div>
                  )}

                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "12px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        updating ||
                        status ===
                          "possible" ||
                        status ===
                          "confirmed"
                      }
                      onClick={() =>
                        changeMatchStatus(
                          matchId,
                          "possible"
                        )
                      }
                      style={{
                        padding:
                          "13px 20px",

                        border:
                          "none",

                        borderRadius:
                          "12px",

                        cursor:
                          updating
                            ? "not-allowed"
                            : "pointer",

                        fontWeight:
                          800,

                        background:
                          status ===
                          "possible"
                            ? "#bbf7d0"
                            : "#059669",

                        color:
                          status ===
                          "possible"
                            ? "#166534"
                            : "#ffffff",

                        opacity:
                          updating
                            ? 0.65
                            : 1,
                      }}
                    >
                      {updating
                        ? "Guardando..."
                        : status ===
                          "possible"
                        ? "✓ Marcada como posible"
                        : "🐾 Puede ser mi mascota"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        updating ||
                        status ===
                          "rejected" ||
                        status ===
                          "confirmed"
                      }
                      onClick={() =>
                        changeMatchStatus(
                          matchId,
                          "rejected"
                        )
                      }
                      style={{
                        padding:
                          "13px 20px",

                        border:
                          "1px solid #fecaca",

                        borderRadius:
                          "12px",

                        cursor:
                          updating
                            ? "not-allowed"
                            : "pointer",

                        fontWeight:
                          800,

                        background:
                          status ===
                          "rejected"
                            ? "#fee2e2"
                            : "#ffffff",

                        color:
                          "#b91c1c",

                        opacity:
                          updating
                            ? 0.65
                            : 1,
                      }}
                    >
                      {status ===
                      "rejected"
                        ? "✓ Descartada"
                        : "✕ Descartar"}
                    </button>

                    {status !==
                      "pending" &&
                      status !==
                        "confirmed" && (
                        <button
                          type="button"
                          disabled={
                            updating
                          }
                          onClick={() =>
                            changeMatchStatus(
                              matchId,
                              "pending"
                            )
                          }
                          style={{
                            padding:
                              "13px 20px",

                            border:
                              "1px solid #cbd5e1",

                            borderRadius:
                              "12px",

                            cursor:
                              updating
                                ? "not-allowed"
                                : "pointer",

                            fontWeight:
                              700,

                            background:
                              "#ffffff",

                            color:
                              "#475569",
                          }}
                        >
                          ↩ Volver a
                          pendiente
                        </button>
                      )}
                  </div>
                </div>

                {/* ========================
                    AVISO
                ======================== */}

                <p
                  style={{
                    margin:
                      "20px 0 0",

                    fontSize:
                      "13px",

                    color:
                      "#64748b",
                  }}
                >
                  La inteligencia
                  artificial sugiere
                  posibles coincidencias.
                  El porcentaje no confirma
                  que se trate de la misma
                  mascota.
                </p>
              </article>
            );
          }
        )}
    </main>
  );
}

// ==========================================
// SCORE BOX
// ==========================================

function ScoreBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          "16px",

        borderRadius:
          "14px",

        background:
          "#ffffff",

        border:
          "1px solid #e2ebe8",
      }}
    >
      <div
        style={{
          fontSize:
            "13px",

          color:
            "#64748b",

          marginBottom:
            "6px",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize:
            "22px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}