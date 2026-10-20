import { routes } from '@vercel/config/v1';
import type { VercelConfig } from '@vercel/config/v1';

/**
 * La dirección del backend no se versiona: se configura en el proyecto de
 * Vercel como variable de entorno BACKEND_URL. Vercel compila este archivo a
 * vercel.json durante el build, así que la variable se lee en ese momento.
 *
 * Conviene definirla solo para Production: los previews de pull requests,
 * incluidos los de forks, no deben conocer la dirección del backend.
 */
const backendUrl = process.env['BACKEND_URL']?.trim().replace(/\/+$/, '');

// VERCEL_ENV la define Vercel en el build. Fuera de Vercel se trata como
// producción, para que la variable faltante no pase inadvertida.
const isPreview = process.env['VERCEL_ENV'] === 'preview'
  || process.env['VERCEL_ENV'] === 'development';

if (!backendUrl && !isPreview) {
  throw new Error(
    'Falta la variable de entorno BACKEND_URL, la URL pública del backend '
      + '(por ejemplo https://backend.example.com). Configúrala en el proyecto de Vercel.',
  );
}

// Exportación por defecto: es la que leen tanto el build de Vercel como
// `npx @vercel/config compile`.
export default {
  // Proxy en el CDN de Vercel: el navegador llama a /api en el mismo origen,
  // sin CORS, y la petición llega al backend. Un preview sin BACKEND_URL se
  // publica sin backend: la interfaz funciona y muestra el servicio como no
  // disponible.
  rewrites: backendUrl
    ? [routes.rewrite('/api/:path*', `${backendUrl}/api/:path*`)]
    : [],
} satisfies VercelConfig;
