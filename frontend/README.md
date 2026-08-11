# PetAlert AI Frontend (PowTrace)

Frontend del MVP de PetAlert AI / PowTrace. Fase 2: conectado al backend real (Node + Express + PostgreSQL).

## Stack

- Next.js 14 (App Router) + TypeScript
- React
- CSS simple
- Lucide icons
- @react-google-maps/api (mapa + selector de ubicación)

## Pantallas

- Home
- Reportar mascota perdida (`/report-lost`) — publica una mascota + reporte reales vía API
- Reportar mascota encontrada (`/report-found`) — ídem, pide teléfono de contacto del que la encontró
- Mapa de reportes (`/map`) — datos reales del backend, con filtros (tipo, especie, búsqueda)
- Reportes (`/reportes`) — listado en tarjetas con los mismos filtros
- Coincidencias (`/matches`) — comparación simple (sin IA) entre reportes perdidos y encontrados/avistados

## Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`NEXT_PUBLIC_API_URL` apunta al backend de PowTrace (`powtrace-backend`). Tiene que estar corriendo
(`npm run dev` en esa carpeta) para que los formularios y el mapa funcionen.

## Cómo usar

```bash
npm install
npm run dev
```

Abrir:

```bash
http://localhost:3000
```

## Notas de integración (Fase 2)

- Crear mascota/reporte no requiere login: el backend acepta la publicación pública y guarda el
  teléfono de contacto ingresado en el formulario (`contactoTelefono`).
- El selector de ubicación en los formularios es opcional: si no se marca un punto en el mapa, el
  reporte queda sin `latitud`/`longitud` y no aparece como marcador en `/map` (pero sí en `/reportes`).
- La sección "Coincidencias" usa una heurística simple (especie + raza + color) client-side, no un
  modelo de IA real.

## Próximo paso

- Login opcional (asociar reportes a una cuenta).
- Geocodificar la dirección en texto si el usuario no marca el mapa.
- Coincidencias con backend/IA real.
