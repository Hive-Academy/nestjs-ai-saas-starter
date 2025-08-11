import { Driver, Session, Transaction, Result } from 'neo4j-driver';

export interface Neo4jConnection {
  driver: Driver;
  isConnected(): Promise<boolean>;
  close(): Promise<void>;
}

export interface SessionOptions {
  database?: string;
  defaultAccessMode?: 'READ' | 'WRITE';
  bookmarks?: string[];
  fetchSize?: number;
}

export interface TransactionOptions {
  metadata?: Record<string, any>;
  timeout?: number;
}