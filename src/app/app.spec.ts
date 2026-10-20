import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DATA_CONTROLLER } from './legal';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  /** Renderiza el marco completo en una ruta. */
  async function render(url: string) {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should name the data sources only in the footer, on every page', async () => {
    for (const url of ['/', '/privacidad', '/terminos', '/no-existe']) {
      const page = await render(url);
      const footer = page.querySelector('footer');
      const outside = page.cloneNode(true) as HTMLElement;
      outside.querySelector('footer')?.remove();

      expect(footer?.textContent, url).toContain('RUI (DNP)');
      expect(footer?.textContent, url).toContain('RUES');
      expect(outside.textContent, url).not.toMatch(/RUI|RUES|DNP|Ventanilla/);
    }
  });

  it('should publish the privacy policy with the real contact', async () => {
    const page = await render('/privacidad');

    expect(page.querySelector('h1')?.textContent).toContain('Política de privacidad');
    expect(page.textContent).toContain(DATA_CONTROLLER.name);
    expect(page.querySelector(`a[href="mailto:${DATA_CONTROLLER.email}"]`)).not.toBeNull();
  });

  it('should link the legal pages from the footer', async () => {
    const footer = (await render('/')).querySelector('footer');

    expect(footer?.querySelector('a[href="/privacidad"]')).not.toBeNull();
    expect(footer?.querySelector('a[href="/terminos"]')).not.toBeNull();
  });

  it('should keep a missing page out of search engines', async () => {
    const page = await render('/no-existe');

    expect(page.querySelector('h1')?.textContent).toContain('Esta página no existe.');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');

    await render('/');
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
