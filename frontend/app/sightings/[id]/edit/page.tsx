"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const API_BASE =
  API_URL.endsWith("/api")
    ? API_URL
    : `${API_URL}/api`;

const inputStyle = {
  width: "100%",

  marginTop: "8px",

  padding: "12px",

  borderRadius: "12px",

  border:
    "1px solid #cbd5e1",

  boxSizing:
    "border-box" as const,
};

function toDatetimeLocal(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const pad = (
    value: number
  ) =>
    String(value).padStart(
      2,
      "0"
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}

export default function EditSightingPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const id =
    String(
      params?.id || ""
    );

  const [
    species,
    setSpecies,
  ] =
    useState("dog");

  const [
    breed,
    setBreed,
  ] =
    useState("");

  const [
    color,
    setColor,
  ] =
    useState("");

  const [
    size,
    setSize,
  ] =
    useState("unknown");

  const [
    gender,
    setGender,
  ] =
    useState("unknown");

  const [
    address,
    setAddress,
  ] =
    useState("");

  const [
    neighborhood,
    setNeighborhood,
  ] =
    useState("");

  const [
    latitude,
    setLatitude,
  ] =
    useState("");

  const [
    longitude,
    setLongitude,
  ] =
    useState("");

  const [
    sightedAt,
    setSightedAt,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    contactName,
    setContactName,
  ] =
    useState("");

  const [
    contactPhone,
    setContactPhone,
  ] =
    useState("");

  const [
    contactEmail,
    setContactEmail,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    async function load() {
      try {
        setLoading(true);

        const response =
          await fetch(
            `${API_BASE}/sightings/${id}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "No se pudo cargar el avistamiento."
          );
        }

        setSpecies(
          data.species ||
            "dog"
        );

        setBreed(
          data.breed ||
            ""
        );

        setColor(
          data.color ||
            ""
        );

        setSize(
          data.size ||
            "unknown"
        );

        setGender(
          data.gender ||
            "unknown"
        );

        setAddress(
          data.location
            ?.address ||
            ""
        );

        setNeighborhood(
          data.location
            ?.neighborhood ||
            ""
        );

        setLatitude(
          data.location
            ?.latitude !=
          null
            ? String(
                data.location
                  .latitude
              )
            : ""
        );

        setLongitude(
          data.location
            ?.longitude !=
          null
            ? String(
                data.location
                  .longitude
              )
            : ""
        );

        setSightedAt(
          toDatetimeLocal(
            data.sightedAt
          )
        );

        setDescription(
          data.description ||
            ""
        );

        setContactName(
          data.contactName ||
            ""
        );

        setContactPhone(
          data.contactPhone ||
            ""
        );

        setContactEmail(
          data.contactEmail ||
            ""
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error cargando avistamiento."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!address.trim()) {
      setError(
        "La dirección es obligatoria."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const response =
        await fetch(
          `${API_BASE}/sightings/${id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                species,

                breed:
                  breed ||
                  null,

                color:
                  color ||
                  null,

                size,

                gender,

                address:
                  address.trim(),

                neighborhood:
                  neighborhood.trim() ||
                  null,

                latitude:
                  latitude ||
                  null,

                longitude:
                  longitude ||
                  null,

                sightedAt:
                  sightedAt ||
                  null,

                description:
                  description ||
                  null,

                contactName:
                  contactName ||
                  null,

                contactPhone:
                  contactPhone ||
                  null,

                contactEmail:
                  contactEmail ||
                  null,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo actualizar el avistamiento."
        );
      }

      router.push(
        "/sightings"
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",

          padding:
            "40px 24px",
        }}
      >
        Cargando
        avistamiento...
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth:
          "900px",

        margin:
          "0 auto",

        padding:
          "40px 24px 80px",
      }}
    >
      <Link
        href="/sightings"
        style={{
          display:
            "inline-flex",

          marginBottom:
            "24px",

          padding:
            "10px 14px",

          borderRadius:
            "12px",

          background:
            "#eff6ff",

          color:
            "#1d4ed8",

          border:
            "1px solid #bfdbfe",

          textDecoration:
            "none",

          fontWeight:
            800,
        }}
      >
        ← Volver a
        Avistamientos
      </Link>

      <section
        style={{
          background:
            "white",

          padding:
            "32px",

          borderRadius:
            "22px",

          boxShadow:
            "0 12px 40px rgba(0,0,0,.07)",
        }}
      >
        <h1>
          ✏️ Editar
          avistamiento
        </h1>

        {error && (
          <div
            style={{
              padding:
                "12px",

              marginBottom:
                "20px",

              borderRadius:
                "10px",

              background:
                "#fee2e2",

              color:
                "#991b1b",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            display:
              "grid",

            gap:
              "20px",
          }}
        >
          <div>
            <label>
              Especie
            </label>

            <select
              value={
                species
              }
              onChange={(
                event
              ) =>
                setSpecies(
                  event.target
                    .value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="dog">
                Perro
              </option>

              <option value="cat">
                Gato
              </option>

              <option value="other">
                Otro
              </option>
            </select>
          </div>

          <div>
            <label>
              Raza
            </label>

            <input
              value={breed}
              onChange={(
                event
              ) =>
                setBreed(
                  event.target
                    .value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <label>
              Color
            </label>

            <input
              value={color}
              onChange={(
                event
              ) =>
                setColor(
                  event.target
                    .value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <label>
              Tamaño
            </label>

            <select
              value={size}
              onChange={(
                event
              ) =>
                setSize(
                  event.target
                    .value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="unknown">
                No sé
              </option>

              <option value="small">
                Pequeño
              </option>

              <option value="medium">
                Mediano
              </option>

              <option value="large">
                Grande
              </option>
            </select>
          </div>

          <div>
            <label>
              Sexo
            </label>

            <select
              value={gender}
              onChange={(
                event
              ) =>
                setGender(
                  event.target
                    .value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="unknown">
                No sé
              </option>

              <option value="male">
                Macho
              </option>

              <option value="female">
                Hembra
              </option>
            </select>
          </div>

          <hr />

          <h2>
            📍 Ubicación
          </h2>

          <div>
            <label>
              Dirección
            </label>

            <input
              value={
                address
              }
              onChange={(
                event
              ) => {
                setAddress(
                  event.target
                    .value
                );

                // fuerza nueva
                // geocodificación
                setLatitude("");
                setLongitude("");
              }}
              style={
                inputStyle
              }
              required
            />
          </div>

          <div>
            <label>
              Barrio / zona
            </label>

            <input
              value={
                neighborhood
              }
              onChange={(
                event
              ) => {
                setNeighborhood(
                  event.target
                    .value
                );

                setLatitude("");
                setLongitude("");
              }}
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <label>
              Fecha y hora
            </label>

            <input
              type="datetime-local"
              value={
                sightedAt
              }
              onChange={(
                event
              ) =>
                setSightedAt(
                  event.target
                    .value
                )
              }
              style={
                inputStyle
              }
            />
          </div>

          <div>
            <label>
              Descripción
            </label>

            <textarea
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
              rows={5}
              style={{
                ...inputStyle,

                resize:
                  "vertical",
              }}
            />
          </div>

          <hr />

          <h2>
            📞 Contacto
          </h2>

          <input
            value={
              contactName
            }
            onChange={(
              event
            ) =>
              setContactName(
                event.target
                  .value
              )
            }
            placeholder="Nombre"
            style={
              inputStyle
            }
          />

          <input
            value={
              contactPhone
            }
            onChange={(
              event
            ) =>
              setContactPhone(
                event.target
                  .value
              )
            }
            placeholder="Teléfono"
            style={
              inputStyle
            }
          />

          <input
            type="email"
            value={
              contactEmail
            }
            onChange={(
              event
            ) =>
              setContactEmail(
                event.target
                  .value
              )
            }
            placeholder="Email"
            style={
              inputStyle
            }
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              padding:
                "14px",

              border: 0,

              borderRadius:
                "14px",

              background:
                "#2563eb",

              color:
                "white",

              fontWeight:
                800,

              cursor:
                saving
                  ? "wait"
                  : "pointer",
            }}
          >
            {saving
              ? "Guardando cambios..."
              : "Guardar cambios"}
          </button>
        </form>
      </section>
    </main>
  );
}