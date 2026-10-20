import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Marca de Personal Resolver: las tres barras desplazadas de la marca
 * original, ahora con el tricolor, más el nombre.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-brand',
  template: `
    <a class="brand" routerLink="/">
      <svg class="mark" viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" />
        <path class="bar-1" d="M9 9.5v9" />
        <path class="bar-2" d="M14 7.5v9" />
        <path class="bar-3" d="M19 11.5v9" />
      </svg>
      <span>Personal Resolver</span>
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border-radius: 8px;
      color: var(--color-ink);
      font-size: 1.0625rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-decoration: none;
    }

    .mark {
      width: 28px;
      height: 28px;
      flex: none;
    }

    rect {
      fill: var(--color-ink);
    }

    path {
      fill: none;
      stroke-width: 3.25;
      stroke-linecap: round;
    }

    .bar-1 {
      stroke: var(--color-yellow);
    }

    /* Más claros que los tokens: van sobre fondo casi negro. */
    .bar-2 {
      stroke: #6e92ff;
    }

    .bar-3 {
      stroke: #f0475e;
    }
  `,
})
export class Brand {}
