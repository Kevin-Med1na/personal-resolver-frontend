export type DocumentType = 'CEDULA' | 'NIT';

export interface PersonBasicData {
  documentNumber: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  age: number | null;
  municipalityCode: string | null;
}

export interface CompanyBasicData {
  documentNumber: string;
  companyName: string;
  legalRepresentative: string | null;
  businessType: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
}

export interface DocumentQueryResponse {
  documentType: DocumentType;
  documentNumber: string;
  source: string;
  status: string;
  entityType: 'PERSON' | 'COMPANY';
  person: PersonBasicData | null;
  company: CompanyBasicData | null;
  message: string;
  consultCount?: number | null;
  /** Primera vez que se consultó el documento. ISO-8601 con zona. */
  firstConsultDate?: string | null;
  /**
   * Consulta inmediatamente anterior a la actual, o null si esta es la primera.
   * No incluye la consulta en curso: informar "consultado ahora mismo" no le
   * aporta nada a quien acaba de consultar.
   */
  previousConsultDate?: string | null;
}

export interface ApiError {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
}
