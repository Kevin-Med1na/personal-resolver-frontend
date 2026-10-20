import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DATA_CONTROLLER, LEGAL_EFFECTIVE_DATE } from '../../legal';
import { setPageMeta } from '../../page-meta';

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto
 * 1377 de 2013). Describe lo que hace el código; si eso cambia, esta página
 * también. No nombra las fuentes: remite al pie de página.
 */
@Component({
  imports: [RouterLink],
  selector: 'app-privacy',
  styleUrl: '../legal-page.css',
  templateUrl: './privacy.html',
})
export class Privacy {
  readonly controller = DATA_CONTROLLER;
  readonly effectiveDate = LEGAL_EFFECTIVE_DATE;

  constructor() {
    setPageMeta('Qué datos trata Personal Resolver, para qué los usa y cómo pedir su consulta, corrección o supresión.');
  }
}
