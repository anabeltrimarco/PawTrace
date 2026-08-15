const {
  cloudinary,
  validateCloudinaryConfig,
} = require("../config/cloudinary");

function uploadBuffer({
  buffer,
  folder,
  publicId,
}) {
  validateCloudinaryConfig();

  if (!buffer) {
    throw new Error(
      "No se recibió el contenido de la imagen."
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId || undefined,
          resource_type: "image",
          overwrite: false,
          unique_filename: true,
          use_filename: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        }
      );

    uploadStream.end(buffer);
  });
}

async function deleteImage(publicId) {
  if (!publicId) return;

  validateCloudinaryConfig();

  try {
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: "image",
      }
    );
  } catch (error) {
    console.error(
      "⚠️ No se pudo eliminar la imagen de Cloudinary:",
      error.message
    );
  }
}

module.exports = {
  uploadBuffer,
  deleteImage,
};