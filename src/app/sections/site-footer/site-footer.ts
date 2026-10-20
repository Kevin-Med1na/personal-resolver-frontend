import { Component } from '@angular/core';
import { Brand } from '../../ui/brand';
import { SERVICE_HOURS_LABEL, SERVICE_OFFSET_LABEL } from '../../service-hours';

/** Pie de página: el único lugar de la interfaz que nombra las fuentes. */
@Component({
  imports: [Brand],
  selector: 'app-site-footer',
  styleUrl: './site-footer.css',
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  readonly serviceHours = `${SERVICE_HOURS_LABEL} (${SERVICE_OFFSET_LABEL})`;
  readonly repository = 'https://github.com/Kevin-Med1na/personal-resolver';
  readonly frontendRepository = `${this.repository}-frontend`;
}
