"use client";

import {
  FormEvent,
  useState,
} from "react";

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type AddressSearchProps = {
  onSelect?: (result: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
};

export default function AddressSearch({
  onSelect,
}: AddressSearchProps) {
  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searched, setSearched] =
    useState(false);

  async function buscar(
    event?: FormEvent
  ) {
    event?.preventDefault();

    const value = query.trim();

    if (value.length < 3) {
      setError(
        "Ingresá al menos 3 caracteres."
      );

      setResults([]);

      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(true);

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
          `https://nominatim.openstreetmap.org/search?${params.toString()}`
        );

      if (!response.ok) {
        throw new Error(
          "No se pudo buscar la dirección."
        );
      }

      const data =
        (await response.json()) as SearchResult[];

      setResults(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Error buscando dirección:",
        err
      );

      setResults([]);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo buscar la dirección."
      );
    } finally {
      setLoading(false);
    }
  }

  function seleccionar(
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
      setError(
        "La ubicación seleccionada no tiene coordenadas válidas."
      );

      return;
    }

    setQuery(
      result.display_name
    );

    setResults([]);
    setError("");

    onSelect?.({
      address:
        result.display_name,

      latitude,

      longitude,
    });
  }

  function limpiar() {
    setQuery("");
    setResults([]);
    setError("");
    setSearched(false);
  }

  return (
    <div
      style={{
        position: "relative",
        zIndex: 9999,
        pointerEvents: "auto",
        marginBottom: "16px",
      }}
      onClick={(event) =>
        event.stopPropagation()
      }
      onMouseDown={(event) =>
        event.stopPropagation()
      }
      onKeyDown={(event) =>
        event.stopPropagation()
      }
    >
      <form
        onSubmit={buscar}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "stretch",
          position: "relative",
          zIndex: 9999,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            zIndex: 9999,
            pointerEvents: "auto",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform:
                "translateY(-50%)",
              fontSize: "18px",
              pointerEvents: "none",
              zIndex: 10000,
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

              if (error) {
                setError("");
              }
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            onFocus={(event) => {
              event.stopPropagation();
            }}
            placeholder="Buscar dirección, barrio o ciudad..."
            autoComplete="off"
            style={{
              position: "relative",
              zIndex: 9999,
              pointerEvents: "auto",

              width: "100%",
              minHeight: "52px",
              boxSizing:
                "border-box",

              padding:
                "0 48px 0 48px",

              border:
                "1px solid #dce8e4",

              borderRadius:
                "14px",

              background:
                "#ffffff",

              color:
                "#1f2937",

              fontSize:
                "16px",

              fontWeight: 600,

              outline: "none",

              cursor: "text",

              boxShadow:
                "0 5px 16px rgba(20, 50, 40, 0.06)",
            }}
          />

          {query && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                limpiar();
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              aria-label="Limpiar búsqueda"
              style={{
                position:
                  "absolute",

                right: "12px",

                top: "50%",

                transform:
                  "translateY(-50%)",

                zIndex: 10000,

                width: "30px",
                height: "30px",

                border: 0,

                borderRadius:
                  "50%",

                background:
                  "#f1f5f4",

                color:
                  "#64748b",

                cursor:
                  "pointer",

                fontSize:
                  "16px",

                pointerEvents:
                  "auto",
              }}
            >
              ×
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          style={{
            position: "relative",
            zIndex: 9999,
            pointerEvents: "auto",

            minWidth: "110px",

            padding:
              "0 20px",

            border: 0,

            borderRadius:
              "14px",

            background:
              "#10b981",

            color:
              "#ffffff",

            fontSize:
              "14px",

            fontWeight:
              800,

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
            ? "Buscando..."
            : "Buscar"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop:
              "8px",

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

            position:
              "relative",

            zIndex: 9999,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {!loading &&
        searched &&
        !error &&
        results.length ===
          0 && (
          <div
            style={{
              marginTop:
                "8px",

              padding:
                "10px 12px",

              borderRadius:
                "10px",

              background:
                "#f8faf9",

              color:
                "#64748b",

              fontSize:
                "13px",

              fontWeight:
                600,

              position:
                "relative",

              zIndex: 9999,
            }}
          >
            No encontramos esa
            dirección.
          </div>
        )}

      {results.length > 0 && (
        <div
          style={{
            position:
              "absolute",

            top: "58px",

            left: 0,

            right:
              "120px",

            zIndex: 10000,

            overflow:
              "hidden",

            border:
              "1px solid #dce8e4",

            borderRadius:
              "14px",

            background:
              "#ffffff",

            boxShadow:
              "0 15px 35px rgba(20, 50, 40, 0.15)",

            pointerEvents:
              "auto",
          }}
        >
          {results.map(
            (result) => (
              <button
                type="button"
                key={
                  result.place_id
                }
                onClick={(event) => {
                  event.stopPropagation();

                  seleccionar(
                    result
                  );
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
                style={{
                  width:
                    "100%",

                  padding:
                    "13px 16px",

                  display:
                    "flex",

                  gap:
                    "10px",

                  alignItems:
                    "flex-start",

                  border: 0,

                  borderBottom:
                    "1px solid #eef3f1",

                  background:
                    "#ffffff",

                  color:
                    "#334155",

                  textAlign:
                    "left",

                  cursor:
                    "pointer",

                  fontSize:
                    "14px",

                  lineHeight:
                    1.45,

                  pointerEvents:
                    "auto",
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
  );
}