import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DATA_CONTROLLER, LEGAL_EFFECTIVE_DATE } from '../../legal';
import { SERVICE_HOURS_LABEL, SERVICE_OFFSET_LABEL } from '../../service-hours';
import { setPageMeta } from '../../page-meta';

@Component({
  imports: [RouterLink],
  selector: 'app-terms',
  styleUrl: '../legal-page.css',
  templateUrl: './terms.html',
})
export class Terms {
  readonly controller = DATA_CONTROLLER;
  readonly effectiveDate = LEGAL_EFFECTIVE_DATE;
  readonly serviceHours = `${SERVICE_HOURS_LABEL} (${SERVICE_OFFSET_LABEL})`;

  constructor() {
    setPageMeta('Condiciones de uso de Personal Resolver: uso permitido, límites de consulta y alcance de la información.');
  }
}
