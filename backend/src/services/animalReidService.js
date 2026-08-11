// ==========================================
// PAWTRACE - ANIMAL RE-ID SERVICE CLIENT
//
// Sprint 1.4.3.6.2.1
//
// Node.js <-> Python
//
// Re-ID híbrido:
// - MegaDescriptor
// - DINOv2
// - MegaDetector
// ==========================================

const ANIMAL_REID_URL =
  process.env.ANIMAL_REID_URL ||
  "http://127.0.0.1:8001";


// ==========================================
// HEALTH
// ==========================================

async function checkAnimalReidHealth() {
  try {
    const response = await fetch(
      `${ANIMAL_REID_URL}/health`
    );

    if (!response.ok) {
      throw new Error(
        `Animal Re-ID respondió ${response.status}`
      );
    }

    return await response.json();

  } catch (error) {
    console.error(
      "❌ Animal Re-ID no disponible:",
      error.message
    );

    return null;
  }
}


// ==========================================
// FUNCIÓN INTERNA
// GENERAR EMBEDDING
// ==========================================

async function requestEmbedding(
  imageUrl,
  endpoint,
  label
) {
  if (!imageUrl) {
    return {
      available: false,
      embedding: null,
      embeddingSize: null,
      model: null,
    };
  }

  try {
    console.log(
      `🧠 Solicitando embedding ${label}:`,
      imageUrl
    );

    const response = await fetch(
      `${ANIMAL_REID_URL}${endpoint}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          image: imageUrl,
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Animal Re-ID ${response.status}: ${errorText}`
      );
    }

    const result =
      await response.json();

    if (
      !Array.isArray(
        result.embedding
      )
    ) {
      throw new Error(
        `${label} no devolvió un embedding válido.`
      );
    }

    console.log(
      `✅ Embedding ${label} recibido:`,
      {
        embeddingSize:
          result.embeddingSize ??
          result.embedding.length,

        model:
          result.model,

        cropped:
          result.cropped,

        processingMode:
          result.processingMode,

        detectionConfidence:
          result.detectionConfidence,
      }
    );

    return {
      available: true,

      embedding:
        result.embedding,

      embeddingSize:
        result.embeddingSize ??
        result.embedding.length,

      model:
        result.model ??
        null,

      detector:
        result.detector ??
        null,

      device:
        result.device ??
        null,

      cropped:
        result.cropped ??
        false,

      processingMode:
        result.processingMode ??
        null,

      detectionConfidence:
        result.detectionConfidence ??
        null,
    };

  } catch (error) {
    console.error(
      `❌ Error generando embedding ${label}:`,
      error.message
    );

    return {
      available: false,
      embedding: null,
      embeddingSize: null,
      model: null,
    };
  }
}


// ==========================================
// MEGADESCRIPTOR
//
// POST /embed
//
// IMPORTANTE:
// Se conserva el nombre anterior para
// mantener compatibilidad con el resto
// del backend.
// ==========================================

async function generateImageEmbedding(
  imageUrl
) {
  return requestEmbedding(
    imageUrl,
    "/embed",
    "MegaDescriptor"
  );
}


// ==========================================
// DINOV2
//
// POST /embed-dino
//
// Sprint 1.4.3.6.2.1
// ==========================================

async function generateDinoEmbedding(
  imageUrl
) {
  return requestEmbedding(
    imageUrl,
    "/embed-dino",
    "DINOv2"
  );
}


// ==========================================
// COSINE SIMILARITY
//
// También la dejamos disponible en Node
// para comparar embeddings persistidos.
// ==========================================

function cosineSimilarity(
  vectorA,
  vectorB
) {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length === 0 ||
    vectorA.length !== vectorB.length
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
// COMPARAR DOS IMÁGENES
//
// Python calcula:
// - MegaDescriptor
// - DINOv2
//
// POST /compare
// ==========================================

async function compareAnimalImages(
  imageA,
  imageB
) {
  if (!imageA || !imageB) {
    return {
      similarity: null,
      percentage: null,

      megaSimilarity: null,
      dinoSimilarity: null,

      model: null,
      dinoModel: null,

      available: false,
    };
  }

  try {
    console.log(
      "🐾 Enviando imágenes al Re-ID híbrido..."
    );

    const response = await fetch(
      `${ANIMAL_REID_URL}/compare`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          imageA,
          imageB,
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Animal Re-ID ${response.status}: ${errorText}`
      );
    }

    const result =
      await response.json();


    // ======================================
    // COMPATIBILIDAD
    //
    // En main.py similarity sigue siendo
    // MegaDescriptor.
    // ======================================

    const megaSimilarity =
      result.megaSimilarity ??
      result.similarity ??
      null;

    const dinoSimilarity =
      result.dinoSimilarity ??
      null;


    console.log(
      "🧪 Resultado Re-ID híbrido:",
      {
        megaSimilarity,
        dinoSimilarity,

        percentage:
          result.percentage,

        megaModel:
          result.model,

        dinoModel:
          result.dinoModel,

        megaEmbeddingSize:
          result.megaEmbeddingSize ??
          result.embeddingSize,

        dinoEmbeddingSize:
          result.dinoEmbeddingSize,
      }
    );


    return {
      // ====================================
      // CAMPOS ANTERIORES
      // ====================================

      similarity:
        megaSimilarity,

      percentage:
        result.percentage ??
        null,

      model:
        result.model ??
        null,

      embeddingSize:
        result.megaEmbeddingSize ??
        result.embeddingSize ??
        null,

      device:
        result.device ??
        null,


      // ====================================
      // CAMPOS NUEVOS
      // ====================================

      megaSimilarity,

      dinoSimilarity,

      dinoModel:
        result.dinoModel ??
        null,

      megaEmbeddingSize:
        result.megaEmbeddingSize ??
        result.embeddingSize ??
        null,

      dinoEmbeddingSize:
        result.dinoEmbeddingSize ??
        null,


      // ====================================
      // DETECCIÓN
      // ====================================

      cropA:
        result.cropA ??
        false,

      cropB:
        result.cropB ??
        false,

      detectionConfidenceA:
        result.detectionConfidenceA ??
        null,

      detectionConfidenceB:
        result.detectionConfidenceB ??
        null,

      processingMode:
        result.processingMode ??
        null,

      available: true,
    };

  } catch (error) {
    console.error(
      "❌ Error llamando Animal Re-ID híbrido:",
      error.message
    );

    return {
      similarity: null,
      percentage: null,

      megaSimilarity: null,
      dinoSimilarity: null,

      model: null,
      dinoModel: null,

      available: false,
    };
  }
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  checkAnimalReidHealth,

  compareAnimalImages,

  // MegaDescriptor
  generateImageEmbedding,

  // DINOv2
  generateDinoEmbedding,

  // comparación local de embeddings
  cosineSimilarity,
};