import { Component, output } from '@angular/core';

@Component({
  selector: 'app-how-it-works',
  styleUrl: './how-it-works.css',
  templateUrl: './how-it-works.html',
})
export class HowItWorks {
  /** Pide llevar a quien lee hasta el formulario. */
  readonly start = output<void>();
}
