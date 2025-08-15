import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentsService } from '../../../shared/services/documents.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="documents-page">
      <div class="page-header">
        <h1>Document Management</h1>
        <p>Manage your documents stored in ChromaDB vector database</p>
        <div class="page-actions">
          <a routerLink="/documents/upload" class="btn btn-primary">
            📤 Upload Document
          </a>
          <a routerLink="/documents/search" class="btn btn-outline">
            🔍 Semantic Search
          </a>
        </div>
      </div>

      <div class="documents-stats">
        <div class="stat-card">
          <h3>Total Documents</h3>
          <p class="stat-number">{{ (documents$ | async)?.length || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>Collections</h3>
          <p class="stat-number">1</p>
          <p class="stat-subtitle">demo-documents</p>
        </div>
        <div class="stat-card">
          <h3>Storage Used</h3>
          <p class="stat-number">~2.3MB</p>
          <p class="stat-subtitle">Vector embeddings</p>
        </div>
      </div>

      <div class="documents-list">
        <h2>Recent Documents</h2>
        <div class="loading" *ngIf="loading">Loading documents...</div>

        <div class="documents-grid" *ngIf="documents$ | async as documents">
          <div
            class="document-card"
            *ngFor="let doc of documents"
            [routerLink]="['/documents', doc.id]"
          >
            <div class="document-header">
              <h3>{{ doc.title || 'Untitled Document' }}</h3>
              <span class="document-date">{{
                doc.createdAt | date : 'short'
              }}</span>
            </div>
            <p class="document-content">
              {{ doc.content | slice : 0 : 150 }}...
            </p>
            <div class="document-metadata">
              <span class="metadata-item"
                >📊 Similarity Score: {{ doc.similarity || 'N/A' }}</span
              >
              <span class="metadata-item"
                >🏷️ Type: {{ doc.metadata?.type || 'text' }}</span
              >
            </div>
          </div>

          <div class="empty-state" *ngIf="documents.length === 0">
            <h3>No documents yet</h3>
            <p>
              Upload your first document to get started with semantic search
            </p>
            <a routerLink="/documents/upload" class="btn btn-primary"
              >Upload Document</a
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .documents-page {
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 2rem;
        text-align: center;
      }

      .page-header h1 {
        font-size: 2rem;
        color: #1f2937;
      }

      .page-header p {
        color: #6b7280;
        font-size: 1.1rem;
      }

      .page-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }

      .documents-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .stat-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        text-align: center;
      }

      .stat-card h3 {
        font-size: 0.9rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }

      .stat-number {
        font-size: 2rem;
        font-weight: bold;
        color: #2563eb;
        margin: 0;
      }

      .stat-subtitle {
        font-size: 0.8rem;
        color: #9ca3af;
        margin: 0.25rem 0 0 0;
      }

      .documents-list h2 {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
        color: #1f2937;
      }

      .documents-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
      }

      .document-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: all 0.3s;
        text-decoration: none;
        color: inherit;
      }

      .document-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      .document-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }

      .document-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #1f2937;
        font-weight: 600;
      }

      .document-date {
        font-size: 0.8rem;
        color: #6b7280;
        white-space: nowrap;
      }

      .document-content {
        color: #4b5563;
        line-height: 1.5;
        margin-bottom: 1rem;
      }

      .document-metadata {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .metadata-item {
        font-size: 0.8rem;
        color: #6b7280;
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .empty-state h3 {
        color: #6b7280;
        margin-bottom: 1rem;
      }

      .empty-state p {
        color: #9ca3af;
        margin-bottom: 1.5rem;
      }
    `,
  ],
})
export class DocumentsListComponent implements OnInit {
  documents$!: Observable<any[]>;
  loading = true;

  constructor(private readonly documentsService: DocumentsService) {}

  ngOnInit() {
    this.documents$ = this.documentsService.getDocuments();
    this.loading = false;
  }
}
