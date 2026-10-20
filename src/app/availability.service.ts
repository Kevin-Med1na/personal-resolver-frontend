import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DocumentApiService } from './services/document-api.service';
import { formatDuration, localServiceHours, serviceWindow } from './service-hours';

type ApiStatus = 'checking' | 'online' | 'offline';

/**
 * Disponibilidad tal como la ve quien usa la aplicación. Combina el estado
 * real del backend con el horario, para que la cabecera y el aviso de horario
 * nunca se contradigan.
 */
export type Availability = 'checking' | 'available' | 'unavailable' | 'closed';

const AVAILABILITY_LABELS: Record<Availability, string> = {
  checking: 'Verificando…',
  available: 'Disponible',
  unavailable: 'No disponible',
  closed: 'Fuera de horario',
};

/** Cada cuánto se vuelve a comprobar el backend con la página visible. */
const REFRESH_INTERVAL_MS = 30_000;

/** Estado del servicio, compartido por la cabecera y la página de consulta. */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly api = inject(DocumentApiService);
  private healthCheck: Promise<boolean> | null = null;

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

  /**
   * Comprueba el backend al cargar, cada 30 segundos mientras la pestaña está
   * visible y al volver a ella: quien la dejó abierta no debe ver un estado
   * de hace minutos. Solo en el navegador.
   */
  start(destroyRef: DestroyRef): void {
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
}
