// ==========================================
// PAWTRACE - SIGHTING CONTROLLER
//
// Sprint 1.4.4.2
// Avistamientos + ubicación
// ==========================================
const {
  geocodeAddress,
} = require(
  "../services/geocodingService"
);

const {
  Sighting,
  SightingPhoto,
  Location,
  User,
  sequelize,
} = require("../models");


// ==========================================
// INCLUDES COMUNES
// ==========================================

const sightingIncludes = [
  {
    model: SightingPhoto,
    as: "photos",
    required: false,
  },

  {
    model: Location,
    as: "location",
    required: false,
  },

  {
    model: User,
    as: "user",
    required: false,
    attributes: [
      "id",
    ],
  },
];


// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function normalizeCoordinate(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return null;
  }

  return number;
}


function normalizeText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}


// ==========================================
// GET /api/sightings
//
// LISTAR AVISTAMIENTOS
// ==========================================

async function listar(
  req,
  res,
  next
) {
  try {
    const {
      species,
      status,
    } = req.query;

    const where = {};

    if (species) {
      where.species =
        species;
    }

    if (status) {
      where.status =
        status;
    } else {
      where.status =
        "active";
    }

    const sightings =
      await Sighting.findAll({
        where,

        include:
          sightingIncludes,

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

    return res.json(
      sightings
    );

  } catch (error) {
    console.error(
      "❌ Error listando avistamientos:",
      error
    );

    next(error);
  }
}


// ==========================================
// GET /api/sightings/:id
//
// OBTENER AVISTAMIENTO
// ==========================================

async function obtener(
  req,
  res,
  next
) {
  try {
    const sighting =
      await Sighting.findByPk(
        req.params.id,
        {
          include:
            sightingIncludes,
        }
      );

    if (!sighting) {
      return res
        .status(404)
        .json({
          error:
            "Avistamiento no encontrado.",
        });
    }

    return res.json(
      sighting
    );

  } catch (error) {
    console.error(
      "❌ Error obteniendo avistamiento:",
      error
    );

    next(error);
  }
}


// ==========================================
// POST /api/sightings
//
// CREAR AVISTAMIENTO + LOCATION
// ==========================================

async function crear(
  req,
  res,
  next
) {
  const transaction =
    await sequelize.transaction();

  let committed =
    false;

  try {
    const {
      // ======================================
      // MASCOTA
      // ======================================

      species,
      breed,
      color,
      size,
      gender,

      // ======================================
      // UBICACIÓN
      // ======================================

      address,
      neighborhood,
      latitude,
      longitude,

      // ======================================
      // AVISTAMIENTO
      // ======================================

      sightedAt,
      description,

      // ======================================
      // CONTACTO
      // ======================================

      contactName,
      contactPhone,
      contactEmail,
    } = req.body;


    // ======================================
    // VALIDAR ESPECIE
    // ======================================

    if (!species) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "La especie es obligatoria.",
        });
    }

    const validSpecies =
      new Set([
        "dog",
        "cat",
        "other",
      ]);

    if (
      !validSpecies.has(
        species
      )
    ) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "Especie inválida.",
        });
    }


    // ======================================
    // VALIDAR UBICACIÓN
    // ======================================

    const normalizedAddress =
      normalizeText(
        address
      );

    if (!normalizedAddress) {
      await transaction.rollback();

      return res
        .status(400)
        .json({
          error:
            "La ubicación es obligatoria.",
        });
    }


    // ======================================
    // NORMALIZAR TAMAÑO
    // ======================================

    const validSizes =
      new Set([
        "small",
        "medium",
        "large",
        "unknown",
      ]);

    const normalizedSize =
      validSizes.has(size)
        ? size
        : "unknown";


    // ======================================
    // NORMALIZAR SEXO
    // ======================================

    const validGenders =
      new Set([
        "male",
        "female",
        "unknown",
      ]);

    const normalizedGender =
      validGenders.has(gender)
        ? gender
        : "unknown";


    // ======================================
    // PASO 1
    // RESOLVER COORDENADAS + CREAR LOCATION
    // ======================================

    const normalizedNeighborhood =
      normalizeText(
        neighborhood
      );

    let finalLatitude =
      normalizeCoordinate(
        latitude
      );

    let finalLongitude =
      normalizeCoordinate(
        longitude
      );

    // ======================================
    // GEOCODIFICACIÓN AUTOMÁTICA
    // ======================================
    //
    // Si el frontend no envió coordenadas,
    // PawTrace intenta obtenerlas a partir
    // de la dirección escrita.
    // ======================================

    if (
      finalLatitude === null ||
      finalLongitude === null
    ) {
      try {
        const geocoded =
          await geocodeAddress({
            address:
              normalizedAddress,

            neighborhood:
              normalizedNeighborhood,
          });

        if (geocoded) {
          finalLatitude =
            geocoded.latitude;

          finalLongitude =
            geocoded.longitude;

          console.log(
            "📍 Coordenadas automáticas:",
            {
              latitude:
                finalLatitude,

              longitude:
                finalLongitude,
            }
          );
        } else {
          console.log(
            "⚠️ No se encontraron coordenadas para:",
            normalizedAddress
          );
        }
      } catch (
        geocodingError
      ) {
        // No cancelamos el avistamiento.
        // Se guarda igualmente aunque el
        // geocoding falle.

        console.error(
          "⚠️ No se pudo geocodificar la dirección:",
          geocodingError
        );
      }
    }

    // ======================================
    // CREAR LOCATION
    // ======================================

    const location =
      await Location.create(
        {
          address:
            normalizedAddress,

          neighborhood:
            normalizedNeighborhood,

          latitude:
            finalLatitude,

          longitude:
            finalLongitude,
        },
        {
          transaction,
        }
      );

    // ======================================
    // PASO 2
    // CREAR SIGHTING
    // ======================================

    const sighting =
      await Sighting.create(
        {
          // El usuario autenticado se toma
          // del token si está disponible.

          userId:
            req.usuario?.id ||
            null,

          locationId:
            location.id,

          species,

          breed:
            normalizeText(
              breed
            ),

          color:
            normalizeText(
              color
            ),

          size:
            normalizedSize,

          gender:
            normalizedGender,

          sightedAt:
            sightedAt
              ? new Date(
                  sightedAt
                )
              : new Date(),

          description:
            normalizeText(
              description
            ),

          contactName:
            normalizeText(
              contactName
            ),

          contactPhone:
            normalizeText(
              contactPhone
            ),

          contactEmail:
            normalizeText(
              contactEmail
            ),

          status:
            "active",
        },
        {
          transaction,
        }
      );


    // ======================================
    // COMMIT
    // ======================================

    await transaction.commit();

    committed =
      true;


    console.log(
      "👁️ Avistamiento creado:",
      {
        sightingId:
          sighting.id,

        locationId:
          location.id,

        species:
          sighting.species,

        address:
          location.address,
      }
    );


    // ======================================
    // DEVOLVER AVISTAMIENTO COMPLETO
    // ======================================

    const completeSighting =
      await Sighting.findByPk(
        sighting.id,
        {
          include:
            sightingIncludes,
        }
      );

    return res
      .status(201)
      .json(
        completeSighting
      );

  } catch (error) {

    if (!committed) {
      try {
        await transaction.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "⚠️ Error haciendo rollback:",
          rollbackError
        );
      }
    }

    console.error(
      "❌ Error creando avistamiento:",
      error
    );

    next(error);
  }
}


// ==========================================
// PUT /api/sightings/:id
//
// ACTUALIZAR AVISTAMIENTO
// ==========================================

async function actualizar(
  req,
  res,
  next
) {
  const transaction =
    await sequelize.transaction();

  let committed =
    false;

  try {
    const sighting =
      await Sighting.findByPk(
        req.params.id,
        {
          transaction,
        }
      );

    if (!sighting) {
      await transaction.rollback();

      return res
        .status(404)
        .json({
          error:
            "Avistamiento no encontrado.",
        });
    }

    const {
      species,
      breed,
      color,
      size,
      gender,

      sightedAt,
      description,

      contactName,
      contactPhone,
      contactEmail,

      status,

      address,
      neighborhood,
      latitude,
      longitude,
    } = req.body;


    // ======================================
    // ESPECIE
    // ======================================

    if (
      species !==
      undefined
    ) {
      const validSpecies =
        new Set([
          "dog",
          "cat",
          "other",
        ]);

      if (
        !validSpecies.has(
          species
        )
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            error:
              "Especie inválida.",
          });
      }

      sighting.species =
        species;
    }


    // ======================================
    // RAZA
    // ======================================

    if (
      breed !==
      undefined
    ) {
      sighting.breed =
        normalizeText(
          breed
        );
    }


    // ======================================
    // COLOR
    // ======================================

    if (
      color !==
      undefined
    ) {
      sighting.color =
        normalizeText(
          color
        );
    }


    // ======================================
    // TAMAÑO
    // ======================================

    if (
      size !==
      undefined
    ) {
      const validSizes =
        new Set([
          "small",
          "medium",
          "large",
          "unknown",
        ]);

      if (
        !validSizes.has(
          size
        )
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            error:
              "Tamaño inválido.",
          });
      }

      sighting.size =
        size;
    }


    // ======================================
    // SEXO
    // ======================================

    if (
      gender !==
      undefined
    ) {
      const validGenders =
        new Set([
          "male",
          "female",
          "unknown",
        ]);

      if (
        !validGenders.has(
          gender
        )
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            error:
              "Sexo inválido.",
          });
      }

      sighting.gender =
        gender;
    }


    // ======================================
    // FECHA DEL AVISTAMIENTO
    // ======================================

    if (
      sightedAt !==
      undefined
    ) {
      sighting.sightedAt =
        sightedAt
          ? new Date(
              sightedAt
            )
          : null;
    }


    // ======================================
    // DESCRIPCIÓN
    // ======================================

    if (
      description !==
      undefined
    ) {
      sighting.description =
        normalizeText(
          description
        );
    }


    // ======================================
    // CONTACTO
    // ======================================

    if (
      contactName !==
      undefined
    ) {
      sighting.contactName =
        normalizeText(
          contactName
        );
    }

    if (
      contactPhone !==
      undefined
    ) {
      sighting.contactPhone =
        normalizeText(
          contactPhone
        );
    }

    if (
      contactEmail !==
      undefined
    ) {
      sighting.contactEmail =
        normalizeText(
          contactEmail
        );
    }


    // ======================================
    // STATUS
    // ======================================

    if (
      status !==
      undefined
    ) {
      const validStatuses =
        new Set([
          "active",
          "resolved",
          "closed",
          "rejected",
        ]);

      if (
        !validStatuses.has(
          status
        )
      ) {
        await transaction.rollback();

        return res
          .status(400)
          .json({
            error:
              "Estado inválido.",
          });
      }

      sighting.status =
        status;
    }


    // ======================================
    // UBICACIÓN
    // ======================================

    const hasLocationData =
      address !== undefined ||
      neighborhood !== undefined ||
      latitude !== undefined ||
      longitude !== undefined;

    if (hasLocationData) {

      let location =
        null;

      if (
        sighting.locationId
      ) {
        location =
          await Location.findByPk(
            sighting.locationId,
            {
              transaction,
            }
          );
      }


      // Si por algún motivo no tenía
      // Location, creamos uno.

      if (!location) {

        const newAddress =
          normalizeText(
            address
          );

        if (!newAddress) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              error:
                "La ubicación es obligatoria.",
            });
        }

        location =
          await Location.create(
            {
              address:
                newAddress,

              neighborhood:
                normalizeText(
                  neighborhood
                ),

              latitude:
                normalizeCoordinate(
                  latitude
                ),

              longitude:
                normalizeCoordinate(
                  longitude
                ),
            },
            {
              transaction,
            }
          );

        sighting.locationId =
          location.id;

      } else {

        if (
          address !==
          undefined
        ) {
          location.address =
            normalizeText(
              address
            );
        }

        if (
          neighborhood !==
          undefined
        ) {
          location.neighborhood =
            normalizeText(
              neighborhood
            );
        }

        if (
          latitude !==
          undefined
        ) {
          location.latitude =
            normalizeCoordinate(
              latitude
            );
        }

        if (
          longitude !==
          undefined
        ) {
          location.longitude =
            normalizeCoordinate(
              longitude
            );
        }

        await location.save({
          transaction,
        });
      }
    }


    // ======================================
    // GUARDAR SIGHTING
    // ======================================

    await sighting.save({
      transaction,
    });


    await transaction.commit();

    committed =
      true;


    console.log(
      "✏️ Avistamiento actualizado:",
      sighting.id
    );


    // ======================================
    // DEVOLVER ACTUALIZADO
    // ======================================

    const updatedSighting =
      await Sighting.findByPk(
        sighting.id,
        {
          include:
            sightingIncludes,
        }
      );

    return res.json(
      updatedSighting
    );

  } catch (error) {

    if (!committed) {
      try {
        await transaction.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "⚠️ Error haciendo rollback:",
          rollbackError
        );
      }
    }

    console.error(
      "❌ Error actualizando avistamiento:",
      error
    );

    next(error);
  }
}


// ==========================================
// DELETE /api/sightings/:id
//
// SOFT DELETE
// ==========================================

async function eliminar(
  req,
  res,
  next
) {
  try {
    const sighting =
      await Sighting.findByPk(
        req.params.id
      );

    if (!sighting) {
      return res
        .status(404)
        .json({
          error:
            "Avistamiento no encontrado.",
        });
    }

    await sighting.destroy();

    console.log(
      "🗑️ Avistamiento eliminado:",
      sighting.id
    );

    return res.json({
      success:
        true,

      message:
        "Avistamiento eliminado correctamente.",
    });

  } catch (error) {
    console.error(
      "❌ Error eliminando avistamiento:",
      error
    );

    next(error);
  }
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};