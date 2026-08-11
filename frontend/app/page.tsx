import Image from "next/image";
import Link from "next/link";

import {
  MapPin,
  Sparkles,
  Search,
  Plus,
  Pencil,
  Heart,
} from "lucide-react";

export default function Home() {
  return (
    <>
      {/* ======================================
          HEADER
      ====================================== */}

      <header className="container nav">
        <div className="logo-box">
          <Link
            href="/"
            className="logo"
          >
            <Image
              src="/logo_powtrace.png"
              alt="PawTrace"
              width={320}
              height={90}
              className="logo-img"
              priority
            />
          </Link>
        </div>

        <nav className="nav-links">
          <Link href="/">
            Inicio
          </Link>

          <Link href="/report-lost">
            Perdí mi mascota
          </Link>

          <Link href="/report-found">
            Encontré una mascota
          </Link>

          <Link href="/sightings">
            Avistamientos
          </Link>

          <Link href="/map">
            Mapa
          </Link>

          <Link href="/reportes">
            Reportes
          </Link>

          <Link href="/matches">
            Coincidencias
          </Link>
        </nav>
      </header>

      {/* ======================================
          MAIN
      ====================================== */}

      <main>
        {/* ====================================
            HERO
        ==================================== */}

        <section className="hero container">
          <div className="hero-text">
            <div className="badge">
              <Sparkles size={16} />
              Búsqueda inteligente de mascotas
            </div>

            <h1>
              Encontrar a tu mascota nunca fue tan fácil.
            </h1>

            <p className="lead">
              PawTrace AI ayuda a publicar
              mascotas perdidas o encontradas,
              ver reportes cercanos en el mapa
              y detectar posibles coincidencias
              con ayuda de inteligencia artificial.
            </p>

            <div className="hero-actions">
              <Link
                className="btn primary"
                href="/report-lost"
              >
                <Plus size={20} />
                Reportar pérdida
              </Link>

              <Link
                className="btn secondary"
                href="/map"
              >
                <MapPin size={20} />
                Ver mapa
              </Link>
            </div>
          </div>

          <div className="hero-photo">
            <Image
              src="/perrogato.png"
              alt="Perro y gato"
              width={847}
              height={744}
              className="hero-image"
              priority
            />
          </div>
        </section>

        {/* ====================================
            CÓMO FUNCIONA
        ==================================== */}

        <section className="container how">
          <h2>
            ¿Cómo funciona?
          </h2>

          <div className="grid">
            <div className="card">
              <Pencil />

              <h3>
                1. Publicá rápido
              </h3>

              <p>
                Cargá foto, zona,
                descripción y datos
                importantes en menos de
                2 minutos.
              </p>
            </div>

            <div className="card">
              <Search />

              <h3>
                2. Buscá en el mapa
              </h3>

              <p>
                Visualizá mascotas perdidas
                y encontradas cerca de tu
                ubicación.
              </p>
            </div>

            <div className="card">
              <Sparkles />

              <h3>
                3. Coincidencias IA
              </h3>

              <p>
                El sistema sugiere posibles
                coincidencias usando datos,
                distancia y fotos.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================
            ESTADÍSTICAS
        ==================================== */}

        <section className="container stats">
          <div>
            <Heart />

            <strong>
              2.548
            </strong>

            <span>
              Mascotas reunidas
            </span>
          </div>

          <div>
            <MapPin />

            <strong>
              1.248
            </strong>

            <span>
              Reportes en el mapa
            </span>
          </div>

          <div>
            <Sparkles />

            <strong>
              IA
            </strong>

            <span>
              Coincidencias inteligentes
            </span>
          </div>
        </section>
      </main>
    </>
  );
}