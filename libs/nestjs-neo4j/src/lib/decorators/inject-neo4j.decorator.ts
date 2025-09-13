import { Inject } from '@nestjs/common';
import { NEO4J_DRIVER, NEO4J_SESSION, NEO4J_CONNECTION } from '../constants';
import {
  getNeo4jConfig,
  getNeo4jConfigWithDefaults,
} from '../utils/neo4j-config.accessor';

export const InjectNeo4j = (): ParameterDecorator => Inject(NEO4J_DRIVER);
export const InjectNeo4jDriver = (): ParameterDecorator => Inject(NEO4J_DRIVER);
export const InjectNeo4jSession = (database?: string): ParameterDecorator => {
  // Use provided database or fall back to stored config
  const effectiveDatabase = database || getNeo4jConfig().database;
  return effectiveDatabase
    ? Inject(`NEO4J_SESSION_${effectiveDatabase}`)
    : Inject(NEO4J_SESSION);
};
export const InjectNeo4jConnection = (): ParameterDecorator =>
  Inject(NEO4J_CONNECTION);
