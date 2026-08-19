// ==========================================
// PAWTRACE API CLIENT
// frontend/lib/api.ts
// PARTE 1/4
// ==========================================

// Base URL del backend.
// En desarrollo:
// NEXT_PUBLIC_API_URL=http://localhost:5000/api

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

export const API_URL =
  RAW_API_URL.endsWith("/api")
    ? RAW_API_URL
    : `${RAW_API_URL.replace(/\/$/, "")}/api`;

// ==========================================
// ENUMS / TIPOS BASE
// ==========================================

export type PetSpecies =
  | "dog"
  | "cat"
  | "other";

export type PetSize =
  | "small"
  | "medium"
  | "large"
  | "unknown";

export type PetGender =
  | "male"
  | "female"
  | "unknown";

export type ReportStatus =
  | "active"
  | "resolved"
  | "closed"
  | "rejected";

export type UserRole =
  | "user"
  | "admin"
  | "moderator";

export type ReportType =
  | "perdido"
  | "encontrado"
  | "avistamiento";

// ==========================================
// LOCATION
// ==========================================

export interface Location {
  id: string;

  address: string | null;

  neighborhood: string | null;

  cityId: string | null;

  provinceId: string | null;

  latitude:
    | string
    | number
    | null;

  longitude:
    | string
    | number
    | null;

  created_at?: string;
}

// ==========================================
// USER
// ==========================================

export interface User {
  id: string;

  fullName: string;

  email: string;

  phone: string | null;

  role: UserRole;

  avatarUrl: string | null;

  isActive: boolean;

  emailVerified: boolean;

  created_at?: string;

  updated_at?: string;
}

// ==========================================
// PET
// ==========================================

export interface PetPhoto {
  id: string;

  petId?: string;

  imageUrl: string;

  storageKey?: string | null;

  isMain?: boolean | null;

  created_at?: string;
}

export interface Pet {
  id: string;

  ownerId: string | null;

  name: string | null;

  species: PetSpecies;

  breed: string | null;

  color: string | null;

  size: PetSize | null;

  gender: PetGender | null;

  ageText: string | null;

  distinctiveFeatures:
    | string
    | null;

  description:
    | string
    | null;

  microchipNumber:
    | string
    | null;

  created_at?: string;

  updated_at?: string;

  deleted_at?: string | null;

  owner?: User | null;

  photos?: PetPhoto[];
}

// ==========================================
// LOST REPORT
// ==========================================

export interface LostReport {
  id: string;

  petId: string;

  userId: string | null;

  locationId: string | null;

  lastSeenAt: string | null;

  contactName:
    | string
    | null;

  contactPhone:
    | string
    | null;

  contactEmail:
    | string
    | null;

  rewardAmount:
    | string
    | number
    | null;

  status: ReportStatus;

  publicNotes:
    | string
    | null;

  internalNotes:
    | string
    | null;

  created_at?: string;

  updated_at?: string;

  deleted_at?: string | null;

  pet?: Pet | null;

  user?: User | null;

  location?: Location | null;
}

// ==========================================
// FOUND REPORT
// ==========================================

export interface FoundReportPhoto {
  id: string;

  foundReportId?: string;

  imageUrl: string;

  storageKey?: string | null;

  isMain?: boolean | null;

  created_at?: string;
}

export interface FoundReport {
  id: string;

  userId: string | null;

  locationId: string | null;

  species: PetSpecies;

  breed: string | null;

  color: string | null;

  size: PetSize | null;

  gender: PetGender | null;

  foundAt: string | null;

  contactName:
    | string
    | null;

  contactPhone:
    | string
    | null;

  contactEmail:
    | string
    | null;

  description:
    | string
    | null;

  status: ReportStatus;

  created_at?: string;

  updated_at?: string;

  deleted_at?: string | null;

  user?: User | null;

  location?: Location | null;

  photos?: FoundReportPhoto[];
}

// ==========================================
// SIGHTINGS / AVISTAMIENTOS
// ==========================================

export interface SightingPhoto {
  id: string;

  sightingId?: string;

  imageUrl: string;

  storageKey?: string | null;

  isMain?: boolean | null;

  created_at?: string;
}

export interface Sighting {
  id: string;

  userId: string | null;

  locationId: string | null;

  species: PetSpecies;

  breed: string | null;

  color: string | null;

  size: PetSize | null;

  gender: PetGender | null;

  sightedAt: string | null;

  contactName:
    | string
    | null;

  contactPhone:
    | string
    | null;

  contactEmail:
    | string
    | null;

  description:
    | string
    | null;

  status: ReportStatus;

  created_at?: string;

  updated_at?: string;

  deleted_at?: string | null;

  user?: User | null;

  location?: Location | null;

  photos?: SightingPhoto[];
}

// ==========================================
// TIPO UNIFICADO PARA LA PÁGINA REPORTES
// ==========================================

// Este tipo sirve para mantener compatible
// frontend/app/reportes/page.tsx mientras el
// backend usa lost_reports y found_reports.

export interface ReporteMascota {
  id: string;

  nombre: string | null;

  especie: string;

  raza: string | null;

  color: string | null;

  tamano:
    | string
    | null;

  descripcion:
    | string
    | null;

  foto:
    | string
    | null;

  contactoNombre:
    | string
    | null;

  contactoTelefono:
    | string
    | null;
}

export interface Reporte {
  id: string;

  tipo: ReportType;

  descripcion: string;

  ubicacion:
    | string
    | null;

  latitud:
    | string
    | number
    | null;

  longitud:
    | string
    | number
    | null;

  foto:
    | string
    | null;

  fecha: string;

  estado: string;

  // Recompensa solo para mascotas perdidas.
  // En encontrados y avistamientos será null.
  rewardAmount:
    | string
    | number
    | null;

  mascotaId:
    | string
    | null;

  usuarioId:
    | string
    | null;

  mascota?: ReporteMascota;

  createdAt: string;

  updatedAt: string;
}

// ==========================================
// INPUTS
// ==========================================

export interface CreatePetInput {
  name?: string | null;

  species: PetSpecies;

  breed?: string | null;

  color?: string | null;

  size?: PetSize | null;

  gender?: PetGender | null;

  ageText?: string | null;

  distinctiveFeatures?:
    | string
    | null;

  description?:
    | string
    | null;

  microchipNumber?:
    | string
    | null;
}

export interface CreateLostReportInput {
  petId: string;

  address: string;

  neighborhood?:
    | string
    | null;

  latitude?:
    | number
    | null;

  longitude?:
    | number
    | null;

  lastSeenAt?:
    | string
    | null;

  contactName?:
    | string
    | null;

  contactPhone?:
    | string
    | null;

  contactEmail?:
    | string
    | null;

  rewardAmount?:
    | number
    | null;

  publicNotes?:
    | string
    | null;

  internalNotes?:
    | string
    | null;
}

export interface CreateFoundReportInput {
  species: PetSpecies;

  breed?:
    | string
    | null;

  color?:
    | string
    | null;

  size?:
    | PetSize
    | null;

  gender?:
    | PetGender
    | null;

  description?:
    | string
    | null;

  address: string;

  neighborhood?:
    | string
    | null;

  latitude?:
    | number
    | null;

  longitude?:
    | number
    | null;

  foundAt?:
    | string
    | null;

  contactName?:
    | string
    | null;

  contactPhone?:
    | string
    | null;

  contactEmail?:
    | string
    | null;
}

// ==========================================
// FILTROS
// ==========================================

export interface ReportFilters {
  tipo?: ReportType | "";

  especie?: string;

  estado?: string;

  q?: string;
}

export interface PetFilters {
  species?: string;

  ownerId?: string;

  q?: string;
}

// ==========================================
// API ERROR
// ==========================================
// ==========================================
// API ERROR
// ==========================================

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(
    message: string,
    status?: number,
    data?: unknown
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;

    Object.setPrototypeOf(
      this,
      ApiError.prototype
    );
  }
}

// ==========================================
// MANEJO DE RESPUESTAS
// ==========================================

async function readResponseData(
  response: Response
) {
  const contentType =
    response.headers.get(
      "content-type"
    );

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text =
      await response.text();

    return text || null;
  } catch {
    return null;
  }
}

export async function handleResponse<T>(
  response: Response
): Promise<T> {
  const data =
    await readResponseData(
      response
    );

  if (!response.ok) {
    let message =
      `Error de red (${response.status}).`;

    if (
      data &&
      typeof data === "object"
    ) {
      const apiData =
        data as {
          error?: string;

          message?: string;

          errores?: Array<{
            msg?: string;
          }>;
        };

      if (apiData.error) {
        message =
          apiData.error;
      } else if (
        apiData.message
      ) {
        message =
          apiData.message;
      } else if (
        Array.isArray(
          apiData.errores
        )
      ) {
        const validationMessage =
          apiData.errores
            .map(
              (error) =>
                error.msg
            )
            .filter(Boolean)
            .join(" ");

        if (
          validationMessage
        ) {
          message =
            validationMessage;
        }
      }
    } else if (
      typeof data ===
        "string" &&
      data.trim()
    ) {
      message =
        data.trim();
    }

    throw new ApiError(
      message,
      response.status,
      data
    );
  }

  return data as T;
}

// ==========================================
// QUERY STRING
// ==========================================

export function buildQuery(
  params: Record<
    string,
    string | undefined | null
  >
) {
  const searchParams =
    new URLSearchParams();

  Object.entries(
    params
  ).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        searchParams.append(
          key,
          value
        );
      }
    }
  );

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : "";
}

// ==========================================
// AUTH HEADERS
// ==========================================

export function getAuthHeaders():
  Record<string, string> {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  const token =
    localStorage.getItem(
      "token"
    );

  if (!token) {
    return {};
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

// ==========================================
// PETS
// ==========================================

export async function listarPets(
  filtros: PetFilters = {}
): Promise<Pet[]> {
  const query = buildQuery({
    species: filtros.species,
    ownerId: filtros.ownerId,
    q: filtros.q,
  });

  const response = await fetch(
    `${API_URL}/pets${query}`,
    {
      cache: "no-store",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse<Pet[]>(
    response
  );
}

export async function obtenerPet(
  id: string
): Promise<Pet> {
  const response = await fetch(
    `${API_URL}/pets/${id}`,
    {
      cache: "no-store",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse<Pet>(
    response
  );
}

export async function crearPet(
  input: CreatePetInput
): Promise<Pet> {
  const response = await fetch(
    `${API_URL}/pets`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        ...getAuthHeaders(),
      },

      body: JSON.stringify(
        input
      ),
    }
  );

  return handleResponse<Pet>(
    response
  );
}

export async function actualizarPet(
  id: string,
  input: Partial<CreatePetInput>
): Promise<Pet> {
  const response = await fetch(
    `${API_URL}/pets/${id}`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",

        ...getAuthHeaders(),
      },

      body: JSON.stringify(
        input
      ),
    }
  );

  return handleResponse<Pet>(
    response
  );
}

export async function eliminarPet(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/pets/${id}`,
    {
      method: "DELETE",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if (
    response.status === 204
  ) {
    return;
  }

  await handleResponse<unknown>(
    response
  );
}

// ==========================================
// FOTOS / CLOUDINARY
// ==========================================

async function uploadPhoto<T>(
  path: string,
  file: File
): Promise<T> {
  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(
    `${API_URL}${path}`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    }
  );

  return handleResponse<T>(response);
}

export async function subirFotoPet(
  petId: string,
  file: File
): Promise<PetPhoto> {
  return uploadPhoto<PetPhoto>(
    `/pets/${petId}/photos`,
    file
  );
}

export async function subirFotoFoundReport(
  foundReportId: string,
  file: File
): Promise<FoundReportPhoto> {
  return uploadPhoto<FoundReportPhoto>(
    `/found-reports/${foundReportId}/photos`,
    file
  );
}

export async function subirFotoSighting(
  sightingId: string,
  file: File
): Promise<SightingPhoto> {
  return uploadPhoto<SightingPhoto>(
    `/sightings/${sightingId}/photos`,
    file
  );
}

// ==========================================
// LOST REPORTS
// ==========================================

export interface LostReportFilters {
  status?: string;

  petId?: string;

  species?: string;

  q?: string;
}

export async function listarLostReports(
  filtros: LostReportFilters = {}
): Promise<LostReport[]> {
  const query = buildQuery({
    status: filtros.status,
    petId: filtros.petId,
  });

  const response = await fetch(
    `${API_URL}/lost-reports${query}`,
    {
      cache: "no-store",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  const reports =
    await handleResponse<
      LostReport[]
    >(response);

  // ========================================
  // FILTRO FRONTEND
  // ========================================
  //
  // El backend actual acepta status y petId.
  // La especie y búsqueda libre las filtramos
  // aquí para mantener la página Reportes
  // funcionando sin agregar rutas nuevas.
  // ========================================

  return reports.filter(
    (report) => {
      if (
        filtros.species &&
        report.pet?.species !==
          filtros.species
      ) {
        return false;
      }

      if (filtros.q) {
        const search =
          filtros.q
            .trim()
            .toLowerCase();

        if (search) {
          const searchable =
            [
              report.pet?.name,
              report.pet?.species,
              report.pet?.breed,
              report.pet?.color,
              report.pet
                ?.description,
              report.publicNotes,
              report.location
                ?.address,
              report.location
                ?.neighborhood,
              report.contactName,
              report.contactPhone,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          if (
            !searchable.includes(
              search
            )
          ) {
            return false;
          }
        }
      }

      return true;
    }
  );
}

// ==========================================
// MIS REPORTES DEL USUARIO AUTENTICADO
// GET /api/lost-reports/mine
// ==========================================

export async function listarMisLostReports(
  status?: ReportStatus
): Promise<LostReport[]> {
  const query = buildQuery({
    status,
  });

  const response = await fetch(
    `${API_URL}/lost-reports/mine${query}`,
    {
      cache: "no-store",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse<LostReport[]>(
    response
  );
}

export async function obtenerLostReport(
  id: string
): Promise<LostReport> {
  const response = await fetch(
    `${API_URL}/lost-reports/${id}`,
    {
      cache: "no-store",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse<LostReport>(
    response
  );
}

export async function crearLostReport(
  input: CreateLostReportInput
): Promise<LostReport> {
  const response = await fetch(
    `${API_URL}/lost-reports`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        ...getAuthHeaders(),
      },

      body: JSON.stringify(
        input
      ),
    }
  );

  return handleResponse<LostReport>(
    response
  );
}

export async function actualizarLostReport(
  id: string,
  input: Partial<
    CreateLostReportInput
  > & {
    status?: ReportStatus;
  }
): Promise<LostReport> {
  const response = await fetch(
    `${API_URL}/lost-reports/${id}`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",

        ...getAuthHeaders(),
      },

      body: JSON.stringify(
        input
      ),
    }
  );

  return handleResponse<LostReport>(
    response
  );
}

export async function eliminarLostReport(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/lost-reports/${id}`,
    {
      method: "DELETE",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if (
    response.status === 204
  ) {
    return;
  }

  await handleResponse<unknown>(
    response
  );
}

// ==========================================
// FOUND REPORTS
// ==========================================
export interface FoundReportFilters {
  status?: string;

  species?: string;

  q?: string;
}

export async function listarFoundReports(
  filtros: FoundReportFilters = {}
): Promise<FoundReport[]> {
  const query = buildQuery({
    status: filtros.status,
    species: filtros.species,
  });

  const response = await fetch(
    `${API_URL}/found-reports${query}`,
    {
      cache: "no-store",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  const reports =
    await handleResponse<
      FoundReport[]
    >(response);

  return reports.filter(
    (report) => {
      if (
        filtros.species &&
        report.species !==
          filtros.species
      ) {
        return false;
      }

      if (filtros.q) {
        const search =
          filtros.q
            .trim()
            .toLowerCase();

        if (search) {
          const searchable =
            [
              report.species,
              report.breed,
              report.color,
              report.description,
              report.location
                ?.address,
              report.location
                ?.neighborhood,
              report.contactName,
              report.contactPhone,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          if (
            !searchable.includes(
              search
            )
          ) {
            return false;
          }
        }
      }

      return true;
    }
  );
}

export async function obtenerFoundReport(
  id: string
): Promise<FoundReport> {
  const response = await fetch(
    `${API_URL}/found-reports/${id}`,
    {
      cache: "no-store",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse<FoundReport>(
    response
  );
}

export async function crearFoundReport(
  input: CreateFoundReportInput
): Promise<FoundReport> {
  const response = await fetch(
    `${API_URL}/found-reports`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        ...getAuthHeaders(),
      },

      body: JSON.stringify(
        input
      ),
    }
  );

  return handleResponse<FoundReport>(
    response
  );
}

export async function actualizarFoundReport(
  id: string,
  input: Partial<
    CreateFoundReportInput
  > & {
    status?: ReportStatus;
  }
): Promise<FoundReport> {
  const response = await fetch(
    `${API_URL}/found-reports/${id}`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",

        ...getAuthHeaders(),
      },

      body: JSON.stringify(
        input
      ),
    }
  );

  return handleResponse<FoundReport>(
    response
  );
}

export async function eliminarFoundReport(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/found-reports/${id}`,
    {
      method: "DELETE",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  if (
    response.status === 204
  ) {
    return;
  }

  await handleResponse<unknown>(
    response
  );
}

// ==========================================
// SIGHTINGS / AVISTAMIENTOS
// ==========================================

export interface SightingFilters {
  status?: string;

  species?: string;

  q?: string;
}

export async function listarSightings(
  filtros: SightingFilters = {}
): Promise<Sighting[]> {
  const query = buildQuery({
    status: filtros.status,
    species: filtros.species,
  });

  const response = await fetch(
    `${API_URL}/sightings${query}`,
    {
      cache: "no-store",

      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  const reports =
    await handleResponse<
      Sighting[]
    >(response);

  return reports.filter(
    (report) => {
      if (
        filtros.species &&
        report.species !==
          filtros.species
      ) {
        return false;
      }

      if (filtros.q) {
        const search =
          filtros.q
            .trim()
            .toLowerCase();

        if (search) {
          const searchable =
            [
              report.species,
              report.breed,
              report.color,
              report.description,
              report.location
                ?.address,
              report.location
                ?.neighborhood,
              report.contactName,
              report.contactPhone,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          if (
            !searchable.includes(
              search
            )
          ) {
            return false;
          }
        }
      }

      return true;
    }
  );
}

// ==========================================
// HELPERS DE CONVERSIÓN
// ==========================================

function mapSpeciesToFrontend(
  species?: PetSpecies | null
) {
  switch (species) {
    case "dog":
      return "perro";

    case "cat":
      return "gato";

    case "other":
      return "otro";

    default:
      return "";
  }
}

function mapSizeToFrontend(
  size?: PetSize | null
) {
  switch (size) {
    case "small":
      return "chico";

    case "medium":
      return "mediano";

    case "large":
      return "grande";

    default:
      return null;
  }
}

function normalizarTexto(
  value?: string | null
) {
  return (
    value ||
    ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

// ==========================================
// CONVERTIR LOST REPORT A REPORTE
// ==========================================

function lostReportToReporte(
  report: LostReport
): Reporte {
  return {
    id: report.id,

    tipo: "perdido",

    descripcion:
      report.publicNotes ||
      report.pet?.description ||
      "",

    ubicacion:
      report.location?.address ||
      report.location
        ?.neighborhood ||
      null,

    latitud:
      report.location?.latitude ??
      null,

    longitud:
      report.location?.longitude ??
      null,

    foto:
      report.pet?.photos?.find(
        (photo) => photo.isMain
      )?.imageUrl ||
      report.pet?.photos?.[0]?.imageUrl ||
      null,

    fecha:
      report.lastSeenAt ||
      report.created_at ||
      "",

    estado:
      report.status,

    // ======================================
    // RECOMPENSA
    // ======================================

    rewardAmount:
      report.rewardAmount ??
      null,

    mascotaId:
      report.petId || null,

    usuarioId:
      report.userId || null,

    mascota: {
      id:
        report.pet?.id ||
        report.petId,

      nombre:
        report.pet?.name ||
        "Mascota perdida",

      especie:
        mapSpeciesToFrontend(
          report.pet?.species
        ),

      raza:
        report.pet?.breed ||
        null,

      color:
        report.pet?.color ||
        null,

      tamano:
        mapSizeToFrontend(
          report.pet?.size
        ),

      descripcion:
        report.pet
          ?.description ||
        null,

      foto:
        report.pet?.photos?.find(
          (photo) => photo.isMain
        )?.imageUrl ||
        report.pet?.photos?.[0]?.imageUrl ||
        null,

      contactoNombre:
        report.contactName ||
        null,

      contactoTelefono:
        report.contactPhone ||
        null,
    },

    createdAt:
      report.created_at ||
      report.lastSeenAt ||
      "",

    updatedAt:
      report.updated_at ||
      report.created_at ||
      "",
  };
}

// ==========================================
// CONVERTIR FOUND REPORT A REPORTE
// ==========================================

function foundReportToReporte(
  report: FoundReport
): Reporte {
  const fotoPrincipal =
    report.photos?.find(
      (photo) => photo.isMain
    )?.imageUrl ||
    report.photos?.[0]?.imageUrl ||
    null;

  return {
    id: report.id,

    tipo: "encontrado",

    descripcion:
      report.description ||
      "",

    ubicacion:
      report.location?.address ||
      report.location
        ?.neighborhood ||
      null,

    latitud:
      report.location?.latitude ??
      null,

    longitud:
      report.location?.longitude ??
      null,

    foto: fotoPrincipal,

    fecha:
      report.foundAt ||
      report.created_at ||
      "",

    estado:
      report.status,

    // Encontrados no tienen recompensa.
    rewardAmount: null,

    mascotaId: null,

    usuarioId:
      report.userId ||
      null,

    mascota: {
      id: report.id,

      nombre:
        "Mascota encontrada",

      especie:
        mapSpeciesToFrontend(
          report.species
        ),

      raza:
        report.breed ||
        null,

      color:
        report.color ||
        null,

      tamano:
        mapSizeToFrontend(
          report.size
        ),

      descripcion:
        report.description ||
        null,

      foto: fotoPrincipal,

      contactoNombre:
        report.contactName ||
        null,

      contactoTelefono:
        report.contactPhone ||
        null,
    },

    createdAt:
      report.created_at ||
      report.foundAt ||
      "",

    updatedAt:
      report.updated_at ||
      report.created_at ||
      "",
  };
}

// ==========================================
// CONVERTIR SIGHTING A REPORTE
// ==========================================

function sightingToReporte(
  report: Sighting
): Reporte {
  const fotoPrincipal =
    report.photos?.find(
      (photo) => photo.isMain
    )?.imageUrl ||
    report.photos?.[0]?.imageUrl ||
    null;

  return {
    id: report.id,

    tipo: "avistamiento",

    descripcion:
      report.description ||
      "",

    ubicacion:
      report.location?.address ||
      report.location
        ?.neighborhood ||
      null,

    latitud:
      report.location?.latitude ??
      null,

    longitud:
      report.location?.longitude ??
      null,

    foto: fotoPrincipal,

    fecha:
      report.sightedAt ||
      report.created_at ||
      "",

    estado:
      report.status,

    // Avistamientos no tienen recompensa.
    rewardAmount: null,

    mascotaId: null,

    usuarioId:
      report.userId ||
      null,

    mascota: {
      id: report.id,

      nombre:
        "Mascota avistada",

      especie:
        mapSpeciesToFrontend(
          report.species
        ),

      raza:
        report.breed ||
        null,

      color:
        report.color ||
        null,

      tamano:
        mapSizeToFrontend(
          report.size
        ),

      descripcion:
        report.description ||
        null,

      foto: fotoPrincipal,

      contactoNombre:
        report.contactName ||
        null,

      contactoTelefono:
        report.contactPhone ||
        null,
    },

    createdAt:
      report.created_at ||
      report.sightedAt ||
      "",

    updatedAt:
      report.updated_at ||
      report.created_at ||
      report.sightedAt ||
      "",
  };
}

// ==========================================
// LISTAR REPORTES UNIFICADOS
// ==========================================

export async function listarReportes(
  filtros: ReportFilters = {}
): Promise<Reporte[]> {
  const wantsLost =
    !filtros.tipo ||
    filtros.tipo ===
      "perdido";

  const wantsFound =
    !filtros.tipo ||
    filtros.tipo ===
      "encontrado";

  const wantsSightings =
    !filtros.tipo ||
    filtros.tipo ===
      "avistamiento";

  const speciesBackend =
    filtros.especie ===
    "perro"
      ? "dog"
      : filtros.especie ===
          "gato"
        ? "cat"
        : filtros.especie ===
            "otro"
          ? "other"
          : undefined;

  const requests:
    Promise<Reporte[]>[] =
      [];

  if (wantsLost) {
    requests.push(
      listarLostReports({
        species:
          speciesBackend,

        q:
          filtros.q,

        status:
          filtros.estado,
      }).then((reports) =>
        reports.map(
          lostReportToReporte
        )
      )
    );
  }

  if (wantsFound) {
    requests.push(
      listarFoundReports({
        species:
          speciesBackend,

        q:
          filtros.q,

        status:
          filtros.estado,
      }).then((reports) =>
        reports.map(
          foundReportToReporte
        )
      )
    );
  }

  if (wantsSightings) {
    requests.push(
      listarSightings({
        species:
          speciesBackend,

        q:
          filtros.q,

        status:
          filtros.estado,
      }).then((reports) =>
        reports.map(
          sightingToReporte
        )
      )
    );
  }
    const results =
    await Promise.all(
      requests
    );

  let reportes =
    results.flat();

  // ========================================
  // BÚSQUEDA GENERAL EXTRA
  // ========================================

  if (filtros.q) {
    const search =
      normalizarTexto(
        filtros.q
      );

    reportes =
      reportes.filter(
        (reporte) => {
          const searchable =
            normalizarTexto(
              [
                reporte.mascota
                  ?.nombre,
                reporte.mascota
                  ?.especie,
                reporte.mascota
                  ?.raza,
                reporte.mascota
                  ?.color,
                reporte.ubicacion,
                reporte.descripcion,
                reporte.mascota
                  ?.contactoNombre,
                reporte.mascota
                  ?.contactoTelefono,
              ]
                .filter(Boolean)
                .join(" ")
            );

          return searchable.includes(
            search
          );
        }
      );
  }

  reportes.sort(
    (
      a,
      b
    ) => {
      const dateA =
        new Date(
          a.createdAt ||
            a.fecha
        ).getTime();

      const dateB =
        new Date(
          b.createdAt ||
            b.fecha
        ).getTime();

      return (
        dateB - dateA
      );
    }
  );

  return reportes;
}

// ==========================================
// COMPATIBILIDAD: MASCOTAS
// ==========================================

export interface FiltrosMascotas {
  especie?: string;
  estado?: string;
  q?: string;
}

function frontendSpeciesToBackend(
  especie?: string
): PetSpecies | undefined {
  switch (especie) {
    case "perro":
    case "Perro":
    case "dog":
      return "dog";

    case "gato":
    case "Gato":
    case "cat":
      return "cat";

    case "otro":
    case "Otro":
    case "other":
      return "other";

    default:
      return undefined;
  }
}

export async function listarMascotas(
  filtros: FiltrosMascotas = {}
): Promise<Pet[]> {
  const species =
    frontendSpeciesToBackend(
      filtros.especie
    );

  return listarPets({
    species,
    q: filtros.q,
  });
}

// ==========================================
// COMPATIBILIDAD: CREAR MASCOTA
// ==========================================

export interface NuevaMascotaInput {
  nombre: string;

  especie: string;

  raza?: string;

  color?: string;

  tamano?: string;

  descripcion?: string;

  contactoNombre?: string;

  contactoTelefono?: string;

  foto?: File | null;
}

function frontendSizeToBackend(
  size?: string
): PetSize | null {
  switch (size) {
    case "chico":
    case "Chico":
    case "small":
      return "small";

    case "mediano":
    case "Mediano":
    case "medium":
      return "medium";

    case "grande":
    case "Grande":
    case "large":
      return "large";

    case "unknown":
      return "unknown";

    default:
      return null;
  }
}

export async function crearMascota(
  input: NuevaMascotaInput
): Promise<Pet> {
  const species =
    frontendSpeciesToBackend(
      input.especie
    );

  if (!species) {
    throw new ApiError(
      "La especie seleccionada no es válida."
    );
  }

  const pet = await crearPet({
    name:
      input.nombre ||
      null,

    species,

    breed:
      input.raza ||
      null,

    color:
      input.color ||
      null,

    size:
      frontendSizeToBackend(
        input.tamano
      ),

    gender:
      "unknown",

    description:
      input.descripcion ||
      null,
  });

  if (input.foto) {
    const photo = await subirFotoPet(
      pet.id,
      input.foto
    );

    return {
      ...pet,
      photos: [photo],
    };
  }

  return pet;
}

// ==========================================
// AUTH
// ==========================================

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
  phone?: string | null;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  usuario?: User;
  message?: string;
}

export async function login(
  input: LoginInput
): Promise<AuthResponse> {
  const response =
    await fetch(
      `${API_URL}/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          input
        ),
      }
    );

  const data =
    await handleResponse<AuthResponse>(
      response
    );

  if (
    typeof window !==
      "undefined" &&
    data.token
  ) {
    localStorage.setItem(
      "token",
      data.token
    );
  }

  return data;
}

export async function register(
  input: RegisterInput
): Promise<AuthResponse> {
  const response =
    await fetch(
      `${API_URL}/auth/registro`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          input
        ),
      }
    );

  const data =
    await handleResponse<AuthResponse>(
      response
    );

  if (
    typeof window !==
      "undefined" &&
    data.token
  ) {
    localStorage.setItem(
      "token",
      data.token
    );
  }

  return data;
}

export function logout() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    "token"
  );
}

// ==========================================
// API GET GENÉRICO
// ==========================================

export async function apiGet<T>(
  path: string
): Promise<T> {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const response =
    await fetch(
      `${API_URL}${normalizedPath}`,
      {
        cache:
          "no-store",

        headers: {
          ...getAuthHeaders(),
        },
      }
    );

  return handleResponse<T>(
    response
  );
}

// ==========================================
// API POST GENÉRICO
// ==========================================

export async function apiPost<
  TResponse,
  TBody = unknown
>(
  path: string,
  body?: TBody
): Promise<TResponse> {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const response =
    await fetch(
      `${API_URL}${normalizedPath}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          ...getAuthHeaders(),
        },

        body:
          body === undefined
            ? undefined
            : JSON.stringify(
                body
              ),
      }
    );

  return handleResponse<TResponse>(
    response
  );
}

// ==========================================
// API PUT GENÉRICO
// ==========================================

export async function apiPut<
  TResponse,
  TBody = unknown
>(
  path: string,
  body?: TBody
): Promise<TResponse> {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const response =
    await fetch(
      `${API_URL}${normalizedPath}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          ...getAuthHeaders(),
        },

        body:
          body === undefined
            ? undefined
            : JSON.stringify(
                body
              ),
      }
    );

  return handleResponse<TResponse>(
    response
  );
}

// ==========================================
// API DELETE GENÉRICO
// ==========================================

export async function apiDelete(
  path: string
): Promise<void> {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const response =
    await fetch(
      `${API_URL}${normalizedPath}`,
      {
        method:
          "DELETE",

        headers: {
          ...getAuthHeaders(),
        },
      }
    );

  if (
    response.status ===
    204
  ) {
    return;
  }

  await handleResponse<unknown>(
    response
  );
}

// ==========================================
// MATCHES
// ==========================================

// Dejamos estas funciones genéricas porque
// la estructura definitiva de ai_matches
// todavía se va a revisar en el Sprint
// correspondiente.

export interface MatchResult {
  id?: string;

  score?:
    | number
    | string;

  status?: string;

  [key: string]:
    unknown;
}

export async function listarMatches():
  Promise<MatchResult[]> {
  try {
    return await apiGet<
      MatchResult[]
    >("/matches");
  } catch (error) {
    console.warn(
      "Matches todavía no disponible:",
      error
    );

    return [];
  }
}

// ==========================================
// NOTIFICACIONES
// ==========================================

export interface NotificationItem {
  id?: string;
  type?: string;
  message?: string;
  read?: boolean;

  [key: string]:
    unknown;
}

export async function listarNotificaciones():
  Promise<NotificationItem[]> {
  try {
    return await apiGet<
      NotificationItem[]
    >("/notifications");
  } catch (error) {
    console.warn(
      "Notificaciones todavía no disponibles:",
      error
    );

    return [];
  }
}

// ==========================================
// UTILIDADES
// ==========================================

export function hasAuthToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  return Boolean(
    localStorage.getItem(
      "token"
    )
  );
}

export function getAuthToken() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return localStorage.getItem(
    "token"
  );
}