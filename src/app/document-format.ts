import { DocumentType } from './models/document.models';

/** "12345678" → "12.345.678". Si no son solo dígitos, lo deja igual. */
export function formatDocumentNumber(value: string): string {
  return /^\d+$/.test(value) ? value.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : value;
}

/** "CC 12.345.678" o "NIT 891.408.584", para encabezados y mensajes. */
export function documentLabel(type: DocumentType, value: string): string {
  return `${type === 'CEDULA' ? 'CC' : 'NIT'} ${formatDocumentNumber(value)}`;
}
