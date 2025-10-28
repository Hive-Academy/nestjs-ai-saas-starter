/**
 * ExecuteDevBrandRequest Model
 *
 * Request payload for initiating a DevBrand workflow execution.
 * Evidence: apps/dev-brand-api/src/app/controllers/devbrand.controller.ts:50-66
 *
 * @remarks
 * - Used by DevBrandApiService.executeWorkflow()
 * - Posted to POST /api/devbrand/execute
 * - Backend validates githubUsername and fetches repository data
 * - userId is optional and defaults to "anonymous" on backend
 *
 * @public
 */
export interface ExecuteDevBrandRequest {
  /**
   * GitHub username for repository analysis
   *
   * @remarks
   * - REQUIRED field
   * - Must be valid GitHub username
   * - Backend fetches all public repositories for this user
   * - Backend analyzes repository metadata, languages, stars, etc.
   *
   * @example "octocat"
   */
  githubUsername: string;

  /**
   * Optional user identifier for tracking and personalization
   *
   * @remarks
   * - OPTIONAL field
   * - Defaults to "anonymous" on backend if not provided
   * - Used for checkpoint persistence and result tracking
   * - Can be used for multi-user scenarios in production
   *
   * @example "user-12345"
   * @default "anonymous"
   */
  userId?: string;
}
