/**
 * Horario de servicio: el rango en que el backend está disponible. Se
 * expresa con desplazamiento fijo respecto a UTC (UTC−5, sin
 * horario de verano) para que se entienda desde cualquier zona horaria.
 */
export const SERVICE_UTC_OFFSET_MINUTES = -5 * 60;
export const SERVICE_START_HOUR = 7;
export const SERVICE_END_HOUR = 17;

const MINUTES_PER_DAY = 24 * 60;

export interface ServiceWindow {
  open: boolean;
  /** Minutos hasta el próximo cambio: el cierre si está abierto, la apertura si no. */
  minutesToChange: number;
}

export function serviceWindow(now: Date): ServiceWindow {
  const minuteOfDay = mod(
    Math.floor(now.getTime() / 60_000) + SERVICE_UTC_OFFSET_MINUTES,
    MINUTES_PER_DAY,
  );
  const start = SERVICE_START_HOUR * 60;
  const end = SERVICE_END_HOUR * 60;

  if (minuteOfDay >= start && minuteOfDay < end) {
    return { open: true, minutesToChange: end - minuteOfDay };
  }

  return { open: false, minutesToChange: mod(start - minuteOfDay, MINUTES_PER_DAY) };
}

/** "7:00 – 17:00", en la zona del servicio. */
export const SERVICE_HOURS_LABEL = `${SERVICE_START_HOUR}:00 – ${SERVICE_END_HOUR}:00`;

/** "UTC−5". */
export const SERVICE_OFFSET_LABEL = formatOffset(SERVICE_UTC_OFFSET_MINUTES);

/**
 * El mismo horario en la zona horaria de quien consulta, o `null` si ya está
 * en UTC−5 y no hace falta convertir nada.
 */
export function localServiceHours(
  now: Date,
  timeZone?: string,
): { range: string; offset: string } | null {
  const offset = utcOffsetMinutes(now, timeZone);

  if (offset === SERVICE_UTC_OFFSET_MINUTES) {
    return null;
  }

  const midnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const toUtc = (hour: number) =>
    new Date(midnightUtc + (hour * 60 - SERVICE_UTC_OFFSET_MINUTES) * 60_000);

  const format = new Intl.DateTimeFormat('es', {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  });

  return {
    range: `${format.format(toUtc(SERVICE_START_HOUR))} – ${format.format(toUtc(SERVICE_END_HOUR))}`,
    offset: formatOffset(offset),
  };
}

/** "45 min", "2 h", "2 h 15 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) {
    return 'UTC';
  }

  const sign = minutes < 0 ? '−' : '+';
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;

  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`;
}

function utcOffsetMinutes(date: Date, timeZone?: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';

  const match = /GMT(?:([+\-−])(\d{1,2})(?::(\d{2}))?)?/.exec(name);

  if (!match || !match[1]) {
    return 0;
  }

  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === '+' ? minutes : -minutes;
}

function mod(value: number, base: number): number {
  return ((value % base) + base) % base;
}
