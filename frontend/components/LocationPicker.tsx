"use client";

import {
  KeyboardEvent,
  useEffect,
  useState,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

// ==========================================
// PROPS
// ==========================================

export type LocationPickerProps = {
  type: "lost" | "found";

  onChange: (
    lat: number,
    lng: number,
    address?: string
  ) => void;
};

// ==========================================
// TIPOS
// ==========================================

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type SelectedLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

// ==========================================
// ICONOS
// ==========================================

const lostIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const foundIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ==========================================
// MOVER EL MAPA
// ==========================================

function FlyToLocation({
  location,
}: {
  location: SelectedLocation | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.flyTo(
      [
        location.latitude,
        location.longitude,
      ],
      17,
      {
        duration: 1.1,
      }
    );
  }, [map, location]);

  return null;
}

// ==========================================
// MARCADOR DEL MAPA
// ==========================================

function LocationMarker({
  type,
  onChange,
  selectedLocation,
  onManualLocation,
}: {
  type: "lost" | "found";

  onChange: (
    lat: number,
    lng: number,
    address?: string
  ) => void;

  selectedLocation: SelectedLocation | null;

  onManualLocation: (
    location: SelectedLocation
  ) => void;
}) {
  const [position, setPosition] =
    useState<[number, number] | null>(
      null
    );

  const [address, setAddress] =
    useState("");

  const [
    loadingAddress,
    setLoadingAddress,
  ] = useState(false);

  // ========================================
  // UBICACIÓN ELEGIDA DESDE BUSCADOR
  // ========================================

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    setPosition([
      selectedLocation.latitude,
      selectedLocation.longitude,
    ]);

    setAddress(
      selectedLocation.address
    );
  }, [selectedLocation]);

  // ========================================
  // OBTENER DIRECCIÓN DESDE COORDENADAS
  // ========================================

  async function getAddress(
    lat: number,
    lng: number
  ) {
    try {
      setLoadingAddress(true);
      setAddress("");

      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "es",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          "No se pudo obtener la dirección."
        );
      }

      const data =
        await response.json();

      const approximateAddress =
        data.display_name ||
        "Dirección aproximada no disponible";

      setAddress(
        approximateAddress
      );

      const location: SelectedLocation = {
        latitude: lat,
        longitude: lng,
        address:
          approximateAddress,
      };

      onManualLocation(
        location
      );

      onChange(
        lat,
        lng,
        approximateAddress
      );
    } catch (error) {
      console.error(
        "Error obteniendo dirección:",
        error
      );

      const fallback =
        "Dirección aproximada no disponible";

      setAddress(fallback);

      const location: SelectedLocation = {
        latitude: lat,
        longitude: lng,
        address: fallback,
      };

      onManualLocation(
        location
      );

      onChange(
        lat,
        lng,
        fallback
      );
    } finally {
      setLoadingAddress(false);
    }
  }

  // ========================================
  // CLICK MANUAL EN EL MAPA
  // ========================================

  useMapEvents({
    click(e) {
      const lat =
        e.latlng.lat;

      const lng =
        e.latlng.lng;

      setPosition([
        lat,
        lng,
      ]);

      getAddress(
        lat,
        lng
      );
    },
  });

  if (!position) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={
        type === "lost"
          ? lostIcon
          : foundIcon
      }
    >
      <Popup>
        <strong>
          {type === "lost"
            ? "🔴 Última ubicación conocida"
            : "🟢 Lugar donde fue encontrada"}
        </strong>

        <br />
        <br />

        {loadingAddress
          ? "Buscando dirección..."
          : address ||
            "Ubicación seleccionada"}
      </Popup>
    </Marker>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function LocationPicker({
  type,
  onChange,
}: LocationPickerProps) {
  const isLost =
    type === "lost";

  const borderColor =
    isLost
      ? "#ef4444"
      : "#10b981";

  const backgroundColor =
    isLost
      ? "#fff5f5"
      : "#f0fdf4";

  const textColor =
    isLost
      ? "#b91c1c"
      : "#047857";

  // ========================================
  // BUSCADOR
  // ========================================

  const [query, setQuery] =
    useState("");

  const [
    results,
    setResults,
  ] =
    useState<SearchResult[]>([]);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    searchError,
    setSearchError,
  ] = useState("");

  const [
    selectedLocation,
    setSelectedLocation,
  ] =
    useState<SelectedLocation | null>(
      null
    );

  // ========================================
  // BUSCAR DIRECCIÓN
  // ========================================

  async function buscarDireccion() {
    const value =
      query.trim();

    if (value.length < 3) {
      setSearchError(
        "Ingresá al menos 3 caracteres."
      );

      setResults([]);

      return;
    }

    try {
      setSearching(true);

      setSearchError("");

      setResults([]);

      const params =
        new URLSearchParams({
          q: value,
          format: "json",
          addressdetails: "1",
          limit: "6",
          countrycodes: "ar",
        });

      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            headers: {
              "Accept-Language": "es",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          "No se pudo buscar la dirección."
        );
      }

      const data =
        (await response.json()) as SearchResult[];

      if (
        !Array.isArray(data) ||
        data.length === 0
      ) {
        setResults([]);

        setSearchError(
          "No encontramos esa dirección."
        );

        return;
      }

      setResults(data);
    } catch (error) {
      console.error(
        "Error buscando dirección:",
        error
      );

      setResults([]);

      setSearchError(
        "No se pudo buscar la dirección."
      );
    } finally {
      setSearching(false);
    }
  }

  // ========================================
  // ENTER EN EL INPUT
  // ========================================

  function handleSearchKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    buscarDireccion();
  }

  // ========================================
  // ELEGIR DIRECCIÓN
  // ========================================

  function seleccionarDireccion(
    result: SearchResult
  ) {
    const latitude =
      Number(result.lat);

    const longitude =
      Number(result.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setSearchError(
        "La ubicación seleccionada no tiene coordenadas válidas."
      );

      return;
    }

    const location: SelectedLocation = {
      latitude,
      longitude,
      address:
        result.display_name,
    };

    setSelectedLocation(
      location
    );

    setQuery(
      result.display_name
    );

    setResults([]);

    setSearchError("");

    onChange(
      latitude,
      longitude,
      result.display_name
    );
  }

  // ========================================
  // LIMPIAR
  // ========================================

  function limpiarBusqueda() {
    setQuery("");
    setResults([]);
    setSearchError("");
  }

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      {/* ====================================
          CABECERA
      ==================================== */}

      <div
        style={{
          marginBottom: "14px",

          padding:
            "14px 16px",

          borderRadius:
            "14px",

          background:
            backgroundColor,

          border:
            `1px solid ${borderColor}`,
        }}
      >
        <strong
          style={{
            display: "block",

            fontSize: "18px",

            color: textColor,

            marginBottom:
              "5px",
          }}
        >
          {isLost
            ? "🔴 Marcá dónde se perdió"
            : "🟢 Marcá dónde la encontraste"}
        </strong>

        <span
          style={{
            color: "#64736f",

            fontSize: "14px",
          }}
        >
          Podés buscar una dirección
          o hacer clic directamente
          sobre el mapa.
        </span>
      </div>

      {/* ====================================
          BUSCADOR
          IMPORTANTE: NO ES UN <form>
      ==================================== */}

      <div
        style={{
          position: "relative",

          zIndex: 5000,

          marginBottom:
            "14px",
        }}
      >
        <div
          style={{
            display: "flex",

            gap: "10px",

            alignItems:
              "stretch",
          }}
        >
          <div
            style={{
              position:
                "relative",

              flex: 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position:
                  "absolute",

                left: "16px",

                top: "50%",

                transform:
                  "translateY(-50%)",

                pointerEvents:
                  "none",

                fontSize:
                  "18px",

                zIndex: 2,
              }}
            >
              🔎
            </span>

            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(
                  event.target.value
                );

                if (searchError) {
                  setSearchError("");
                }
              }}
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Buscar calle, altura, barrio o ciudad..."
              autoComplete="off"
              style={{
                width: "100%",

                minHeight:
                  "52px",

                padding:
                  "0 48px",

                border:
                  "1px solid #d8dfe5",

                borderRadius:
                  "14px",

                background:
                  "#ffffff",

                color:
                  "#10231f",

                fontSize:
                  "16px",

                outline:
                  "none",

                cursor:
                  "text",

                boxSizing:
                  "border-box",
              }}
            />

            {query && (
              <button
                type="button"
                onClick={
                  limpiarBusqueda
                }
                aria-label="Limpiar búsqueda"
                style={{
                  position:
                    "absolute",

                  right: "12px",

                  top: "50%",

                  transform:
                    "translateY(-50%)",

                  width: "30px",

                  height: "30px",

                  border: 0,

                  borderRadius:
                    "50%",

                  background:
                    "#eef4f2",

                  cursor:
                    "pointer",

                  color:
                    "#64748b",

                  fontSize:
                    "17px",

                  zIndex: 2,
                }}
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={
              buscarDireccion
            }
            disabled={
              searching
            }
            style={{
              minWidth:
                "115px",

              border: 0,

              borderRadius:
                "14px",

              padding:
                "0 20px",

              background:
                isLost
                  ? "#ef4444"
                  : "#10b981",

              color:
                "#ffffff",

              fontWeight:
                800,

              fontSize:
                "15px",

              cursor:
                searching
                  ? "wait"
                  : "pointer",

              opacity:
                searching
                  ? 0.7
                  : 1,
            }}
          >
            {searching
              ? "Buscando..."
              : "Buscar"}
          </button>
        </div>

        {/* ==================================
            ERROR
        ================================== */}

        {searchError && (
          <div
            style={{
              marginTop: "8px",

              padding:
                "10px 12px",

              borderRadius:
                "10px",

              background:
                "#fff5f5",

              color:
                "#b91c1c",

              fontSize:
                "13px",

              fontWeight:
                600,
            }}
          >
            ⚠️ {searchError}
          </div>
        )}

        {/* ==================================
            RESULTADOS
        ================================== */}

        {results.length > 0 && (
          <div
            style={{
              position:
                "absolute",

              top: "60px",

              left: 0,

              right:
                "125px",

              zIndex:
                10000,

              overflow:
                "hidden",

              border:
                "1px solid #dce8e4",

              borderRadius:
                "14px",

              background:
                "#ffffff",

              boxShadow:
                "0 16px 36px rgba(20,50,40,.16)",
            }}
          >
            {results.map(
              (result) => (
                <button
                  type="button"
                  key={
                    result.place_id
                  }
                  onClick={() =>
                    seleccionarDireccion(
                      result
                    )
                  }
                  style={{
                    width:
                      "100%",

                    display:
                      "flex",

                    gap:
                      "10px",

                    alignItems:
                      "flex-start",

                    padding:
                      "13px 15px",

                    border: 0,

                    borderBottom:
                      "1px solid #eef3f1",

                    background:
                      "#ffffff",

                    color:
                      "#334155",

                    cursor:
                      "pointer",

                    textAlign:
                      "left",

                    fontSize:
                      "14px",

                    lineHeight:
                      1.45,
                  }}
                >
                  <span>
                    📍
                  </span>

                  <span>
                    {
                      result.display_name
                    }
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ====================================
          UBICACIÓN SELECCIONADA
      ==================================== */}

      {selectedLocation && (
        <div
          style={{
            marginBottom:
              "12px",

            padding:
              "11px 14px",

            borderRadius:
              "12px",

            background:
              "#f8faf9",

            border:
              "1px solid #dce8e4",

            color:
              "#475569",

            fontSize:
              "14px",
          }}
        >
          📍{" "}
          {
            selectedLocation.address
          }
        </div>
      )}

      {/* ====================================
          MAPA
      ==================================== */}

      <div
        style={{
          width: "100%",

          height: "350px",

          borderRadius:
            "18px",

          overflow:
            "hidden",

          border:
            `3px solid ${borderColor}`,

          boxShadow:
            `0 10px 30px ${
              isLost
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(16, 185, 129, 0.12)"
            }`,
        }}
      >
        <MapContainer
          center={[
            -34.6037,
            -58.3816,
          ]}
          zoom={12}
          scrollWheelZoom={
            true
          }
          style={{
            width: "100%",

            height: "100%",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyToLocation
            location={
              selectedLocation
            }
          />

          <LocationMarker
            type={type}
            onChange={
              onChange
            }
            selectedLocation={
              selectedLocation
            }
            onManualLocation={(
              location
            ) => {
              setSelectedLocation(
                location
              );

              setQuery(
                location.address
              );
            }}
          />
        </MapContainer>
      </div>
    </div>
  );
}