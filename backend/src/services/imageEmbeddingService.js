// ==========================================
// PAWTRACE - IMAGE EMBEDDING SERVICE
//
// Sprint 1.4.3.6.2.1
//
// Re-ID híbrido:
//
// MegaDescriptor
// - persistido en PostgreSQL
//
// DINOv2
// - cacheado en memoria
//
// Incluye:
// - reutilización PostgreSQL
// - protección concurrencia
// - cache DINO
// - cosine similarity
// ==========================================

const {
  ImageEmbedding,
} = require("../models");

const {
  generateImageEmbedding,
  generateDinoEmbedding,
} = require(
  "./animalReidService"
);


// ==========================================
// GENERACIONES MEGA EN CURSO
// ==========================================

const embeddingInFlight =
  new Map();


// ==========================================
// GENERACIONES DINO EN CURSO
// ==========================================

const dinoInFlight =
  new Map();


// ==========================================
// CACHE DINO EN MEMORIA
//
// key:
// entityType::entityId::imageUrl
//
// value:
// resultado completo del embedding
// ==========================================

const dinoCache =
  new Map();


// ==========================================
// CLAVE DE CACHE
// ==========================================

function buildEmbeddingKey({
  entityType,
  entityId,
  imageUrl,
}) {
  return [
    entityType,
    entityId,
    imageUrl,
  ].join("::");
}


// ==========================================
// VALIDAR DATOS
// ==========================================

function validateEmbeddingInput({
  entityType,
  entityId,
  imageUrl,
}) {
  if (
    !entityType ||
    !entityId ||
    !imageUrl
  ) {
    throw new Error(
      "Faltan datos para generar el embedding."
    );
  }
}


// ==========================================
// MEGADESCRIPTOR
//
// OBTENER O GENERAR
// ==========================================

async function getOrCreateEmbedding({
  entityType,
  entityId,
  imageUrl,
}) {
  validateEmbeddingInput({
    entityType,
    entityId,
    imageUrl,
  });

  const key =
    buildEmbeddingKey({
      entityType,
      entityId,
      imageUrl,
    });


  // ========================================
  // YA SE ESTÁ GENERANDO
  // ========================================

  if (
    embeddingInFlight.has(
      key
    )
  ) {
    console.log(
      "⏳ Esperando MegaDescriptor que ya se está generando:",
      {
        entityType,
        entityId,
      }
    );

    return await embeddingInFlight.get(
      key
    );
  }


  // ========================================
  // CREAR UNA ÚNICA TAREA
  // ========================================

  const task =
    getOrCreateMegaInternal({
      entityType,
      entityId,
      imageUrl,
    });

  embeddingInFlight.set(
    key,
    task
  );

  try {
    return await task;

  } finally {
    embeddingInFlight.delete(
      key
    );
  }
}


// ==========================================
// MEGADESCRIPTOR
// IMPLEMENTACIÓN INTERNA
// ==========================================

async function getOrCreateMegaInternal({
  entityType,
  entityId,
  imageUrl,
}) {

  // ========================================
  // 1. BUSCAR EN POSTGRESQL
  // ========================================

  const existing =
    await ImageEmbedding.findOne({
      where: {
        entityType,
        entityId,
      },
    });


  // ========================================
  // 2. MISMA IMAGEN
  // REUTILIZAR
  // ========================================

  if (
    existing &&
    existing.imageUrl ===
      imageUrl
  ) {
    console.log(
      "⚡ MegaDescriptor recuperado desde PostgreSQL:",
      {
        entityType,
        entityId,

        embeddingSize:
          existing.embeddingSize,

        processingMode:
          existing.processingMode,
      }
    );

    return existing;
  }


  // ========================================
  // 3. GENERAR CON PYTHON
  // ========================================

  console.log(
    "🧠 Generando nuevo MegaDescriptor:",
    {
      entityType,
      entityId,
      imageUrl,
    }
  );

  const aiResult =
    await generateImageEmbedding(
      imageUrl
    );

  if (
    !aiResult ||
    aiResult.available !== true ||
    !Array.isArray(
      aiResult.embedding
    )
  ) {
    throw new Error(
      "Animal Re-ID no pudo generar MegaDescriptor."
    );
  }

  const embeddingSize =
    aiResult.embeddingSize ??
    aiResult.embedding.length;


  // ========================================
  // 4. ACTUALIZAR EXISTENTE
  // ========================================

  if (existing) {
    await existing.update({
      imageUrl,

      model:
        aiResult.model,

      embedding:
        aiResult.embedding,

      embeddingSize,

      processingMode:
        aiResult.processingMode ??
        null,

      detectionConfidence:
        aiResult.detectionConfidence ??
        null,
    });

    console.log(
      "♻️ MegaDescriptor actualizado en PostgreSQL:",
      {
        entityType,
        entityId,
        embeddingSize,
      }
    );

    return existing;
  }


  // ========================================
  // 5. CREAR
  // ========================================

  try {
    const created =
      await ImageEmbedding.create({
        entityType,
        entityId,
        imageUrl,

        model:
          aiResult.model,

        embedding:
          aiResult.embedding,

        embeddingSize,

        processingMode:
          aiResult.processingMode ??
          null,

        detectionConfidence:
          aiResult.detectionConfidence ??
          null,
      });

    console.log(
      "💾 MegaDescriptor guardado en PostgreSQL:",
      {
        entityType,
        entityId,
        embeddingSize,
      }
    );

    return created;

  } catch (error) {

    // ======================================
    // PROTECCIÓN CONTRA CONCURRENCIA
    // ======================================

    if (
      error?.name ===
      "SequelizeUniqueConstraintError"
    ) {
      console.log(
        "♻️ MegaDescriptor creado concurrentemente; recuperándolo..."
      );

      const concurrent =
        await ImageEmbedding.findOne({
          where: {
            entityType,
            entityId,
          },
        });

      if (concurrent) {
        return concurrent;
      }
    }

    throw error;
  }
}


// ==========================================
// DINOV2
//
// OBTENER O GENERAR
// ==========================================

async function getOrCreateDinoEmbedding({
  entityType,
  entityId,
  imageUrl,
}) {
  validateEmbeddingInput({
    entityType,
    entityId,
    imageUrl,
  });

  const key =
    buildEmbeddingKey({
      entityType,
      entityId,
      imageUrl,
    });


  // ========================================
  // 1. CACHE
  // ========================================

  if (
    dinoCache.has(
      key
    )
  ) {
    const cached =
      dinoCache.get(
        key
      );

    console.log(
      "⚡ DINOv2 recuperado desde cache:",
      {
        entityType,
        entityId,

        embeddingSize:
          cached.embeddingSize,
      }
    );

    return cached;
  }


  // ========================================
  // 2. YA SE ESTÁ GENERANDO
  // ========================================

  if (
    dinoInFlight.has(
      key
    )
  ) {
    console.log(
      "⏳ Esperando DINOv2 que ya se está generando:",
      {
        entityType,
        entityId,
      }
    );

    return await dinoInFlight.get(
      key
    );
  }


  // ========================================
  // 3. CREAR TAREA
  // ========================================

  const task =
    generateDinoInternal({
      entityType,
      entityId,
      imageUrl,
      key,
    });

  dinoInFlight.set(
    key,
    task
  );

  try {
    return await task;

  } finally {
    dinoInFlight.delete(
      key
    );
  }
}


// ==========================================
// DINOV2
// IMPLEMENTACIÓN INTERNA
// ==========================================

async function generateDinoInternal({
  entityType,
  entityId,
  imageUrl,
  key,
}) {
  console.log(
    "🦖 Generando DINOv2:",
    {
      entityType,
      entityId,
      imageUrl,
    }
  );

  const aiResult =
    await generateDinoEmbedding(
      imageUrl
    );

  if (
    !aiResult ||
    aiResult.available !== true ||
    !Array.isArray(
      aiResult.embedding
    )
  ) {
    throw new Error(
      "Animal Re-ID no pudo generar DINOv2."
    );
  }

  const result = {
    entityType,
    entityId,
    imageUrl,

    model:
      aiResult.model,

    embedding:
      aiResult.embedding,

    embeddingSize:
      aiResult.embeddingSize ??
      aiResult.embedding.length,

    processingMode:
      aiResult.processingMode ??
      null,

    detectionConfidence:
      aiResult.detectionConfidence ??
      null,

    cropped:
      aiResult.cropped ??
      false,
  };


  // ========================================
  // GUARDAR EN CACHE
  // ========================================

  dinoCache.set(
    key,
    result
  );

  console.log(
    "💾 DINOv2 guardado en cache:",
    {
      entityType,
      entityId,

      embeddingSize:
        result.embeddingSize,

      cacheSize:
        dinoCache.size,
    }
  );

  return result;
}


// ==========================================
// OBTENER AMBOS EMBEDDINGS
//
// Útil para matchCandidateService.
// ==========================================

async function getHybridEmbeddings({
  entityType,
  entityId,
  imageUrl,
}) {
  const [
    mega,
    dino,
  ] = await Promise.all([
    getOrCreateEmbedding({
      entityType,
      entityId,
      imageUrl,
    }),

    getOrCreateDinoEmbedding({
      entityType,
      entityId,
      imageUrl,
    }),
  ]);

  return {
    mega,
    dino,
  };
}


// ==========================================
// COSINE SIMILARITY
// ==========================================

function cosineSimilarity(
  vectorA,
  vectorB
) {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length === 0 ||
    vectorB.length === 0 ||
    vectorA.length !==
      vectorB.length
  ) {
    return null;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (
    let i = 0;
    i < vectorA.length;
    i += 1
  ) {
    const a =
      Number(vectorA[i]);

    const b =
      Number(vectorB[i]);

    if (
      !Number.isFinite(a) ||
      !Number.isFinite(b)
    ) {
      return null;
    }

    dotProduct +=
      a * b;

    normA +=
      a * a;

    normB +=
      b * b;
  }

  if (
    normA === 0 ||
    normB === 0
  ) {
    return null;
  }

  return (
    dotProduct /
    (
      Math.sqrt(normA) *
      Math.sqrt(normB)
    )
  );
}


// ==========================================
// LIMPIAR CACHE DINO
//
// No es necesario usarlo normalmente,
// pero queda disponible.
// ==========================================

function clearDinoCache() {
  const previousSize =
    dinoCache.size;

  dinoCache.clear();

  console.log(
    "🧹 Cache DINOv2 limpiado:",
    {
      removed:
        previousSize,
    }
  );
}


// ==========================================
// ESTADO CACHE DINO
// ==========================================

function getDinoCacheStats() {
  return {
    cached:
      dinoCache.size,

    inFlight:
      dinoInFlight.size,
  };
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // MegaDescriptor
  getOrCreateEmbedding,

  // DINOv2
  getOrCreateDinoEmbedding,

  // Ambos
  getHybridEmbeddings,

  // Utilidades
  cosineSimilarity,

  clearDinoCache,
  getDinoCacheStats,
};