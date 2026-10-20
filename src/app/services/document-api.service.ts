import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import {
  DocumentQueryResponse,
  DocumentType,
} from '../models/document.models';

interface DocumentQueryRequest {
  documentType: DocumentType;
  documentNumber: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/lookup';

  lookup(documentType: DocumentType, documentNumber: string): Observable<DocumentQueryResponse> {
    const body: DocumentQueryRequest = {
      documentType,
      documentNumber,
    };

    return this.http.post<DocumentQueryResponse>(this.endpoint, body);
  }

  /**
   * Responde sin consultar ninguna fuente. Si el equipo que ejecuta el backend
   * está apagado, Vercel no lo alcanza y la petición falla.
   */
  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>('/api/health').pipe(timeout(8000));
  }
}
