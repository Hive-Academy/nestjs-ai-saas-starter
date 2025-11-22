# Requirements Document - TASK_2025_050

## Introduction

This document specifies requirements for implementing a conversation history sidebar component that enables users to view, navigate, and manage their past conversations in both the Researcher Chat and DevBrand Supervisor workflows. This feature enhances user experience by providing quick access to conversation threads while maintaining workflow-specific context and authentication.

The implementation follows the established architecture pattern where the workflow-engine library exposes business logic services (WorkflowResumptionService), and applications implement REST endpoints with framework-specific UI integration.

**Business Value:**

- Users can resume previous research sessions without losing context
- Improved workflow continuity for multi-agent supervisor workflows
- Enhanced user productivity through conversation history management
- Clear separation of concerns between researcher and supervisor workflows

## Functional Requirements

### Requirement 1: Backend API Endpoints - Conversation History Retrieval

**User Story:** As a backend service, I want to expose conversation history endpoints for researcher and supervisor workflows, so that frontend applications can retrieve and display past conversations.

#### Acceptance Criteria

1. WHEN ResearchChatController receives GET request to `/research-chat/conversation/history/:threadId` THEN system SHALL retrieve sanitized conversation state using WorkflowResumptionService
2. WHEN ResearchChatController verifies thread ownership THEN system SHALL extract userId from JWT token and compare with thread metadata userId
3. WHEN thread ownership verification fails THEN system SHALL throw UnauthorizedException with user ID and thread ID details
4. WHEN conversation history is retrieved successfully THEN system SHALL return formatted response with messages array, metadata (query, reportTitle, researchStatus), nextSteps, and waitingForApproval status
5. WHEN DevBrandController receives GET request to `/devbrand/conversation/history/:threadId` THEN system SHALL retrieve supervisor workflow state with agent coordination details
6. WHEN DevBrandController formats supervisor response THEN system SHALL include agentCoordination object with currentAgent, nextAgent, agentHistory timeline, and pendingTasks array
7. WHEN conversation history request fails THEN system SHALL log error with thread ID and throw appropriate HTTP exception (UnauthorizedException or NotFoundException)

### Requirement 2: Backend API Endpoints - User Thread List

**User Story:** As a backend service, I want to expose endpoints that list all conversation threads for a specific user, so that the frontend can display a user's conversation history sidebar.

#### Acceptance Criteria

1. WHEN ResearchChatController receives GET request to `/research-chat/conversation/list` THEN system SHALL extract userId from JWT authentication
2. WHEN listing researcher threads THEN system SHALL query WorkflowResumptionService for all threads matching userId in metadata
3. WHEN retrieving thread list THEN system SHALL return last 10 conversations sorted by most recent timestamp first
4. WHEN formatting thread list response THEN system SHALL include threadId, preview (first user message or query), timestamp, status (active/completed/waiting), and unread indicator
5. WHEN DevBrandController receives GET request to `/devbrand/conversation/list` THEN system SHALL retrieve supervisor workflow threads for authenticated user
6. WHEN supervisor thread list is returned THEN system SHALL include currentAgent and workflowProgress in each thread summary
7. WHEN no threads exist for user THEN system SHALL return empty array with 200 OK status

### Requirement 3: Backend API Endpoints - New Conversation Creation

**User Story:** As a backend service, I want to expose endpoints that create new conversation threads with proper initialization, so that users can start fresh conversations from the sidebar.

#### Acceptance Criteria

1. WHEN ResearchChatController receives POST request to `/research-chat/conversation/new` THEN system SHALL generate unique thread ID using format `research-{timestamp}-{userId}`
2. WHEN creating new researcher thread THEN system SHALL initialize empty state with userId in metadata and return thread ID for frontend navigation
3. WHEN DevBrandController receives POST request to `/devbrand/conversation/new` THEN system SHALL create supervisor thread with format `devbrand-{timestamp}-{userId}`
4. WHEN new thread is created THEN system SHALL return response with threadId, status: 'created', and conversationUrl for navigation

### Requirement 4: Frontend UI Component - Conversation History Sidebar

**User Story:** As a user using the researcher chat interface, I want a sidebar showing my last 10 conversations with a "New Chat" button, so that I can quickly navigate between research sessions.

#### Acceptance Criteria

1. WHEN ConversationSidebarComponent renders THEN component SHALL display vertically scrollable list of last 10 conversations
2. WHEN conversation list item is displayed THEN item SHALL show preview text (truncated to 60 characters), timestamp in relative format (e.g., "2 hours ago"), and visual indicator for active/waiting/completed status
3. WHEN user clicks conversation list item THEN component SHALL emit conversationSelected event with threadId for parent component navigation
4. WHEN "New Chat" button is clicked THEN component SHALL call API endpoint to create new thread and emit newConversationCreated event with new threadId
5. WHEN sidebar is collapsed THEN component SHALL show icon-only view with tooltip on hover
6. WHEN no conversations exist THEN component SHALL display empty state message "No conversations yet. Start a new chat!"
7. WHEN conversation is waiting for approval THEN list item SHALL display orange indicator with "Waiting for approval" badge
8. WHEN sidebar loads THEN component SHALL call conversation list API endpoint with user authentication and handle loading/error states

### Requirement 5: Frontend UI Component - Sidebar Integration

**User Story:** As a user navigating the researcher chat interface, I want the conversation sidebar integrated into the main layout, so that I have seamless access to conversation history without disrupting my workflow.

#### Acceptance Criteria

1. WHEN ResearchChatComponent initializes THEN component SHALL include ConversationSidebarComponent in template with proper layout (sidebar left, chat area right)
2. WHEN conversationSelected event is emitted THEN ResearchChatComponent SHALL navigate to selected thread by calling history API endpoint and loading conversation state
3. WHEN newConversationCreated event is emitted THEN ResearchChatComponent SHALL clear current chat state and initialize new conversation with returned threadId
4. WHEN DevBrandPocPageComponent initializes THEN component SHALL include ConversationSidebarComponent configured for supervisor workflow
5. WHEN sidebar is integrated THEN layout SHALL use CSS Grid with responsive breakpoints (sidebar: 280px on desktop, drawer on mobile)
6. WHEN conversation is loaded from history THEN chat component SHALL populate messages array from conversation history response and display in message list
7. WHEN mobile viewport is detected (< 768px) THEN sidebar SHALL convert to slide-out drawer with hamburger menu toggle

### Requirement 6: Frontend Configuration - Hardcoded Test Users

**User Story:** As a developer testing the conversation history feature, I want two hardcoded test users in the frontend, so that I can demonstrate separate conversation histories for researcher and supervisor workflows.

#### Acceptance Criteria

1. WHEN application initializes THEN frontend SHALL define TEST_USERS constant with two user objects: `{ id: 'test-researcher-001', name: 'Test Researcher', role: 'researcher' }` and `{ id: 'test-supervisor-001', name: 'Test Supervisor', role: 'supervisor' }`
2. WHEN ResearchChatComponent initializes THEN component SHALL set userId to 'test-researcher-001' in component property
3. WHEN DevBrandPocPageComponent initializes THEN component SHALL set userId to 'test-supervisor-001' in component property
4. WHEN conversation list API is called THEN frontend SHALL send appropriate test user ID in JWT token or request headers
5. WHEN user profile switcher is implemented (future) THEN test users SHALL be replaceable with real authentication service

### Requirement 7: Backend Data Transfer Objects - Type Safety

**User Story:** As a backend developer, I want strongly-typed DTOs for conversation history endpoints, so that requests and responses are validated and documented.

#### Acceptance Criteria

1. WHEN ConversationListResponseDto is defined THEN DTO SHALL include conversations array, totalCount number, and hasMore boolean
2. WHEN ConversationSummaryDto is defined THEN DTO SHALL include threadId, preview, timestamp, status, metadata, and unread properties with validation decorators
3. WHEN ConversationHistoryResponseDto is defined THEN DTO SHALL match response format from TASK_2025_049 guide (threadId, userId, conversationHistory, metadata, nextSteps, waitingForApproval)
4. WHEN NewConversationDto is defined for request body THEN DTO SHALL include optional initialQuery string with @IsOptional and @IsString decorators
5. WHEN NewConversationResponseDto is defined THEN DTO SHALL include threadId, status, conversationUrl with @ApiProperty decorators for Swagger documentation

## Non-Functional Requirements

### Performance Requirements

**Response Time:**

- 95% of conversation list requests SHALL complete under 300ms
- 99% of conversation list requests SHALL complete under 500ms
- 95% of conversation history requests SHALL complete under 500ms
- 99% of conversation history requests SHALL complete under 1000ms

**Throughput:**

- System SHALL handle 100 concurrent users requesting conversation lists
- System SHALL support 50 concurrent conversation history loads

**Resource Usage:**

- Sidebar component SHALL not cause main chat UI lag (60fps maintained)
- Memory usage for sidebar component SHALL be < 5MB
- Conversation list API SHALL limit results to 10 items (pagination for future)

### Security Requirements

**Authentication:**

- All conversation API endpoints SHALL require JWT authentication via @UseGuards(JwtAuthGuard)
- JWT token SHALL contain userId claim for thread ownership verification
- Expired or invalid JWT tokens SHALL return 401 Unauthorized

**Authorization:**

- Users SHALL only access their own conversation threads (verified via metadata.userId)
- Thread ownership verification SHALL occur before returning conversation data
- Cross-user thread access attempts SHALL be logged and return 403 Forbidden

**Data Protection:**

- Conversation history responses SHALL exclude sensitive internal state (checkpoint IDs returned only for active workflows)
- API responses SHALL sanitize error messages to prevent information leakage
- Researcher workflow SHALL not expose supervisor-specific metadata and vice versa

**Input Validation:**

- Thread ID parameters SHALL be validated against format (alphanumeric, hyphens, max 100 chars)
- Request DTOs SHALL use class-validator decorators for automatic validation
- Invalid input SHALL return 400 Bad Request with specific validation errors

### Scalability Requirements

**Load Capacity:**

- System SHALL handle 10x current conversation load (future growth)
- Conversation list endpoint SHALL support pagination parameters (page, limit) for future scaling
- Database queries SHALL use indexes on userId and timestamp fields

**Caching Strategy:**

- Conversation list responses SHALL be cacheable for 30 seconds
- Conversation history SHALL be cached per threadId for 5 minutes
- Cache invalidation SHALL occur on new messages or state updates

### Reliability Requirements

**Uptime:**

- Conversation history API SHALL maintain 99.9% uptime
- Sidebar component SHALL gracefully handle API failures with retry logic (3 retries with exponential backoff)

**Error Handling:**

- Network failures SHALL display user-friendly error: "Unable to load conversations. Please try again."
- Empty conversation state SHALL not crash sidebar component (display empty state UI)
- Malformed API responses SHALL be caught and logged with error details

**Data Consistency:**

- Conversation list SHALL reflect latest thread updates within 60 seconds
- Thread status indicators SHALL match actual workflow state

### Usability Requirements

**User Interface:**

- Conversation list SHALL be scannable with clear visual hierarchy
- Active conversation SHALL be visually highlighted in sidebar
- Sidebar SHALL be collapsible to maximize chat area (save preference to localStorage)
- Mobile drawer SHALL slide in/out with smooth animation (250ms transition)

**Accessibility:**

- Sidebar SHALL support keyboard navigation (arrow keys to navigate list, Enter to select)
- Conversation list items SHALL have ARIA labels with conversation preview and timestamp
- "New Chat" button SHALL be keyboard accessible (Tab + Enter)
- Screen readers SHALL announce conversation status changes

**Internationalization (Future):**

- Timestamps SHALL use locale-aware formatting (toLocaleString)
- Status labels SHALL be externalized for translation support

### Testing Requirements

**Unit Tests:**

- ConversationSidebarComponent SHALL have 80% code coverage
- Backend controllers SHALL have unit tests for all endpoints
- Service layer SHALL mock WorkflowResumptionService calls

**Integration Tests:**

- End-to-end test SHALL verify conversation list → select → load flow
- Backend integration test SHALL verify JWT authentication for all endpoints
- Frontend integration test SHALL verify sidebar emits correct events

**Performance Tests:**

- Load test SHALL verify 100 concurrent conversation list requests
- Stress test SHALL verify 500 threads per user without degradation

## Acceptance Criteria - Overall Feature

### Backend Acceptance Criteria

- [ ] ResearchChatController implements GET `/research-chat/conversation/list` with JWT authentication
- [ ] ResearchChatController implements GET `/research-chat/conversation/history/:threadId` with thread ownership verification
- [ ] ResearchChatController implements POST `/research-chat/conversation/new` with thread creation logic
- [ ] DevBrandController implements GET `/devbrand/conversation/list` with JWT authentication
- [ ] DevBrandController implements GET `/devbrand/conversation/history/:threadId` with agent coordination details
- [ ] DevBrandController implements POST `/devbrand/conversation/new` with thread creation logic
- [ ] All endpoints return properly typed responses matching DTOs
- [ ] Error handling differentiates UnauthorizedException, NotFoundException, and InternalServerErrorException
- [ ] Audit logging records all conversation access with userId and threadId
- [ ] Swagger documentation includes @ApiOperation and @ApiResponse decorators for all endpoints

### Frontend Acceptance Criteria

- [ ] ConversationSidebarComponent displays last 10 conversations with preview, timestamp, and status
- [ ] "New Chat" button creates new thread and emits newConversationCreated event
- [ ] Conversation selection emits conversationSelected event with threadId
- [ ] ResearchChatComponent integrates sidebar with responsive layout (Grid on desktop, drawer on mobile)
- [ ] DevBrandPocPageComponent integrates sidebar with supervisor-specific configuration
- [ ] Sidebar handles loading states with skeleton UI
- [ ] Sidebar handles error states with retry button
- [ ] Empty state displays "No conversations yet" message with visual icon
- [ ] Active conversation is visually highlighted in sidebar list
- [ ] Mobile drawer slides in/out with smooth animation

### Integration Acceptance Criteria

- [ ] Clicking conversation in sidebar loads full conversation history into chat component
- [ ] Creating new conversation clears current chat and initializes fresh state
- [ ] Researcher chat sidebar only shows researcher workflow conversations
- [ ] Supervisor POC sidebar only shows supervisor workflow conversations
- [ ] JWT authentication works for all conversation API calls
- [ ] Thread ownership verification prevents cross-user access
- [ ] Conversation status indicators (active/waiting/completed) display correctly

### Test Acceptance Criteria

- [ ] Unit tests pass for ConversationSidebarComponent (80% coverage)
- [ ] Unit tests pass for backend controllers (all endpoints)
- [ ] Integration test verifies end-to-end conversation selection flow
- [ ] Performance test verifies response times meet SLA (95% < 300ms for list)
- [ ] Security test verifies JWT authentication and authorization

## Dependencies

### Backend Dependencies

- WorkflowResumptionService from `@hive-academy/langgraph-workflow-engine`
- JwtAuthGuard from NestJS authentication module
- class-validator for DTO validation
- @nestjs/swagger for API documentation

### Frontend Dependencies

- HttpClient from `@angular/common/http`
- Tailwind CSS for styling
- Angular standalone components
- RxJS for state management

### External Services

- JWT authentication service (existing)
- LangGraph checkpoint storage (for thread retrieval)

## Technical Constraints

1. **Library Boundary:** workflow-engine library MUST NOT expose controllers (application-level concern)
2. **Authentication:** All endpoints MUST use existing JWT authentication infrastructure
3. **Type Safety:** NO `any` types allowed in DTOs or service interfaces
4. **Import Aliases:** MUST use `@hive-academy/*` import paths for libraries
5. **Backward Compatibility:** MUST NOT create versioned endpoints (v1/v2) or compatibility layers

## Integration Points

### Backend Integration Points

- ResearchChatController imports WorkflowResumptionService from workflow-engine library
- DevBrandController imports WorkflowResumptionService from workflow-engine library
- Both controllers use JwtAuthGuard from auth module
- Controllers inject Logger for audit logging

### Frontend Integration Points

- ResearchChatComponent imports ConversationSidebarComponent
- DevBrandPocPageComponent imports ConversationSidebarComponent
- Sidebar component calls HttpClient service for API requests
- Chat components listen to sidebar events (conversationSelected, newConversationCreated)

## Out of Scope

- Conversation search functionality (future enhancement)
- Conversation deletion or archiving (future enhancement)
- Conversation sharing or collaboration (future enhancement)
- Pagination for conversations beyond 10 items (future enhancement)
- Real authentication service integration (using hardcoded test users)
- WebSocket live updates for conversation list (future enhancement)
- Conversation tags or categories (future enhancement)

## Success Metrics

**User Experience Metrics:**

- Time to load conversation list < 500ms (P95)
- Time to switch conversations < 1s (P95)
- Zero conversation data loss during navigation

**Technical Metrics:**

- API endpoint response times meet SLA
- 80% test coverage for all new code
- Zero security vulnerabilities in authentication flow

**Business Metrics:**

- Users can resume previous conversations successfully
- Separate conversation histories for researcher and supervisor workflows
- Foundation for future conversation management features

## References

- Architecture Reference: `task-tracking/TASK_2025_049/controller-implementation-guide.md`
- Existing Researcher Component: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`
- Existing Supervisor Component: `apps/dev-brand-ui/src/app/features/devbrand-poc/pages/devbrand-poc-page.component.ts`
- Backend Controllers: `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts` and `apps/dev-brand-api/src/app/controllers/devbrand.controller.ts`
- WorkflowResumptionService: `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts`

## Notes

- This feature builds on the conversation history architecture established in TASK_2025_049
- The implementation follows the pattern where libraries expose services, applications implement controllers
- Hardcoded test users are a temporary solution for POC; real authentication will replace this in production
- Sidebar component is designed to be reusable across both researcher and supervisor workflows with configuration
- All conversation data flows through WorkflowResumptionService to maintain architectural consistency
