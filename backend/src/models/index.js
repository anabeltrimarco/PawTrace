const sequelize =
  require("../config/db");

const Match =
  require("./Match");

const User =
  require("./User");

const Pet =
  require("./Pet");

const LostReport =
  require("./LostReport");

const FoundReport =
  require("./FoundReport");

const Location =
  require("./Location");

const PetPhoto =
  require("./PetPhoto");

const FoundReportPhoto =
  require("./FoundReportPhoto");


// ==========================================
// AVISTAMIENTOS
// ==========================================

const Sighting =
  require("./Sighting");

const SightingPhoto =
  require("./SightingPhoto");


// ==========================================
// USER ↔ PET
// ==========================================

User.hasMany(
  Pet,
  {
    foreignKey:
      "ownerId",

    as:
      "pets",
  }
);

Pet.belongsTo(
  User,
  {
    foreignKey:
      "ownerId",

    as:
      "owner",
  }
);


// ==========================================
// PET ↔ LOST REPORT
// ==========================================

Pet.hasMany(
  LostReport,
  {
    foreignKey:
      "petId",

    as:
      "lostReports",

    onDelete:
      "CASCADE",
  }
);

LostReport.belongsTo(
  Pet,
  {
    foreignKey:
      "petId",

    as:
      "pet",
  }
);


// ==========================================
// USER ↔ LOST REPORT
// ==========================================

User.hasMany(
  LostReport,
  {
    foreignKey:
      "userId",

    as:
      "lostReports",
  }
);

LostReport.belongsTo(
  User,
  {
    foreignKey:
      "userId",

    as:
      "user",
  }
);


// ==========================================
// LOCATION ↔ LOST REPORT
// ==========================================

Location.hasMany(
  LostReport,
  {
    foreignKey:
      "locationId",

    as:
      "lostReports",
  }
);

LostReport.belongsTo(
  Location,
  {
    foreignKey:
      "locationId",

    as:
      "location",
  }
);


// ==========================================
// USER ↔ FOUND REPORT
// ==========================================

User.hasMany(
  FoundReport,
  {
    foreignKey:
      "userId",

    as:
      "foundReports",
  }
);

FoundReport.belongsTo(
  User,
  {
    foreignKey:
      "userId",

    as:
      "user",
  }
);


// ==========================================
// LOCATION ↔ FOUND REPORT
// ==========================================

Location.hasMany(
  FoundReport,
  {
    foreignKey:
      "locationId",

    as:
      "foundReports",
  }
);

FoundReport.belongsTo(
  Location,
  {
    foreignKey:
      "locationId",

    as:
      "location",
  }
);


// ==========================================
// PET ↔ PET PHOTO
// ==========================================

Pet.hasMany(
  PetPhoto,
  {
    foreignKey:
      "petId",

    as:
      "photos",

    onDelete:
      "CASCADE",
  }
);

PetPhoto.belongsTo(
  Pet,
  {
    foreignKey:
      "petId",

    as:
      "pet",
  }
);


// ==========================================
// FOUND REPORT ↔ FOUND REPORT PHOTO
// ==========================================

FoundReport.hasMany(
  FoundReportPhoto,
  {
    foreignKey:
      "foundReportId",

    as:
      "photos",

    onDelete:
      "CASCADE",
  }
);

FoundReportPhoto.belongsTo(
  FoundReport,
  {
    foreignKey:
      "foundReportId",

    as:
      "foundReport",
  }
);


// ==========================================
// USER ↔ SIGHTING
// ==========================================
//
// Un usuario puede crear varios
// avistamientos.
// ==========================================

User.hasMany(
  Sighting,
  {
    foreignKey:
      "userId",

    as:
      "sightings",

    onDelete:
      "SET NULL",
  }
);

Sighting.belongsTo(
  User,
  {
    foreignKey:
      "userId",

    as:
      "user",
  }
);


// ==========================================
// LOCATION ↔ SIGHTING
// ==========================================
//
// Cada avistamiento puede tener
// una ubicación.
// ==========================================

Location.hasMany(
  Sighting,
  {
    foreignKey:
      "locationId",

    as:
      "sightings",

    onDelete:
      "SET NULL",
  }
);

Sighting.belongsTo(
  Location,
  {
    foreignKey:
      "locationId",

    as:
      "location",
  }
);


// ==========================================
// SIGHTING ↔ SIGHTING PHOTO
// ==========================================
//
// Un avistamiento puede tener
// una o varias fotos.
// ==========================================

Sighting.hasMany(
  SightingPhoto,
  {
    foreignKey:
      "sightingId",

    as:
      "photos",

    onDelete:
      "CASCADE",
  }
);

SightingPhoto.belongsTo(
  Sighting,
  {
    foreignKey:
      "sightingId",

    as:
      "sighting",
  }
);


// ==========================================
// LOST REPORT ↔ MATCH
// ==========================================

LostReport.hasMany(
  Match,
  {
    foreignKey:
      "lostReportId",

    as:
      "matches",

    onDelete:
      "CASCADE",
  }
);

Match.belongsTo(
  LostReport,
  {
    foreignKey:
      "lostReportId",

    as:
      "lostReport",
  }
);


// ==========================================
// FOUND REPORT ↔ MATCH
// ==========================================

FoundReport.hasMany(
  Match,
  {
    foreignKey:
      "foundReportId",

    as:
      "matches",

    onDelete:
      "CASCADE",
  }
);

Match.belongsTo(
  FoundReport,
  {
    foreignKey:
      "foundReportId",

    as:
      "foundReport",
  }
);


// ==========================================
// SIGHTING ↔ MATCH
// ==========================================
//
// Permite que los avistamientos
// generen coincidencias con
// mascotas perdidas.
// ==========================================

Sighting.hasMany(
  Match,
  {
    foreignKey:
      "sightingId",

    as:
      "matches",

    onDelete:
      "CASCADE",
  }
);

Match.belongsTo(
  Sighting,
  {
    foreignKey:
      "sightingId",

    as:
      "sighting",
  }
);


// ==========================================
// IMAGE EMBEDDING
// ==========================================

const ImageEmbedding =
  require(
    "./ImageEmbedding"
  )(sequelize);


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  sequelize,

  User,

  Pet,

  LostReport,

  FoundReport,

  Location,

  PetPhoto,

  FoundReportPhoto,

  Sighting,

  SightingPhoto,

  Match,

  ImageEmbedding,
};