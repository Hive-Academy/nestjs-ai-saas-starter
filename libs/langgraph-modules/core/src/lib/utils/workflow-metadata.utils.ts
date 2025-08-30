import 'reflect-metadata';
import { WORKFLOW_METADATA_KEY } from '../constants';

/**
 * Check if a class is decorated with @Workflow
 */
export function isWorkflow(target: any): boolean {
  return Reflect.hasMetadata(WORKFLOW_METADATA_KEY, target);
}
