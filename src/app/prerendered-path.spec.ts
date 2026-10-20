import { normalizePath, servedPageMatchesRoute } from './prerendered-path';

describe('prerendered path', () => {
  it('should normalize paths', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/privacidad/')).toBe('/privacidad');
    expect(normalizePath('/privacidad?x=1#y')).toBe('/privacidad');
    expect(normalizePath('/#consulta')).toBe('/');
  });

  /** Un documento con la marca que deja el renderizado en el servidor. */
  function served(renderedPath: string | null, pathname: string): Document {
    const doc = document.implementation.createHTMLDocument();
    if (renderedPath !== null) {
      const meta = doc.createElement('meta');
      meta.name = 'prerendered-path';
      meta.content = renderedPath;
      doc.head.append(meta);
    }
    // jsdom no deja cambiar document.location: basta con lo que lee la función.
    return {
      querySelector: (selector: string) => doc.querySelector(selector),
      location: { pathname },
    } as unknown as Document;
  }

  it('should hydrate only the page that was rendered for this route', () => {
    expect(servedPageMatchesRoute(served('/', '/'))).toBe(true);
    expect(servedPageMatchesRoute(served('/privacidad', '/privacidad/'))).toBe(true);

    // Vercel entregó la portada (o la página de respaldo) para otra ruta.
    expect(servedPageMatchesRoute(served('/', '/no-existe'))).toBe(false);
    expect(servedPageMatchesRoute(served(null, '/privacidad'))).toBe(false);
  });
});
