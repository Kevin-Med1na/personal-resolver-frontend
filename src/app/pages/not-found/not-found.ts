import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { setPageMeta } from '../../page-meta';

@Component({
  imports: [RouterLink],
  selector: 'app-not-found',
  template: `
    <section class="legal not-found" aria-labelledby="not-found-title">
      <p class="kicker kicker-blue">Error 404</p>
      <h1 class="section-title" id="not-found-title">
        Esta página no existe.
        <span class="quiet">El formulario sí.</span>
      </h1>
      <p>Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <a class="btn btn-primary" routerLink="/" fragment="consulta">
        Ir a la consulta
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </section>
  `,
  styleUrl: '../legal-page.css',
  styles: `
    .not-found {
      min-height: 52vh;
    }

    .section-title .quiet {
      display: block;
    }

    .btn {
      margin-top: 28px;
      text-decoration: none;
    }
  `,
})
export class NotFound {
  constructor() {
    // Vercel la sirve con estado 200: que los buscadores no la indexen.
    setPageMeta('La página que buscas no existe.', { index: false });
  }
}
