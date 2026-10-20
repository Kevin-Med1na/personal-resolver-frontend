import { routes } from '@vercel/config/v1';
import type { VercelConfig } from '@vercel/config/v1';

/**
 * La dirección del backend no se versiona: se configura en el proyecto de
 * Vercel como variable de entorno BACKEND_URL (Production y Preview).
 * Vercel compila este archivo a vercel.json durante el build, así que la
 * variable se lee en ese momento.
 */
const backendUrl = process.env['BACKEND_URL']?.trim().replace(/\/+$/, '');

if (!backendUrl) {
  throw new Error(
    'Falta la variable de entorno BACKEND_URL, la URL pública del backend '
      + '(por ejemplo https://backend.example.com). Configúrala en el proyecto de Vercel.',
  );
}

// Exportación por defecto: es la que leen tanto el build de Vercel como
// `npx @vercel/config compile`.
export default {
  // Proxy en el CDN de Vercel: el navegador llama a /api en el mismo origen,
  // sin CORS, y la petición llega al backend.
  rewrites: [routes.rewrite('/api/:path*', `${backendUrl}/api/:path*`)],
} satisfies VercelConfig;
