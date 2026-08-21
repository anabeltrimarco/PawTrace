// ==========================================
// PAWTRACE - MATCH CANDIDATE SERVICE
//
// Matching:
// - Perdida ↔ Encontrada
// - Perdida ↔ Avistamiento
//
// Incluye:
// - Datos físicos
// - Distancia
// - PetIdentity Fine-grained Re-ID (motor principal)
// - Consensus Python /compare
// - PetIdentity Production Lite como único motor visual
// - Persistencia
// - Matching por raza
// ==========================================

const {
  LostReport,
  FoundReport,
  Sighting,
  Pet,
  PetPhoto,
  FoundReportPhoto,
  SightingPhoto,
  Location,
  Match,
} = require("../models");

const {
  getHybridEmbeddings,
  cosineSimilarity,
} = require("./imageEmbeddingService");

// ==========================================
// PETIDENTITY / ANIMAL RE-ID SERVICE
//
// Local:
//   http://127.0.0.1:8001
//
// Producción:
//   configurar ANIMAL_REID_URL con la URL
//   pública/interna del microservicio Python.
// ==========================================

const ANIMAL_REID_URL = String(
  process.env.ANIMAL_REID_URL ||
    "http://127.0.0.1:8001"
).replace(/\/+$/, "");

const ANIMAL_REID_TIMEOUT_MS = Number(
  process.env.ANIMAL_REID_TIMEOUT_MS ||
    120000
);

// ==========================================
// COLA GLOBAL PETIDENTITY
//
// Aunque generateCandidates procesa cada
// candidato con await, pueden existir dos
// requests /matches simultáneos. Esta cola
// garantiza una sola llamada /compare a la vez
// desde este proceso del backend.
// ==========================================

let petIdentityQueue =
  Promise.resolve();

async function runPetIdentitySerialized(
  task
) {
  let releaseQueue;

  const currentTurn =
    new Promise((resolve) => {
      releaseQueue = resolve;
    });

  const previousTurn =
    petIdentityQueue;

  petIdentityQueue =
    previousTurn
      .catch(() => undefined)
      .then(() => currentTurn);

  await previousTurn.catch(
    () => undefined
  );

  try {
    return await task();
  } finally {
    releaseQueue();
  }
}

const BACKEND_PUBLIC_URL = String(
  process.env.BACKEND_PUBLIC_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
).replace(/\/+$/, "");

// ==========================================
// NORMALIZAR URL DE FOTO PARA PYTHON
// ==========================================

function resolveImageUrlForReId(
  imageUrl
) {
  const value = String(
    imageUrl || ""
  ).trim();

  if (!value) {
    return null;
  }

  if (
    /^https?:\/\//i.test(value)
  ) {
    return value;
  }

  if (
    value.startsWith("/")
  ) {
    return `${BACKEND_PUBLIC_URL}${value}`;
  }

  return `${BACKEND_PUBLIC_URL}/${value}`;
}

// ==========================================
// LLAMAR POST /compare DEL SERVICIO PYTHON
// ==========================================

async function compareWithPetIdentity(
  imageA,
  imageB
) {
  const resolvedA =
    resolveImageUrlForReId(
      imageA
    );

  const resolvedB =
    resolveImageUrlForReId(
      imageB
    );

  if (
    !resolvedA ||
    !resolvedB
  ) {
    throw new Error(
      "PetIdentity requiere dos URLs de imagen."
    );
  }

  if (
    typeof fetch !== "function"
  ) {
    throw new Error(
      "La versión de Node.js no dispone de fetch global."
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    ANIMAL_REID_TIMEOUT_MS
  );

  try {
    console.log(
      "🪪 Consultando PetIdentity:",
      {
        imageA: resolvedA,
        imageB: resolvedB,
        service:
          `${ANIMAL_REID_URL}/compare`,
      }
    );

    const response =
      await fetch(
        `${ANIMAL_REID_URL}/compare`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            imageA: resolvedA,
            imageB: resolvedB,
          }),

          signal:
            controller.signal,
        }
      );

    const rawBody =
      await response.text();

    let data = null;

    try {
      data = rawBody
        ? JSON.parse(rawBody)
        : null;
    } catch {
      throw new Error(
        `Animal Re-ID devolvió una respuesta no JSON (HTTP ${response.status}).`
      );
    }

    if (!response.ok) {
      const detail =
        data?.detail ||
        data?.message ||
        `HTTP ${response.status}`;

      throw new Error(
        `Animal Re-ID /compare falló: ${
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail)
        }`
      );
    }

    return {
      ...data,

      _resolvedImageA:
        resolvedA,

      _resolvedImageB:
        resolvedB,
    };
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        `Animal Re-ID excedió ${ANIMAL_REID_TIMEOUT_MS} ms.`
      );
    }

    throw error;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

// ==========================================
// HELPERS DE PETIDENTITY
// ==========================================

function asFiniteNumber(
  value,
  fallback = null
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}

function clampScore(
  value
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number(value) || 0
      )
    )
  );
}

function petIdentityPercent(
  value
) {
  const normalized =
    asFiniteNumber(
      value,
      0
    );

  // Los scores del servicio Python son 0..1.
  return clampScore(
    normalized * 100
  );
}

// ==========================================
// NORMALIZAR TEXTO
// ==========================================

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ==========================================
// NORMALIZAR RAZA
// ==========================================

function normalizeBreed(value) {
  const breed = normalizeText(value);

  if (!breed) {
    return "";
  }

  const aliases = {
    golden: "golden retriever",
    "golden retriever": "golden retriever",

    labrador: "labrador retriever",
    "labrador retriever": "labrador retriever",

    "ovejero aleman": "pastor aleman",
    "pastor aleman": "pastor aleman",
    "german shepherd": "pastor aleman",

    caniche: "caniche",
    poodle: "caniche",

    salchicha: "dachshund",
    dachshund: "dachshund",

    "husky siberiano": "husky siberiano",
    husky: "husky siberiano",

    mestiza: "mestizo",
    mestizo: "mestizo",
    mixed: "mestizo",
    cruza: "mestizo",
    cruzado: "mestizo",
    cruzada: "mestizo",
    "sin raza": "mestizo",
    "sin raza definida": "mestizo",

    desconocido: "desconocida",
    desconocida: "desconocida",
    unknown: "desconocida",

    otro: "otra",
    otra: "otra",
  };

  return aliases[breed] || breed;
}

// ==========================================
// RAZA GENÉRICA
// ==========================================

function isGenericBreed(value) {
  const breed = normalizeBreed(value);

  if (!breed) {
    return true;
  }

  const genericBreeds = new Set([
    "mestizo",
    "mestiza",
    "mixed",
    "cruza",
    "cruzado",
    "cruzada",
    "sin raza",
    "sin raza definida",
    "desconocido",
    "desconocida",
    "unknown",
    "otro",
    "otra",
  ]);

  return genericBreeds.has(breed);
}

// ==========================================
// SIMILITUD DE TEXTO
// ==========================================

function textSimilarity(valueA, valueB) {
  const a = normalizeText(valueA);
  const b = normalizeText(valueB);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {
    return 0.8;
  }

  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));

  let common = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) {
      common += 1;
    }
  }

  const total = new Set([
    ...wordsA,
    ...wordsB,
  ]).size;

  if (!total) {
    return 0;
  }

  return common / total;
}

// ==========================================
// SIMILITUD DE RAZA
// ==========================================

function breedSimilarityScore(breedA, breedB) {
  const a = normalizeBreed(breedA);
  const b = normalizeBreed(breedB);

  if (!a || !b) {
    return 0;
  }

  return textSimilarity(a, b);
}

// ==========================================
// DISTANCIA HAVERSINE
// ==========================================

function distanceKm(lat1, lon1, lat2, lon2) {
  const aLat = Number(lat1);
  const aLon = Number(lon1);
  const bLat = Number(lat2);
  const bLon = Number(lon2);

  if (
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLon) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLon)
  ) {
    return null;
  }

  const EARTH_RADIUS = 6371;

  const toRadians = (degrees) =>
    (degrees * Math.PI) / 180;

  const deltaLat = toRadians(bLat - aLat);
  const deltaLon = toRadians(bLon - aLon);

  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) *
      Math.cos(toRadians(bLat)) *
      Math.sin(deltaLon / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    );

  return EARTH_RADIUS * angularDistance;
}

// ==========================================
// SCORE POR DISTANCIA
// ==========================================

function getDistanceScore(distance) {
  if (distance === null) {
    return 0;
  }

  // La distancia ayuda, pero nunca debe
  // dominar el matching.
  if (distance <= 1) return 8;
  if (distance <= 3) return 6;
  if (distance <= 5) return 5;
  if (distance <= 10) return 3;
  if (distance <= 20) return 1;
  if (distance <= 50) return 0;
  if (distance <= 100) return -8;

  return -20;
}

// ==========================================
// FOTO PRINCIPAL PERDIDA
// ==========================================

function getLostPhoto(lostReport) {
  const photos =
    lostReport?.pet?.photos || [];

  return (
    photos.find(
      (photo) => photo.isMain
    ) ||
    photos[0] ||
    null
  );
}

// ==========================================
// FOTO PRINCIPAL ENCONTRADA
// ==========================================

function getFoundPhoto(foundReport) {
  const photos =
    foundReport?.photos || [];

  return (
    photos.find(
      (photo) => photo.isMain
    ) ||
    photos[0] ||
    null
  );
}

// ==========================================
// FOTO PRINCIPAL AVISTAMIENTO
// ==========================================

function getSightingPhoto(sighting) {
  const photos =
    sighting?.photos || [];

  return (
    photos.find(
      (photo) => photo.isMain
    ) ||
    photos[0] ||
    null
  );
}

// ==========================================
// TIPO DE RELACIÓN ENTRE RAZAS
// ==========================================

function getBreedRelation(
  lostBreed,
  candidateBreed
) {
  const normalizedLost =
    normalizeBreed(lostBreed);

  const normalizedCandidate =
    normalizeBreed(candidateBreed);

  const lostGeneric =
    isGenericBreed(
      normalizedLost
    );

  const candidateGeneric =
    isGenericBreed(
      normalizedCandidate
    );

  const bothGeneric =
    lostGeneric &&
    candidateGeneric;

  const bothSpecific =
    !lostGeneric &&
    !candidateGeneric;

  const specificToGeneric =
    (!lostGeneric &&
      candidateGeneric) ||
    (lostGeneric &&
      !candidateGeneric);

  return {
    lostGeneric,
    foundGeneric:
      candidateGeneric,
    candidateGeneric,
    bothGeneric,
    bothSpecific,
    specificToGeneric,
  };
}

// ==========================================
// NORMALIZAR DESTINO DEL MATCH
// ==========================================

function normalizeTarget(
  target,
  targetType
) {
  if (!target) {
    return null;
  }

  if (
    targetType === "sighting"
  ) {
    const photo =
      getSightingPhoto(target);

    return {
      id: target.id,

      targetType:
        "sighting",

      species:
        target.species,

      breed:
        target.breed || null,

      color:
        target.color || null,

      size:
        target.size || null,

      description:
        target.description ||
        target.notes ||
        null,

      photo:
        photo?.imageUrl ||
        photo?.url ||
        null,

      location:
        target.location ||
        null,

      date:
        target.sightedAt ||
        target.created_at ||
        target.createdAt ||
        null,

      raw: target,
    };
  }

  const photo =
    getFoundPhoto(target);

  return {
    id: target.id,

    targetType: "found",

    species:
      target.species,

    breed:
      target.breed || null,

    color:
      target.color || null,

    size:
      target.size || null,

    description:
      target.description ||
      null,

    photo:
      photo?.imageUrl ||
      photo?.url ||
      null,

    location:
      target.location ||
      null,

    date:
      target.foundAt ||
      target.created_at ||
      target.createdAt ||
      null,

    raw: target,
  };
}

// ==========================================
// CALCULAR CANDIDATO
// ==========================================

function calculateCandidate(
  lostReport,
  target,
  targetType = "found"
) {
  if (!lostReport?.pet) {
    return null;
  }

  const normalizedTarget =
    normalizeTarget(
      target,
      targetType
    );

  if (!normalizedTarget) {
    return null;
  }

  // ==========================================
  // ESPECIE
  // ==========================================

  const lostSpecies =
    normalizeText(
      lostReport.pet.species
    );

  const targetSpecies =
    normalizeText(
      normalizedTarget.species
    );

  if (
    !lostSpecies ||
    !targetSpecies ||
    lostSpecies !==
      targetSpecies
  ) {
    return null;
  }

  // ==========================================
  // RAZA
  // ==========================================

  const lostBreed =
    normalizeBreed(
      lostReport.pet.breed
    );

  const targetBreed =
    normalizeBreed(
      normalizedTarget.breed
    );

  const breedRelation =
    getBreedRelation(
      lostBreed,
      targetBreed
    );

  const breedSimilarity =
    breedSimilarityScore(
      lostBreed,
      targetBreed
    );

  let score = 0;

  const reasons = [];

  // ==========================================
  // MISMA ESPECIE
  // ==========================================

  // Antes sumaba 20.
  // Ahora pesa menos porque ser perro/gato
  // no alcanza para inferir identidad.
  score += 10;

  reasons.push(
    "Misma especie"
  );

  // ==========================================
  // TAMAÑO
  // ==========================================

  const lostSize =
    normalizeText(
      lostReport.pet.size
    );

  const targetSize =
    normalizeText(
      normalizedTarget.size
    );

  const hasBothSizes =
    Boolean(
      lostSize &&
      targetSize
    );

  const sameSize =
    hasBothSizes &&
    lostSize ===
      targetSize;

  const sizeConflict =
    hasBothSizes &&
    !sameSize;

  if (sameSize) {
    score += 7;

    reasons.push(
      "Mismo tamaño"
    );
  } else if (
    sizeConflict
  ) {
    score -= 12;

    reasons.push(
      "Tamaño diferente"
    );
  }

  // ==========================================
  // RAZA
  // ==========================================

  let breedConflict =
    false;

  const sameGenericBreed =
    breedRelation.bothGeneric &&
    Boolean(
      lostBreed &&
      targetBreed
    ) &&
    lostBreed ===
      targetBreed;

  if (
    sameGenericBreed
  ) {
    // Coincidencia genérica:
    // ayuda poco.
    score += 3;

    reasons.push(
      lostBreed ===
        "mestizo"
        ? "Ambos clasificados como mestizos"
        : "Raza genérica coincidente"
    );
  } else if (
    breedRelation
      .specificToGeneric
  ) {
    // Caso importante:
    // "Mestizo" vs "Pastor Alemán"
    // NO debe sumar.
    //
    // Tampoco lo consideramos una
    // contradicción absoluta porque un
    // usuario puede etiquetar mal la raza.
    score -= 5;

    reasons.push(
      "Raza no concluyente: clasificación genérica frente a específica"
    );
  } else if (
    breedRelation.bothGeneric
  ) {
    reasons.push(
      "Raza no concluyente"
    );
  } else if (
    breedSimilarity >= 0.8
  ) {
    score += 15;

    reasons.push(
      "Raza muy similar"
    );
  } else if (
    breedSimilarity >= 0.4
  ) {
    score += 6;

    reasons.push(
      "Raza parcialmente similar"
    );
  } else if (
    lostBreed &&
    targetBreed
  ) {
    breedConflict =
      true;

    score -= 30;

    reasons.push(
      "Raza incompatible"
    );
  }

  // ==========================================
  // COLOR
  // ==========================================

  const lostColor =
    normalizeText(
      lostReport.pet.color
    );

  const targetColor =
    normalizeText(
      normalizedTarget.color
    );

  const hasBothColors =
    Boolean(
      lostColor &&
      targetColor
    );

  const colorSimilarity =
    textSimilarity(
      lostColor,
      targetColor
    );

  let colorConflict =
    false;

  const sameColor =
    hasBothColors &&
    colorSimilarity >= 0.8;

  const partialColor =
    hasBothColors &&
    colorSimilarity >= 0.4 &&
    colorSimilarity < 0.8;

  if (sameColor) {
    score += 8;

    reasons.push(
      "Color muy similar"
    );
  } else if (
    partialColor
  ) {
    score += 3;

    reasons.push(
      "Color parcialmente similar"
    );
  } else if (
    hasBothColors
  ) {
    score -= 15;

    colorConflict =
      true;

    reasons.push(
      "Color diferente"
    );
  }

  // ==========================================
  // DISTANCIA
// ==========================================

  const distance =
    distanceKm(
      lostReport?.location
        ?.latitude,

      lostReport?.location
        ?.longitude,

      normalizedTarget
        ?.location
        ?.latitude,

      normalizedTarget
        ?.location
        ?.longitude
    );

  if (
    distance !== null
  ) {
    const distanceScore =
      getDistanceScore(
        distance
      );

    score +=
      distanceScore;

    reasons.push(
      `A ${distance.toFixed(
        1
      )} km`
    );

    if (
      distance > 100
    ) {
      reasons.push(
        "Distancia muy grande"
      );
    } else if (
      distance > 50
    ) {
      reasons.push(
        "Ubicación lejana"
      );
    }
  } else {
    reasons.push(
      "Ubicación no disponible; coincidencia evaluada sin distancia"
    );
  }

  // ==========================================
  // SCORE DE DATOS
  // ==========================================

  const candidateScore =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );

  const lostPhoto =
    getLostPhoto(
      lostReport
    );

  const foundReportId =
    targetType === "found"
      ? normalizedTarget.id
      : null;

  const sightingId =
    targetType ===
    "sighting"
      ? normalizedTarget.id
      : null;

  return {
    targetType,

    lostReportId:
      lostReport.id,

    foundReportId,

    sightingId,

    candidateScore,

    imageSimilarity:
      null,

    rawImageSimilarity:
      null,

    finalScore:
      candidateScore,

    reasons,

    distanceKm:
      distance === null
        ? null
        : Number(
            distance.toFixed(
              2
            )
          ),

    compatibility: {
      breedSimilarity:
        Math.round(
          breedSimilarity *
            100
        ),

      colorSimilarity:
        Math.round(
          colorSimilarity *
            100
        ),

      breedConflict,

      colorConflict,

      sizeConflict,

      sameSize,

      sameColor,

      partialColor,

      genericBreed:
        breedRelation
          .lostGeneric ||
        breedRelation
          .candidateGeneric,

      bothGenericBreed:
        breedRelation
          .bothGeneric,

      bothSpecificBreed:
        breedRelation
          .bothSpecific,

      specificToGenericBreed:
        breedRelation
          .specificToGeneric,

      sameGenericBreed,
    },

    lost: {
      id:
        lostReport.id,

      petId:
        lostReport.petId ||
        lostReport.pet.id,

      name:
        lostReport.pet
          .name ||
        "Mascota perdida",

      species:
        lostReport.pet
          .species,

      breed:
        lostReport.pet
          .breed ||
        null,

      color:
        lostReport.pet
          .color ||
        null,

      size:
        lostReport.pet
          .size ||
        null,

      description:
        lostReport.pet
          .description ||
        null,

      photo:
        lostPhoto
          ?.imageUrl ||
        lostPhoto?.url ||
        null,

      location:
        lostReport.location ||
        null,

      date:
        lostReport
          .lastSeenAt ||
        lostReport
          .created_at ||
        lostReport
          .createdAt ||
        null,
    },

    target: {
      id:
        normalizedTarget.id,

      type:
        targetType,

      species:
        normalizedTarget
          .species,

      breed:
        normalizedTarget
          .breed,

      color:
        normalizedTarget
          .color,

      size:
        normalizedTarget
          .size,

      description:
        normalizedTarget
          .description,

      photo:
        normalizedTarget
          .photo,

      location:
        normalizedTarget
          .location,

      date:
        normalizedTarget
          .date,
    },

    found: {
      id:
        normalizedTarget.id,

      species:
        normalizedTarget
          .species,

      breed:
        normalizedTarget
          .breed,

      color:
        normalizedTarget
          .color,

      size:
        normalizedTarget
          .size,

      description:
        normalizedTarget
          .description,

      photo:
        normalizedTarget
          .photo,

      location:
        normalizedTarget
          .location,

      date:
        normalizedTarget
          .date,

      type:
        targetType,

      isSighting:
        targetType ===
        "sighting",
    },

    sighting:
      targetType ===
      "sighting"
        ? {
            id:
              normalizedTarget.id,

            species:
              normalizedTarget
                .species,

            breed:
              normalizedTarget
                .breed,

            color:
              normalizedTarget
                .color,

            size:
              normalizedTarget
                .size,

            description:
              normalizedTarget
                .description,

            photo:
              normalizedTarget
                .photo,

            location:
              normalizedTarget
                .location,

            date:
              normalizedTarget
                .date,
          }
        : null,
  };
}

// ==========================================
// COMPARACIÓN ANIMAL RE-ID LEGACY
//
// IMPORTANTE:
// Esta función se mantiene únicamente por
// compatibilidad con tests/imports antiguos.
// Production Lite NO la utiliza como fallback.
// ==========================================

async function addLegacyImageSimilarity(
  candidate
) {
  candidate.imageSimilarity =
    null;

  candidate.rawImageSimilarity =
    null;

  candidate.megaSimilarity =
    null;

  candidate.dinoSimilarity =
    null;

  candidate.finalScore =
    Math.min(
      49,
      Math.round(
        candidate
          .candidateScore *
          0.65
      )
    );

  candidate.hybridScore =
    candidate.finalScore;

  candidate.reasons.push(
    "Fallback MegaDescriptor/DINOv2 desactivado en Production Lite"
  );

  return candidate;
}

// ==========================================
// COMPARACIÓN PETIDENTITY - MOTOR PRINCIPAL
// ==========================================

async function addImageSimilarity(
  candidate
) {
  const lostPhoto =
    candidate?.lost?.photo;

  const targetPhoto =
    candidate?.target?.photo ||
    candidate?.found?.photo ||
    candidate?.sighting?.photo;

  // ========================================
  // SIN DOS FOTOS
  // ========================================

  if (
    !lostPhoto ||
    !targetPhoto
  ) {
    candidate.imageSimilarity =
      null;

    candidate.rawImageSimilarity =
      null;

    candidate.petIdentitySimilarity =
      null;

    candidate.petIdentityScore =
      null;

    candidate.petIdentityEffectiveScore =
      null;

    candidate.petIdentityReliability =
      null;

    candidate.petIdentityVerdict =
      null;

    candidate.petIdentityCropA =
      false;

    candidate.petIdentityCropB =
      false;

    candidate.primaryEngine =
      "PetIdentity";

    candidate.finalScore =
      Math.min(
        49,
        Math.round(
          candidate
            .candidateScore *
            0.65
        )
      );

    candidate.hybridScore =
      candidate.finalScore;

    candidate.reasons.push(
      "PetIdentity no disponible: faltan dos fotos"
    );

    candidate.reasons.push(
      "Resultado preliminar de baja confianza"
    );

    return candidate;
  }

  try {
    // ======================================
    // LLAMADA REAL AL SERVICIO PYTHON
    // SERIALIZADA: UNA POR VEZ
    // ======================================

    const result =
      await runPetIdentitySerialized(
        () =>
          compareWithPetIdentity(
            lostPhoto,
            targetPhoto
          )
      );

    const petRaw =
      asFiniteNumber(
        result
          ?.petIdentitySimilarity,
        null
      );

    const petScore =
      asFiniteNumber(
        result
          ?.petIdentityScore,
        0
      );

    const petEffective =
      asFiniteNumber(
        result
          ?.petIdentityEffectiveScore,
        0
      );

    const petReliability =
      asFiniteNumber(
        result
          ?.petIdentityReliability,
        0
      );

    const petVerdict =
      String(
        result
          ?.petIdentityVerdict ||
          ""
      );

    const cropA =
      result
        ?.petIdentityCropA ===
      true;

    const cropB =
      result
        ?.petIdentityCropB ===
      true;

    const dualCrop =
      cropA &&
      cropB;

    const consensusPercentage =
      clampScore(
        asFiniteNumber(
          result
            ?.consensusPercentage,
          0
        )
      );

    // ======================================
    // EXPONER DATOS EN EL CANDIDATO
    // ======================================

    candidate.primaryEngine =
      result?.primaryEngine ||
      "PetIdentity";

    candidate.primaryEngineScore =
      asFiniteNumber(
        result
          ?.primaryEngineScore,
        petEffective
      );

    candidate.petIdentitySimilarity =
      petRaw;

    candidate.petIdentityScore =
      petScore;

    candidate.petIdentityPercentage =
      petIdentityPercent(
        petScore
      );

    candidate.petIdentityEffectiveScore =
      petEffective;

    candidate.petIdentityEffectivePercentage =
      petIdentityPercent(
        petEffective
      );

    candidate.petIdentityReliability =
      petReliability;

    candidate.petIdentityVerdict =
      petVerdict;

    candidate.petIdentityCropA =
      cropA;

    candidate.petIdentityCropB =
      cropB;

    candidate.consensusScore =
      asFiniteNumber(
        result
          ?.consensusScore,
        consensusPercentage /
          100
      );

    candidate.consensusPercentage =
      consensusPercentage;

    candidate.consensusVerdict =
      result
        ?.consensusVerdict ||
      null;

    candidate.consensusReason =
      result
        ?.consensusReason ||
      null;

    candidate.megaSimilarity =
      null;

    candidate.dinoSimilarity =
      null;

    candidate.visualVerificationScore =
      asFiniteNumber(
        result
          ?.visualScore,
        null
      );

    candidate.rawImageSimilarity =
      petRaw;

    candidate.imageSimilarity =
      petIdentityPercent(
        petEffective
      );

    // ======================================
    // SCORE BASE
    //
    // 70% PetIdentity efectivo
    // 20% consensus Python
    // 10% datos estructurados
    // ======================================

    let finalScore =
      clampScore(
        candidate
          .petIdentityEffectivePercentage *
          0.70 +
        consensusPercentage *
          0.20 +
        candidate
          .candidateScore *
          0.10
      );

    // ======================================
    // SIN CROP DUAL
//
// No permitimos persistir un match
// automático. Ya vimos que el fondo
// puede inflar similitudes.
// ======================================

    if (!dualCrop) {
      finalScore =
        Math.min(
          finalScore,
          54
        );

      candidate.reasons.push(
        "PetIdentity con baja autoridad: no hubo crop válido de ambos animales"
      );
    }

    // ======================================
    // IDENTIDAD DIFERENTE
    //
    // Con crop dual + reliability alta,
    // PetIdentity tiene poder de descarte.
    // ======================================

    if (
      dualCrop &&
      petReliability >= 0.90 &&
      petVerdict ===
        "different_identity"
    ) {
      finalScore = 0;

      candidate.reasons.push(
        "PetIdentity descarta la coincidencia: identidad diferente"
      );
    }

    // ======================================
    // MATCH FUERTE
    // ======================================

    if (
      dualCrop &&
      petReliability >= 0.90 &&
      petVerdict ===
        "strong_identity_match"
    ) {
      finalScore =
        Math.max(
          finalScore,
          75
        );

      candidate.reasons.push(
        "PetIdentity: coincidencia fuerte de identidad"
      );
    }

    // ======================================
    // MATCH POSIBLE
    //
    // Puede superar el umbral 55, pero no
    // recibe el piso fuerte de 75.
    // ======================================

    if (
      dualCrop &&
      petReliability >= 0.90 &&
      petVerdict ===
        "possible_identity_match"
    ) {
      finalScore =
        Math.max(
          finalScore,
          55
        );

      candidate.reasons.push(
        "PetIdentity: coincidencia posible; requiere revisión"
      );
    }

    // ======================================
    // IDENTIDAD INCIERTA
    // ======================================

   if (
  petVerdict ===
    "uncertain_identity"
) {
  if (
    dualCrop &&
    petReliability >= 0.90 &&
    petRaw !== null &&
    petRaw >= 0.58
  ) {
    // Caso visual prometedor pero todavía
    // no suficientemente fuerte para confirmar.
    finalScore =
      Math.max(
        finalScore,
        55
      );

    finalScore =
      Math.min(
        finalScore,
        69
      );

    candidate.reasons.push(
      "PetIdentity: posible coincidencia visual; requiere revisión"
    );
    } else {
     finalScore =
        Math.min(
         finalScore,
          54
      );

     candidate.reasons.push(
       "PetIdentity no pudo confirmar identidad"
      );
    }
  }

    // ======================================
    // CONFLICTOS DE DATOS
    //
    // PetIdentity fuerte puede sobrevivir
    // a errores humanos de color/tamaño,
    // pero no dejamos que datos conflictivos
    // eleven un caso visual dudoso.
    // ======================================

    const strongPetIdentity =
      dualCrop &&
      petReliability >= 0.90 &&
      petVerdict ===
        "strong_identity_match";

    if (
      candidate
        .compatibility
        ?.sizeConflict &&
      !strongPetIdentity
    ) {
      finalScore =
        Math.min(
          finalScore,
          54
        );

      candidate.reasons.push(
        "Tamaño diferente sin confirmación fuerte de PetIdentity"
      );
    }

    if (
      candidate
        .compatibility
        ?.colorConflict &&
      !strongPetIdentity
    ) {
      finalScore =
        Math.min(
          finalScore,
          54
        );

      candidate.reasons.push(
        "Color diferente sin confirmación fuerte de PetIdentity"
      );
    }

    // ======================================
    // DISTANCIA
    //
    // Una distancia extrema no borra una
    // identidad fuerte, pero sí frena
    // candidatos dudosos.
    // ======================================

    if (
      candidate.distanceKm !==
        null &&
      candidate.distanceKm >
        100 &&
      !strongPetIdentity
    ) {
      finalScore =
        Math.min(
          finalScore,
          40
        );

      candidate.reasons.push(
        "Distancia excesiva para una coincidencia no confirmada"
      );
    } else if (
      candidate.distanceKm !==
        null &&
      candidate.distanceKm >
        50 &&
      !strongPetIdentity
    ) {
      finalScore =
        Math.min(
          finalScore,
          49
        );

      candidate.reasons.push(
        "Ubicación lejana para una coincidencia no confirmada"
      );
    }

    // ======================================
    // CLAMP FINAL
    // ======================================

    candidate.finalScore =
      clampScore(
        finalScore
      );

    candidate.hybridScore =
      candidate.finalScore;

    // ======================================
    // RAZONES TÉCNICAS
    // ======================================

    if (petRaw !== null) {
      candidate.reasons.push(
        `PetIdentity raw: ${petRaw.toFixed(
          6
        )}`
      );
    }

    candidate.reasons.push(
      `PetIdentity efectivo: ${candidate.petIdentityEffectivePercentage}%`
    );

    candidate.reasons.push(
      `PetIdentity reliability: ${petReliability.toFixed(
        2
      )}`
    );

    if (petVerdict) {
      candidate.reasons.push(
        `PetIdentity verdict: ${petVerdict}`
      );
    }

    candidate.reasons.push(
      `Consensus Python: ${consensusPercentage}%${
        candidate.consensusVerdict
          ? ` (${candidate.consensusVerdict})`
          : ""
      }`
    );

    if (
      candidate.consensusReason
    ) {
      candidate.reasons.push(
        `Consensus: ${candidate.consensusReason}`
      );
    }

    console.log(
      "🪪 Resultado PetIdentity:",
      {
        targetType:
          candidate.targetType,

        petRaw,

        petEffective:
          candidate
            .petIdentityEffectivePercentage,

        reliability:
          petReliability,

        verdict:
          petVerdict,

        cropA,

        cropB,

        consensus:
          consensusPercentage,

        dataScore:
          candidate
            .candidateScore,

        finalScore:
          candidate
            .finalScore,
      }
    );

    return candidate;
  } catch (error) {
    // ======================================
    // PETIDENTITY NO DISPONIBLE
    //
    // Production Lite usa PetIdentity como
    // único motor visual.
    //
    // NO llamamos MegaDescriptor/DINOv2.
    // ======================================

    console.error(
      "❌ PetIdentity /compare falló:",
      error.message
    );

    candidate.petIdentityVerdict =
      null;

    candidate.petIdentitySimilarity =
      null;

    candidate.petIdentityScore =
      null;

    candidate.petIdentityEffectiveScore =
      null;

    candidate.petIdentityReliability =
      null;

    candidate.imageSimilarity =
      null;

    candidate.rawImageSimilarity =
      null;

    candidate.megaSimilarity =
      null;

    candidate.dinoSimilarity =
      null;

    // Sin comparación visual válida no
    // persistimos una coincidencia automática.
    candidate.finalScore =
      Math.min(
        49,
        Math.round(
          candidate
            .candidateScore *
            0.65
        )
      );

    candidate.hybridScore =
      candidate.finalScore;

    candidate.reasons.push(
      "PetIdentity temporalmente no disponible"
    );

    candidate.reasons.push(
      "Resultado preliminar: no se ejecuta fallback legacy en Production Lite"
    );

    return candidate;
  }
}

// ==========================================
// CONSTRUIR WHERE DE MATCH
// ==========================================

function buildMatchWhere(
  candidate
) {
  if (
    candidate.targetType ===
      "sighting" ||
    candidate.sightingId
  ) {
    return {
      lostReportId:
        candidate
          .lostReportId,

      sightingId:
        candidate
          .sightingId,
    };
  }

  return {
    lostReportId:
      candidate
        .lostReportId,

    foundReportId:
      candidate
        .foundReportId,
  };
}

// ==========================================
// CONSTRUIR DATOS PARA CREAR MATCH
// ==========================================

function buildMatchCreateData(
  candidate,
  aiReason
) {
  const base = {
    lostReportId:
      candidate
        .lostReportId,

    score:
      candidate
        .finalScore,

    status:
      "pending",

    aiReason,
  };

  if (
    candidate.targetType ===
      "sighting" ||
    candidate.sightingId
  ) {
    return {
      ...base,

      foundReportId:
        null,

      sightingId:
        candidate
          .sightingId,
    };
  }

  return {
    ...base,

    foundReportId:
      candidate
        .foundReportId,

    sightingId:
      null,
  };
}

// ==========================================
// PERSISTENCIA
// ==========================================

async function persistCandidate(
  candidate
) {
  const aiReason =
    candidate.reasons.join(
      " | "
    );

  const matchWhere =
    buildMatchWhere(
      candidate
    );

  let match =
    await Match.findOne({
      where:
        matchWhere,
    });

  // ========================================
  // MATCH DESCARTADO PREVIAMENTE
  // ========================================

  if (
    match &&
    match.status ===
      "rejected"
  ) {
    console.log(
      "🚫 Match descartado previamente:",
      {
        lostReportId:
          candidate
            .lostReportId,

        foundReportId:
          candidate
            .foundReportId ||
          null,

        sightingId:
          candidate
            .sightingId ||
          null,

        targetType:
          candidate
            .targetType,
      }
    );

    candidate.matchId =
      match.id;

    candidate.status =
      "rejected";

    candidate.rejected =
      true;

    return candidate;
  }

  // ========================================
  // CREAR NUEVO MATCH
  // ========================================

  if (!match) {
    const createData =
      buildMatchCreateData(
        candidate,
        aiReason
      );

    match =
      await Match.create(
        createData
      );

    console.log(
      "✅ Match nuevo creado:",
      {
        matchId:
          match.id,

        targetType:
          candidate
            .targetType,

        lostReportId:
          candidate
            .lostReportId,

        foundReportId:
          candidate
            .foundReportId ||
          null,

        sightingId:
          candidate
            .sightingId ||
          null,
      }
    );
  } else {
    // ======================================
    // ACTUALIZAR MATCH EXISTENTE
    // ======================================

    match.score =
      candidate
        .finalScore;

    match.aiReason =
      aiReason;

    match.updatedAt =
      new Date();

    await match.save();
  }

  candidate.matchId =
    match.id;

  candidate.status =
    match.status;

  candidate.rejected =
    false;

  return candidate;
}

// ==========================================
// VALIDAR PREFILTRO
// ==========================================

function passesPreFilter(
  candidate
) {
  if (!candidate) {
    return false;
  }

  const genericCandidate =
    candidate
      .compatibility
      ?.genericBreed ===
    true;

  // Si una raza es genérica,
  // permitimos que llegue a la etapa visual,
  // porque PetIdentity puede resolver
  // la ambigüedad.
  if (genericCandidate) {
    return true;
  }

  // Para razas específicas pedimos
  // al menos un mínimo de compatibilidad.
  if (
    candidate
      .candidateScore <
    10
  ) {
    return false;
  }

  return true;
}

// ==========================================
// REGLA DURA DE RAZA
// ==========================================

function hasHardBreedConflict(
  candidate
) {
  return Boolean(
    candidate
      ?.compatibility
      ?.bothSpecificBreed ===
      true &&
    candidate
      ?.compatibility
      ?.breedConflict ===
      true
  );
}
// ==========================================
// PROCESAR UN CANDIDATO
// ==========================================

async function processCandidate(
  candidate
) {
  if (!candidate) {
    return null;
  }

  // ========================================
  // PREFILTRO DE DATOS
  // ========================================

  if (
    !passesPreFilter(
      candidate
    )
  ) {
    return null;
  }

  // ========================================
  // RAZA ESPECÍFICA INCOMPATIBLE
  // ========================================

  if (
    hasHardBreedConflict(
      candidate
    )
  ) {
    console.log(
      "❌ Descartado antes de IA por raza incompatible:",
      {
        lost:
          candidate
            .lost
            ?.breed,

        target:
          candidate
            .target
            ?.breed,

        targetType:
          candidate
            .targetType,
      }
    );

    return null;
  }

  // ========================================
  // COMPARACIÓN VISUAL
  //
  // PetIdentity es ahora el motor principal.
  // ========================================

  candidate =
    await addImageSimilarity(
      candidate
    );

  // ========================================
  // UMBRAL FINAL
  //
  // Solo persistimos una coincidencia
  // si alcanza 55.
  //
  // - strong_identity_match >= 75
  // - possible_identity_match >= 55
  // - different_identity = 0
  // - sin crop dual <= 54
  // - sin PetIdentity válido <= 49
  // ========================================

  if (
    candidate.finalScore <
    55
  ) {
    console.log(
      "🛑 Candidato descartado por score final:",
      {
        targetType:
          candidate.targetType,

        lostReportId:
          candidate.lostReportId,

        foundReportId:
          candidate.foundReportId ||
          null,

        sightingId:
          candidate.sightingId ||
          null,

        finalScore:
          candidate.finalScore,

        petIdentityVerdict:
          candidate
            .petIdentityVerdict ||
          null,
      }
    );

    return null;
  }

  // ========================================
  // PERSISTENCIA
  // ========================================

  candidate =
    await persistCandidate(
      candidate
    );

  // ========================================
  // NO VOLVER A MOSTRAR DESCARTADOS
  // ========================================

  if (
    candidate.status ===
    "rejected"
  ) {
    return null;
  }

  return candidate;
}

// ==========================================
// GENERAR CANDIDATOS
//
// Cruza:
// 1. Perdidos ↔ Encontrados
// 2. Perdidos ↔ Avistamientos
// ==========================================

async function generateCandidates() {
  // ========================================
  // CARGAR MASCOTAS PERDIDAS
  // ========================================

  const lostReports =
    await LostReport.findAll({
      where: {
        status:
          "active",
      },

      include: [
        {
          model:
            Pet,

          as:
            "pet",

          required:
            true,

          include: [
            {
              model:
                PetPhoto,

              as:
                "photos",

              required:
                false,
            },
          ],
        },

        {
          model:
            Location,

          as:
            "location",

          required:
            false,
        },
      ],

      order: [
        [
          "created_at",
          "DESC",
        ],
      ],
    });

  // ========================================
  // CARGAR MASCOTAS ENCONTRADAS
  // ========================================

  const foundReports =
    await FoundReport.findAll({
      where: {
        status:
          "active",
      },

      include: [
        {
          model:
            FoundReportPhoto,

          as:
            "photos",

          required:
            false,
        },

        {
          model:
            Location,

          as:
            "location",

          required:
            false,
        },
      ],

      order: [
        [
          "created_at",
          "DESC",
        ],
      ],
    });

  // ========================================
  // CARGAR AVISTAMIENTOS
  // ========================================

  const sightings =
    await Sighting.findAll({
      where: {
        status:
          "active",
      },

      include: [
        {
          model:
            SightingPhoto,

          as:
            "photos",

          required:
            false,
        },

        {
          model:
            Location,

          as:
            "location",

          required:
            false,
        },
      ],

      order: [
        [
          "sightedAt",
          "DESC",
        ],
        [
          "created_at",
          "DESC",
        ],
      ],
    });

  console.log(
    "🔎 Motor de candidatos:"
  );

  console.log(
    `Perdidos: ${lostReports.length}`
  );

  console.log(
    `Encontrados: ${foundReports.length}`
  );

  console.log(
    `Avistamientos: ${sightings.length}`
  );

  const candidates = [];

  // ========================================
  // 1. PERDIDOS VS ENCONTRADOS
  // ========================================

  for (
    const lostReport of
    lostReports
  ) {
    for (
      const foundReport of
      foundReports
    ) {
      let candidate =
        calculateCandidate(
          lostReport,
          foundReport,
          "found"
        );

      candidate =
        await processCandidate(
          candidate
        );

      if (!candidate) {
        continue;
      }

      candidates.push(
        candidate
      );
    }
  }

  // ========================================
  // 2. PERDIDOS VS AVISTAMIENTOS
  // ========================================

  for (
    const lostReport of
    lostReports
  ) {
    for (
      const sighting of
      sightings
    ) {
      let candidate =
        calculateCandidate(
          lostReport,
          sighting,
          "sighting"
        );

      candidate =
        await processCandidate(
          candidate
        );

      if (!candidate) {
        continue;
      }

      candidates.push(
        candidate
      );
    }
  }

  // ========================================
  // ORDENAR MEJORES PRIMERO
// ========================================

  candidates.sort(
    (
      candidateA,
      candidateB
    ) => {
      const scoreA =
        candidateA
          .finalScore ??
        candidateA
          .candidateScore;

      const scoreB =
        candidateB
          .finalScore ??
        candidateB
          .candidateScore;

      return (
        scoreB -
        scoreA
      );
    }
  );

  const foundCount =
    candidates.filter(
      (candidate) =>
        candidate
          .targetType ===
        "found"
    ).length;

  const sightingCount =
    candidates.filter(
      (candidate) =>
        candidate
          .targetType ===
        "sighting"
    ).length;

  console.log(
    `✅ Candidatos encontrados: ${candidates.length}`
  );

  console.log(
    `   Encontrados: ${foundCount}`
  );

  console.log(
    `   Avistamientos: ${sightingCount}`
  );

  return candidates;
}

// ==========================================
// HELPERS PARA DEBUG / PRUEBAS
// ==========================================

function isSightingCandidate(
  candidate
) {
  return Boolean(
    candidate &&
      (
        candidate.targetType ===
          "sighting" ||
        candidate.sightingId
      )
  );
}

function isFoundCandidate(
  candidate
) {
  return Boolean(
    candidate &&
      candidate.targetType ===
        "found" &&
      candidate.foundReportId
  );
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  generateCandidates,

  calculateCandidate,
  processCandidate,

  addImageSimilarity,
  addLegacyImageSimilarity,
  compareWithPetIdentity,
  runPetIdentitySerialized,
  resolveImageUrlForReId,

  persistCandidate,
  buildMatchWhere,
  buildMatchCreateData,

  passesPreFilter,
  hasHardBreedConflict,

  normalizeText,
  normalizeBreed,
  normalizeTarget,

  isGenericBreed,
  breedSimilarityScore,
  getBreedRelation,

  distanceKm,
  getDistanceScore,

  textSimilarity,

  getLostPhoto,
  getFoundPhoto,
  getSightingPhoto,

  isSightingCandidate,
  isFoundCandidate,
};
