import {
  SERVICE_HOURS_LABEL,
  SERVICE_OFFSET_LABEL,
  formatDuration,
  formatOffset,
  localServiceHours,
  serviceWindow,
} from './service-hours';

/** Instante dado en UTC−5: 7:00 UTC−5 son las 12:00 UTC. */
function atServiceTime(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 9, 20, hour + 5, minute));
}

describe('service hours', () => {
  it('should be open from 7:00 up to, but not including, 17:00 UTC−5', () => {
    expect(serviceWindow(atServiceTime(6, 59)).open).toBe(false);
    expect(serviceWindow(atServiceTime(7, 0)).open).toBe(true);
    expect(serviceWindow(atServiceTime(16, 59)).open).toBe(true);
    expect(serviceWindow(atServiceTime(17, 0)).open).toBe(false);
  });

  it('should count the minutes until it closes or opens again', () => {
    expect(serviceWindow(atServiceTime(14, 45)).minutesToChange).toBe(2 * 60 + 15);
    expect(serviceWindow(atServiceTime(17, 0)).minutesToChange).toBe(14 * 60);
    expect(serviceWindow(atServiceTime(23, 30)).minutesToChange).toBe(7 * 60 + 30);
  });

  it('should not depend on the time zone of the browser', () => {
    // 2:00 UTC del 21 son las 21:00 UTC−5 del 20: fuera de horario.
    expect(serviceWindow(new Date(Date.UTC(2026, 9, 21, 2, 0))).open).toBe(false);
  });

  it('should translate the hours to the visitor time zone', () => {
    expect(localServiceHours(atServiceTime(9), 'Europe/Madrid'))
      .toEqual({ range: '14:00 – 0:00', offset: 'UTC+2' });
    expect(localServiceHours(atServiceTime(9), 'UTC'))
      .toEqual({ range: '12:00 – 22:00', offset: 'UTC' });
  });

  it('should not translate anything for visitors already in UTC−5', () => {
    expect(localServiceHours(atServiceTime(9), 'America/Bogota')).toBeNull();
  });

  it('should format labels without naming any country', () => {
    expect(SERVICE_HOURS_LABEL).toBe('7:00 – 17:00');
    expect(SERVICE_OFFSET_LABEL).toBe('UTC−5');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(135)).toBe('2 h 15 min');
  });
});
