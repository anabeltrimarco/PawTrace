// ==========================================
// PAWTRACE - IMAGE EMBEDDING MODEL
//
// Sprint 1.4.3.6
// ==========================================

const {
  DataTypes,
} = require("sequelize");

module.exports = (
  sequelize
) => {
  const ImageEmbedding =
    sequelize.define(
      "ImageEmbedding",
      {
        // ======================================
        // ID
        // ======================================

        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        // ======================================
        // TIPO DE ENTIDAD
        // lost_report / found_report
        // ======================================

        entityType: {
          type:
            DataTypes.STRING(
              40
            ),

          allowNull:
            false,

          field:
            "entity_type",
        },

        // ======================================
        // ID DE LA ENTIDAD
        // ======================================

        entityId: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          field:
            "entity_id",
        },

        // ======================================
        // URL DE LA IMAGEN
        // ======================================

        imageUrl: {
          type:
            DataTypes.TEXT,

          allowNull:
            false,

          field:
            "image_url",
        },

        // ======================================
        // MODELO IA
        // ======================================

        model: {
          type:
            DataTypes.STRING(
              150
            ),

          allowNull:
            false,
        },

        // ======================================
        // VECTOR DEL EMBEDDING
        // ======================================

        embedding: {
          type:
            DataTypes.JSONB,

          allowNull:
            false,
        },

        // ======================================
        // TAMAÑO DEL VECTOR
        // ======================================

        embeddingSize: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          field:
            "embedding_size",
        },

        // ======================================
        // MODO DE PROCESAMIENTO
        // ======================================

        processingMode: {
          type:
            DataTypes.STRING(
              80
            ),

          allowNull:
            true,

          field:
            "processing_mode",
        },

        // ======================================
        // CONFIANZA DE DETECCIÓN
        // ======================================

        detectionConfidence: {
          type:
            DataTypes.DECIMAL(
              8,
              6
            ),

          allowNull:
            true,

          field:
            "detection_confidence",
        },
      },

      // ========================================
      // CONFIGURACIÓN
      // ========================================

      {
        tableName:
          "image_embeddings",

        // IMPORTANTE:
        // La tabla actual no tiene
        // created_at / updated_at.
        timestamps:
          false,

        indexes: [
          {
            unique:
              true,

            fields: [
              "entity_type",
              "entity_id",
              "model",
            ],
          },
        ],
      }
    );

  return ImageEmbedding;
};