import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface Document {
  id: string;
  title?: string;
  content: string;
  metadata?: {
    type?: string;
    author?: string;
    createdAt?: string;
    [key: string]: any;
  };
  similarity?: number;
  createdAt: Date;
}

export interface CreateDocumentDto {
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SearchDocumentsDto {
  query: string;
  limit?: number;
  minSimilarity?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentsService {
  private readonly apiUrl = '/api/documents';

  constructor(private http: HttpClient) {}

  getDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Failed to fetch documents:', error);
        return of([]);
      })
    );
  }

  getDocument(id: string): Observable<Document | null> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Failed to fetch document ${id}:`, error);
        return of(null);
      })
    );
  }

  createDocument(document: CreateDocumentDto): Observable<Document | null> {
    return this.http.post<Document>(this.apiUrl, document).pipe(
      catchError((error) => {
        console.error('Failed to create document:', error);
        return of(null);
      })
    );
  }

  searchDocuments(searchParams: SearchDocumentsDto): Observable<Document[]> {
    return this.http
      .post<Document[]>(`${this.apiUrl}/search`, searchParams)
      .pipe(
        catchError((error) => {
          console.error('Failed to search documents:', error);
          return of([]);
        })
      );
  }

  deleteDocument(id: string): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Failed to delete document ${id}:`, error);
        return of(false);
      })
    );
  }

  getSimilarDocuments(id: string, limit = 5): Observable<Document[]> {
    return this.http
      .get<Document[]>(`${this.apiUrl}/${id}/similar?limit=${limit}`)
      .pipe(
        catchError((error) => {
          console.error(`Failed to get similar documents for ${id}:`, error);
          return of([]);
        })
      );
  }
}
