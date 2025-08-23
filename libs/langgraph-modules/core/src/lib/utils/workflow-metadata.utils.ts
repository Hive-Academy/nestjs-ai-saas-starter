import 'reflect-metadata';

// Workflow metadata keys
export const WORKFLOW_METADATA_KEY = 'workflow:metadata';
export const WORKFLOW_NODES_KEY = 'workflow:nodes';
export const WORKFLOW_EDGES_KEY = 'workflow:edges';
export const WORKFLOW_TOOLS_KEY = 'workflow:tools';

/**
 * Check if a class is decorated with @Workflow
 */
export function isWorkflow(target: any): boolean {
  return Reflect.hasMetadata(WORKFLOW_METADATA_KEY, target);
}