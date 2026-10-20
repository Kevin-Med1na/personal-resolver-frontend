import { Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvailabilityService } from './availability.service';
import { recordRenderedPath } from './prerendered-path';
import { Brand } from './ui/brand';
import { SiteFooter } from './sections/site-footer/site-footer';

/** Marco común: cabecera con el estado del servicio, la página y el pie. */
@Component({
  imports: [RouterOutlet, Brand, SiteFooter],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly status = inject(AvailabilityService);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => this.status.start(destroyRef));
    recordRenderedPath();
  }
}
