"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import AddressSearch from "../../components/map/AddressSearch";

// ==========================================
// TIPOS
// ==========================================

type LocationData = {
  id?: string;
  address?: string | null;
  neighborhood?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type PetData = {
  id?: string;
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  description?: string | null;
};

type LostReport = {
  id: string;
  status?: string | null;
  lastSeenAt?: string | null;
  contactPhone?: string | null;
  publicNotes?: string | null;
  pet?: PetData | null;
  location?: LocationData | null;
};

type FoundReport = {
  id: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  foundAt?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  status?: string | null;
  location?: LocationData | null;
};

type Sighting = {
  id: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  size?: string | null;
  description?: string | null;
  sightedAt?: string | null;
  contactPhone?: string | null;
  location?: LocationData | null;
};

type MapMarker = {
  id: string;
  type: "lost" | "found" | "sighting";
  latitude: number;
  longitude: number;
  name: string;
  species: string;
  breed: string;
  color: string;
  size: string;
  date: string;
  description: string;
  address: string;
  phone: string;
};

type FilterType =
  | "all"
  | "lost"
  | "found"
  | "sighting";

type SearchLocation = {
  address: string;
  latitude: number;
  longitude: number;
};

// ==========================================
// ICONO MASCOTA PERDIDA
// ==========================================

const lostIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: #ef4444;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,.25);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <span
        style="
          transform: rotate(45deg);
          font-size: 17px;
        "
      >
        🐾
      </span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// ==========================================
// ICONO MASCOTA ENCONTRADA
// ==========================================

const foundIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: #10b981;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,.25);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <span
        style="
          transform: rotate(45deg);
          font-size: 17px;
        "
      >
        🐾
      </span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// ==========================================
// ICONO AVISTAMIENTO
// ==========================================

const sightingIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: #8b5cf6;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,.25);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <span style="transform: rotate(45deg); font-size: 17px;">
        👀
      </span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// ==========================================
// ICONO UBICACIÓN BUSCADA
// ==========================================

const searchIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 42px;
        height: 42px;
        border-radius: 50% 50% 50% 0;
        background: #2563eb;
        border: 3px solid white;
        box-shadow: 0 5px 16px rgba(0,0,0,.30);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      "
    >
      <span
        style="
          transform: rotate(45deg);
          font-size: 19px;
        "
      >
        📍
      </span>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -42],
});

// ==========================================
// HELPERS
// ==========================================

function speciesLabel(
  species?: string | null
) {
  switch (species) {
    case "dog":
      return "Perro";

    case "cat":
      return "Gato";

    case "other":
      return "Otro";

    default:
      return (
        species ||
        "No especificada"
      );
  }
}

function sizeLabel(
  size?: string | null
) {
  switch (size) {
    case "small":
      return "Chico";

    case "medium":
      return "Mediano";

    case "large":
      return "Grande";

    case "unknown":
      return "No especificado";

    default:
      return (
        size ||
        "No especificado"
      );
  }
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Fecha no informada";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Fecha no informada";
  }

  return date.toLocaleDateString(
    "es-AR"
  );
}

function parseCoordinate(
  value?: string | number | null
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return null;
  }

  return parsed;
}

// ==========================================
// LOST REPORT → MARKER
// ==========================================

function createLostMarker(
  report: LostReport
): MapMarker | null {
  const latitude =
    parseCoordinate(
      report.location
        ?.latitude
    );

  const longitude =
    parseCoordinate(
      report.location
        ?.longitude
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    id: report.id,

    type: "lost",

    latitude,

    longitude,

    name:
      report.pet?.name ||
      "Mascota perdida",

    species:
      speciesLabel(
        report.pet?.species
      ),

    breed:
      report.pet?.breed ||
      "No especificada",

    color:
      report.pet?.color ||
      "No especificado",

    size:
      sizeLabel(
        report.pet?.size
      ),

    date:
      formatDate(
        report.lastSeenAt
      ),

    description:
      report.publicNotes ||
      report.pet
        ?.description ||
      "Sin descripción",

    address:
      report.location
        ?.address ||
      "Ubicación no especificada",

    phone:
      report.contactPhone ||
      "No informado",
  };
}

// ==========================================
// FOUND REPORT → MARKER
// ==========================================

function createFoundMarker(
  report: FoundReport
): MapMarker | null {
  const latitude =
    parseCoordinate(
      report.location
        ?.latitude
    );

  const longitude =
    parseCoordinate(
      report.location
        ?.longitude
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    id: report.id,

    type: "found",

    latitude,

    longitude,

    name:
      "Mascota encontrada",

    species:
      speciesLabel(
        report.species
      ),

    breed:
      report.breed ||
      "No especificada",

    color:
      report.color ||
      "No especificado",

    size:
      sizeLabel(
        report.size
      ),

    date:
      formatDate(
        report.foundAt
      ),

    description:
      report.description ||
      "Sin descripción",

    address:
      report.location
        ?.address ||
      "Ubicación no especificada",

    phone:
      report.contactPhone ||
      "No informado",
  };
}

// ==========================================
// AVISTAMIENTO → MARKER
// ==========================================

function createSightingMarker(
  report: Sighting
): MapMarker | null {
  const latitude = parseCoordinate(
    report.location?.latitude
  );
  const longitude = parseCoordinate(
    report.location?.longitude
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    id: report.id,
    type: "sighting",
    latitude,
    longitude,
    name: "Mascota avistada",
    species: speciesLabel(report.species),
    breed: report.breed || "No especificada",
    color: report.color || "No especificado",
    size: sizeLabel(report.size),
    date: formatDate(report.sightedAt),
    description:
      report.description || "Sin descripción",
    address:
      report.location?.address ||
      "Ubicación no especificada",
    phone:
      report.contactPhone || "No informado",
  };
}

// ==========================================
// AJUSTAR MAPA A REPORTES
// ==========================================

function AutoFitBounds({
  markers,
}: {
  markers: MapMarker[];
}) {
  const map =
    useMap();

  useEffect(() => {
    if (
      markers.length === 0
    ) {
      return;
    }

    if (
      markers.length === 1
    ) {
      map.setView(
        [
          markers[0]
            .latitude,
          markers[0]
            .longitude,
        ],
        15
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        markers.map(
          (marker) => [
            marker.latitude,
            marker.longitude,
          ]
        )
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          40,
          40,
        ],

        maxZoom: 15,
      }
    );
  }, [
    map,
    markers,
  ]);

  return null;
}

// ==========================================
// MOVER MAPA A DIRECCIÓN BUSCADA
// ==========================================

function FlyToSearchLocation({
  location,
}: {
  location:
    | SearchLocation
    | null;
}) {
  const map =
    useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.flyTo(
      [
        location.latitude,
        location.longitude,
      ],
      16,
      {
        duration: 1.2,
      }
    );
  }, [
    map,
    location,
  ]);

  return null;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function MapView() {
  const center:
    [number, number] = [
      -34.578,
      -58.538,
    ];

  const [
    lostReports,
    setLostReports,
  ] =
    useState<
      LostReport[]
    >([]);

  const [
    foundReports,
    setFoundReports,
  ] =
    useState<
      FoundReport[]
    >([]);

  const [
    sightings,
    setSightings,
  ] =
    useState<
      Sighting[]
    >([]);

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
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "all"
    );

  // ==========================================
  // DIRECCIÓN BUSCADA
  // ==========================================

  const [
    searchLocation,
    setSearchLocation,
  ] =
    useState<
      SearchLocation | null
    >(null);

  // ==========================================
  // API
  // ==========================================

  const API_URL =
    process.env
      .NEXT_PUBLIC_API_URL ||
    "http://localhost:5000/api";

  // ==========================================
  // CARGAR REPORTES
  // ==========================================

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);

        setError("");

        const [
          lostResponse,
          foundResponse,
          sightingsResponse,
        ] =
          await Promise.all(
            [
              fetch(
                `${API_URL}/lost-reports`
              ),

              fetch(
                `${API_URL}/found-reports`
              ),

              fetch(
                `${API_URL}/sightings`
              ),
            ]
          );

        const lostData =
          await lostResponse.json();

        const foundData =
          await foundResponse.json();

        const sightingsData =
          await sightingsResponse.json();

        if (
          !lostResponse.ok
        ) {
          throw new Error(
            lostData.error ||
              "No se pudieron cargar las mascotas perdidas."
          );
        }

        if (
          !foundResponse.ok
        ) {
          throw new Error(
            foundData.error ||
              "No se pudieron cargar las mascotas encontradas."
          );
        }

        if (
          !sightingsResponse.ok
        ) {
          throw new Error(
            sightingsData.error ||
              "No se pudieron cargar los avistamientos."
          );
        }

        setLostReports(
          Array.isArray(
            lostData
          )
            ? lostData
            : []
        );

        setFoundReports(
          Array.isArray(
            foundData
          )
            ? foundData
            : []
        );

        setSightings(
          Array.isArray(sightingsData)
            ? sightingsData
            : []
        );
      } catch (err) {
        console.error(
          "Error cargando mapa:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los reportes."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [API_URL]);

  // ==========================================
  // TODOS LOS MARCADORES
  // ==========================================

  const allMarkers =
    useMemo<
      MapMarker[]
    >(() => {
      const result:
        MapMarker[] = [];

      lostReports.forEach(
        (report) => {
          const marker =
            createLostMarker(
              report
            );

          if (marker) {
            result.push(
              marker
            );
          }
        }
      );

      foundReports.forEach(
        (report) => {
          const marker =
            createFoundMarker(
              report
            );

          if (marker) {
            result.push(
              marker
            );
          }
        }
      );

      sightings.forEach(
        (report) => {
          const marker =
            createSightingMarker(report);

          if (marker) {
            result.push(marker);
          }
        }
      );

      return result;
    }, [
      lostReports,
      foundReports,
      sightings,
    ]);

  // ==========================================
  // FILTRAR MARCADORES
  // ==========================================

  const visibleMarkers =
    useMemo(() => {
      if (
        filter === "lost"
      ) {
        return allMarkers.filter(
          (marker) =>
            marker.type ===
            "lost"
        );
      }

      if (
        filter === "found"
      ) {
        return allMarkers.filter(
          (marker) =>
            marker.type ===
            "found"
        );
      }

      if (filter === "sighting") {
        return allMarkers.filter(
          (marker) =>
            marker.type === "sighting"
        );
      }

      return allMarkers;
    }, [
      allMarkers,
      filter,
    ]);

  // ==========================================
  // CONTADORES
  // ==========================================

  const lostCount =
    allMarkers.filter(
      (marker) =>
        marker.type ===
        "lost"
    ).length;

  const foundCount =
    allMarkers.filter(
      (marker) =>
        marker.type ===
        "found"
    ).length;

  const sightingCount =
    allMarkers.filter(
      (marker) =>
        marker.type === "sighting"
    ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "520px",

          display:
            "grid",

          placeItems:
            "center",

          borderRadius:
            "22px",

          background:
            "#f7faf9",

          border:
            "1px solid #dce8e4",

          fontWeight: 600,

          color:
            "#64736f",
        }}
      >
        Cargando reportes...
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div
        style={{
          padding:
            "18px",

          borderRadius:
            "16px",

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
    );
  }

  // ==========================================
  // ESTILO BOTONES
  // ==========================================

  const buttonStyle = (
    active: boolean
  ) => ({
    border:
      active
        ? "2px solid #111827"
        : "1px solid #d1d5db",

    background:
      active
        ? "#111827"
        : "#ffffff",

    color:
      active
        ? "#ffffff"
        : "#374151",

    borderRadius:
      "999px",

    padding:
      "9px 16px",

    cursor:
      "pointer",

    fontWeight:
      700,
  });

  return (
    <div>
      {/* ======================================
          BUSCADOR DE DIRECCIONES
      ====================================== */}

      <AddressSearch
        onSelect={(
          location
        ) => {
          setSearchLocation(
            location
          );
        }}
      />

      {/* ======================================
          DIRECCIÓN SELECCIONADA
      ====================================== */}

      {searchLocation && (
        <div
          style={{
            marginBottom:
              "14px",

            padding:
              "12px 16px",

            borderRadius:
              "14px",

            background:
              "#eff6ff",

            border:
              "1px solid #bfdbfe",

            color:
              "#1e40af",

            fontSize:
              "14px",

            fontWeight:
              600,

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            gap:
              "12px",

            flexWrap:
              "wrap",
          }}
        >
          <span>
            📍{" "}
            {
              searchLocation.address
            }
          </span>

          <button
            type="button"
            onClick={() =>
              setSearchLocation(
                null
              )
            }
            style={{
              border: 0,

              background:
                "transparent",

              color:
                "#1e40af",

              cursor:
                "pointer",

              fontWeight:
                800,
            }}
          >
            ✕ Quitar
          </button>
        </div>
      )}

      {/* ======================================
          FILTROS
      ====================================== */}

      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          alignItems:
            "center",

          gap:
            "10px",

          marginBottom:
            "14px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setFilter(
              "all"
            )
          }
          style={buttonStyle(
            filter ===
              "all"
          )}
        >
          Todas (
          {allMarkers.length})
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter(
              "lost"
            )
          }
          style={buttonStyle(
            filter ===
              "lost"
          )}
        >
          🔴 Perdidas (
          {lostCount})
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter(
              "found"
            )
          }
          style={buttonStyle(
            filter ===
              "found"
          )}
        >
          🟢 Encontradas (
          {foundCount})
        </button>

        <button
          type="button"
          onClick={() =>
            setFilter("sighting")
          }
          style={buttonStyle(
            filter === "sighting"
          )}
        >
          🟣 Avistamientos (
          {sightingCount})
        </button>
      </div>

      {/* ======================================
          CANTIDAD
      ====================================== */}

      <div
        style={{
          marginBottom:
            "14px",

          padding:
            "12px 16px",

          borderRadius:
            "14px",

          background:
            "#ffffff",

          border:
            "1px solid #dce8e4",

          color:
            "#64736f",

          fontWeight:
            600,
        }}
      >
        Mostrando{" "}
        {
          visibleMarkers.length
        }{" "}
        reporte
        {visibleMarkers.length ===
        1
          ? ""
          : "s"}
        .
      </div>

      {/* ======================================
          MAPA
      ====================================== */}

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={
          true
        }
        style={{
          width:
            "100%",

          height:
            "520px",

          borderRadius:
            "22px",

          overflow:
            "hidden",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ajuste automático para reportes */}

        <AutoFitBounds
          markers={
            visibleMarkers
          }
        />

        {/* Mover a dirección buscada */}

        <FlyToSearchLocation
          location={
            searchLocation
          }
        />

        {/* ====================================
            MARCADOR DIRECCIÓN BUSCADA
        ==================================== */}

        {searchLocation && (
          <Marker
            position={[
              searchLocation.latitude,
              searchLocation.longitude,
            ]}
            icon={searchIcon}
          >
            <Popup>
              <div
                style={{
                  minWidth:
                    "220px",

                  lineHeight:
                    1.5,
                }}
              >
                <strong
                  style={{
                    display:
                      "block",

                    marginBottom:
                      "7px",

                    color:
                      "#2563eb",
                  }}
                >
                  📍 Ubicación buscada
                </strong>

                {
                  searchLocation.address
                }
              </div>
            </Popup>
          </Marker>
        )}

        {/* ====================================
            MARCADORES REPORTES
        ==================================== */}

        {visibleMarkers.map(
          (marker) => (
            <Marker
              key={`${marker.type}-${marker.id}`}
              position={[
                marker.latitude,
                marker.longitude,
              ]}
              icon={
                marker.type ===
                "lost"
                  ? lostIcon
                  : marker.type === "found"
                  ? foundIcon
                  : sightingIcon
              }
            >
              <Popup>
                <div
                  style={{
                    minWidth:
                      "220px",

                    lineHeight:
                      1.5,
                  }}
                >
                  <strong
                    style={{
                      display:
                        "block",

                      marginBottom:
                        "8px",

                      color:
                        marker.type ===
                        "lost"
                          ? "#dc2626"
                          : marker.type === "found"
                          ? "#059669"
                          : "#7c3aed",

                      fontSize:
                        "15px",
                    }}
                  >
                    {marker.type ===
                    "lost"
                      ? "🔴 MASCOTA PERDIDA"
                      : marker.type === "found"
                      ? "🟢 MASCOTA ENCONTRADA"
                      : "🟣 AVISTAMIENTO"}
                  </strong>

                  <div
                    style={{
                      marginBottom:
                        "8px",
                    }}
                  >
                    <strong>
                      {
                        marker.name
                      }
                    </strong>
                  </div>

                  <div>
                    <strong>
                      Especie:
                    </strong>{" "}
                    {
                      marker.species
                    }
                  </div>

                  <div>
                    <strong>
                      Raza:
                    </strong>{" "}
                    {
                      marker.breed
                    }
                  </div>

                  <div>
                    <strong>
                      Color:
                    </strong>{" "}
                    {
                      marker.color
                    }
                  </div>

                  <div>
                    <strong>
                      Tamaño:
                    </strong>{" "}
                    {
                      marker.size
                    }
                  </div>

                  <div>
                    <strong>
                      Fecha:
                    </strong>{" "}
                    {
                      marker.date
                    }
                  </div>

                  <hr
                    style={{
                      margin:
                        "10px 0",
                    }}
                  />

                  <div>
                    <strong>
                      📍 Ubicación
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "4px",
                    }}
                  >
                    {
                      marker.address
                    }
                  </div>

                  <hr
                    style={{
                      margin:
                        "10px 0",
                    }}
                  />

                  <div>
                    <strong>
                      Descripción
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop:
                        "4px",
                    }}
                  >
                    {
                      marker.description
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        "10px",
                    }}
                  >
                    <strong>
                      📞 Contacto:
                    </strong>{" "}
                    {
                      marker.phone
                    }
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}