// ==========================================
// PAWTRACE - PHOTO CONTROLLER
//
// Fotos de mascotas registradas.
// Cloudinary + prevención de duplicados
// + Animal Re-ID
// ==========================================

const crypto = require("crypto");

const {
  Pet,
  PetPhoto,
} = require("../models");

const {
  getOrCreateEmbedding,
} = require(
  "../services/imageEmbeddingService"
);

const {
  uploadBuffer,
  deleteImage,
} = require(
  "../services/cloudinaryStorageService"
);


// ==========================================
// HASH SHA-256 DEL BUFFER
// ==========================================

function calculateBufferHash(buffer) {
  if (!buffer) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}


// ==========================================
// BUSCAR FOTO DUPLICADA
//
// Para las nuevas fotos Cloudinary usamos
// el hash como parte del storageKey.
// ==========================================

async function findDuplicatePhoto({
  petId,
  fileHash,
}) {
  if (!fileHash) {
    return null;
  }

  const photos =
    await PetPhoto.findAll({
      where: {
        petId,
      },
    });

  return (
    photos.find((photo) =>
      photo.storageKey?.includes(
        fileHash
      )
    ) || null
  );
}


// ==========================================
// SUBIR FOTO DE PET
//
// POST /api/pets/:id/photos
// ==========================================

async function uploadPetPhoto(
  req,
  res,
  next
) {
  let cloudinaryPublicId =
    null;

  try {

    // ======================================
    // ID DE MASCOTA
    // ======================================

    const { id } =
      req.params;


    // ======================================
    // VALIDAR ARCHIVO
    // ======================================

    if (
      !req.file ||
      !req.file.buffer
    ) {
      return res
        .status(400)
        .json({
          error:
            "Tenés que seleccionar una imagen.",
        });
    }


    // ======================================
    // BUSCAR MASCOTA
    // ======================================

    const pet =
      await Pet.findByPk(
        id
      );

    if (!pet) {
      return res
        .status(404)
        .json({
          error:
            "Mascota no encontrada.",
        });
    }


    // ======================================
    // HASH DE LA IMAGEN
    // ======================================

    const fileHash =
      calculateBufferHash(
        req.file.buffer
      );

    console.log(
      "🔐 SHA-256 foto nueva:",
      fileHash
    );


    // ======================================
    // DETECTAR DUPLICADO
    // ======================================

    const duplicatePhoto =
      await findDuplicatePhoto({
        petId: id,
        fileHash,
      });

    if (duplicatePhoto) {

      console.log(
        "♻️ Foto duplicada detectada:",
        {
          petId: id,
          photoId:
            duplicatePhoto.id,
        }
      );

      return res
        .status(200)
        .json({
          ...duplicatePhoto.toJSON(),

          duplicate: true,

          message:
            "Esta foto ya estaba cargada para la mascota.",
        });
    }


    // ======================================
    // SUBIR A CLOUDINARY
    // ======================================

    console.log(
      "☁️ Subiendo foto de mascota a Cloudinary..."
    );

    const uploadResult =
      await uploadBuffer({
        buffer:
          req.file.buffer,

        folder:
          `pawtrace/pets/${id}`,

        publicId:
          fileHash,
      });


    if (
      !uploadResult?.secure_url ||
      !uploadResult?.public_id
    ) {
      throw new Error(
        "Cloudinary no devolvió una URL válida."
      );
    }


    cloudinaryPublicId =
      uploadResult.public_id;


    console.log(
      "☁️ Foto subida a Cloudinary:",
      {
        publicId:
          uploadResult.public_id,

        secureUrl:
          uploadResult.secure_url,
      }
    );


    // ======================================
    // FOTO PRINCIPAL
    // ======================================

    const existingMain =
      await PetPhoto.findOne({
        where: {
          petId: id,
          isMain: true,
        },
      });


    // ======================================
    // GUARDAR EN POSTGRESQL
    //
    // imageUrl:
    // URL HTTPS permanente Cloudinary
    //
    // storageKey:
    // public_id Cloudinary
    // ======================================

    const photo =
      await PetPhoto.create({
        petId: id,

        imageUrl:
          uploadResult.secure_url,

        storageKey:
          uploadResult.public_id,

        isMain:
          existingMain
            ? false
            : true,
      });


    // Desde este momento la imagen
    // pertenece al registro persistido.
    // No debe borrarse si falla solamente IA.

    cloudinaryPublicId =
      null;


    console.log(
      "✅ Foto de mascota guardada:",
      {
        petId: id,

        photoId:
          photo.id,

        imageUrl:
          photo.imageUrl,

        storageKey:
          photo.storageKey,
      }
    );


    // ======================================
    // GENERAR EMBEDDING
    //
    // Cloudinary ya proporciona una URL
    // HTTPS pública y persistente.
    // ======================================

    try {

      const embedding =
        await getOrCreateEmbedding({
          entityType:
            "pet_photo",

          entityId:
            photo.id,

          imageUrl:
            photo.imageUrl,
        });


      console.log(
        "🧠 Embedding PetPhoto listo:",
        {
          photoId:
            photo.id,

          embeddingSize:
            embedding
              ?.embeddingSize ??
            null,

          processingMode:
            embedding
              ?.processingMode ??
            null,
        }
      );

    } catch (
      embeddingError
    ) {

      // IMPORTANTE:
      // Un fallo de Animal Re-ID
      // NO elimina la foto.

      console.error(
        "⚠️ No se pudo generar embedding PetPhoto:",
        embeddingError.message
      );
    }


    // ======================================
    // RESPONSE
    // ======================================

    return res
      .status(201)
      .json({
        ...photo.toJSON(),

        duplicate:
          false,

        storage:
          "cloudinary",
      });

  } catch (error) {

    // ======================================
    // LIMPIEZA CLOUDINARY
    //
    // Si Cloudinary recibió la imagen pero
    // falló PostgreSQL, eliminamos la imagen
    // para no dejar archivos huérfanos.
    // ======================================

    if (
      cloudinaryPublicId
    ) {
      await deleteImage(
        cloudinaryPublicId
      );
    }

    console.error(
      "❌ Error subiendo foto de mascota:",
      error
    );

    next(error);
  }
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  uploadPetPhoto,
};