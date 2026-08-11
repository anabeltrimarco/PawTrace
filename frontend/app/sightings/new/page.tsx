"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const API_BASE = API_URL.endsWith("/api")
  ? API_URL
  : `${API_URL}/api`;
    
const DOG_BREEDS = [
  "Akita",
  "Beagle",
  "Border Collie",
  "Boston Terrier",
  "Boxer",
  "Bulldog Francés",
  "Bulldog Inglés",
  "Caniche",
  "Chihuahua",
  "Cocker Spaniel",
  "Dachshund",
  "Dálmata",
  "Dóberman",
  "Golden Retriever",
  "Husky Siberiano",
  "Labrador Retriever",
  "Maltés",
  "Pastor Alemán",
  "Ovejero Alemán",
  "Pastor Australiano",
  "Pinscher",
  "Pitbull",
  "Pomerania",
  "Pug",
  "Rottweiler",
  "San Bernardo",
  "Schnauzer",
  "Shih Tzu",
  "Weimaraner",
  "Yorkshire Terrier",
  "Mestizo",
  "Otra",
  "Desconocida",
];

const CAT_BREEDS = [
  "Angora",
  "Bengalí",
  "British Shorthair",
  "Maine Coon",
  "Persa",
  "Ragdoll",
  "Siamés",
  "Sphynx",
  "Mestizo",
  "Otra",
  "Desconocida",
];

const inputStyle = {
  width: "100%",
  marginTop: "8px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box" as const,
};

type CreatedSighting = {
  id: string;
};

export default function NewSightingPage() {
  const router = useRouter();

  const [species, setSpecies] =
    useState("dog");

  const [breed, setBreed] =
    useState("");

  const [color, setColor] =
    useState("");

  const [size, setSize] =
    useState("unknown");

  const [gender, setGender] =
    useState("unknown");

  const [description, setDescription] =
    useState("");

  const [sightedAt, setSightedAt] =
    useState("");

  // ========================================
  // UBICACIÓN
  // ========================================

  const [address, setAddress] =
    useState("");

  const [
    neighborhood,
    setNeighborhood,
  ] = useState("");

  const [latitude, setLatitude] =
    useState("");

  const [longitude, setLongitude] =
    useState("");

  const [
    locating,
    setLocating,
  ] = useState(false);

  const [
    locationMessage,
    setLocationMessage,
  ] = useState("");

  // ========================================
  // FOTO
  // ========================================

  const [photo, setPhoto] =
    useState<File | null>(null);

  const [
    photoPreview,
    setPhotoPreview,
  ] = useState("");

  // ========================================
  // CONTACTO
  // ========================================

  const [
    contactName,
    setContactName,
  ] = useState("");

  const [
    contactPhone,
    setContactPhone,
  ] = useState("");

  const [
    contactEmail,
    setContactEmail,
  ] = useState("");

  // ========================================
  // ESTADO
  // ========================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const breeds =
    species === "dog"
      ? DOG_BREEDS
      : species === "cat"
      ? CAT_BREEDS
      : [];

  // ========================================
  // LIBERAR PREVIEW
  // ========================================

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(
          photoPreview
        );
      }
    };
  }, [photoPreview]);

  // ========================================
  // SELECCIONAR FOTO
  // ========================================

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "La foto debe ser JPG, PNG o WEBP."
      );
      event.target.value = "";
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        "La foto no puede superar los 10 MB."
      );
      event.target.value = "";
      return;
    }

    setError("");

    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setPhoto(file);

    setPhotoPreview(
      URL.createObjectURL(file)
    );
  }

  // ========================================
  // USAR UBICACIÓN DEL DISPOSITIVO
  // ========================================

  function useCurrentLocation() {
    setLocationMessage("");
    setError("");

    if (
      !navigator.geolocation
    ) {
      setError(
        "Este navegador no permite obtener la ubicación."
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(
          String(
            position.coords.latitude
          )
        );

        setLongitude(
          String(
            position.coords.longitude
          )
        );

        setLocationMessage(
          "✓ Ubicación obtenida correctamente."
        );

        setLocating(false);
      },

      (locationError) => {
        console.error(
          locationError
        );

        setError(
          "No pudimos obtener tu ubicación. Podés escribir la dirección manualmente."
        );

        setLocating(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  // ========================================
  // SUBIR FOTO
  // ========================================

  async function uploadPhoto(
    sightingId: string
  ) {
    if (!photo) {
      return;
    }

    const formData =
      new FormData();

    // IMPORTANTE:
    // debe llamarse "photo" porque así
    // está configurado Multer.
    formData.append(
      "photo",
      photo
    );

    const response =
      await fetch(
        `${API_BASE}/sightings/${sightingId}/photos`,
      {
        method: "POST",
        body: formData,
      }
    )
    

    let data: any = null;

    try {
      data =
        await response.json();
    } catch {
      // Si el servidor no devuelve JSON,
      // manejamos el error debajo.
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "El avistamiento se guardó, pero no se pudo subir la foto."
      );
    }
  }

  // ========================================
  // PUBLICAR
  // ========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLocationMessage("");

    if (!address.trim()) {
      setError(
        "Ingresá la dirección donde viste a la mascota."
      );
      return;
    }

    setLoading(true);

    try {
      // ====================================
      // PASO 1 - CREAR AVISTAMIENTO
      // ====================================

      const response =
        await fetch(
          `${API_BASE}/sightings`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              species,

              breed:
                breed || null,

              color:
                color || null,

              size,

              gender,

              address:
                address.trim(),

              neighborhood:
                neighborhood.trim() ||
                null,

              latitude:
                latitude || null,

              longitude:
                longitude || null,

              sightedAt:
                sightedAt ||
                new Date().toISOString(),

              description:
                description || null,

              contactName:
                contactName || null,

              contactPhone:
                contactPhone || null,

              contactEmail:
                contactEmail || null,
            }),
          }
        );

      let data: any = null;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "El servidor devolvió una respuesta inválida."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo guardar el avistamiento."
        );
      }

      const sighting =
        data as CreatedSighting;

      if (!sighting?.id) {
        throw new Error(
          "El avistamiento se creó pero el servidor no devolvió su ID."
        );
      }

      // ====================================
      // PASO 2 - SUBIR FOTO
      // ====================================

      if (photo) {
        await uploadPhoto(
          sighting.id
        );
      }

      // ====================================
      // TERMINADO
      // ====================================

      router.push(
        "/sightings"
      );

      router.refresh();

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding:
          "40px 24px 80px",
      }}
    >
      {/* VOLVER */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#0f766e",
            fontWeight: 800,
            fontSize: "16px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            border: "1px solid #99f6e4",
            borderRadius: "12px",
            background: "#f0fdfa",
          }}
        >
          ← Volver al inicio
        </Link>
      </div>

      <section
        style={{
          background: "white",
          padding: "32px",
          borderRadius: "22px",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              marginBottom: "8px",
            }}
          >
            Reportar avistamiento
          </h1>

          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            Contanos dónde y cómo viste
            a la mascota.
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            display: "grid",
            gap: "20px",
          }}
        >
          {/* FOTO */}

          <div>
            <h2>
              📷 Foto
            </h2>

            <p
              style={{
                color: "#64748b",
              }}
            >
              Una foto puede ayudar a
              encontrar coincidencias con
              mascotas perdidas.
            </p>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handlePhotoChange
              }
            />

            {photoPreview && (
              <div
                style={{
                  marginTop:
                    "16px",
                }}
              >
                <img
                  src={
                    photoPreview
                  }
                  alt="Vista previa del avistamiento"
                  style={{
                    width: "100%",
                    maxWidth:
                      "420px",
                    height:
                      "280px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "16px",
                    border:
                      "1px solid #e2e8f0",
                  }}
                />

                <div
                  style={{
                    marginTop:
                      "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        photoPreview
                      ) {
                        URL.revokeObjectURL(
                          photoPreview
                        );
                      }

                      setPhoto(
                        null
                      );

                      setPhotoPreview(
                        ""
                      );
                    }}
                    style={{
                      border:
                        "1px solid #cbd5e1",
                      background:
                        "white",
                      borderRadius:
                        "10px",
                      padding:
                        "8px 12px",
                      cursor:
                        "pointer",
                    }}
                  >
                    Quitar foto
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr />

          {/* DATOS MASCOTA */}

          <h2>
            🐾 Mascota avistada
          </h2>

          <div>
            <label>
              Especie *
            </label>

            <select
              value={species}
              onChange={(event) => {
                setSpecies(
                  event.target.value
                );

                setBreed("");
              }}
              required
              style={inputStyle}
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

            {breeds.length >
            0 ? (
              <select
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
              >
                <option value="">
                  Seleccionar raza
                </option>

                {breeds.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            ) : (
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
                placeholder="Raza o tipo"
                style={
                  inputStyle
                }
              />
            )}
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
              placeholder="Ej: marrón y blanco"
              style={inputStyle}
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
              style={inputStyle}
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
              style={inputStyle}
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

          {/* UBICACIÓN */}

          <h2>
            📍 Ubicación del avistamiento
          </h2>

          <div>
            <label>
              Dirección *
            </label>

            <input
              value={address}
              onChange={(
                event
              ) =>
                setAddress(
                  event.target
                    .value
                )
              }
              required
              placeholder="Ej: Av. Márquez 2500"
              style={inputStyle}
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
              ) =>
                setNeighborhood(
                  event.target
                    .value
                )
              }
              placeholder="Ej: José León Suárez"
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            onClick={
              useCurrentLocation
            }
            disabled={locating}
            style={{
              padding:
                "12px 18px",
              border:
                "1px solid #0f766e",
              borderRadius:
                "12px",
              background:
                "white",
              color:
                "#0f766e",
              fontWeight: 700,
              cursor:
                locating
                  ? "wait"
                  : "pointer",
            }}
          >
            {locating
              ? "Obteniendo ubicación..."
              : "📍 Usar mi ubicación actual"}
          </button>

          {locationMessage && (
            <div
              style={{
                padding:
                  "12px",
                borderRadius:
                  "10px",
                background:
                  "#ecfdf5",
                color:
                  "#047857",
              }}
            >
              {
                locationMessage
              }
            </div>
          )}

          {(latitude ||
            longitude) && (
            <div
              style={{
                padding:
                  "14px",
                borderRadius:
                  "12px",
                background:
                  "#f8fafc",
                color:
                  "#475569",
              }}
            >
              <strong>
                Coordenadas:
              </strong>

              <div>
                Latitud:{" "}
                {latitude ||
                  "-"}
              </div>

              <div>
                Longitud:{" "}
                {longitude ||
                  "-"}
              </div>
            </div>
          )}

          <hr />

          {/* FECHA */}

          <div>
            <label>
              Fecha y hora
            </label>

            <input
              type="datetime-local"
              value={sightedAt}
              onChange={(
                event
              ) =>
                setSightedAt(
                  event.target
                    .value
                )
              }
              style={inputStyle}
            />
          </div>

          {/* DESCRIPCIÓN */}

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
              placeholder="Ej: Lo vi cerca de la plaza, caminando solo..."
              style={{
                ...inputStyle,
                resize:
                  "vertical",
              }}
            />
          </div>

          <hr />

          {/* CONTACTO */}

          <h2>
            Datos de contacto
          </h2>

          <div>
            <label>
              Nombre
            </label>

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
              style={inputStyle}
            />
          </div>

          <div>
            <label>
              Teléfono
            </label>

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
              style={inputStyle}
            />
          </div>

          <div>
            <label>
              Email
            </label>

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
              style={inputStyle}
            />
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={{
                padding:
                  "12px",
                borderRadius:
                  "10px",
                background:
                  "#fee2e2",
                color:
                  "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          {/* PUBLICAR */}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding:
                "14px 20px",
              border: "none",
              borderRadius:
                "14px",
              background:
                "#14b8a6",
              color: "white",
              fontWeight: 800,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
              opacity:
                loading
                  ? 0.7
                  : 1,
            }}
          >
            {loading
              ? photo
                ? "Guardando y subiendo foto..."
                : "Guardando..."
              : "Publicar avistamiento"}
          </button>
        </form>
      </section>
    </main>
  );
}