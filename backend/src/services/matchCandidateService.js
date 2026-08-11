// ==========================================
// PAWTRACE - MATCH CANDIDATE SERVICE
//
// Sprint 1.4.1
// Sprint 1.4.2
// Sprint 1.4.3
// Sprint 1.4.3.2
// Sprint 1.4.3.5.2
//
// - Candidatos
// - Datos físicos
// - Distancia
// - Animal Re-ID con MegaDescriptor
// - Persistencia
// - Matching por tipo de raza
// ==========================================

const {
  LostReport,
  FoundReport,
  Pet,
  PetPhoto,
  FoundReportPhoto,
  Location,
  Match,
} = require("../models");

const {
  getHybridEmbeddings,
  cosineSimilarity,
} = require(
  "./imageEmbeddingService"
);

// ==========================================
// NORMALIZAR TEXTO
// ==========================================

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

// ==========================================
// NORMALIZAR RAZA
// ==========================================

function normalizeBreed(value) {
  const breed =
    normalizeText(value);

  if (!breed) {
    return "";
  }

  const aliases = {
    golden:
      "golden retriever",

    "golden retriever":
      "golden retriever",

    labrador:
      "labrador retriever",

    "labrador retriever":
      "labrador retriever",

    "ovejero aleman":
      "pastor aleman",

    "pastor aleman":
      "pastor aleman",

    "german shepherd":
      "pastor aleman",

    caniche:
      "caniche",

    poodle:
      "caniche",

    salchicha:
      "dachshund",

    dachshund:
      "dachshund",

    "husky siberiano":
      "husky siberiano",

    husky:
      "husky siberiano",

    // ======================================
    // GENÉRICAS
    // ======================================

    mestiza:
      "mestizo",

    mixed:
      "mestizo",

    cruza:
      "mestizo",

    cruzado:
      "mestizo",

    cruzada:
      "mestizo",

    "sin raza":
      "mestizo",

    "sin raza definida":
      "mestizo",

    desconocido:
      "desconocida",

    unknown:
      "desconocida",

    otro:
      "otra",
  };

  return (
    aliases[breed] ||
    breed
  );
}

// ==========================================
// RAZA GENÉRICA
// ==========================================

function isGenericBreed(value) {
  const breed =
    normalizeBreed(value);

  if (!breed) {
    return true;
  }

  const genericBreeds =
    new Set([
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

  return genericBreeds.has(
    breed
  );
}

// ==========================================
// SIMILITUD DE TEXTO
// ==========================================

function textSimilarity(
  valueA,
  valueB
) {
  const a =
    normalizeText(valueA);

  const b =
    normalizeText(valueB);

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

  const wordsA =
    new Set(
      a.split(/\s+/)
    );

  const wordsB =
    new Set(
      b.split(/\s+/)
    );

  let common = 0;

  for (
    const word of wordsA
  ) {
    if (
      wordsB.has(word)
    ) {
      common += 1;
    }
  }

  const total =
    new Set([
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
  const a =
    normalizeBreed(
      breedA
    );

  const b =
    normalizeBreed(
      breedB
    );

  if (!a || !b) {
    return 0;
  }

  return textSimilarity(
    a,
    b
  );
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
  const aLat =
    Number(lat1);

  const aLon =
    Number(lon1);

  const bLat =
    Number(lat2);

  const bLon =
    Number(lon2);

  if (
    !Number.isFinite(
      aLat
    ) ||
    !Number.isFinite(
      aLon
    ) ||
    !Number.isFinite(
      bLat
    ) ||
    !Number.isFinite(
      bLon
    )
  ) {
    return null;
  }

  const EARTH_RADIUS =
    6371;

  const toRadians =
    (degrees) =>
      (
        degrees *
        Math.PI
      ) /
      180;

  const deltaLat =
    toRadians(
      bLat -
        aLat
    );

  const deltaLon =
    toRadians(
      bLon -
        aLon
    );

  const value =
    Math.sin(
      deltaLat / 2
    ) **
      2 +
    Math.cos(
      toRadians(
        aLat
      )
    ) *
      Math.cos(
        toRadians(
          bLat
        )
      ) *
      Math.sin(
        deltaLon / 2
      ) **
        2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(
        value
      ),
      Math.sqrt(
        1 - value
      )
    );

  return (
    EARTH_RADIUS *
    angularDistance
  );
}

// ==========================================
// SCORE POR DISTANCIA
// ==========================================

function getDistanceScore(
  distance
) {
  if (
    distance === null
  ) {
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

function getLostPhoto(
  lostReport
) {
  const photos =
    lostReport
      ?.pet
      ?.photos ||
    [];

  return (
    photos.find(
      (photo) =>
        photo.isMain
    ) ||
    photos[0] ||
    null
  );
}

// ==========================================
// FOTO PRINCIPAL ENCONTRADA
// ==========================================

function getFoundPhoto(
  foundReport
) {
  const photos =
    foundReport
      ?.photos ||
    [];

  return (
    photos.find(
      (photo) =>
        photo.isMain
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
  foundBreed
) {
    const normalizedLost =
    normalizeBreed(
      lostBreed
    );

  const normalizedFound =
    normalizeBreed(
      foundBreed
    );

  const lostGeneric =
    isGenericBreed(
      normalizedLost
    );

  const foundGeneric =
    isGenericBreed(
      normalizedFound
    );

  const bothGeneric =
    lostGeneric &&
    foundGeneric;

  const bothSpecific =
    !lostGeneric &&
    !foundGeneric;

  const specificToGeneric =
    (
      !lostGeneric &&
      foundGeneric
    ) ||
    (
      lostGeneric &&
      !foundGeneric
    );

  return {
    lostGeneric,
    foundGeneric,
    bothGeneric,
    bothSpecific,
    specificToGeneric,
  };
}

// ==========================================
// CALCULAR CANDIDATO
// ==========================================

function calculateCandidate(
  lostReport,
  foundReport
) {
  if (!lostReport?.pet) {
    return null;
  }

  // ========================================
  // ESPECIE - REGLA DURA
  // ========================================

  const lostSpecies =
    normalizeText(
      lostReport
        .pet
        .species
    );

  const foundSpecies =
    normalizeText(
      foundReport
        .species
    );

  if (
    !lostSpecies ||
    !foundSpecies ||
    lostSpecies !==
      foundSpecies
  ) {
    return null;
  }

  // ========================================
  // RAZA
  // ========================================

  const lostBreed =
    normalizeBreed(
      lostReport
        .pet
        .breed
    );

  const foundBreed =
    normalizeBreed(
      foundReport
        .breed
    );

  const breedRelation =
    getBreedRelation(
      lostBreed,
      foundBreed
    );

  const breedSimilarity =
    breedSimilarityScore(
      lostBreed,
      foundBreed
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
      lostReport
        .pet
        .size
    );

  const foundSize =
    normalizeText(
      foundReport
        .size
    );

  const hasBothSizes =
    Boolean(
      lostSize &&
      foundSize
    );

  const sameSize =
    hasBothSizes &&
    lostSize ===
      foundSize;

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

  let breedConflict =
    false;

  const sameGenericBreed =
    breedRelation
      .bothGeneric &&
    Boolean(
      lostBreed &&
      foundBreed
    ) &&
    lostBreed ===
      foundBreed;

  if (
    sameGenericBreed
  ) {
    // Mestizo ↔ Mestizo:
    // no se premia automáticamente.
    // MegaDescriptor tendrá mayor peso.

    reasons.push(
      lostBreed ===
        "mestizo"
        ? "Ambos mestizos"
        : "Raza genérica coincidente"
    );
  } else if (
    breedRelation
      .specificToGeneric
  ) {
    reasons.push(
      "Raza específica contra clasificación genérica"
    );
  } else if (
    breedRelation
      .bothGeneric
  ) {
    reasons.push(
      "Raza no concluyente"
    );
  } else if (
    breedSimilarity >=
    0.8
  ) {
    score += 25;

    reasons.push(
      "Raza muy similar"
    );
  } else if (
    breedSimilarity >=
    0.4
  ) {
    score += 12;

    reasons.push(
      "Raza parcialmente similar"
    );
  } else if (
    lostBreed &&
    foundBreed
  ) {
    breedConflict =
      true;

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
      lostReport
        .pet
        .color
    );

  const foundColor =
    normalizeText(
      foundReport
        .color
    );

  const hasBothColors =
    Boolean(
      lostColor &&
      foundColor
    );

  const colorSimilarity =
    textSimilarity(
      lostColor,
      foundColor
    );

  let colorConflict =
    false;

  const sameColor =
    hasBothColors &&
    colorSimilarity >=
      0.8;

  const partialColor =
    hasBothColors &&
    colorSimilarity >=
      0.4 &&
    colorSimilarity <
      0.8;

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

    colorConflict =
      true;

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

      foundReport
        ?.location
        ?.latitude,

      foundReport
        ?.location
        ?.longitude
    );

  const distanceScore =
    getDistanceScore(
      distance
    );

  score +=
    distanceScore;

  if (
    distance !== null
  ) {
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
  }

  // ========================================
  // SCORE DE DATOS
  // ========================================

  const candidateScore =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          score
        )
      )
    );

  // ========================================
  // FOTOS
  // ========================================

  const lostPhoto =
    getLostPhoto(
      lostReport
    );

  const foundPhoto =
    getFoundPhoto(
      foundReport
    );

  // ========================================
  // RESPUESTA DEL CANDIDATO
  // ========================================

  return {
    lostReportId:
      lostReport.id,

    foundReportId:
      foundReport.id,

    candidateScore,

    // Score visual mostrado al frontend.
    imageSimilarity:
      null,

    // Valor crudo 0..1 de MegaDescriptor.
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
          .foundGeneric,

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

    // ======================================
    // MASCOTA PERDIDA
    // ======================================

    lost: {
      id:
        lostReport.id,

      petId:
        lostReport.petId ||
        lostReport
          .pet
          .id,

      name:
        lostReport
          .pet
          .name ||
        "Mascota perdida",

      species:
        lostReport
          .pet
          .species,

      breed:
        lostReport
          .pet
          .breed ||
        null,

      color:
        lostReport
          .pet
          .color ||
        null,

      size:
        lostReport
          .pet
          .size ||
        null,

      description:
        lostReport
          .pet
          .description ||
        null,

      photo:
        lostPhoto
          ?.imageUrl ||
        null,

      location:
        lostReport
          .location ||
        null,

      date:
        lostReport
          .lastSeenAt ||
        lostReport
          .created_at ||
        null,
    },

    // ======================================
    // MASCOTA ENCONTRADA
    // ======================================

    found: {
      id:
        foundReport.id,

      species:
        foundReport
          .species,

      breed:
        foundReport
          .breed ||
        null,

      color:
        foundReport
          .color ||
        null,

      size:
        foundReport
          .size ||
        null,

      description:
        foundReport
          .description ||
        null,

      photo:
        foundPhoto
          ?.imageUrl ||
        null,

      location:
        foundReport
          .location ||
        null,

      date:
        foundReport
          .foundAt ||
        foundReport
          .created_at ||
        null,
    },
  };
}

// ==========================================
// COMPARACIÓN ANIMAL RE-ID
// MegaDescriptor-L-384
// ==========================================
async function addImageSimilarity(
  candidate
) {
  const lostPhoto = candidate?.lost?.photo;
  const foundPhoto = candidate?.found?.photo;

  if (!lostPhoto || !foundPhoto) {
    candidate.imageSimilarity = null;
    candidate.rawImageSimilarity = null;
    candidate.megaSimilarity = null;
    candidate.dinoSimilarity = null;
    candidate.hybridScore = candidate.candidateScore;
    candidate.finalScore = candidate.candidateScore;

    candidate.reasons.push(
      "Sin dos fotos para comparación Animal Re-ID"
    );

    return candidate;
  }

  try {
    console.log("🧠 Comparando Re-ID híbrido:", {
      perdida: candidate.lostReportId,
      encontrada: candidate.foundReportId,
    });

    const lostEmbeddings =
      await getHybridEmbeddings({
        entityType: "lost_report",
        entityId: candidate.lostReportId,
        imageUrl: lostPhoto,
      });

    const foundEmbeddings =
      await getHybridEmbeddings({
        entityType: "found_report",
        entityId: candidate.foundReportId,
        imageUrl: foundPhoto,
      });

    const lostMegaVector =
      lostEmbeddings?.mega?.embedding;

    const foundMegaVector =
      foundEmbeddings?.mega?.embedding;

    const lostDinoVector =
      lostEmbeddings?.dino?.embedding;

    const foundDinoVector =
      foundEmbeddings?.dino?.embedding;

    const megaSimilarity =
      cosineSimilarity(
        lostMegaVector,
        foundMegaVector
      );

    const dinoSimilarity =
      cosineSimilarity(
        lostDinoVector,
        foundDinoVector
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

    function normalizeMega(value) {
      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        return 0;
      }

      if (value >= 0.60) return 100;
      if (value >= 0.45) return 90;
      if (value >= 0.35) return 80;
      if (value >= 0.25) return 70;
      if (value >= 0.18) return 60;
      if (value >= 0.12) return 50;
      if (value >= 0.08) return 40;
      if (value >= 0.04) return 30;
      if (value >= 0) return 20;

      return 0;
    }

    // ======================================
    // NORMALIZAR DINOV2
    //
    // Nuestra prueba del mismo perro dio:
    // 0.570801
    // ======================================

    function normalizeDino(value) {
      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        return 0;
      }

      if (value >= 0.80) return 100;
      if (value >= 0.70) return 95;
      if (value >= 0.60) return 90;
      if (value >= 0.55) return 85;
      if (value >= 0.50) return 75;
      if (value >= 0.45) return 65;
      if (value >= 0.40) return 55;
      if (value >= 0.35) return 45;
      if (value >= 0.30) return 35;
      if (value >= 0.20) return 20;

      return 0;
    }

    const megaScore =
      normalizeMega(megaSimilarity);

    const dinoScore =
      normalizeDino(dinoSimilarity);

    // ======================================
    // SCORE VISUAL
    // DINO 80% + Mega 20%
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
        candidate.candidateScore * 0.25
      );

    // ======================================
    // RAZAS INCOMPATIBLES
    // ======================================

    const bothSpecificBreed =
      candidate
        .compatibility
        ?.bothSpecificBreed === true;

    const breedConflict =
      candidate
        .compatibility
        ?.breedConflict === true;

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
        candidate.lost?.breed,
        "vs",
        candidate.found?.breed
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
        Math.max(finalScore, 58);

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
        Math.max(finalScore, 52);

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
        Math.min(finalScore, 35);

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
        Math.min(finalScore, 64);

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
        Math.min(finalScore, 64);

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
        Math.min(finalScore, 44);

      candidate.reasons.push(
        "Distancia excesiva"
      );

    } else if (
      candidate.distanceKm !== null &&
      candidate.distanceKm > 50
    ) {
      finalScore =
        Math.min(finalScore, 54);
    }

    // ======================================
    // LIMITAR ENTRE 0 Y 100
    // ======================================

    candidate.finalScore =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(finalScore)
        )
      );

    candidate.hybridScore =
      candidate.finalScore;

    // ======================================
    // EXPLICACIONES
    // ======================================

    if (megaSimilarity !== null) {
      candidate.reasons.push(
        `MegaDescriptor: ${megaSimilarity.toFixed(4)}`
      );
    }

    if (dinoSimilarity !== null) {
      candidate.reasons.push(
        `DINOv2: ${dinoSimilarity.toFixed(4)}`
      );
    }

    candidate.reasons.push(
      `Score visual híbrido: ${visualScore}%`
    );

    // ======================================
    // LOG DE CALIBRACIÓN
    // ======================================

    console.log(
      "⚡ Resultado Re-ID híbrido:",
      {
        megaSimilarity:
          megaSimilarity === null
            ? null
            : Number(
                megaSimilarity.toFixed(6)
              ),

        dinoSimilarity:
          dinoSimilarity === null
            ? null
            : Number(
                dinoSimilarity.toFixed(6)
              ),

        megaScore,
        dinoScore,

        dataScore:
          candidate.candidateScore,

        visualScore,

        hybridScore:
          candidate.finalScore,
      }
    );

    return candidate;

  } catch (error) {
    console.error(
      "❌ Comparación Re-ID híbrida falló:",
      error.message
    );

    candidate.imageSimilarity = null;
    candidate.rawImageSimilarity = null;
    candidate.megaSimilarity = null;
    candidate.dinoSimilarity = null;

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
// PERSISTENCIA
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

  // ========================================
  // BUSCAR MATCH EXISTENTE
  // ========================================

  let match =
    await Match.findOne({
      where: {
        lostReportId:
          candidate
            .lostReportId,

        foundReportId:
          candidate
            .foundReportId,
      },
    });

  // ========================================
  // SI FUE DESCARTADO
  //
  // No lo revivimos.
  // Solo ese par queda bloqueado.
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
            .foundReportId,
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
    match =
      await Match.create({
        lostReportId:
          candidate
            .lostReportId,

        foundReportId:
          candidate
            .foundReportId,

        score:
          candidate
            .finalScore,

        status:
          "pending",

        aiReason,
      });

    console.log(
      "✅ Match nuevo creado:",
      match.id
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
// GENERAR CANDIDATOS
// ==========================================

async function generateCandidates() {
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

  console.log(
    "🔎 Motor de candidatos:"
  );

  console.log(
    `Perdidos: ${lostReports.length}`
  );

  console.log(
    `Encontrados: ${foundReports.length}`
  );

  const candidates =
    [];

  // ========================================
  // CRUZAR PERDIDOS VS ENCONTRADOS
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
          foundReport
        );

      // Especie incompatible.
      if (!candidate) {
        continue;
      }

      const genericCandidate =
        candidate
          .compatibility
          ?.genericBreed ===
        true;

      // ====================================
      // PREFILTRO DE DATOS
      //
      // Razas genéricas:
      // siempre llegan a MegaDescriptor.
      //
      // Razas específicas:
      // exigimos al menos algo de
      // compatibilidad estructural.
      // ====================================

      if (
        !genericCandidate &&
        candidate
          .candidateScore <
          15
      ) {
        continue;
      }

      // ====================================
      // MEGADESCRIPTOR
      // ====================================
      // ====================================
      // REGLA DURA DE RAZA
      // ====================================

    // Si las dos razas son específicas
    // y además son incompatibles,
    // descartamos el candidato antes
    // de ejecutar la IA.

    if (
      candidate
      .compatibility
      ?.bothSpecificBreed === true &&
      candidate
      .compatibility
        ?.breedConflict === true
    ) {
    console.log(
      "❌ Descartado antes de IA por raza incompatible:",
      {
        lost: candidate.lost?.breed,
        found: candidate.found?.breed,
     }
    );
    continue;
}
      candidate =
        await addImageSimilarity(
          candidate
        );

      // ====================================
      // FILTRO FINAL
      //
      // El frontend considera 55+
      // como "Coincidencia posible".
      // ====================================

      if (
        candidate
          .finalScore <
        55
      ) {
        continue;
      }

      // ====================================
      // PERSISTENCIA
      // ====================================

      candidate =
  await persistCandidate(
    candidate
  );

// Si el usuario ya descartó
// exactamente este par,
// no lo mostramos nuevamente.

  if (
    candidate
      .status ===
      "rejected"
  ) {
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

  console.log(
    `✅ Candidatos encontrados: ${candidates.length}`
  );

  return candidates;
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  generateCandidates,

  calculateCandidate,

  addImageSimilarity,

  persistCandidate,

  distanceKm,

  textSimilarity,

  normalizeBreed,

  isGenericBreed,

  breedSimilarityScore,

  getBreedRelation,
};