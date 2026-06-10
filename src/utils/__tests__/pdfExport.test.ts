jest.mock('expo-print');
jest.mock('expo-sharing');

import { escapeHtml } from '../pdfExport';

describe('escapeHtml', () => {
  it('échappe le &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('échappe le <', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('échappe le >', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('échappe les guillemets doubles', () => {
    expect(escapeHtml('"texte"')).toBe('&quot;texte&quot;');
  });

  it('chaîne sans caractère spécial reste inchangée', () => {
    expect(escapeHtml('Voyage Rome 2026')).toBe('Voyage Rome 2026');
  });

  it('chaîne vide reste vide', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('échappe plusieurs caractères dans une même chaîne', () => {
    expect(escapeHtml('<b>a & b > c "d"</b>')).toBe(
      '&lt;b&gt;a &amp; b &gt; c &quot;d&quot;&lt;/b&gt;'
    );
  });

  it('échappe plusieurs & consécutifs', () => {
    expect(escapeHtml('a && b')).toBe('a &amp;&amp; b');
  });

  it('échappe un commentaire HTML', () => {
    expect(escapeHtml('<!-- commentaire -->')).toBe('&lt;!-- commentaire --&gt;');
  });

  it('échappe une balise script (cas injection XSS)', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });
});
