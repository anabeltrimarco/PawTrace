# PowTrace — Backend (Fase 1)

API REST para una plataforma de mascotas perdidas y encontradas. Node.js + Express + PostgreSQL (Sequelize) + JWT.

## Funcionalidades de esta fase

- Autenticación con JWT (registro, login, perfil).
- CRUD completo de usuarios (con permisos por rol).
- CRUD de mascotas (con foto).
- CRUD de reportes (perdido / encontrado / avistamiento, con foto y ubicación).
- Subida de imágenes con Multer, servidas en `/uploads`.
- Integración con PostgreSQL vía Sequelize.

## Requisitos

- Node.js 18+
- PostgreSQL corriendo localmente (ya lo tenés instalado).

## Instalación

```bash
cd powtrace-backend
npm install
cp .env.example .env
```

Editá `.env` con los datos de tu base de datos PostgreSQL:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawtrace
DB_USER=postgres
DB_PASSWORD=Yo123
```

Creá la base de datos (si no existe):

```bash
psql -U postgres -c "CREATE DATABASE powtrace;"
```

Creá/actualizá las tablas a partir de los modelos:

```bash
npm run db:sync
```

## Levantar el servidor

```bash
npm run dev    # con recarga automática (nodemon)
# o
npm start
```

El servidor queda en `http://localhost:4000` (o el puerto que definas en `PORT`).

## Estructura del proyecto

```
src/
  config/       # conexión a PostgreSQL y script de sincronización
  models/       # User, Mascota, Reporte (Sequelize)
  middlewares/  # auth (JWT), upload (Multer), manejo de errores
  controllers/  # lógica de cada recurso
  routes/       # definición de endpoints
  app.js        # configuración de Express
  server.js     # arranque del servidor
uploads/        # imágenes subidas (mascotas/, reportes/)
```

## Endpoints principales

### Auth
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | /api/auth/registro | Crea un usuario | No |
| POST | /api/auth/login | Devuelve `{ usuario, token }` | No |
| GET | /api/auth/perfil | Datos del usuario autenticado | Sí |

### Usuarios
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | /api/usuarios | Lista todos los usuarios | Sí (admin) |
| GET | /api/usuarios/:id | Obtiene un usuario | Sí |
| PUT | /api/usuarios/:id | Actualiza un usuario (propio o admin) | Sí |
| DELETE | /api/usuarios/:id | Elimina un usuario (propio o admin) | Sí |

### Mascotas
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | /api/mascotas | Lista mascotas (filtros `estado`, `propietarioId`) | No |
| GET | /api/mascotas/:id | Obtiene una mascota | No |
| POST | /api/mascotas | Crea una mascota (form-data, campo `foto`) | Sí |
| PUT | /api/mascotas/:id | Actualiza (dueño o admin) | Sí |
| DELETE | /api/mascotas/:id | Elimina (dueño o admin) | Sí |

### Reportes
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | /api/reportes | Lista reportes (filtros `tipo`, `estado`, `mascotaId`) | No |
| GET | /api/reportes/:id | Obtiene un reporte | No |
| POST | /api/reportes | Crea un reporte (form-data, campo `foto`) | Sí |
| PUT | /api/reportes/:id | Actualiza (autor o admin) | Sí |
| DELETE | /api/reportes/:id | Elimina (autor o admin) | Sí |

Las peticiones autenticadas requieren el header:

```
Authorization: Bearer <token>
```

## Ejemplos rápidos (curl)

Registro:
```bash
curl -X POST http://localhost:4000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","email":"ana@mail.com","password":"123456"}'
```

Crear mascota con foto:
```bash
curl -X POST http://localhost:4000/api/mascotas \
  -H "Authorization: Bearer <token>" \
  -F "nombre=Firulais" \
  -F "especie=perro" \
  -F "estado=perdida" \
  -F "foto=@/ruta/a/foto.jpg"
```

## Próximas fases (sugerido)

- Notificaciones (email/push) cuando aparece un reporte cercano.
- Búsqueda geoespacial (PostGIS) por radio de distancia.
- Paginación y búsqueda por texto en mascotas/reportes.
- Tests automatizados (Jest + Supertest).
