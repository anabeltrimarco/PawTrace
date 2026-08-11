"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

import {
  ChangeEvent,
  FormEvent,
  useRef,
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
// ENUMS FRONTEND → BACKEND
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

export default function ReportFound() {
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

  // Evita doble publicación
  const submittingRef =
    useRef(false);

  // ========================================
  // UBICACIÓN
  // ========================================

  const handleLocationChange = (
    lat: number,
    lng: number,
    approximateAddress?: string
  ) => {
    setLatitude(lat);

    setLongitude(lng);

    setAddress(
      approximateAddress || ""
    );
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

      event.target.value = "";

      setError(
        "La foto debe ser JPG, PNG o WEBP."
      );

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

      event.target.value = "";

      setError(
        "La foto no puede superar los 10 MB."
      );

      return;
    }

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setPhoto(file);

    setPreview(
      URL.createObjectURL(
        file
      )
    );
  };

  // ========================================
  // QUITAR FOTO
  // ========================================

  const removePhoto = () => {
    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setPhoto(null);

    setPreview(null);

    setError("");
  };

  // ========================================
  // AUTH OPCIONAL
  // ========================================

  function getAuthHeaders():
    Record<string, string> {
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
  // LEER RESPUESTA JSON
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

      // Evitar doble click
      if (
        submittingRef.current
      ) {
        return;
      }

      setError("");

      setSuccess("");

      const form =
        event.currentTarget;

      const formData =
        new FormData(form);

      // ====================================
      // CAMPOS
      // ====================================

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

      const ubicacion =
        String(
          formData.get(
            "ubicacion"
          ) || ""
        ).trim();

      const fechaEncontrada =
        String(
          formData.get(
            "fechaEncontrada"
          ) || ""
        ).trim();

      const telefono =
        String(
          formData.get(
            "telefono"
          ) || ""
        ).trim();

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
        !especie ||
        !ubicacion ||
        !fechaEncontrada ||
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
          "Buscá una dirección o marcá en el mapa dónde encontraste la mascota."
        );

        return;
      }

      // IMPORTANTE:
      // La foto NO es obligatoria.

      const backendSpecies =
        speciesMap[especie];

      const backendSize =
        sizeMap[tamano];

      if (!backendSpecies) {
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

      submittingRef.current =
        true;

      setIsSubmitting(true);

      try {
        const API_URL =
          process.env
            .NEXT_PUBLIC_API_URL ||
          "http://localhost:5000/api";

        // ==================================
        // PASO 1
        // CREAR REPORTE ENCONTRADO
        // ==================================

        const payload = {
          species:
            backendSpecies,

          breed:
            backendBreed || null,

          color:
            color || null,

          size:
            backendSize,

          gender:
            "unknown",

          description:
            descripcion,

          address:
            address ||
            ubicacion,

          latitude,

          longitude,

          foundAt:
            `${fechaEncontrada}T12:00:00`,

          contactPhone:
            telefono,
        };

        console.log(
          "📤 Creando FoundReport:",
          payload
        );

        const reportResponse =
          await fetch(
            `${API_URL}/found-reports`,
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
                  payload
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
              "No se pudo publicar la mascota encontrada."
          );
        }

        const reportId =
          reportResult.id;

        if (!reportId) {
          throw new Error(
            "El backend creó el reporte pero no devolvió su ID."
          );
        }

        console.log(
          "✅ FoundReport creado:",
          reportId
        );

        // ==================================
        // PASO 2
        // SUBIR FOTO SOLO SI EXISTE
        // ==================================

        if (photo) {
          const photoFormData =
            new FormData();

          photoFormData.append(
            "photo",
            photo
          );

          console.log(
            "📷 Subiendo foto..."
          );

          const photoResponse =
            await fetch(
              `${API_URL}/found-reports/${reportId}/photos`,
              {
                method:
                  "POST",

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
                "El reporte se creó, pero no se pudo guardar la foto."
            );
          }

          console.log(
            "✅ Foto guardada:",
            photoResult
          );
        } else {
          console.log(
            "ℹ️ Reporte publicado sin foto."
          );
        }

        // ==================================
        // ÉXITO
        // ==================================

        setSuccess(
          photo
            ? "🐾 Mascota encontrada publicada correctamente con foto."
            : "🐾 Mascota encontrada publicada correctamente."
        );

        // ==================================
        // LIMPIAR
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

        setPhoto(null);

        if (preview) {
          URL.revokeObjectURL(
            preview
          );
        }

        setPreview(null);

        window.scrollTo({
          top: 0,
          behavior:
            "smooth",
        });
      } catch (err) {
        console.error(
          "❌ Error publicando encontrada:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al publicar la mascota encontrada."
        );
      } finally {
        submittingRef.current =
          false;

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
        Reportar mascota encontrada
      </h1>

      <p className="lead">
        Ayudá a que su familia
        pueda encontrarla.
      </p>

      {/* ==================================
          MENSAJE DE ÉXITO
      ================================== */}

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

              gap:
                "10px",

              flexWrap:
                "wrap",
            }}
          >
            <Link
              href="/reportes"
              style={{
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

              // Al cambiar de especie,
              // limpiamos la raza anterior.
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
            Raza aproximada
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
            Si no estás segura de la
            raza, elegí Mestizo,
            Otra o Desconocida.
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
            placeholder="Ej: Negro y blanco"
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
            UBICACIÓN
        ================================== */}

        <div className="form-group">
          <label htmlFor="ubicacion">
            Ubicación donde fue encontrada *
          </label>

          <input
            id="ubicacion"
            type="text"
            name="ubicacion"
            placeholder="Ej: Villa Ballester, San Martín"
            required
          />
        </div>

        {/* ==================================
            FECHA
        ================================== */}

        <div className="form-group">
          <label htmlFor="fechaEncontrada">
            Fecha *
          </label>

          <input
            id="fechaEncontrada"
            type="date"
            name="fechaEncontrada"
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
            MAPA
        ================================== */}

        <div className="form-group full">
          <LocationPicker
            type="found"
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
                    "#f0fdf4",

                  color:
                    "#065f46",

                  border:
                    "1px solid #bbf7d0",
                }}
              >
                <strong
                  style={{
                    display:
                      "block",

                    marginBottom:
                      "8px",

                    color:
                      "#047857",
                  }}
                >
                  📍 Ubicación seleccionada
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
            placeholder="Collar, comportamiento, estado de salud, características especiales..."
            required
          />
        </div>

        {/* ==================================
            FOTO OPCIONAL
        ================================== */}

        <div className="form-group full">
          <label>
            Foto (opcional)
          </label>

          {!preview ? (
            <label className="upload-box">
              <input
                type="file"
                name="foto"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handlePhotoChange
                }
              />

              <span className="upload-icon">
                📷
              </span>

              <strong>
                Agregá una foto si la tenés
              </strong>

              <small>
                JPG • PNG • WEBP • hasta 10 MB
              </small>
            </label>
          ) : (
            <div
              style={{
                border:
                  "2px dashed #10b981",

                borderRadius:
                  "18px",

                padding:
                  "20px",

                textAlign:
                  "center",

                background:
                  "#f0fdf4",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Vista previa de la mascota encontrada"
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
                    "0 0 6px",

                  fontWeight:
                    700,

                  color:
                    "#047857",
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
                      "#64748b",

                    fontSize:
                      "13px",
                  }}
                >
                  {photo.name}
                </p>
              )}

              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "center",

                  gap:
                    "10px",

                  flexWrap:
                    "wrap",
                }}
              >
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
                      "#10b981",

                    color:
                      "#ffffff",

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

                <button
                  type="button"
                  onClick={
                    removePhoto
                  }
                  style={{
                    padding:
                      "10px 22px",

                    borderRadius:
                      "10px",

                    border:
                      "1px solid #d1d5db",

                    background:
                      "#ffffff",

                    cursor:
                      "pointer",

                    fontWeight:
                      600,
                  }}
                >
                  Quitar foto
                </button>
              </div>
            </div>
          )}

          <small
            style={{
              display:
                "block",

              marginTop:
                "10px",

              color:
                "#64748b",
            }}
          >
            Podés publicar el
            reporte aunque no tengas
            una foto.
          </small>
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
            : "Publicar mascota encontrada"}
        </button>
      </form>
    </main>
  );
}