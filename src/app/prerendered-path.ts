import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const META_NAME = 'prerendered-path';

/** "/privacidad/?a=1#b" → "/privacidad". */
export function normalizePath(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/**
 * En el servidor, deja en el HTML la ruta con la que se renderizó, para que el
 * navegador sepa si puede hidratarlo (ver main.ts).
 */
export function recordRenderedPath(): void {
  if (!isPlatformServer(inject(PLATFORM_ID))) {
    return;
  }

  const meta = inject(Meta);

  inject(Router).events
    .pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    )
    .subscribe((event) => meta.updateTag({ name: META_NAME, content: normalizePath(event.urlAfterRedirects) }));
}

/** ¿El HTML recibido es el que se renderizó para esta misma ruta? */
export function servedPageMatchesRoute(doc: Document): boolean {
  const rendered = doc.querySelector<HTMLMetaElement>(`meta[name="${META_NAME}"]`)?.content;
  return rendered !== undefined && rendered === normalizePath(doc.location.pathname);
}
