import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'privacidad', renderMode: RenderMode.Prerender },
  { path: 'terminos', renderMode: RenderMode.Prerender },
  // Rutas que no existen: un servidor Node responde 404. Vercel sirve el sitio
  // como estático y las atiende con la página de respaldo (ver vercel.ts).
  { path: '**', renderMode: RenderMode.Server, status: 404 },
];
