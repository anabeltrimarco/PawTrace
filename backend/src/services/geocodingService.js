// ==========================================
// PAWTRACE - GEOCODING SERVICE
//
// Dirección → Latitud / Longitud
// ==========================================

const cache = new Map();

let lastRequestAt = 0;

function wait(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function geocodeAddress({
  address,
  neighborhood,
}) {
  const cleanAddress = String(
    address || ""
  ).trim();

  const cleanNeighborhood = String(
    neighborhood || ""
  ).trim();

  if (!cleanAddress) {
    return null;
  }

  const query = [
    cleanAddress,
    cleanNeighborhood,
    "Argentina",
  ]
    .filter(Boolean)
    .join(", ");

  const cacheKey =
    query.toLowerCase();

  // ========================================
  // CACHE
  // ========================================

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // ========================================
  // RESPETAR 1 REQUEST / SEGUNDO
  // ========================================

  const elapsed =
    Date.now() - lastRequestAt;

  if (elapsed < 1000) {
    await wait(1000 - elapsed);
  }

  const url = new URL(
    "https://nominatim.openstreetmap.org/search"
  );

  url.searchParams.set(
    "q",
    query
  );

  url.searchParams.set(
    "format",
    "jsonv2"
  );

  url.searchParams.set(
    "limit",
    "1"
  );

  url.searchParams.set(
    "countrycodes",
    "ar"
  );

  lastRequestAt = Date.now();

  console.log(
    "📍 Geocodificando:",
    query
  );

  const response = await fetch(
    url.toString(),
    {
      headers: {
        "User-Agent":
          "PawTrace/1.0 (pet-recovery-platform)",

        "Accept-Language":
          "es-AR,es;q=0.9",
      },
    }
  );

  if (!response.ok) {
    console.error(
      "⚠️ Error geocoding:",
      response.status
    );

    return null;
  }

  const results =
    await response.json();

  if (
    !Array.isArray(results) ||
    results.length === 0
  ) {
    console.log(
      "⚠️ Dirección no encontrada:",
      query
    );

    return null;
  }

  const result = results[0];

  const latitude =
    Number(result.lat);

  const longitude =
    Number(result.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const coordinates = {
    latitude,
    longitude,

    displayName:
      result.display_name ||
      query,
  };

  cache.set(
    cacheKey,
    coordinates
  );

  console.log(
    "✅ Dirección geocodificada:",
    coordinates
  );

  return coordinates;
}

module.exports = {
  geocodeAddress,
};