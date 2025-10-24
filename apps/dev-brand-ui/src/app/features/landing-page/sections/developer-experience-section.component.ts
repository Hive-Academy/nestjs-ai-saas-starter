import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Developer Experience Section Component
 *
 * TASK_2025_026 - Task 13 (BATCH 3)
 *
 * Shows familiar NestJS patterns applied to AI/ML workflows.
 * Demonstrates side-by-side code comparison and pattern mapping table.
 *
 * Design Specifications:
 * - Background: bg-secondary (#F9FAFB)
 * - Section padding: py-20 md:py-32
 * - Container: max-w-7xl mx-auto px-8 md:px-12
 * - Code blocks: bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm
 * - Grid: grid-cols-1 lg:grid-cols-2 gap-12 for code comparison
 * - Table: bg-white rounded-card shadow-card
 *
 * Reference:
 * - visual-design-specification.md:1173-1302
 * - design-handoff.md:1085-1185
 */
@Component({
  selector: 'app-developer-experience-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="bg-secondary py-20 md:py-32"
      aria-labelledby="devex-headline"
    >
      <div class="max-w-7xl mx-auto px-8 md:px-12">
        <!-- Section Headline -->
        <h2
          id="devex-headline"
          class="text-4xl md:text-6xl font-bold text-headline leading-tight mb-8 text-center"
        >
          Write AI Workflows Like NestJS Controllers
        </h2>

        <!-- Section Intro -->
        <p
          class="text-lg md:text-xl text-secondary leading-relaxed max-w-3xl mx-auto text-center mb-16"
        >
          Same decorators. Same dependency injection. Same module system. Zero
          learning curve.
        </p>

        <!-- Side-by-Side Code Comparison -->
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto mb-16"
        >
          <!-- Traditional NestJS Controller -->
          <div>
            <div class="text-xl font-bold text-headline mb-4">
              Traditional NestJS Controller
            </div>
            <pre
              class="bg-gray-900 text-gray-100 p-6 rounded-lg text-sm overflow-x-auto"
              role="region"
              aria-label="Traditional NestJS controller code example"
            ><code class="font-mono">&#64;Controller('users')
export class UserController &#123;
  constructor(
    private readonly userService: UserService
  ) &#123;&#125;

  &#64;Get(':id')
  async getUser(
    &#64;Param('id') id: string
  ): Promise&lt;User&gt; &#123;
    return this.userService.findById(id);
  &#125;

  &#64;Post()
  async createUser(
    &#64;Body() dto: CreateUserDto
  ): Promise&lt;User&gt; &#123;
    return this.userService.create(dto);
  &#125;
&#125;</code></pre>
          </div>

          <!-- AI/ML Workflow (Our Approach) -->
          <div>
            <div class="text-xl font-bold text-accent-primary mb-4">
              Our AI/ML Workflow (Same Patterns)
            </div>
            <pre
              class="bg-gray-900 text-gray-100 p-6 rounded-lg text-sm overflow-x-auto"
              role="region"
              aria-label="AI workflow code example using same NestJS patterns"
            ><code class="font-mono">&#64;Workflow(&#123; name: 'user-analysis' &#125;)
export class UserAnalysisWorkflow &#123;
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly memoryService: MemoryService
  ) &#123;&#125;

  &#64;Node(&#123; name: 'fetch' &#125;)
  async fetchUser(
    &#64;State() state: AnalysisState
  ): Promise&lt;Partial&lt;AnalysisState&gt;&gt; &#123;
    return &#123;
      user: await this.analysisService
        .findById(state.userId)
    &#125;;
  &#125;

  &#64;Node(&#123; name: 'analyze' &#125;)
  &#64;RequiresApproval(&#123;
    confidenceThreshold: 0.8
  &#125;)
  async analyzeUser(
    &#64;State() state: AnalysisState
  ): Promise&lt;Partial&lt;AnalysisState&gt;&gt; &#123;
    return &#123;
      analysis: await this.analysisService
        .analyze(state.user)
    &#125;;
  &#125;

  &#64;Edge(&#123; from: 'fetch', to: 'analyze' &#125;)
  defineFlow() &#123;&#125;
&#125;</code></pre>
          </div>
        </div>

        <!-- Pattern Mapping Table -->
        <div class="mt-16">
          <div class="text-2xl font-bold text-headline mb-8 text-center">
            Familiar Patterns Applied to AI/ML
          </div>

          <div class="overflow-x-auto">
            <table
              class="w-full border-collapse bg-white rounded-card shadow-card"
            >
              <thead>
                <tr class="bg-gray-50">
                  <th
                    class="text-left p-4 text-sm font-semibold text-secondary border-b border-gray-200"
                  >
                    NestJS Pattern
                  </th>
                  <th
                    class="text-left p-4 text-sm font-semibold text-secondary border-b border-gray-200"
                  >
                    Traditional Use
                  </th>
                  <th
                    class="text-left p-4 text-sm font-semibold text-secondary border-b border-gray-200"
                  >
                    Our AI/ML Application
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (pattern of patternMappings; track pattern.nestjsPattern) {
                <tr
                  class="border-t border-gray-200 hover:bg-accent-primary/5 transition-colors"
                >
                  <td class="p-4 text-sm font-mono text-accent-primary">
                    {{ pattern.nestjsPattern }}
                  </td>
                  <td class="p-4 text-sm text-secondary">
                    {{ pattern.traditionalUse }}
                  </td>
                  <td class="p-4 text-sm text-primary">
                    {{ pattern.aimlApplication }}
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DeveloperExperienceSectionComponent {
  /**
   * Pattern mapping table showing NestJS patterns applied to AI/ML
   */
  patternMappings = [
    {
      nestjsPattern: '@Injectable()',
      traditionalUse: 'Services, repositories',
      aimlApplication: 'Agents, tools, workflows',
    },
    {
      nestjsPattern: '@Module()',
      traditionalUse: 'Feature modules, shared modules',
      aimlApplication: 'Workflow modules, agent modules',
    },
    {
      nestjsPattern: '@Controller()',
      traditionalUse: 'REST endpoints, GraphQL resolvers',
      aimlApplication: 'Workflow orchestrators, agent coordinators',
    },
    {
      nestjsPattern: 'Dependency Injection',
      traditionalUse: 'Service composition, testing',
      aimlApplication: 'Agent composition, tool injection',
    },
    {
      nestjsPattern: '@Inject()',
      traditionalUse: 'Custom providers, tokens',
      aimlApplication: 'LLM clients, vector databases, graph databases',
    },
    {
      nestjsPattern: 'Interceptors',
      traditionalUse: 'Logging, caching, transformation',
      aimlApplication: 'Monitoring, checkpointing, human-in-the-loop',
    },
  ];
}
