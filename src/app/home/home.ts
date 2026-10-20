import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DocumentApiService } from '../services/document-api.service';
import {
  CompanyBasicData,
  DocumentQueryResponse,
  DocumentType,
  PersonBasicData,
} from '../models/document.models';
import {
  SERVICE_END_HOUR,
  SERVICE_HOURS_LABEL,
  SERVICE_OFFSET_LABEL,
  SERVICE_START_HOUR,
  formatDuration,
} from '../service-hours';
import { documentLabel } from '../document-format';
import { AvailabilityService } from '../availability.service';
import { setPageMeta } from '../page-meta';
import { HowItWorks } from '../sections/how-it-works/how-it-works';
import { Faq } from '../sections/faq/faq';

/**
 * Qué salió mal, para darle a cada caso su propio tratamiento visual.
 * `unavailable` y `closed` significan que el backend no respondió: está
 * apagado, fuera de horario o la respuesta no es suya. `limited`, que se
 * superó el límite de consultas.
 */
export type ErrorKind = 'validation' | 'notFound' | 'failed' | 'limited' | 'unavailable' | 'closed';

/** Lo que muestra el panel de resultados. La validación se muestra junto al campo. */
export type PanelState = 'idle' | 'loading' | 'person' | 'company' | Exclude<ErrorKind, 'validation'>;

interface UiError {
  kind: ErrorKind;
  kicker: string;
  message: string;
  hint: string;
}

@Component({
  imports: [FormsModule, NgTemplateOutlet, RouterLink, HowItWorks, Faq],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  documentType: DocumentType = 'CEDULA';
  documentNumber = '';

  readonly loading = signal(false);
  readonly result = signal<DocumentQueryResponse | null>(null);
  readonly error = signal<UiError | null>(null);
  readonly searched = signal(false);

  readonly isPerson = computed(() => this.result()?.entityType === 'PERSON');
  readonly isCompany = computed(() => this.result()?.entityType === 'COMPANY');

  /** El documento de la última consulta enviada, ya normalizado. */
  readonly lastQuery = signal<{ type: DocumentType; number: string } | null>(null);

  readonly queryLabel = computed(() => {
    const query = this.lastQuery();
    return query ? documentLabel(query.type, query.number) : '';
  });

  readonly validationError = computed(() => {
    const error = this.error();
    return error?.kind === 'validation' ? error : null;
  });

  readonly panelState = computed<PanelState>(() => {
    const error = this.error();

    if (this.loading()) {
      return 'loading';
    }
    if (error && error.kind !== 'validation') {
      return error.kind;
    }
    if (this.isPerson() && this.result()?.person) {
      return 'person';
    }
    if (this.isCompany() && this.result()?.company) {
      return 'company';
    }
    return 'idle';
  });

  readonly serviceHours = SERVICE_HOURS_LABEL;
  readonly serviceOffset = SERVICE_OFFSET_LABEL;

  /** Estado del servicio, compartido con la cabecera. */
  readonly status = inject(AvailabilityService);

  private readonly api = inject(DocumentApiService);
  private readonly injector = inject(Injector);
  private readonly workspace = viewChild<ElementRef<HTMLElement>>('workspace');
  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');

  constructor() {
    setPageMeta('Datos básicos de personas y empresas colombianas a partir de su cédula o su NIT.');
  }

  selectType(type: DocumentType): void {
    this.documentType = type;
    this.result.set(null);
    this.error.set(null);
    this.searched.set(false);
    this.documentNumber = '';
  }

  async submit(): Promise<void> {
    const normalized = this.normalizeDocument(this.documentNumber);

    if (!normalized) {
      this.error.set({
        kind: 'validation',
        kicker: 'DATOS NO VÁLIDOS',
        message: this.documentType === 'CEDULA'
          ? 'Ingresa una cédula válida de 6 a 12 dígitos.'
          : 'Ingresa un NIT válido.',
        hint: 'Revisa el número e inténtalo de nuevo.',
      });
      this.result.set(null);
      this.searched.set(true);
      this.focusDocumentInput();
      return;
    }

    this.documentNumber = normalized;
    this.lastQuery.set({ type: this.documentType, number: normalized });
    this.loading.set(true);
    this.result.set(null);
    this.error.set(null);
    this.searched.set(true);
    this.revealWorkspace();

    try {
      // Si ya se sabe que no responde, se confirma antes de consultar.
      if (this.status.apiStatus() !== 'online' && !(await this.status.verifyBackend())) {
        this.error.set(this.unavailableError());
        return;
      }

      this.result.set(await firstValueFrom(this.api.lookup(this.documentType, normalized)));
      this.status.apiStatus.set('online');
    } catch (error) {
      // Un error solo se muestra como tal si el backend confirma que está
      // arriba. Si no, la respuesta no es suya y el servicio no está disponible.
      this.error.set(await this.status.verifyBackend()
        ? this.describeError(error as HttpErrorResponse)
        : this.unavailableError());
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Si el resultado queda debajo del pliegue, se desplaza lo justo para
   * mostrarlo, sin sacar el formulario de la vista si cabe.
   */
  private revealWorkspace(): void {
    afterNextRender(() => {
      const element = this.workspace()?.nativeElement;

      if (element && element.getBoundingClientRect().top > window.innerHeight * 0.6) {
        element.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
      }
    }, { injector: this.injector });
  }

  clear(): void {
    this.documentNumber = '';
    this.result.set(null);
    this.error.set(null);
    this.searched.set(false);
  }

  /** Al corregir el número, el aviso de validación ya no aplica. */
  clearValidation(): void {
    if (this.validationError()) {
      this.error.set(null);
    }
  }

  /** Lleva el foco al campo del documento, desplazándose solo si no está a la vista. */
  focusDocumentInput(): void {
    const input = this.documentInput()?.nativeElement;

    if (!input) {
      return;
    }

    const { top, bottom } = input.getBoundingClientRect();

    if (top < 0 || bottom > window.innerHeight) {
      input.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    }
    input.focus({ preventScroll: true });
  }

  formatDocument(type: DocumentType, value: string): string {
    return documentLabel(type, value);
  }

  getPerson(): PersonBasicData | null {
    return this.result()?.person ?? null;
  }

  getCompany(): CompanyBasicData | null {
    return this.result()?.company ?? null;
  }

  /**
   * Etiqueta del campo de fecha: cambia según si el documento ya se había
   * consultado antes, porque "consulta anterior" no tiene sentido la primera vez.
   */
  consultDateLabel(): string {
    return this.result()?.previousConsultDate
      ? 'Consulta anterior'
      : 'Primera consulta';
  }

  /**
   * Muestra la consulta anterior a la actual. Si no hay ninguna, muestra la
   * primera, que es la que se está haciendo.
   */
  formattedConsultDate(): string {
    const result = this.result();
    const value = result?.previousConsultDate ?? result?.firstConsultDate;

    if (!value) {
      return 'No disponible';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  consultCountLabel(): string {
    const count = this.result()?.consultCount;

    if (count === null || count === undefined) {
      return 'No disponible';
    }

    return `${count} ${count === 1 ? 'consulta' : 'consultas'}`;
  }

  private normalizeDocument(value: string): string {
    const trimmed = value.trim();

    if (this.documentType === 'CEDULA') {
      return /^\d{6,12}$/.test(trimmed) ? trimmed : '';
    }

    let normalized = trimmed
      .replaceAll('.', '')
      .replaceAll(' ', '');

    if (normalized.includes('-')) {
      normalized = normalized.slice(0, normalized.indexOf('-'));
    }

    normalized = normalized.replace(/\D/g, '');

    return normalized.length >= 6 && normalized.length <= 15 ? normalized : '';
  }

  /**
   * Mensajes propios en vez de los del backend: los de este nombran las
   * fuentes consultadas, y la interfaz solo las muestra en el pie de página.
   */
  private describeError(error: HttpErrorResponse): UiError {
    switch (error.status) {
      case HttpStatusCode.NotFound:
        return {
          kind: 'notFound',
          kicker: 'SIN RESULTADOS',
          message: 'No encontramos información para el documento consultado.',
          hint: 'Prueba con otro documento o verifica que el número esté escrito correctamente.',
        };
      case HttpStatusCode.TooManyRequests:
        return {
          kind: 'limited',
          kicker: 'DEMASIADAS CONSULTAS',
          message: 'Hiciste muchas consultas seguidas.',
          hint: `Espera ${waitTime(error)} antes de volver a consultar.`,
        };
      case HttpStatusCode.BadRequest:
        return {
          kind: 'validation',
          kicker: 'DATOS NO VÁLIDOS',
          message: 'La solicitud no es válida.',
          hint: 'Revisa el tipo y el número de documento.',
        };
      default:
        return {
          kind: 'failed',
          kicker: 'NO FUE POSIBLE COMPLETARLA',
          message: 'No fue posible obtener la información en este momento.',
          hint: 'Intenta nuevamente en unos segundos.',
        };
    }
  }

  private unavailableError(): UiError {
    const schedule = this.status.schedule();

    if (schedule && !schedule.open) {
      return {
        kind: 'closed',
        kicker: 'FUERA DE HORARIO',
        message: 'El servicio está fuera de horario.',
        hint: `Funciona de ${SERVICE_START_HOUR}:00 a ${SERVICE_END_HOUR}:00 (${SERVICE_OFFSET_LABEL}). `
          + `Abre en ${formatDuration(schedule.minutesToChange)}.`,
      };
    }

    return {
      kind: 'unavailable',
      kicker: 'SERVICIO NO DISPONIBLE',
      message: 'El servicio no está disponible en este momento.',
      hint: 'Intenta nuevamente en unos minutos.',
    };
  }
}

/**
 * Suave salvo que el sistema pida reducir el movimiento. Solo para los
 * desplazamientos del formulario: al cambiar de página se salta arriba sin
 * animación.
 */
function scrollBehavior(): ScrollBehavior {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 'auto' : 'smooth';
}

/** Lo que pide esperar el backend (cabecera Retry-After), en palabras. */
function waitTime(error: HttpErrorResponse): string {
  const seconds = Number(error.headers?.get('Retry-After'));

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'un momento';
  }

  return seconds < 60 ? `${Math.ceil(seconds)} s` : formatDuration(Math.ceil(seconds / 60));
}
