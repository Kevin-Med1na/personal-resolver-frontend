import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

const providers = [
  provideBrowserGlobalErrorListeners(),
  provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
  provideHttpClient(),
];

export const appConfig: ApplicationConfig = {
  providers: [...providers, provideClientHydration()],
};

/** Sin hidratación: para cuando el HTML recibido no es el de la ruta (ver main.ts). */
export const clientOnlyConfig: ApplicationConfig = { providers };
