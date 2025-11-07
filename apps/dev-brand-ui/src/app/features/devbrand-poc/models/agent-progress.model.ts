/**
 * AgentProgress Model
 *
 * Represents individual agent execution state within LangGraph workflow.
 * Evidence: implementation-plan.md:587-622 (State Type Definitions)
 * Evidence: research-summary.md:148-302 (3-Agent workflow analysis)
 *
 * @remarks
 * - Tracks progress for each of the 3 DevBrand agents:
 *   1. github-code-analyzer: Analyzes repositories and extracts achievements
 *   2. personal-brand-strategist: Develops brand strategy and positioning
 *   3. content-creator: Generates platform-specific content
 * - Used by ProgressVisualizationComponent for real-time agent status display
 *
 * @public
 */

/**
 * AgentStatus Type
 *
 * Discriminated union representing all possible agent states.
 *
 * @remarks
 * - idle: Agent not yet started (initial state)
 * - thinking: Agent processing LLM request (generating content)
 * - executing: Agent running tools or performing operations
 * - waiting: Agent waiting for external dependency (HITL, API response)
 * - completed: Agent finished successfully
 * - error: Agent encountered error during execution
 *
 * @public
 */
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'completed'
  | 'error';

/**
 * AgentProgress Interface
 *
 * Complete state representation for individual agent tracking.
 *
 * @remarks
 * - agentId: Unique identifier (github-code-analyzer, personal-brand-strategist, content-creator)
 * - agentName: Human-readable display name
 * - status: Current agent state (discriminator for UI rendering)
 * - progress: Percentage completion (0-100) for granular progress tracking
 * - currentAction: Current operation description (e.g., "Analyzing package.json", "Generating LinkedIn post")
 * - lastUpdate: Timestamp of last status/progress change (for staleness detection)
 *
 * @example
 * ```typescript
 * // GitHub analyzer in execution
 * const analyzerProgress: AgentProgress = {
 *   agentId: 'github-code-analyzer',
 *   agentName: 'GitHub Code Analyzer',
 *   status: 'executing',
 *   progress: 45,
 *   currentAction: 'Extracting achievements from commit history',
 *   lastUpdate: new Date('2025-10-28T16:02:30Z')
 * };
 *
 * // Brand strategist thinking (LLM generation)
 * const strategistProgress: AgentProgress = {
 *   agentId: 'personal-brand-strategist',
 *   agentName: 'Personal Brand Strategist',
 *   status: 'thinking',
 *   progress: 80,
 *   currentAction: 'Generating brand positioning statement',
 *   lastUpdate: new Date('2025-10-28T16:05:00Z')
 * };
 *
 * // Content creator completed
 * const creatorProgress: AgentProgress = {
 *   agentId: 'content-creator',
 *   agentName: 'Content Creator',
 *   status: 'completed',
 *   progress: 100,
 *   currentAction: null,
 *   lastUpdate: new Date('2025-10-28T16:08:00Z')
 * };
 * ```
 *
 * @public
 */
export interface AgentProgress {
  /**
   * Unique agent identifier
   *
   * @remarks
   * - Must be one of: 'github-code-analyzer', 'personal-brand-strategist', 'content-creator'
   * - Used for agent-specific event filtering
   * - Maps to phase component in canonical node ID
   */
  agentId: string;

  /**
   * Human-readable agent name
   *
   * @remarks
   * - Display name for UI rendering
   * - Example: "GitHub Code Analyzer", "Personal Brand Strategist"
   */
  agentName: string;

  /**
   * Current agent status
   *
   * @remarks
   * - Use for UI state discrimination (spinners, badges, colors)
   * - Transitions: idle → thinking/executing/waiting → completed/error
   * - 'thinking': LLM generating response (token streaming)
   * - 'executing': Running tools (GitHub API calls, data processing)
   * - 'waiting': Paused for HITL or external dependency
   */
  status: AgentStatus;

  /**
   * Progress percentage (0-100)
   *
   * @remarks
   * - 0: Agent not started
   * - 1-99: In progress (partial completion)
   * - 100: Completed successfully
   * - Used for granular progress bars within agent cards
   * - Updated based on internal agent checkpoints or tool completions
   */
  progress: number;

  /**
   * Current action description
   *
   * @remarks
   * - null if agent idle or completed
   * - Human-readable description of current operation
   * - Examples:
   *   - "Fetching GitHub repository data"
   *   - "Analyzing technology stack from package.json"
   *   - "Generating LinkedIn post content"
   *   - "Waiting for user approval"
   * - Display in UI for transparency (user knows what agent is doing)
   */
  currentAction: string | null;

  /**
   * Timestamp of last status/progress update
   *
   * @remarks
   * - Updated on every status change or progress increment
   * - Used for:
   *   - Staleness detection (agent stuck/timeout)
   *   - Timeline visualization
   *   - Performance monitoring (time per agent)
   * - Compare with current time to detect hung agents
   */
  lastUpdate: Date;
}
