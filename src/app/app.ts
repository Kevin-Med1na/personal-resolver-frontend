import {
  Component,
  DestroyRef,
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
import { firstValueFrom } from 'rxjs';
import { DocumentApiService } from './services/document-api.service';
import {
  CompanyBasicData,
  DocumentQueryResponse,
  DocumentType,
  PersonBasicData,
} from './models/document.models';
import {
  SERVICE_END_HOUR,
  SERVICE_HOURS_LABEL,
  SERVICE_OFFSET_LABEL,
  SERVICE_START_HOUR,
  formatDuration,
  localServiceHours,
  serviceWindow,
} from './service-hours';
import { documentLabel } from './document-format';
import { Brand } from './ui/brand';
import { HowItWorks } from './sections/how-it-works/how-it-works';
import { Faq } from './sections/faq/faq';
import { SiteFooter } from './sections/site-footer/site-footer';

type ApiStatus = 'checking' | 'online' | 'offline';

/**
 * Disponibilidad tal como la ve quien usa la aplicación. Combina el estado
 * real del backend con el horario, para que la cabecera y el aviso de horario
 * nunca se contradigan.
 */
export type Availability = 'checking' | 'available' | 'unavailable' | 'closed';

/**
 * Qué salió mal, para darle a cada caso su propio tratamiento visual.
 * `unavailable` y `closed` significan que el backend no respondió: está
 * apagado, fuera de horario o la respuesta no es suya.
 */
export type ErrorKind = 'validation' | 'notFound' | 'failed' | 'unavailable' | 'closed';

/** Lo que muestra el panel de resultados. La validación se muestra junto al campo. */
export type PanelState = 'idle' | 'loading' | 'person' | 'company' | Exclude<ErrorKind, 'validation'>;

interface UiError {
  kind: ErrorKind;
  kicker: string;
  message: string;
  hint: string;
}

const AVAILABILITY_LABELS: Record<Availability, string> = {
  checking: 'Verificando…',
  available: 'Disponible',
  unavailable: 'No disponible',
  closed: 'Fuera de horario',
};

/** Cada cuánto se vuelve a comprobar el backend con la página visible. */
const REFRESH_INTERVAL_MS = 30_000;

@Component({
  imports: [FormsModule, NgTemplateOutlet, Brand, HowItWorks, Faq, SiteFooter],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
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

  /**
   * La página se prerenderiza, así que la hora y el estado del backend solo
   * se conocen en el navegador. Mientras tanto quedan en null / 'checking'
   * para que el HTML prerenderizado no congele la hora del build.
   */
  readonly now = signal<Date | null>(null);
  readonly apiStatus = signal<ApiStatus>('checking');

  readonly schedule = computed(() => {
    const now = this.now();
    return now ? serviceWindow(now) : null;
  });

  readonly localHours = computed(() => {
    const now = this.now();
    return now ? localServiceHours(now) : null;
  });

  readonly availability = computed<Availability>(() => {
    switch (this.apiStatus()) {
      case 'checking':
        return 'checking';
      case 'online':
        return 'available';
      default:
        return this.schedule()?.open === false ? 'closed' : 'unavailable';
    }
  });

  readonly availabilityLabel = computed(() => AVAILABILITY_LABELS[this.availability()]);

  readonly availabilityDetail = computed(() => {
    const schedule = this.schedule();

    switch (this.availability()) {
      case 'available':
        return schedule?.open
          ? `Cierra en ${formatDuration(schedule.minutesToChange)}`
          : 'Fuera del horario habitual';
      case 'unavailable':
        return 'El servidor no responde';
      case 'closed':
        return schedule ? `Abre en ${formatDuration(schedule.minutesToChange)}` : '';
      default:
        return 'Comprobando el servidor';
    }
  });

  private readonly api = inject(DocumentApiService);
  private readonly injector = inject(Injector);
  private readonly workspace = viewChild<ElementRef<HTMLElement>>('workspace');
  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');
  private healthCheck: Promise<boolean> | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // También al volver a la pestaña: quien la dejó abierta no debe ver un
      // estado de hace minutos.
      const refresh = () => {
        if (document.visibilityState === 'hidden') {
          return;
        }
        this.now.set(new Date());
        void this.verifyBackend();
      };

      refresh();
      const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
      document.addEventListener('visibilitychange', refresh);
      window.addEventListener('focus', refresh);

      destroyRef.onDestroy(() => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', refresh);
        window.removeEventListener('focus', refresh);
      });
    });
  }

  /**
   * Comprueba con /api/health que el backend responde. Solo cuenta un
   * {"status":"UP"}: si el backend no está corriendo, lo que llega es un error
   * de algún intermediario (el proxy, un túnel u otro servicio).
   */
  verifyBackend(): Promise<boolean> {
    this.healthCheck ??= firstValueFrom(this.api.health())
      .then((response) => response?.status === 'UP', () => false)
      .then((up) => {
        this.apiStatus.set(up ? 'online' : 'offline');
        return up;
      })
      .finally(() => (this.healthCheck = null));

    return this.healthCheck;
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
      if (this.apiStatus() !== 'online' && !(await this.verifyBackend())) {
        this.error.set(this.unavailableError());
        return;
      }

      this.result.set(await firstValueFrom(this.api.lookup(this.documentType, normalized)));
      this.apiStatus.set('online');
    } catch (error) {
      // Un error solo se muestra como tal si el backend confirma que está
      // arriba. Si no, la respuesta no es suya y el servicio no está disponible.
      this.error.set(await this.verifyBackend()
        ? this.describeError(error as HttpErrorResponse)
        : this.unavailableError());
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Si el resultado queda debajo del pliegue, se desplaza lo justo para
   * mostrarlo, sin sacar el formulario de la vista si cabe. El desplazamiento
   * es suave salvo que el sistema pida reducir el movimiento (ver styles.css).
   */
  private revealWorkspace(): void {
    afterNextRender(() => {
      const element = this.workspace()?.nativeElement;

      if (element && element.getBoundingClientRect().top > window.innerHeight * 0.6) {
        element.scrollIntoView({ block: 'nearest' });
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
      input.scrollIntoView({ block: 'center' });
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
    const schedule = this.schedule();

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
