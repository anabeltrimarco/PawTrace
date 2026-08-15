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
// - Animal Re-ID
// - MegaDescriptor
// - DINOv2
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

    // ======================================
    // GENÉRICAS
    // ======================================

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

  if (
    a.includes(b) ||
    b.includes(a)
  ) {
    return 0.8;
  }

  const wordsA = new Set(
    a.split(/\s+/)
  );

  const wordsB = new Set(
    b.split(/\s+/)
  );

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

function breedSimilarityScore(
  breedA,
  breedB
) {
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

function distanceKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
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

  const deltaLat = toRadians(
    bLat - aLat
  );

  const deltaLon = toRadians(
    bLon - aLon
  );

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

  return (
    EARTH_RADIUS *
    angularDistance
  );
}


// ==========================================
// SCORE POR DISTANCIA
// ==========================================

function getDistanceScore(distance) {
  if (distance === null) {
    return 0;
  }

  if (distance <= 1) {
    return 15;
  }

  if (distance <= 3) {
    return 12;
  }

  if (distance <= 5) {
    return 10;
  }

  if (distance <= 10) {
    return 7;
  }

  if (distance <= 20) {
    return 4;
  }

  if (distance <= 50) {
    return 1;
  }

  if (distance <= 100) {
    return -5;
  }

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
    (
      !lostGeneric &&
      candidateGeneric
    ) ||
    (
      lostGeneric &&
      !candidateGeneric
    );

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
//
// Convierte FoundReport y Sighting
// a una estructura común.
//
// De esta manera el cálculo físico
// puede ser reutilizado.
// ==========================================

function normalizeTarget(
  target,
  targetType
) {
  if (!target) {
    return null;
  }

  if (targetType === "sighting") {
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

      raw:
        target,
    };
  }

  const photo =
    getFoundPhoto(target);

  return {
    id: target.id,

    targetType:
      "found",

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

    raw:
      target,
  };
}


// ==========================================
// CALCULAR CANDIDATO
//
// Ahora funciona para:
//
// LostReport ↔ FoundReport
// LostReport ↔ Sighting
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

  // ========================================
  // ESPECIE - REGLA DURA
  // ========================================

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
    lostSpecies !== targetSpecies
  ) {
    return null;
  }

  // ========================================
  // RAZA
  // ========================================

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

  // ========================================
  // MISMA ESPECIE
  // ========================================

  score += 20;

  reasons.push(
    "Misma especie"
  );

  // ========================================
  // TAMAÑO
  // ========================================

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
    lostSize === targetSize;

  const sizeConflict =
    hasBothSizes &&
    !sameSize;

  if (sameSize) {
    score += 15;

    reasons.push(
      "Mismo tamaño"
    );
  } else if (
    sizeConflict
  ) {
    score -= 10;

    reasons.push(
      "Tamaño diferente"
    );
  }

  // ========================================
  // RAZA
  // ========================================

  let breedConflict = false;

  const sameGenericBreed =
    breedRelation.bothGeneric &&
    Boolean(
      lostBreed &&
      targetBreed
    ) &&
    lostBreed === targetBreed;

  if (sameGenericBreed) {
    reasons.push(
      lostBreed === "mestizo"
        ? "Ambos mestizos"
        : "Raza genérica coincidente"
    );
  } else if (
    breedRelation.specificToGeneric
  ) {
    reasons.push(
      "Raza específica contra clasificación genérica"
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
    score += 25;

    reasons.push(
      "Raza muy similar"
    );
  } else if (
    breedSimilarity >= 0.4
  ) {
    score += 12;

    reasons.push(
      "Raza parcialmente similar"
    );
  } else if (
    lostBreed &&
    targetBreed
  ) {
    breedConflict = true;

    score -= 30;

    reasons.push(
      "Raza incompatible"
    );
  }

  // ========================================
  // COLOR
  // ========================================

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

  let colorConflict = false;

  const sameColor =
    hasBothColors &&
    colorSimilarity >= 0.8;

  const partialColor =
    hasBothColors &&
    colorSimilarity >= 0.4 &&
    colorSimilarity < 0.8;

  if (sameColor) {
    score += 15;

    reasons.push(
      "Color muy similar"
    );
  } else if (
    partialColor
  ) {
    score += 8;

    reasons.push(
      "Color parcialmente similar"
    );
  } else if (
    hasBothColors
  ) {
    score -= 10;

    colorConflict = true;

    reasons.push(
      "Color diferente"
    );
  }

  // ========================================
  // DISTANCIA
  // ========================================

  const distance =
    distanceKm(
      lostReport
        ?.location
        ?.latitude,

      lostReport
        ?.location
        ?.longitude,

      normalizedTarget
        ?.location
        ?.latitude,

      normalizedTarget
        ?.location
        ?.longitude
    );

  const distanceScore =
    getDistanceScore(
      distance
    );

  score += distanceScore;

  if (
    distance !== null
  ) {
    reasons.push(
      `A ${distance.toFixed(1)} km`
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
  }

  // ========================================
  // SCORE DE DATOS
  // ========================================

  const candidateScore =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );

  // ========================================
  // FOTO PRINCIPAL PERDIDA
  // ========================================

  const lostPhoto =
    getLostPhoto(
      lostReport
    );

  // ========================================
  // IDENTIFICADORES SEGÚN TIPO
  // ========================================

  const foundReportId =
    targetType === "found"
      ? normalizedTarget.id
      : null;

  const sightingId =
    targetType === "sighting"
      ? normalizedTarget.id
      : null;

  // ========================================
  // RESPUESTA
  // ========================================

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
            distance.toFixed(2)
          ),

    compatibility: {
      breedSimilarity:
        Math.round(
          breedSimilarity * 100
        ),

      colorSimilarity:
        Math.round(
          colorSimilarity * 100
        ),

      breedConflict,

      colorConflict,

      sizeConflict,

      sameSize,

      sameColor,

      partialColor,

      genericBreed:
        breedRelation.lostGeneric ||
        breedRelation.candidateGeneric,

      bothGenericBreed:
        breedRelation.bothGeneric,

      bothSpecificBreed:
        breedRelation.bothSpecific,

      specificToGenericBreed:
        breedRelation.specificToGeneric,

      sameGenericBreed,
    },

    // ======================================
    // MASCOTA PERDIDA
    // ======================================

    lost: {
      id:
        lostReport.id,

      petId:
        lostReport.petId ||
        lostReport.pet.id,

      name:
        lostReport.pet.name ||
        "Mascota perdida",

      species:
        lostReport.pet.species,

      breed:
        lostReport.pet.breed ||
        null,

      color:
        lostReport.pet.color ||
        null,

      size:
        lostReport.pet.size ||
        null,

      description:
        lostReport.pet
          .description ||
        null,

      photo:
        lostPhoto?.imageUrl ||
        lostPhoto?.url ||
        null,

      location:
        lostReport.location ||
        null,

      date:
        lostReport.lastSeenAt ||
        lostReport.created_at ||
        lostReport.createdAt ||
        null,
    },

    // ======================================
    // DESTINO NORMALIZADO
    // ======================================

    target: {
      id:
        normalizedTarget.id,

      type:
        targetType,

      species:
        normalizedTarget.species,

      breed:
        normalizedTarget.breed,

      color:
        normalizedTarget.color,

      size:
        normalizedTarget.size,

      description:
        normalizedTarget.description,

      photo:
        normalizedTarget.photo,

      location:
        normalizedTarget.location,

      date:
        normalizedTarget.date,
    },

    // ======================================
    // COMPATIBILIDAD CON FRONTEND ACTUAL
    //
    // Para FoundReport mantenemos found.
    // Para Sighting también dejamos una
    // estructura equivalente para no romper
    // componentes que lean candidate.found.
    // ======================================

    found: {
      id:
        normalizedTarget.id,

      species:
        normalizedTarget.species,

      breed:
        normalizedTarget.breed,

      color:
        normalizedTarget.color,

      size:
        normalizedTarget.size,

      description:
        normalizedTarget.description,

      photo:
        normalizedTarget.photo,

      location:
        normalizedTarget.location,

      date:
        normalizedTarget.date,

      type:
        targetType,

      isSighting:
        targetType === "sighting",
    },

    sighting:
      targetType === "sighting"
        ? {
            id:
              normalizedTarget.id,

            species:
              normalizedTarget.species,

            breed:
              normalizedTarget.breed,

            color:
              normalizedTarget.color,

            size:
              normalizedTarget.size,

            description:
              normalizedTarget.description,

            photo:
              normalizedTarget.photo,

            location:
              normalizedTarget.location,

            date:
              normalizedTarget.date,
          }
        : null,
  };
}
// ==========================================
// COMPARACIÓN ANIMAL RE-ID
//
// Funciona para:
//
// LostReport ↔ FoundReport
// LostReport ↔ Sighting
//
// DINOv2 + MegaDescriptor
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
  // VALIDAR FOTOS
  // ========================================

  if (
    !lostPhoto ||
    !targetPhoto
  ) {
    candidate.imageSimilarity =
      null;

    candidate.rawImageSimilarity =
      null;

    candidate.megaSimilarity =
      null;

    candidate.dinoSimilarity =
      null;

    candidate.hybridScore =
      candidate.candidateScore;

    candidate.finalScore =
      candidate.candidateScore;

    candidate.reasons.push(
      "Sin dos fotos para comparación Animal Re-ID"
    );

    return candidate;
  }

  try {
    // ========================================
    // IDENTIFICAR TIPO DE DESTINO
    // ========================================

    const isSighting =
      candidate.targetType ===
        "sighting" ||
      Boolean(
        candidate.sightingId
      );

    const targetEntityType =
      isSighting
        ? "sighting"
        : "found_report";

    const targetEntityId =
      isSighting
        ? candidate.sightingId
        : candidate.foundReportId;

    console.log(
      "🧠 Comparando Re-ID híbrido:",
      {
        perdida:
          candidate.lostReportId,

        tipoDestino:
          isSighting
            ? "avistamiento"
            : "encontrada",

        destino:
          targetEntityId,
      }
    );

    // ========================================
    // EMBEDDING DE MASCOTA PERDIDA
    // ========================================

    const lostEmbeddings =
      await getHybridEmbeddings({
        entityType:
          "lost_report",

        entityId:
          candidate.lostReportId,

        imageUrl:
          lostPhoto,
      });

    // ========================================
    // EMBEDDING DEL DESTINO
    //
    // Encontrada:
    // entityType = found_report
    //
    // Avistamiento:
    // entityType = sighting
    // ========================================

    const targetEmbeddings =
      await getHybridEmbeddings({
        entityType:
          targetEntityType,

        entityId:
          targetEntityId,

        imageUrl:
          targetPhoto,
      });

    // ========================================
    // VECTORES MEGADESCRIPTOR
    // ========================================

    const lostMegaVector =
      lostEmbeddings
        ?.mega
        ?.embedding;

    const targetMegaVector =
      targetEmbeddings
        ?.mega
        ?.embedding;

    // ========================================
    // VECTORES DINOV2
    // ========================================

    const lostDinoVector =
      lostEmbeddings
        ?.dino
        ?.embedding;

    const targetDinoVector =
      targetEmbeddings
        ?.dino
        ?.embedding;

    // ========================================
    // SIMILITUD MEGADESCRIPTOR
    // ========================================

    const megaSimilarity =
      cosineSimilarity(
        lostMegaVector,
        targetMegaVector
      );

    // ========================================
    // SIMILITUD DINOV2
    // ========================================

    const dinoSimilarity =
      cosineSimilarity(
        lostDinoVector,
        targetDinoVector
      );

    if (
      megaSimilarity === null &&
      dinoSimilarity === null
    ) {
      throw new Error(
        "No se pudo calcular ninguna similitud visual."
      );
    }

    candidate.megaSimilarity =
      megaSimilarity;

    candidate.dinoSimilarity =
      dinoSimilarity;

    candidate.rawImageSimilarity =
      megaSimilarity;

    // ======================================
    // NORMALIZAR MEGADESCRIPTOR
    // ======================================

    function normalizeMega(
      value
    ) {
      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        return 0;
      }

      if (value >= 0.60) {
        return 100;
      }

      if (value >= 0.45) {
        return 90;
      }

      if (value >= 0.35) {
        return 80;
      }

      if (value >= 0.25) {
        return 70;
      }

      if (value >= 0.18) {
        return 60;
      }

      if (value >= 0.12) {
        return 50;
      }

      if (value >= 0.08) {
        return 40;
      }

      if (value >= 0.04) {
        return 30;
      }

      if (value >= 0) {
        return 20;
      }

      return 0;
    }

    // ======================================
    // NORMALIZAR DINOV2
    // ======================================

    function normalizeDino(
      value
    ) {
      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        return 0;
      }

      if (value >= 0.80) {
        return 100;
      }

      if (value >= 0.70) {
        return 95;
      }

      if (value >= 0.60) {
        return 90;
      }

      if (value >= 0.55) {
        return 85;
      }

      if (value >= 0.50) {
        return 75;
      }

      if (value >= 0.45) {
        return 65;
      }

      if (value >= 0.40) {
        return 55;
      }

      if (value >= 0.35) {
        return 45;
      }

      if (value >= 0.30) {
        return 35;
      }

      if (value >= 0.20) {
        return 20;
      }

      return 0;
    }

    // ======================================
    // SCORES NORMALIZADOS
    // ======================================

    const megaScore =
      normalizeMega(
        megaSimilarity
      );

    const dinoScore =
      normalizeDino(
        dinoSimilarity
      );

    // ======================================
    // SCORE VISUAL
    //
    // DINO 80%
    // Mega 20%
    // ======================================

    const visualScore =
      Math.round(
        dinoScore * 0.80 +
        megaScore * 0.20
      );

    candidate.imageSimilarity =
      visualScore;

    candidate.megaScore =
      megaScore;

    candidate.dinoScore =
      dinoScore;

    // ======================================
    // SCORE HÍBRIDO FINAL
    //
    // DINOv2          60%
    // MegaDescriptor  15%
    // Datos           25%
    // ======================================

    let finalScore =
      Math.round(
        dinoScore * 0.60 +
        megaScore * 0.15 +
        candidate
          .candidateScore *
          0.25
      );

    // ======================================
    // RAZAS ESPECÍFICAS INCOMPATIBLES
    // ======================================

    const bothSpecificBreed =
      candidate
        .compatibility
        ?.bothSpecificBreed ===
      true;

    const breedConflict =
      candidate
        .compatibility
        ?.breedConflict ===
      true;

    if (
      bothSpecificBreed &&
      breedConflict
    ) {
      candidate.finalScore = 0;

      candidate.hybridScore = 0;

      candidate.reasons.push(
        "Razas específicas incompatibles"
      );

      console.log(
        "❌ Descartado por raza:",
        {
          perdida:
            candidate
              .lost
              ?.breed,

          destino:
            candidate
              .target
              ?.breed,

          targetType:
            candidate
              .targetType,
        }
      );

      return candidate;
    }

    // ======================================
    // DINO FUERTE + DATOS COMPATIBLES
    // ======================================

    if (
      dinoSimilarity !== null &&
      dinoSimilarity >= 0.55 &&
      candidate.candidateScore >= 50
    ) {
      finalScore += 8;

      candidate.reasons.push(
        "DINOv2 y datos físicos fuertemente compatibles"
      );
    }

    // ======================================
    // DINO FUERTE
    // ======================================

    if (
      dinoSimilarity !== null &&
      dinoSimilarity >= 0.55
    ) {
      finalScore =
        Math.max(
          finalScore,
          58
        );

      candidate.reasons.push(
        "Alta similitud visual DINOv2"
      );
    }

    // ======================================
    // DINO MODERADO
    // ======================================

    if (
      dinoSimilarity !== null &&
      dinoSimilarity >= 0.45 &&
      dinoSimilarity < 0.55 &&
      candidate.candidateScore >= 50
    ) {
      finalScore =
        Math.max(
          finalScore,
          52
        );

      candidate.reasons.push(
        "Similitud DINOv2 moderada con datos compatibles"
      );
    }

    // ======================================
    // DINO MUY BAJO
    // ======================================

    if (
      dinoSimilarity !== null &&
      dinoSimilarity < 0.20
    ) {
      finalScore =
        Math.min(
          finalScore,
          35
        );

      candidate.reasons.push(
        "DINOv2 indica similitud visual muy baja"
      );
    }

    // ======================================
    // TAMAÑO DIFERENTE
    // ======================================

    if (
      candidate
        .compatibility
        ?.sizeConflict
    ) {
      finalScore =
        Math.min(
          finalScore,
          64
        );

      candidate.reasons.push(
        "Penalización por tamaño diferente"
      );
    }

    // ======================================
    // COLOR DIFERENTE
    // ======================================

    if (
      candidate
        .compatibility
        ?.colorConflict
    ) {
      finalScore =
        Math.min(
          finalScore,
          64
        );

      candidate.reasons.push(
        "Penalización por color diferente"
      );
    }

    // ======================================
    // DISTANCIA
    // ======================================

    if (
      candidate.distanceKm !== null &&
      candidate.distanceKm > 100
    ) {
      finalScore =
        Math.min(
          finalScore,
          44
        );

      candidate.reasons.push(
        "Distancia excesiva"
      );
    } else if (
      candidate.distanceKm !== null &&
      candidate.distanceKm > 50
    ) {
      finalScore =
        Math.min(
          finalScore,
          54
        );
    }

    // ======================================
    // PEQUEÑO REFUERZO PARA AVISTAMIENTOS
    //
    // Un avistamiento normalmente tiene
    // menos información que un reporte
    // encontrado.
    //
    // Si la IA visual es fuerte,
    // no queremos descartarlo simplemente
    // por tener menos campos descriptivos.
    // ======================================

    if (
      isSighting &&
      dinoSimilarity !== null &&
      dinoSimilarity >= 0.50
    ) {
      finalScore =
        Math.max(
          finalScore,
          55
        );

      candidate.reasons.push(
        "Avistamiento con similitud visual relevante"
      );
    }

    // ======================================
    // LIMITAR ENTRE 0 Y 100
    // ======================================

    candidate.finalScore =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            finalScore
          )
        )
      );

    candidate.hybridScore =
      candidate.finalScore;

    // ======================================
    // EXPLICACIONES
    // ======================================

    if (
      megaSimilarity !== null
    ) {
      candidate.reasons.push(
        `MegaDescriptor: ${megaSimilarity.toFixed(
          4
        )}`
      );
    }

    if (
      dinoSimilarity !== null
    ) {
      candidate.reasons.push(
        `DINOv2: ${dinoSimilarity.toFixed(
          4
        )}`
      );
    }

    candidate.reasons.push(
      `Score visual híbrido: ${visualScore}%`
    );

    if (isSighting) {
      candidate.reasons.push(
        "Origen del candidato: avistamiento"
      );
    } else {
      candidate.reasons.push(
        "Origen del candidato: mascota encontrada"
      );
    }

    // ======================================
    // LOG DE CALIBRACIÓN
    // ======================================

    console.log(
      "⚡ Resultado Re-ID híbrido:",
      {
        targetType:
          candidate.targetType,

        megaSimilarity:
          megaSimilarity ===
          null
            ? null
            : Number(
                megaSimilarity.toFixed(
                  6
                )
              ),

        dinoSimilarity:
          dinoSimilarity ===
          null
            ? null
            : Number(
                dinoSimilarity.toFixed(
                  6
                )
              ),

        megaScore,

        dinoScore,

        dataScore:
          candidate
            .candidateScore,

        visualScore,

        hybridScore:
          candidate
            .finalScore,
      }
    );

    return candidate;

  } catch (error) {
    console.error(
      "❌ Comparación Re-ID híbrida falló:",
      error.message
    );

    candidate.imageSimilarity =
      null;

    candidate.rawImageSimilarity =
      null;

    candidate.megaSimilarity =
      null;

    candidate.dinoSimilarity =
      null;

    candidate.hybridScore =
      candidate.candidateScore;

    candidate.finalScore =
      candidate.candidateScore;

    candidate.reasons.push(
      "Animal Re-ID híbrido temporalmente no disponible"
    );

    return candidate;
  }
}


// ==========================================
// CONSTRUIR WHERE DE MATCH
//
// Determina cómo buscar un Match
// existente según el tipo.
//
// Encontrada:
// lostReportId + foundReportId
//
// Avistamiento:
// lostReportId + sightingId
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
        candidate.lostReportId,

      sightingId:
        candidate.sightingId,
    };
  }

  return {
    lostReportId:
      candidate.lostReportId,

    foundReportId:
      candidate.foundReportId,
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
      candidate.lostReportId,

    score:
      candidate.finalScore,

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
        candidate.sightingId,
    };
  }

  return {
    ...base,

    foundReportId:
      candidate.foundReportId,

    sightingId:
      null,
  };
}


// ==========================================
// PERSISTENCIA
//
// Soporta:
//
// perdida + encontrada
// perdida + avistamiento
// ==========================================

async function persistCandidate(
  candidate
) {
  const aiReason =
    candidate
      .reasons
      .join(
        " | "
      );

  const matchWhere =
    buildMatchWhere(
      candidate
    );

  // ========================================
  // BUSCAR MATCH EXISTENTE
  // ========================================

  let match =
    await Match.findOne({
      where:
        matchWhere,
    });

  // ========================================
  // SI FUE DESCARTADO
  //
  // No lo revivimos.
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
  // CREAR MATCH NUEVO
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
  }

  // ========================================
  // ACTUALIZAR MATCH EXISTENTE
  // ========================================

  else {
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
//
// Devuelve true si el candidato
// puede continuar hacia Animal Re-ID.
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

  // ========================================
  // Razas genéricas
  //
  // Siempre permitimos que llegue
  // al análisis visual.
  // ========================================

  if (genericCandidate) {
    return true;
  }

  // ========================================
  // Razas específicas
  //
  // Requerimos un mínimo de
  // compatibilidad estructural.
  // ========================================

  if (
    candidate
      .candidateScore <
    15
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
//
// Centraliza la lógica usada tanto
// por FoundReport como por Sighting.
// ==========================================

async function processCandidate(
  candidate
) {
  if (!candidate) {
    return null;
  }

  // ========================================
  // PREFILTRO
  // ========================================

  if (
    !passesPreFilter(
      candidate
    )
  ) {
    return null;
  }

  // ========================================
  // RAZA INCOMPATIBLE
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
  // ANIMAL RE-ID
  // ========================================

  candidate =
    await addImageSimilarity(
      candidate
    );

  // ========================================
  // FILTRO FINAL
  //
  // 55+ =
  // "Coincidencia posible"
  // ========================================

  if (
    candidate.finalScore <
    55
  ) {
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
  // DESCARTADO POR EL USUARIO
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
//
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

  // ========================================
  // LOG DEL MOTOR
  // ========================================

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

  const candidates =
    [];

  // ========================================
  // 1. CRUZAR PERDIDOS VS ENCONTRADOS
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
  // 2. CRUZAR PERDIDOS VS AVISTAMIENTOS
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

  // ========================================
  // LOG FINAL
  // ========================================

  const foundCount =
    candidates.filter(
      (candidate) =>
        candidate.targetType ===
        "found"
    ).length;

  const sightingCount =
    candidates.filter(
      (candidate) =>
        candidate.targetType ===
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
  // ========================================
  // MOTOR PRINCIPAL
  // ========================================

  generateCandidates,

  // ========================================
  // CÁLCULO DE CANDIDATOS
  // ========================================

  calculateCandidate,

  processCandidate,

  // ========================================
  // ANIMAL RE-ID
  // ========================================

  addImageSimilarity,

  // ========================================
  // PERSISTENCIA
  // ========================================

  persistCandidate,

  buildMatchWhere,

  buildMatchCreateData,

  // ========================================
  // PREFILTROS
  // ========================================

  passesPreFilter,

  hasHardBreedConflict,

  // ========================================
  // NORMALIZACIÓN
  // ========================================

  normalizeText,

  normalizeBreed,

  normalizeTarget,

  // ========================================
  // RAZA
  // ========================================

  isGenericBreed,

  breedSimilarityScore,

  getBreedRelation,

  // ========================================
  // DISTANCIA
  // ========================================

  distanceKm,

  getDistanceScore,

  // ========================================
  // SIMILITUD
  // ========================================

  textSimilarity,

  // ========================================
  // FOTOS
  // ========================================

  getLostPhoto,

  getFoundPhoto,

  getSightingPhoto,

  // ========================================
  // TIPO DE CANDIDATO
  // ========================================

  isSightingCandidate,

  isFoundCandidate,
};