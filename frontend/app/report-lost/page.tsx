"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";

// ==========================================
// LOCATION PICKER
// ==========================================

type LocationPickerProps = {
  type: "lost" | "found";

  onChange: (
    lat: number,
    lng: number,
    address?: string
  ) => void;
};

const LocationPicker =
  dynamic<LocationPickerProps>(
    () =>
      import(
        "../../components/LocationPicker"
      ),
    {
      ssr: false,

      loading: () => (
        <div
          style={{
            height: "350px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border:
              "1px solid #dce8e4",
            borderRadius: "18px",
            background: "#f7faf9",
          }}
        >
          Cargando mapa...
        </div>
      ),
    }
  );

// ==========================================
// MAPEO FRONTEND → BACKEND
// ==========================================

const speciesMap: Record<
  string,
  "dog" | "cat" | "other"
> = {
  Perro: "dog",
  Gato: "cat",
  Otro: "other",
};

const sizeMap: Record<
  string,
  "small" | "medium" | "large"
> = {
  Chico: "small",
  Mediano: "medium",
  Grande: "large",
};

// ==========================================
// RAZAS - SPRINT 1.4.3.3
// ==========================================

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
  "Ovejero Alemán / Pastor Alemán",
  "Ovejero Belga / Pastor Belga",
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
  "Abisinio",
  "Angora",
  "Azul Ruso",
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

const OTHER_BREEDS = [
  "Otra",
  "Desconocida",
];


// ==========================================
// NORMALIZACIÓN DE RAZAS PARA BACKEND
// Mantiene etiquetas amigables en pantalla,
// pero guarda valores consistentes.
// ==========================================

const BREED_BACKEND_MAP: Record<string, string> = {
  "Ovejero Alemán / Pastor Alemán":
    "Pastor Alemán",

  "Ovejero Belga / Pastor Belga":
    "Pastor Belga",
};

function normalizeBreedForBackend(
  breed: string
) {
  return (
    BREED_BACKEND_MAP[breed] ||
    breed
  );
}


function getBreedsBySpecies(
  species: string
) {
  if (species === "Perro") {
    return DOG_BREEDS;
  }

  if (species === "Gato") {
    return CAT_BREEDS;
  }

  return OTHER_BREEDS;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ReportLost() {
  // ========================================
  // ESPECIE / RAZA
  // ========================================

  const [
    selectedSpecies,
    setSelectedSpecies,
  ] = useState("Perro");

  const [
    selectedBreed,
    setSelectedBreed,
  ] = useState("");

  const availableBreeds =
    getBreedsBySpecies(
      selectedSpecies
    );

  // ========================================
  // UBICACIÓN
  // ========================================

  const [
    latitude,
    setLatitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    longitude,
    setLongitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    address,
    setAddress,
  ] = useState("");

  const [
    ubicacionInput,
    setUbicacionInput,
  ] = useState("");

  // ========================================
  // FOTO
  // ========================================

  const [
    photo,
    setPhoto,
  ] =
    useState<File | null>(
      null
    );

  const [
    preview,
    setPreview,
  ] =
    useState<string | null>(
      null
    );

  // ========================================
  // ESTADO
  // ========================================

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  // ========================================
  // UBICACIÓN DESDE MAPA/BUSCADOR
  // ========================================

  const handleLocationChange = (
    lat: number,
    lng: number,
    approximateAddress?: string
  ) => {
    setLatitude(lat);

    setLongitude(lng);

    if (approximateAddress) {
      setAddress(
        approximateAddress
      );

      setUbicacionInput(
        approximateAddress
      );
    }
  };

  // ========================================
  // FOTO
  // ========================================

  const handlePhotoChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setError("");

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
      setPhoto(null);

      setPreview(null);

      setError(
        "La foto debe ser JPG, PNG o WEBP."
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      setPhoto(null);

      setPreview(null);

      setError(
        "La foto no puede superar los 10 MB."
      );

      event.target.value = "";

      return;
    }

    setPhoto(file);

    setPreview(
      URL.createObjectURL(
        file
      )
    );
  };

  // ========================================
  // AUTH OPCIONAL
  // ========================================

  function getAuthHeaders() {
    if (
      typeof window ===
      "undefined"
    ) {
      return {};
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      return {};
    }

    return {
      Authorization:
        `Bearer ${token}`,
    };
  }

  // ========================================
  // LEER RESPUESTA
  // ========================================

  async function readJsonResponse(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  // ========================================
  // SUBMIT
  // ========================================

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");

      setSuccess("");

      const form =
        event.currentTarget;

      const formData =
        new FormData(form);

      const nombre =
        String(
          formData.get(
            "nombre"
          ) || ""
        ).trim();

      const especie =
        String(
          formData.get(
            "especie"
          ) || ""
        ).trim();

      const raza =
        String(
          formData.get(
            "raza"
          ) || ""
        ).trim();

      const backendBreed =
        normalizeBreedForBackend(
          raza
        );

      const color =
        String(
          formData.get(
            "color"
          ) || ""
        ).trim();

      const tamano =
        String(
          formData.get(
            "tamano"
          ) || ""
        ).trim();

      const fechaPerdida =
        String(
          formData.get(
            "fechaPerdida"
          ) || ""
        ).trim();

      const telefono =
        String(
          formData.get(
            "telefono"
          ) || ""
        ).trim();

      const recompensa =
        String(
          formData.get(
            "recompensa"
          ) || ""
        ).trim();

      const rewardAmount =
        recompensa
          ? Number(recompensa)
          : null;

      if (
        rewardAmount !== null &&
        (
          !Number.isFinite(
            rewardAmount
          ) ||
          rewardAmount < 0
        )
      ) {
        setError(
          "La recompensa debe ser un importe válido."
        );

        return;
      }

      const descripcion =
        String(
          formData.get(
            "descripcion"
          ) || ""
        ).trim();

      // ====================================
      // VALIDACIONES
      // ====================================

      if (
        !nombre ||
        !especie ||
        !raza ||
        !ubicacionInput.trim() ||
        !fechaPerdida ||
        !telefono ||
        !descripcion
      ) {
        setError(
          "Completá todos los campos obligatorios."
        );

        return;
      }

      if (
        latitude === null ||
        longitude === null
      ) {
        setError(
          "Buscá una dirección o marcá en el mapa dónde se perdió la mascota."
        );

        return;
      }

      // ====================================
      // FOTO OBLIGATORIA
      // ====================================

      if (!photo) {
        setError(
          "Debés cargar una foto de la mascota perdida."
        );

        return;
      }

      const backendSpecies =
        speciesMap[especie];

      const backendSize =
        sizeMap[tamano];

      if (
        !backendSpecies
      ) {
        setError(
          "La especie seleccionada no es válida."
        );

        return;
      }

      if (!backendSize) {
        setError(
          "El tamaño seleccionado no es válido."
        );

        return;
      }

      // FOTO OBLIGATORIA:
      // siempre se sube antes de crear el reporte.

      setIsSubmitting(true);

      try {
        const API_URL =
          process.env
            .NEXT_PUBLIC_API_URL ||
          "http://localhost:5000/api";

        // ==================================
        // PASO 1
        // CREAR MASCOTA
        // ==================================

        const petResponse =
          await fetch(
            `${API_URL}/pets`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                ...getAuthHeaders(),
              },

              body:
                JSON.stringify(
                  {
                    name:
                      nombre,

                    species:
                      backendSpecies,

                    breed:
                      backendBreed ||
                      null,

                    color:
                      color ||
                      null,

                    size:
                      backendSize,

                    gender:
                      "unknown",

                    description:
                      descripcion,
                  }
                ),
            }
          );

        const petResult =
          await readJsonResponse(
            petResponse
          );

        if (
          !petResponse.ok
        ) {
          console.error(
            "Error creando mascota:",
            petResult
          );

          throw new Error(
            petResult.error ||
              petResult
                .errores?.[0]
                ?.msg ||
              "No se pudo registrar la mascota."
          );
        }

        const petId =
          petResult.id;

        if (!petId) {
          throw new Error(
            "El backend no devolvió el ID de la mascota."
          );
        }

        console.log(
          "✅ Mascota creada:",
          petResult
        );

        // ==================================
        // PASO 2
        // SUBIR FOTO A PET_PHOTOS
        // ==================================

        if (photo) {
          const photoFormData =
            new FormData();

          /*
           * IMPORTANTE:
           * El backend espera que el campo
           * multipart se llame "photo".
           */
          photoFormData.append(
            "photo",
            photo
          );

          const photoResponse =
            await fetch(
              `${API_URL}/pets/${petId}/photos`,
              {
                method:
                  "POST",

                /*
                 * NO agregar Content-Type.
                 *
                 * El navegador genera:
                 * multipart/form-data;
                 * boundary=...
                 */
                headers: {
                  ...getAuthHeaders(),
                },

                body:
                  photoFormData,
              }
            );

          const photoResult =
            await readJsonResponse(
              photoResponse
            );

          if (
            !photoResponse.ok
          ) {
            console.error(
              "❌ Error subiendo foto:",
              photoResult
            );

            throw new Error(
              photoResult.error ||
                photoResult.message ||
                "La mascota se creó, pero no se pudo guardar la foto."
            );
          }

          console.log(
            "✅ Foto guardada:",
            photoResult
          );
        }

        // ==================================
        // PASO 3
        // CREAR LOST REPORT + LOCATION
        // ==================================

        const reportResponse =
          await fetch(
            `${API_URL}/lost-reports`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                ...getAuthHeaders(),
              },

              body:
                JSON.stringify(
                  {
                    petId,

                    // ======================
                    // LOCATION
                    // ======================

                    address:
                      address ||
                      ubicacionInput.trim(),

                    latitude,

                    longitude,

                    // ======================
                    // LOST REPORT
                    // ======================

                    lastSeenAt:
                      `${fechaPerdida}T12:00:00`,

                    contactPhone:
                      telefono,

                    rewardAmount,

                    publicNotes:
                      descripcion,
                  }
                ),
            }
          );

        const reportResult =
          await readJsonResponse(
            reportResponse
          );

        if (
          !reportResponse.ok
        ) {
          console.error(
            "❌ Error creando reporte:",
            reportResult
          );

          throw new Error(
            reportResult.error ||
              reportResult
                .errores?.[0]
                ?.msg ||
              "La mascota se registró, pero no se pudo crear el reporte de pérdida."
          );
        }

        console.log(
          "✅ Reporte creado:",
          reportResult
        );

        // ==================================
        // ÉXITO
        // ==================================

        setSuccess(
          "🐾 Mascota perdida publicada correctamente con su foto."
        );

        // ==================================
        // LIMPIAR FORMULARIO
        // ==================================

        form.reset();

        setSelectedSpecies(
          "Perro"
        );

        setSelectedBreed(
          ""
        );

        setLatitude(null);

        setLongitude(null);

        setAddress("");

        setUbicacionInput("");

        setPhoto(null);

        if (preview) {
          URL.revokeObjectURL(
            preview
          );
        }

        setPreview(null);

        // Dejamos la pantalla en el mensaje
        // de confirmación.
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior:
              "smooth",
          });
        }, 100);
      } catch (err) {
        console.error(
          "Error publicando mascota:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al publicar la mascota."
        );
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  // ==========================================
  // UI
  // ==========================================

  return (
    <main className="container form-page">
      <Link href="/">
        ← Volver
      </Link>

      <h1>
        Reportar mascota perdida
      </h1>

      <p className="lead">
        Completá los datos
        principales para activar
        la búsqueda.
      </p>

      {/* ====================================
          MENSAJE DE ÉXITO
      ==================================== */}

      {success && (
        <div
          style={{
            marginBottom:
              "18px",

            padding:
              "16px 18px",

            borderRadius:
              "14px",

            background:
              "#f0fdf4",

            border:
              "1px solid #bbf7d0",

            color:
              "#047857",

            fontWeight:
              700,
          }}
        >
          ✅ {success}

          <div
            style={{
              marginTop:
                "12px",

              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                "10px",
            }}
          >
            <Link
              href="/reportes"
              style={{
                display:
                  "inline-flex",

                padding:
                  "9px 14px",

                borderRadius:
                  "10px",

                background:
                  "#047857",

                color:
                  "#ffffff",

                textDecoration:
                  "none",

                fontWeight:
                  700,
              }}
            >
              Ver en Reportes
            </Link>

            <Link
              href="/map"
              style={{
                display:
                  "inline-flex",

                padding:
                  "9px 14px",

                borderRadius:
                  "10px",

                border:
                  "1px solid #047857",

                color:
                  "#047857",

                textDecoration:
                  "none",

                fontWeight:
                  700,
              }}
            >
              Ver en el mapa
            </Link>
          </div>
        </div>
      )}

      <form
        className="card form-grid"
        onSubmit={
          handleSubmit
        }
      >
        {/* ==================================
            NOMBRE
        ================================== */}

        <div className="form-group">
          <label htmlFor="nombre">
            Nombre de la mascota *
          </label>

          <input
            id="nombre"
            type="text"
            name="nombre"
            placeholder="Ej: Luna"
            required
          />
        </div>

        {/* ==================================
            ESPECIE
        ================================== */}

        <div className="form-group">
          <label htmlFor="especie">
            Especie *
          </label>

          <select
            id="especie"
            name="especie"
            value={
              selectedSpecies
            }
            onChange={(
              event
            ) => {
              setSelectedSpecies(
                event.target.value
              );

              setSelectedBreed(
                ""
              );
            }}
            required
          >
            <option value="Perro">
              Perro
            </option>

            <option value="Gato">
              Gato
            </option>

            <option value="Otro">
              Otro
            </option>
          </select>
        </div>

        {/* ==================================
            RAZA
        ================================== */}

        <div className="form-group">
          <label htmlFor="raza">
            Raza *
          </label>

          <select
            id="raza"
            name="raza"
            value={
              selectedBreed
            }
            onChange={(
              event
            ) => {
              setSelectedBreed(
                event.target.value
              );
            }}
            required
          >
            <option value="">
              Seleccioná una raza
            </option>

            {availableBreeds.map(
              (breed) => (
                <option
                  key={breed}
                  value={breed}
                >
                  {breed}
                </option>
              )
            )}
          </select>

          <small
            style={{
              marginTop:
                "6px",
              color:
                "#64748b",
            }}
          >
            Si no sabés la raza,
            elegí Mestizo, Otra
            o Desconocida.
          </small>
        </div>

        {/* ==================================
            COLOR
        ================================== */}

        <div className="form-group">
          <label htmlFor="color">
            Color
          </label>

          <input
            id="color"
            type="text"
            name="color"
            placeholder="Ej: Blanco con manchas marrones"
          />
        </div>

        {/* ==================================
            TAMAÑO
        ================================== */}

        <div className="form-group">
          <label htmlFor="tamano">
            Tamaño
          </label>

          <select
            id="tamano"
            name="tamano"
            defaultValue="Mediano"
          >
            <option value="Chico">
              Chico
            </option>

            <option value="Mediano">
              Mediano
            </option>

            <option value="Grande">
              Grande
            </option>
          </select>
        </div>

        {/* ==================================
            UBICACIÓN TEXTO
        ================================== */}

        <div className="form-group">
          <label htmlFor="ubicacion">
            Última ubicación *
          </label>

          <input
            id="ubicacion"
            type="text"
            name="ubicacion"
            value={
              ubicacionInput
            }
            onChange={(
              event
            ) => {
              setUbicacionInput(
                event.target.value
              );
            }}
            placeholder="Ej: Villa Ballester, San Martín"
            required
          />
        </div>

        {/* ==================================
            FECHA
        ================================== */}

        <div className="form-group">
          <label htmlFor="fechaPerdida">
            Fecha de pérdida *
          </label>

          <input
            id="fechaPerdida"
            type="date"
            name="fechaPerdida"
            required
          />
        </div>

        {/* ==================================
            TELÉFONO
        ================================== */}

        <div className="form-group">
          <label htmlFor="telefono">
            Teléfono de contacto *
          </label>

          <input
            id="telefono"
            type="tel"
            name="telefono"
            placeholder="Ej: 11 3248 3391"
            required
          />
        </div>

        {/* ==================================
            RECOMPENSA
        ================================== */}

        <div className="form-group">
          <label htmlFor="recompensa">
            Recompensa ofrecida
          </label>

          <div
            style={{
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#64748b",
                fontWeight: 700,
                pointerEvents: "none",
              }}
            >
              $
            </span>

            <input
              id="recompensa"
              type="number"
              name="recompensa"
              min="0"
              step="1"
              placeholder="Ej: 50000"
              style={{
                paddingLeft: "32px",
              }}
            />
          </div>

          <small
            style={{
              display: "block",
              marginTop: "6px",
              color: "#64748b",
            }}
          >
            Opcional. Dejalo vacío si no ofrecés recompensa.
          </small>
        </div>

        {/* ==================================
            MAPA
        ================================== */}

        <div className="form-group full">
          <LocationPicker
            type="lost"
            onChange={
              handleLocationChange
            }
          />

          {latitude !== null &&
            longitude !== null && (
              <div
                style={{
                  marginTop:
                    "12px",

                  padding:
                    "16px",

                  borderRadius:
                    "14px",

                  background:
                    "#fff5f5",

                  color:
                    "#7f1d1d",

                  border:
                    "1px solid #fecaca",
                }}
              >
                <strong
                  style={{
                    display:
                      "block",

                    marginBottom:
                      "8px",

                    color:
                      "#b91c1c",
                  }}
                >
                  📍 Ubicación
                  seleccionada
                </strong>

                {address && (
                  <div
                    style={{
                      marginBottom:
                        "10px",
                    }}
                  >
                    <strong>
                      Dirección:
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "4px",
                      }}
                    >
                      {address}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    fontSize:
                      "14px",

                    color:
                      "#64736f",
                  }}
                >
                  <strong>
                    Coordenadas
                  </strong>

                  <br />

                  Latitud:{" "}
                  {latitude.toFixed(
                    6
                  )}

                  <br />

                  Longitud:{" "}
                  {longitude.toFixed(
                    6
                  )}
                </div>
              </div>
            )}
        </div>

        {/* ==================================
            DESCRIPCIÓN
        ================================== */}

        <div className="form-group full">
          <label htmlFor="descripcion">
            Descripción *
          </label>

          <textarea
            id="descripcion"
            name="descripcion"
            placeholder="Collar, carácter, si responde a su nombre, características especiales..."
            required
          />
        </div>

        {/* ==================================
            FOTO
        ================================== */}

        <div className="form-group full">
          <label>
            Foto de la mascota *
          </label>

          <p
            style={{
              margin: "0 0 12px",
              color: "#64736f",
              fontSize: "14px",
            }}
          >
            La foto es obligatoria y nos permite
            compararla con mascotas encontradas
            mediante inteligencia artificial.
          </p>

          {!preview ? (
            <label className="upload-box">
              <input
                type="file"
                name="foto"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handlePhotoChange
                }
                required
              />

              <span className="upload-icon">
                📷
              </span>

              <strong>
                Arrastrá una foto
                o hacé clic para
                subirla
              </strong>

              <small>
                JPG • PNG • WEBP •
                hasta 10 MB
              </small>
            </label>
          ) : (
            <div
              style={{
                border:
                  "2px dashed #ef4444",

                borderRadius:
                  "18px",

                padding:
                  "20px",

                textAlign:
                  "center",

                background:
                  "#fff5f5",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Vista previa de la mascota"
                style={{
                  width:
                    "100%",

                  maxWidth:
                    "360px",

                  maxHeight:
                    "280px",

                  objectFit:
                    "cover",

                  borderRadius:
                    "16px",

                  marginBottom:
                    "15px",
                }}
              />

              <p
                style={{
                  margin:
                    "0 0 12px",

                  fontWeight:
                    700,

                  color:
                    "#b91c1c",
                }}
              >
                ✅ Foto seleccionada
              </p>

              {photo && (
                <p
                  style={{
                    margin:
                      "0 0 12px",

                    color:
                      "#64736f",

                    fontSize:
                      "13px",
                  }}
                >
                  {photo.name}
                </p>
              )}

              <label
                style={{
                  display:
                    "inline-flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  padding:
                    "10px 22px",

                  background:
                    "#ef4444",

                  color:
                    "#fff",

                  borderRadius:
                    "10px",

                  cursor:
                    "pointer",

                  fontWeight:
                    600,
                }}
              >
                Cambiar foto

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={
                    handlePhotoChange
                  }
                  style={{
                    display:
                      "none",
                  }}
                />
              </label>
            </div>
          )}

          {photo && (
            <small
              style={{
                display:
                  "block",

                marginTop:
                  "9px",

                color:
                  "#047857",

                fontWeight:
                  600,
              }}
            >
              ✅ Esta foto se
              guardará junto con
              la mascota al
              publicar.
            </small>
          )}
        </div>

        {/* ==================================
            ERROR
        ================================== */}

        {error && (
          <div
            className="full"
            style={{
              padding:
                "14px 16px",

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

        {/* ==================================
            BOTÓN
        ================================== */}

        <button
          type="submit"
          className="btn-primary full"
          disabled={
            isSubmitting
          }
          style={{
            opacity:
              isSubmitting
                ? 0.7
                : 1,

            cursor:
              isSubmitting
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isSubmitting
            ? "Publicando..."
            : "Publicar búsqueda"}
        </button>
      </form>
    </main>
  );
}