import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    chromadb: ServiceHealth;
    neo4j: ServiceHealth;
    redis: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly apiUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  getHealthStatus(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.apiUrl}/health`).pipe(
      catchError((error) => {
        console.error('Health check failed:', error);
        return of({
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          uptime: 0,
          version: 'unknown',
          services: {
            chromadb: { status: 'unknown' as const },
            neo4j: { status: 'unknown' as const },
            redis: { status: 'unknown' as const },
          },
        });
      })
    );
  }

  getDetailedHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health/detailed`).pipe(
      catchError((error) => {
        console.error('Detailed health check failed:', error);
        return of({
          application: {
            status: 'unhealthy',
            services: {},
          },
          system: {
            memory: {},
            uptime: 0,
            nodeVersion: 'unknown',
            platform: 'unknown',
          },
        });
      })
    );
  }
}
