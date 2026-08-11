"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const API_BASE = API_URL.endsWith("/api")
  ? API_URL
  : `${API_URL}/api`;

type SightingPhoto = {
  id: string;
  imageUrl?: string | null;
  isMain?: boolean | null;
};

type SightingLocation = {
  address?: string | null;
  neighborhood?: string | null;
};

type Sighting = {
  id: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  sightedAt?: string | null;
  description?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  photos?: SightingPhoto[];
  location?: SightingLocation | null;
};

function speciesLabel(
  species?: string | null
) {
  if (species === "dog") {
    return "🐶 Perro";
  }

  if (species === "cat") {
    return "🐱 Gato";
  }

  return "🐾 Mascota";
}

function sizeLabel(
  size?: string | null
) {
  switch (size) {
    case "small":
      return "Pequeño";

    case "medium":
      return "Mediano";

    case "large":
      return "Grande";

    default:
      return "No especificado";
  }
}

function genderLabel(
  gender?: string | null
) {
  switch (gender) {
    case "male":
      return "Macho";

    case "female":
      return "Hembra";

    default:
      return "No especificado";
  }
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Fecha no informada";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Fecha no informada";
  }

  return date.toLocaleString(
    "es-AR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

export default function SightingsPage() {
  const [
    sightings,
    setSightings,
  ] =
    useState<Sighting[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function loadSightings() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          `${API_BASE}/sightings`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudieron cargar los avistamientos."
        );
      }

      setSightings(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error cargando avistamientos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSightings();
  }, []);

  async function handleDelete(
    sightingId: string
  ) {
    const confirmed =
      window.confirm(
        "¿Seguro que querés eliminar este avistamiento?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        sightingId
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          `${API_BASE}/sightings/${sightingId}`,
          {
            method: "DELETE",
          }
        );

      let data: any =
        null;

      try {
        data =
          await response.json();
      } catch {}

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo eliminar el avistamiento."
        );
      }

      setSightings(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              sightingId
          )
      );

      setMessage(
        "✓ Avistamiento eliminado correctamente."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar."
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding:
          "40px 24px 80px",
      }}
    >
      <Link
        href="/"
        style={{
          display:
            "inline-flex",

          marginBottom:
            "24px",

          padding:
            "10px 14px",

          borderRadius:
            "12px",

          border:
            "1px solid #99f6e4",

          background:
            "#f0fdfa",

          color:
            "#0f766e",

          textDecoration:
            "none",

          fontWeight:
            800,
        }}
      >
        ← Volver al inicio
      </Link>

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          flexWrap:
            "wrap",

          gap: "20px",

          marginBottom:
            "30px",
        }}
      >
        <div>
          <h1
            style={{
              margin:
                "0 0 8px",
            }}
          >
            👀 Avistamientos
          </h1>

          <p
            style={{
              margin: 0,

              color:
                "#64748b",
            }}
          >
            Mascotas vistas
            recientemente.
          </p>
        </div>

        <Link
          href="/sightings/new"
          style={{
            padding:
              "12px 18px",

            borderRadius:
              "12px",

            textDecoration:
              "none",

            background:
              "#14b8a6",

            color:
              "white",

            fontWeight:
              800,
          }}
        >
          + Reportar avistamiento
        </Link>
      </div>

      {message && (
        <div
          style={{
            marginBottom:
              "20px",

            padding:
              "14px",

            background:
              "#ecfdf5",

            color:
              "#047857",

            borderRadius:
              "12px",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom:
              "20px",

            padding:
              "14px",

            background:
              "#fee2e2",

            color:
              "#991b1b",

            borderRadius:
              "12px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <p>
          Cargando
          avistamientos...
        </p>
      )}

      {!loading &&
        sightings.length ===
          0 && (
          <div
            style={{
              padding:
                "40px",

              borderRadius:
                "18px",

              background:
                "white",
            }}
          >
            <h2>
              Todavía no hay
              avistamientos
            </h2>
          </div>
        )}

      <div
        style={{
          display: "grid",
          gap: "22px",
        }}
      >
        {sightings.map(
          (sighting) => {
            const photo =
              sighting.photos?.find(
                (item) =>
                  item.isMain
              ) ||
              sighting.photos?.[0];

            return (
              <article
                key={
                  sighting.id
                }
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "minmax(220px, 300px) 1fr",

                  gap:
                    "24px",

                  padding:
                    "22px",

                  borderRadius:
                    "20px",

                  background:
                    "white",

                  boxShadow:
                    "0 8px 30px rgba(0,0,0,.06)",
                }}
              >
                <div>
                  {photo
                    ?.imageUrl ? (
                    <img
                      src={
                        photo.imageUrl
                      }
                      alt="Avistamiento"
                      style={{
                        width:
                          "100%",

                        height:
                          "230px",

                        objectFit:
                          "cover",

                        borderRadius:
                          "16px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height:
                          "230px",

                        display:
                          "grid",

                        placeItems:
                          "center",

                        background:
                          "#f8fafc",

                        border:
                          "1px dashed #cbd5e1",

                        borderRadius:
                          "16px",
                      }}
                    >
                      📷 Sin foto
                    </div>
                  )}
                </div>

                <div>
                  <div
                    style={{
                      display:
                        "flex",

                      justifyContent:
                        "space-between",

                      flexWrap:
                        "wrap",

                      gap:
                        "12px",
                    }}
                  >
                    <h2
                      style={{
                        margin:
                          0,
                      }}
                    >
                      {speciesLabel(
                        sighting.species
                      )}{" "}
                      avistado
                    </h2>

                    <div
                      style={{
                        display:
                          "flex",

                        gap:
                          "10px",
                      }}
                    >
                      <Link
                        href={`/sightings/${sighting.id}/edit`}
                        style={{
                          padding:
                            "9px 13px",

                          borderRadius:
                            "10px",

                          border:
                            "1px solid #bfdbfe",

                          background:
                            "#eff6ff",

                          color:
                            "#1d4ed8",

                          textDecoration:
                            "none",

                          fontWeight:
                            800,
                        }}
                      >
                        ✏️ Editar
                      </Link>

                      <button
                        type="button"
                        disabled={
                          deletingId ===
                          sighting.id
                        }
                        onClick={() =>
                          handleDelete(
                            sighting.id
                          )
                        }
                        style={{
                          padding:
                            "9px 13px",

                          borderRadius:
                            "10px",

                          border:
                            "1px solid #fecaca",

                          background:
                            "white",

                          color:
                            "#dc2626",

                          fontWeight:
                            800,

                          cursor:
                            "pointer",
                        }}
                      >
                        {deletingId ===
                        sighting.id
                          ? "Eliminando..."
                          : "🗑️ Eliminar"}
                      </button>
                    </div>
                  </div>

                  <p>
                    <strong>
                      Raza:
                    </strong>{" "}
                    {sighting.breed ||
                      "No especificada"}
                  </p>

                  <p>
                    <strong>
                      Color:
                    </strong>{" "}
                    {sighting.color ||
                      "No especificado"}
                  </p>

                  <p>
                    <strong>
                      Tamaño:
                    </strong>{" "}
                    {sizeLabel(
                      sighting.size
                    )}
                  </p>

                  <p>
                    <strong>
                      Sexo:
                    </strong>{" "}
                    {genderLabel(
                      sighting.gender
                    )}
                  </p>

                  <div
                    style={{
                      padding:
                        "12px",

                      borderRadius:
                        "12px",

                      background:
                        "#f8fafc",
                    }}
                  >
                    <strong>
                      📍 Ubicación
                    </strong>

                    <div>
                      {sighting
                        .location
                        ?.address ||
                        "No informada"}

                      {sighting
                        .location
                        ?.neighborhood
                        ? ` · ${sighting.location.neighborhood}`
                        : ""}
                    </div>
                  </div>

                  <p>
                    <strong>
                      🕐 Fecha:
                    </strong>{" "}
                    {formatDate(
                      sighting.sightedAt
                    )}
                  </p>

                  {sighting.description && (
                    <p>
                      {
                        sighting.description
                      }
                    </p>
                  )}

                  {sighting.contactPhone && (
                    <p>
                      <strong>
                        📞 Contacto:
                      </strong>{" "}
                      {
                        sighting.contactPhone
                      }
                    </p>
                  )}
                </div>
              </article>
            );
          }
        )}
      </div>
    </main>
  );
}