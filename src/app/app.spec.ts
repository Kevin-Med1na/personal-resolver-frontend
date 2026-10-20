import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { DocumentQueryResponse } from './models/document.models';

const PERSON_RESPONSE: DocumentQueryResponse = {
  documentType: 'CEDULA',
  documentNumber: '12345678',
  source: 'RUI',
  status: 'FOUND',
  entityType: 'PERSON',
  person: {
    documentNumber: '12345678',
    fullName: 'LAURA SOFIA GOMEZ TORRES',
    firstName: 'LAURA SOFIA',
    lastName: 'GOMEZ TORRES',
    gender: 'Femenino',
    state: 'BOLÍVAR',
    city: 'TURBACO',
    address: null,
    age: 43,
    ruiGroup: 'C',
    ruiLevel: 'C01',
    incomeGroup: 'Solo ingreso estimado',
    municipalityCode: '13836',
  },
  company: null,
  message: 'Consulta realizada con éxito',
  consultCount: 1,
  firstConsultDate: '2026-09-15T21:08:40.867516Z',
  previousConsultDate: null,
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with cédula selected', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.documentType).toBe('CEDULA');
  });

  it('should normalize a NIT before sending the request', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.selectType('NIT');
    app.documentNumber = '891.408.584-5';

    expect((app as any).normalizeDocument(app.documentNumber)).toBe('891408584');
  });

  it('should label singular and plural consultation counts', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.result.set(PERSON_RESPONSE);

    expect(app.consultCountLabel()).toBe('1 consulta');

    app.result.update((result) => result ? { ...result, consultCount: 2 } : result);

    expect(app.consultCountLabel()).toBe('2 consultas');
  });

  describe('availability and lookups', () => {
    const IN_HOURS = new Date(Date.UTC(2026, 9, 20, 19, 45));   // 14:45 en UTC−5
    const OUT_OF_HOURS = new Date(Date.UTC(2026, 9, 21, 2, 0)); // 21:00 en UTC−5
    const MOCK_403 = { status: 403, statusText: 'Forbidden' };

    /** Deja correr las promesas pendientes entre respuesta y respuesta. */
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    function setup(now: Date, status: 'checking' | 'online' | 'offline') {
      const app = TestBed.createComponent(App).componentInstance;
      const http = TestBed.inject(HttpTestingController);
      app.now.set(now);
      app.apiStatus.set(status);
      app.documentNumber = '1234567890';
      return { app, http };
    }

    it('should never contradict itself: header and hours card share one state', () => {
      const { app } = setup(IN_HOURS, 'offline');

      expect(app.availability()).toBe('unavailable');
      expect(app.availabilityLabel()).toBe('No disponible');
      expect(app.availabilityDetail()).toBe('El servidor no responde');

      app.apiStatus.set('online');
      expect(app.availabilityLabel()).toBe('Disponible');
      expect(app.availabilityDetail()).toBe('Cierra en 2 h 15 min');

      app.now.set(OUT_OF_HOURS);
      app.apiStatus.set('offline');
      expect(app.availabilityLabel()).toBe('Fuera de horario');
      expect(app.availabilityDetail()).toBe('Abre en 10 h');
    });

    it('should report the service as unavailable when the answer does not come from the backend', async () => {
      // La página aún dice "Disponible", pero el contenedor ya se apagó y en
      // el puerto responde otro proceso.
      const { app, http } = setup(IN_HOURS, 'online');

      const done = app.submit();
      http.expectOne('/api/lookup').flush({ message: 'mock de auditoria: solo lectura' }, MOCK_403);
      await settle();
      http.expectOne('/api/health').flush({ message: 'mock de auditoria: solo lectura' }, MOCK_403);
      await done;

      expect(app.error()).toEqual({
        kicker: 'SERVICIO NO DISPONIBLE',
        message: 'El servicio no está disponible en este momento.',
        hint: 'Intenta nuevamente en unos minutos.',
        kind: 'unavailable',
      });
      expect(app.availabilityLabel()).toBe('No disponible');
    });

    it('should not even query while the backend is known to be down', async () => {
      const { app, http } = setup(OUT_OF_HOURS, 'offline');

      const done = app.submit();
      http.expectOne('/api/health').flush('ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR', {
        status: 502,
        statusText: 'Bad Gateway',
      });
      await done;

      http.expectNone('/api/lookup');
      expect(app.error()?.kind).toBe('closed');
      expect(app.error()?.kicker).toBe('FUERA DE HORARIO');
      expect(app.error()?.hint).toBe('Funciona de 7:00 a 17:00 (UTC−5). Abre en 10 h.');
    });

    it('should show the not-found answer once the backend confirms it is up', async () => {
      const { app, http } = setup(IN_HOURS, 'online');

      const done = app.submit();
      http.expectOne('/api/lookup').flush(
        { status: 404, message: 'No se encontró información para la cédula consultada.' },
        { status: 404, statusText: 'Not Found' },
      );
      await settle();
      http.expectOne('/api/health').flush({ status: 'UP' });
      await done;

      expect(app.error()?.kicker).toBe('SIN RESULTADOS');
      expect(app.error()?.kind).toBe('notFound');
      expect(app.availabilityLabel()).toBe('Disponible');
    });

    it('should never show the data sources in an error', async () => {
      const { app, http } = setup(IN_HOURS, 'online');

      const done = app.submit();
      http.expectOne('/api/lookup').flush(
        { status: 503, message: 'RUI no resolvió la consulta dentro del tiempo disponible.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await settle();
      http.expectOne('/api/health').flush({ status: 'UP' });
      await done;

      const shown = JSON.stringify(app.error());
      expect(shown).not.toMatch(/RUI|RUES|DNP|Ventanilla/i);
      expect(app.error()?.message).toBe('No fue posible obtener la información en este momento.');
    });

    it('should follow the real backend status from the health check', async () => {
      const { app, http } = setup(IN_HOURS, 'checking');

      const up = app.verifyBackend();
      http.expectOne('/api/health').flush({ status: 'UP' });
      expect(await up).toBe(true);
      expect(app.apiStatus()).toBe('online');

      const down = app.verifyBackend();
      http.expectOne('/api/health').flush('ROUTER_EXTERNAL_TARGET_CONNECTION_ERROR', {
        status: 502,
        statusText: 'Bad Gateway',
      });
      expect(await down).toBe(false);
      expect(app.apiStatus()).toBe('offline');
    });

    it('should give each outcome its own panel state', async () => {
      const { app, http } = setup(IN_HOURS, 'online');
      expect(app.panelState()).toBe('idle');

      const done = app.submit();
      expect(app.panelState()).toBe('loading');
      expect(app.queryLabel()).toBe('CC 1.234.567.890');

      http.expectOne('/api/lookup').flush(
        { status: 404, message: 'No se encontró información para la cédula consultada.' },
        { status: 404, statusText: 'Not Found' },
      );
      await settle();
      http.expectOne('/api/health').flush({ status: 'UP' });
      await done;
      expect(app.panelState()).toBe('notFound');

      const retry = app.submit();
      http.expectOne('/api/lookup').flush({ status: 502 }, { status: 502, statusText: 'Bad Gateway' });
      await settle();
      http.expectOne('/api/health').flush({ status: 'UP' });
      await retry;
      expect(app.panelState()).toBe('failed');

      const found = app.submit();
      http.expectOne('/api/lookup').flush(PERSON_RESPONSE);
      await found;
      expect(app.panelState()).toBe('person');
    });

    it('should keep validation next to the field, not in the result panel', async () => {
      const { app, http } = setup(IN_HOURS, 'online');
      app.documentNumber = '12-34';

      await app.submit();

      http.expectNone('/api/lookup');
      expect(app.validationError()?.message).toBe('Ingresa una cédula válida de 6 a 12 dígitos.');
      expect(app.panelState()).toBe('idle');

      app.clearValidation();
      expect(app.error()).toBeNull();
    });

    it('should show a rejected request next to the field as well', async () => {
      const { app, http } = setup(IN_HOURS, 'online');

      const done = app.submit();
      http.expectOne('/api/lookup').flush({ status: 400 }, { status: 400, statusText: 'Bad Request' });
      await settle();
      http.expectOne('/api/health').flush({ status: 'UP' });
      await done;

      expect(app.validationError()?.message).toBe('La solicitud no es válida.');
      expect(app.panelState()).toBe('idle');
    });
  });

  describe('rendering', () => {
    function render(response: DocumentQueryResponse | null = null) {
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance.result.set(response);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('should name the data sources only in the footer', () => {
      const page = render();
      const footer = page.querySelector('footer');
      const outside = page.cloneNode(true) as HTMLElement;
      outside.querySelector('footer')?.remove();

      expect(footer?.textContent).toContain('RUI (DNP)');
      expect(footer?.textContent).toContain('RUES');
      expect(outside.textContent).not.toMatch(/RUI|RUES|DNP|Ventanilla/);
    });

    it('should render a person with the real fields and the consultation history', () => {
      const page = render({
        ...PERSON_RESPONSE,
        consultCount: 4,
        previousConsultDate: '2026-10-19T14:02:11Z',
      });
      const panel = page.querySelector<HTMLElement>('.panel');

      expect(panel?.dataset['state']).toBe('person');
      expect(panel?.textContent).toContain('CC 12.345.678');
      expect(panel?.querySelector('h2')?.textContent).toContain('LAURA SOFIA GOMEZ TORRES');
      expect(panel?.textContent).toContain('43 años');
      expect(panel?.textContent).toContain('TURBACO');
      expect(panel?.textContent).toContain('4 consultas');
      expect(panel?.textContent).toContain('Consulta anterior');
      // Lo que llega pero no se muestra.
      expect(panel?.textContent).not.toContain('Solo ingreso estimado');
    });

    it('should render a company with its NIT formatted', () => {
      const page = render({
        ...PERSON_RESPONSE,
        documentType: 'NIT',
        documentNumber: '891408584',
        source: 'RUES',
        entityType: 'COMPANY',
        person: null,
        company: {
          documentNumber: '891408584',
          companyName: 'COMERCIALIZADORA EJEMPLO S.A.S.',
          legalRepresentative: null,
          businessType: 'SOCIEDAD POR ACCIONES SIMPLIFICADA',
          state: 'ACTIVA',
          city: 'BOGOTÁ',
          address: null,
        },
      });
      const panel = page.querySelector<HTMLElement>('.panel');

      expect(panel?.dataset['state']).toBe('company');
      expect(panel?.textContent).toContain('NIT 891.408.584');
      expect(panel?.textContent).toContain('COMERCIALIZADORA EJEMPLO S.A.S.');
      expect(panel?.textContent).toContain('ACTIVA');
    });
  });
});
