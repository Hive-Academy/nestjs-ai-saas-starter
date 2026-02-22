import { Component } from '@angular/core';

import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';

/**
 * Developer Experience Section Component
 *
 * POLISHED: Modern, clean design with scroll animations
 *
 * Shows familiar NestJS patterns applied to AI/ML workflows.
 * Side-by-side code comparison + visual pattern mapping cards.
 *
 * Design Philosophy:
 * - No more EnhancedCard components - clean, minimal design
 * - Scroll-driven animations for all elements
 * - Pattern mapping as visual cards instead of table
 * - Gradient text and modern spacing
 * - Code comparison remains the hero
 */
@Component({
  selector: 'app-developer-experience-section',
  standalone: true,
  imports: [ScrollAnimationDirective],
  template: `
    <section
      class="relative bg-gradient-to-b from-gray-50 via-white to-gray-50 py-20 md:py-32"
      aria-labelledby="devex-headline"
    >
      <div class="max-w-7xl mx-auto px-8 md:px-16">
        <!-- Section Headline -->
        <div class="text-center mb-20">
          <h2
            id="devex-headline"
            class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-transparent mb-6 leading-tight"
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 80%',
              duration: 0.8,
              once: false
            }"
          >
            Write AI Workflows Like NestJS Controllers
          </h2>
          <p
            class="text-xl md:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 75%',
              duration: 0.8,
              delay: 0.2,
              once: false
            }"
          >
            Same decorators. Same dependency injection. Same module system. Zero
            learning curve.
          </p>
        </div>

        <!-- Side-by-Side Code Comparison -->
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-20"
        >
          <!-- Traditional NestJS Controller -->
          <div
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 75%',
              duration: 0.8,
              once: false
            }"
          >
            <div class="mb-4">
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-2xl"
                >
                  🎮
                </div>
                <div class="text-2xl font-bold text-text-headline">
                  Traditional NestJS Controller
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <span
                  class="px-3 py-1 bg-accent-primary/10 text-accent-primary text-xs font-semibold rounded-full"
                >
                  NestJS
                </span>
                <span
                  class="px-3 py-1 bg-accent-secondary/10 text-accent-secondary text-xs font-semibold rounded-full"
                >
                  TypeScript
                </span>
                <span
                  class="px-3 py-1 bg-accent-tertiary/10 text-accent-tertiary text-xs font-semibold rounded-full"
                >
                  REST API
                </span>
              </div>
            </div>
            <pre
              class="bg-gray-900 text-gray-100 p-6 rounded-xl text-sm overflow-x-auto border border-gray-700"
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
          <div
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 75%',
              duration: 0.8,
              delay: 0.2,
              once: false
            }"
          >
            <div class="mb-4">
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-tertiary to-accent-success flex items-center justify-center text-2xl"
                >
                  🤖
                </div>
                <div
                  class="text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-tertiary bg-clip-text text-transparent"
                >
                  AI/ML Workflow (Same Patterns)
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <span
                  class="px-3 py-1 bg-accent-tertiary/10 text-accent-tertiary text-xs font-semibold rounded-full"
                >
                  LangGraph
                </span>
                <span
                  class="px-3 py-1 bg-accent-secondary/10 text-accent-secondary text-xs font-semibold rounded-full"
                >
                  LangChain
                </span>
                <span
                  class="px-3 py-1 bg-accent-success/10 text-accent-success text-xs font-semibold rounded-full"
                >
                  AI Agents
                </span>
              </div>
            </div>
            <pre
              class="bg-gray-900 text-gray-100 p-6 rounded-xl text-sm overflow-x-auto border border-gray-700"
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

        <!-- Pattern Mapping Visual Cards -->
        <div class="mt-20">
          <h3
            class="text-4xl md:text-5xl font-bold text-text-headline text-center mb-12"
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 80%',
              duration: 0.8,
              once: false
            }"
          >
            <span class="text-4xl mr-3">🔄</span>
            Familiar Patterns Applied to AI/ML
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (pattern of patternMappings; track pattern.nestjsPattern) {
            <div
              class="bg-white rounded-2xl border border-gray-200 shadow-card p-6 hover:shadow-card-elevated transition-all duration-300"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 80%',
                duration: 0.6,
                delay: $index * 0.1,
                once: false
              }"
            >
              <div
                class="text-2xl font-bold font-mono text-accent-primary mb-3"
              >
                {{ pattern.nestjsPattern }}
              </div>
              <div class="space-y-3">
                <div>
                  <div
                    class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1"
                  >
                    Traditional Use
                  </div>
                  <div class="text-sm text-text-primary">
                    {{ pattern.traditionalUse }}
                  </div>
                </div>
                <div class="border-t border-gray-200 pt-3">
                  <div
                    class="text-xs font-semibold text-accent-success uppercase tracking-wide mb-1"
                  >
                    AI/ML Application
                  </div>
                  <div class="text-sm font-semibold text-text-headline">
                    {{ pattern.aimlApplication }}
                  </div>
                </div>
              </div>
            </div>
            }
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
