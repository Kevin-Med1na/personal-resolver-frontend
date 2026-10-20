import { inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

/**
 * Descripción de la página, también para las vistas previas de enlaces, y si
 * los buscadores pueden indexarla. Se llama desde el constructor de cada
 * página: al navegar dentro de la aplicación, la página nueva reemplaza lo que
 * dejó la anterior.
 */
export function setPageMeta(description: string, { index } = { index: true }): void {
  const meta = inject(Meta);

  meta.updateTag({ name: 'description', content: description });
  meta.updateTag({ property: 'og:description', content: description });

  if (index) {
    meta.removeTag("name='robots'");
  } else {
    meta.updateTag({ name: 'robots', content: 'noindex' });
  }
}
