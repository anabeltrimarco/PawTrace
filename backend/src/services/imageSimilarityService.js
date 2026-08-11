// ==========================================
// PAWTRACE - IMAGE SIMILARITY SERVICE
//
// Sprint 1.4.2
// Sprint 1.4.3.4 v4.1
//
// Comparación visual con CLIP
// usando Transformers.js.
//
// IMPORTANTE:
// CLIP devuelve similitud semántica/visual,
// NO probabilidad de ser la misma mascota.
//
// Por eso calibramos el cosine similarity
// antes de usarlo como score visual.
// ==========================================

// Cargamos el modelo una sola vez.
// La primera comparación puede tardar
// porque el modelo debe descargarse/cargarse.

let extractorPromise = null;

// ==========================================
// CONFIGURACIÓN DE CALIBRACIÓN
// ==========================================

// Debajo de este valor consideramos que
// la similitud CLIP es demasiado débil
// para aportar evidencia útil.

const MIN_USEFUL_SIMILARITY = 0.55;

// A partir de este valor consideramos
// que la similitud visual es extremadamente
// alta dentro de este modelo.
//
// NO significa "100% misma mascota".
// Solo representa el techo del score visual
// que PawTrace utilizará internamente.

const MAX_USEFUL_SIMILARITY = 0.90;

// ==========================================
// OBTENER PIPELINE
// ==========================================

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import(
      "@huggingface/transformers"
    ).then(
      async ({
        pipeline,
      }) => {
        console.log(
          "🤖 Cargando modelo CLIP..."
        );

        const extractor =
          await pipeline(
            "image-feature-extraction",
            "Xenova/clip-vit-base-patch32"
          );

        console.log(
          "✅ Modelo CLIP cargado correctamente."
        );

        return extractor;
      }
    );
  }

  return extractorPromise;
}

// ==========================================
// EXTRAER EMBEDDING
// ==========================================

async function getImageEmbedding(
  imageUrl
) {
  if (!imageUrl) {
    return null;
  }

  try {
    const extractor =
      await getExtractor();

    const output =
      await extractor(
        imageUrl
      );

    if (
      !output ||
      !output.data
    ) {
      throw new Error(
        "El modelo no devolvió datos para la imagen."
      );
    }

    const vector =
      Array.from(
        output.data
      );

    if (
      vector.length === 0
    ) {
      throw new Error(
        "El embedding obtenido está vacío."
      );
    }

    return vector;
  } catch (error) {
    console.error(
      "❌ Error obteniendo embedding:",
      {
        imageUrl,

        message:
          error.message,
      }
    );

    throw error;
  }
}

// ==========================================
// SIMILITUD COSENO
// ==========================================

function cosineSimilarity(
  vectorA,
  vectorB
) {
  if (
    !Array.isArray(
      vectorA
    ) ||
    !Array.isArray(
      vectorB
    )
  ) {
    return 0;
  }

  if (
    vectorA.length === 0 ||
    vectorB.length === 0
  ) {
    return 0;
  }

  if (
    vectorA.length !==
    vectorB.length
  ) {
    console.warn(
      "⚠️ Los embeddings tienen distinta longitud:",
      vectorA.length,
      vectorB.length
    );

    return 0;
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
      Number(
        vectorA[i]
      );

    const b =
      Number(
        vectorB[i]
      );

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
    return 0;
  }

  return (
    dotProduct /
    (
      Math.sqrt(
        normA
      ) *
      Math.sqrt(
        normB
      )
    )
  );
}

// ==========================================
// CALIBRAR SIMILITUD CLIP
//
// Antes:
// 0.67 => 67%
//
// Ahora:
// 0.67 => score visual calibrado,
// mucho más conservador.
//
// Esto evita tratar el cosine similarity
// como probabilidad real.
// ==========================================

function similarityToPercentage(
  similarity
) {
  if (
    similarity === null ||
    similarity === undefined ||
    Number.isNaN(
      similarity
    )
  ) {
    return null;
  }

  const numericSimilarity =
    Number(
      similarity
    );

  if (
    !Number.isFinite(
      numericSimilarity
    )
  ) {
    return null;
  }

  // ========================================
  // SIMILITUD MUY BAJA
  // ========================================

  if (
    numericSimilarity <=
    MIN_USEFUL_SIMILARITY
  ) {
    return 0;
  }

  // ========================================
  // TECHO DE SIMILITUD
  // ========================================

  if (
    numericSimilarity >=
    MAX_USEFUL_SIMILARITY
  ) {
    return 100;
  }

  // ========================================
  // NORMALIZACIÓN LINEAL
  //
  // Rango útil:
  // 0.55 -> 0
  // 0.90 -> 100
  // ========================================

  const normalized =
    (
      numericSimilarity -
      MIN_USEFUL_SIMILARITY
    ) /
    (
      MAX_USEFUL_SIMILARITY -
      MIN_USEFUL_SIMILARITY
    );

  const percentage =
    normalized * 100;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        percentage
      )
    )
  );
}

// ==========================================
// NIVEL DE SIMILITUD
//
// Solo sirve para debug/logs.
// No reemplaza al score final.
// ==========================================

function getSimilarityLevel(
  percentage
) {
  if (
    percentage === null ||
    percentage === undefined
  ) {
    return "unavailable";
  }

  if (percentage >= 80) {
    return "very_high";
  }

  if (percentage >= 60) {
    return "high";
  }

  if (percentage >= 40) {
    return "medium";
  }

  if (percentage >= 20) {
    return "low";
  }

  return "very_low";
}

// ==========================================
// COMPARAR DOS IMÁGENES
// ==========================================

async function compareImages(
  imageUrlA,
  imageUrlB
) {
  if (
    !imageUrlA ||
    !imageUrlB
  ) {
    return {
      similarity: null,
      rawSimilarity: null,
      percentage: null,
      level: "unavailable",
    };
  }

  console.log(
    "🖼️ Comparando imágenes..."
  );

  console.log(
    "   Perdida:",
    imageUrlA
  );

  console.log(
    "   Encontrada:",
    imageUrlB
  );

  const [
    embeddingA,
    embeddingB,
  ] =
    await Promise.all([
      getImageEmbedding(
        imageUrlA
      ),

      getImageEmbedding(
        imageUrlB
      ),
    ]);

  if (
    !embeddingA ||
    !embeddingB
  ) {
    return {
      similarity: null,
      rawSimilarity: null,
      percentage: null,
      level: "unavailable",
    };
  }

  // ========================================
  // COSINE SIMILARITY CRUDO
  // ========================================

  const rawSimilarity =
    cosineSimilarity(
      embeddingA,
      embeddingB
    );

  // ========================================
  // SCORE VISUAL CALIBRADO
  // ========================================

  const percentage =
    similarityToPercentage(
      rawSimilarity
    );

  const level =
    getSimilarityLevel(
      percentage
    );

  console.log(
    "🧠 CLIP raw similarity:",
    Number(
      rawSimilarity.toFixed(
        4
      )
    )
  );

  console.log(
    `✅ Score visual calibrado: ${percentage}%`
  );

  console.log(
    "📊 Nivel visual:",
    level
  );

  return {
    // Mantengo similarity por compatibilidad
    // con código anterior.
    similarity:
      rawSimilarity,

    rawSimilarity,

    percentage,

    level,

    embeddingSize:
      embeddingA.length,

    calibration: {
      minUsefulSimilarity:
        MIN_USEFUL_SIMILARITY,

      maxUsefulSimilarity:
        MAX_USEFUL_SIMILARITY,
    },
  };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getImageEmbedding,

  cosineSimilarity,

  compareImages,

  similarityToPercentage,

  getSimilarityLevel,
};