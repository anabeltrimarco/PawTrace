"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
});

export default function MapPage() {
  return (
    <main className="container form-page">
      <Link href="/">← Volver</Link>

      <h1>Mapa de reportes</h1>

      <p className="lead">
        Mascotas perdidas, encontradas y avistamientos cercanos.
      </p>

      <MapView />
    </main>
  );
}