import { Inject } from '@nestjs/common';
import { NEO4J_DRIVER, NEO4J_SESSION, NEO4J_CONNECTION } from '../constants';

export const InjectNeo4j = (): ParameterDecorator => Inject(NEO4J_DRIVER);
export const InjectNeo4jDriver = (): ParameterDecorator => Inject(NEO4J_DRIVER);
export const InjectNeo4jSession = (database?: string): ParameterDecorator => {
  return database ? Inject(`NEO4J_SESSION_${database}`) : Inject(NEO4J_SESSION);
};
export const InjectNeo4jConnection = (): ParameterDecorator => Inject(NEO4J_CONNECTION);