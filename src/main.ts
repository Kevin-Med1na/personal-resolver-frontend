import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig, clientOnlyConfig } from './app/app.config';
import { App } from './app/app';
import { servedPageMatchesRoute } from './app/prerendered-path';

/*
 * Vercel sirve el HTML prerenderizado de las rutas que existen; para las demás
 * entrega una página de respaldo. Hidratar un HTML de otra ruta fallaría, así
 * que en ese caso la aplicación se dibuja desde cero.
 */
bootstrapApplication(App, servedPageMatchesRoute(document) ? appConfig : clientOnlyConfig)
  .catch((err) => console.error(err));
