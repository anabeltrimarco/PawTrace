import "./globals.css";
import Image from "next/image";
import AuthStatus from "../components/AuthStatus";

export const metadata = {
  title: "PawTrace AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="app-wrapper">

          {/* Estado de sesión */}
          <AuthStatus />

          <div className="app-content">
            {children}
          </div>

          <footer className="app-footer">
            <div className="app-footer-content">
              <Image
                src="/powered-by-coreia.png"
                alt="Powered by Coreia"
                width={180}
                height={60}
                className="app-footer-logo"
              />
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}