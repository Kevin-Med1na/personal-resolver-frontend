import { documentLabel, formatDocumentNumber } from './document-format';

describe('document format', () => {
  it('should group digits by thousands with dots', () => {
    expect(formatDocumentNumber('12345678')).toBe('12.345.678');
    expect(formatDocumentNumber('1234567890')).toBe('1.234.567.890');
    expect(formatDocumentNumber('123456')).toBe('123.456');
    expect(formatDocumentNumber('123')).toBe('123');
  });

  it('should leave anything that is not only digits untouched', () => {
    expect(formatDocumentNumber('891408584-5')).toBe('891408584-5');
    expect(formatDocumentNumber('')).toBe('');
  });

  it('should prefix the document type', () => {
    expect(documentLabel('CEDULA', '12345678')).toBe('CC 12.345.678');
    expect(documentLabel('NIT', '891408584')).toBe('NIT 891.408.584');
  });
});
