import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SearchResponse,
  NewsSearchResponse,
  ResearchSearchResponse,
} from '../../../../core/services/showcase-api.service';

export interface SearchDemonstration {
  type: 'web' | 'news' | 'research';
  query: string;
  results?: SearchResponse | NewsSearchResponse | ResearchSearchResponse;
  isLoading: boolean;
  error?: string;
}

export interface SearchConfig {
  query: string;
  type: 'web' | 'news' | 'research';
  newsTimeframe: 'day' | 'week' | 'month';
  newsCategory: 'general' | 'tech' | 'business' | 'science' | 'health';
  researchDepth: 'summary' | 'detailed' | 'comprehensive';
}

@Component({
  selector: 'brand-search-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="my-8 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm overflow-hidden"
    >
      <div
        class="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-indigo-500/80 to-purple-500/80 cursor-pointer transition-all duration-300 hover:from-indigo-600/90 hover:to-purple-600/90"
        (click)="onToggleExpanded()"
        (keypress)="onToggleExpanded()"
        tabindex="0"
      >
        <h3 class="m-0 font-semibold text-white">
          🔍 Tavily Search Integration Showcase
        </h3>
        <button
          class="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-md cursor-pointer transition-all duration-300 text-sm hover:bg-white/30"
        >
          @if (isExpanded()) { ▼ Hide } @else { ▶ Show }
        </button>
      </div>

      @if (isExpanded()) {
      <div class="p-6">
        <p class="text-white/80 mb-6 leading-relaxed">
          Demonstrate real-time web search capabilities using Tavily API
          integration with @Tool decorators
        </p>

        <div class="bg-white/5 p-6 rounded-xl mb-6 border border-white/10">
          <div class="mb-4">
            <label for="searchQuery" class="block font-medium text-white mb-2"
              >Search Query:</label
            >
            <input
              id="searchQuery"
              [(ngModel)]="searchQuery"
              placeholder="Enter your search query..."
              class="w-full px-3 py-3 border border-white/30 rounded-lg text-base bg-white/10 text-white transition-all duration-300 focus:outline-none focus:border-indigo-500/70 focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] focus:bg-white/15 placeholder:text-white/50"
            />
          </div>

          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4"
          >
            <div class="search-type-selector">
              <label
                for="searchTypeSelect"
                class="block font-medium text-white mb-1 text-sm"
              >
                Search Type:
              </label>
              <select
                id="searchTypeSelect"
                [(ngModel)]="searchType"
                class="w-full px-2 py-2 border border-white/30 rounded-md bg-white/10 text-white text-sm"
              >
                <option value="web">🌐 Web Search</option>
                <option value="news">📰 News Search</option>
                <option value="research">🔬 Research Search</option>
              </select>
            </div>

            @if (searchType() === 'news') {
            <div class="flex gap-4 items-end">
              <div class="flex-1">
                <label
                  class="block font-medium text-white mb-1 text-sm"
                  for="newsTimeframeSelect"
                >
                  Timeframe:
                </label>
                <select
                  id="newsTimeframeSelect"
                  [(ngModel)]="newsTimeframe"
                  class="w-full px-2 py-2 border border-white/30 rounded-md bg-white/10 text-white text-sm"
                >
                  <option value="day">Last Day</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                </select>
              </div>

              <div class="flex-1">
                <label
                  class="block font-medium text-white mb-1 text-sm"
                  for="newsCategorySelect"
                >
                  Category:
                </label>
                <select
                  id="newsCategorySelect"
                  [(ngModel)]="newsCategory"
                  class="w-full px-2 py-2 border border-white/30 rounded-md bg-white/10 text-white text-sm"
                >
                  <option value="general">General</option>
                  <option value="tech">Technology</option>
                  <option value="business">Business</option>
                  <option value="science">Science</option>
                  <option value="health">Health</option>
                </select>
              </div>
            </div>
            } @if (searchType() === 'research') {
            <div class="research-options">
              <label
                class="block font-medium text-white mb-1 text-sm"
                for="researchDepthSelect"
              >
                Analysis Depth:
              </label>
              <select
                id="researchDepthSelect"
                [(ngModel)]="researchDepth"
                class="w-full px-2 py-2 border border-white/30 rounded-md bg-white/10 text-white text-sm"
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
            }
          </div>

          <button
            class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            [disabled]="
              !searchQuery().trim() || (demonstration()?.isLoading ?? false)
            "
            (click)="onExecuteSearch()"
          >
            @if (demonstration()?.isLoading) {
            <span
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></span>
            } @else {
            <span class="text-lg">🔍</span>
            }
            {{ getSearchButtonText() }}
          </button>
        </div>

        <!-- Search Results Display -->
        @if (demonstration(); as demo) {
        <div class="search-results">
          @if (demo.error) {
          <div
            class="bg-red-500/20 text-red-400 p-4 rounded-lg border border-red-500/30 flex items-center gap-2"
          >
            <span class="text-lg">❌</span>
            <span>{{ demo.error }}</span>
          </div>
          } @else if (demo.results) {

          <!-- Web Search Results -->
          @if (demo.type === 'web' && demo.results &&
          isWebSearchResponse(demo.results)) {
          <div class="bg-white/5 border border-white/15 rounded-xl p-6">
            <h4 class="text-white mb-4 font-semibold">
              Web Search Results ({{ demo.results.totalResults }})
            </h4>
            @if (demo.results.answer) {
            <div
              class="bg-blue-500/10 p-4 rounded-lg border-l-4 border-blue-500 mb-6"
            >
              <h5 class="text-blue-400 mb-2 text-base">AI Summary:</h5>
              <p class="text-white/90 leading-relaxed">
                {{ demo.results.answer }}
              </p>
            </div>
            }
            <div class="flex flex-col gap-4">
              @for (result of demo.results.results; track result.url) {
              <div
                class="bg-white/5 p-4 rounded-lg border border-white/15 transition-all duration-300 hover:bg-white/10 hover:border-white/30"
              >
                <h6 class="mb-2">
                  <a
                    [href]="result.url"
                    target="_blank"
                    class="text-blue-400 no-underline font-medium hover:underline"
                  >
                    {{ result.title }}
                  </a>
                </h6>
                <p class="text-white/80 leading-relaxed mb-3">
                  {{ result.content.substring(0, 200) }}...
                </p>
                <div class="flex gap-4 text-sm text-white/70 flex-wrap">
                  <span
                    class="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-xl font-medium"
                  >
                    Score: {{ (result.score * 100).toFixed(1) }}%
                  </span>
                  <span class="truncate">{{ result.url }}</span>
                </div>
              </div>
              }
            </div>
          </div>
          }

          <!-- News Search Results -->
          @if (demo.type === 'news' && demo.results &&
          isNewsSearchResponse(demo.results)) {
          <div class="bg-white/5 border border-white/15 rounded-xl p-6">
            <h4 class="text-white mb-4 font-semibold">
              📰 News Articles ({{ demo.results.totalArticles }})
            </h4>
            <div class="flex flex-col gap-4">
              @for (article of demo.results.articles; track article.url) {
              <div
                class="bg-white/5 p-4 rounded-lg border border-white/15 transition-all duration-300 hover:bg-white/10 hover:border-white/30"
              >
                <h6 class="mb-2">
                  <a
                    [href]="article.url"
                    target="_blank"
                    class="text-blue-400 no-underline font-medium hover:underline"
                  >
                    {{ article.title }}
                  </a>
                </h6>
                <p class="text-white/80 leading-relaxed mb-3">
                  {{ article.summary }}
                </p>
                <div class="flex gap-4 text-sm text-white/70 flex-wrap">
                  <span class="font-medium text-white/90">{{
                    article.source
                  }}</span>
                  <span>{{ article.publishedAt | date : 'short' }}</span>
                  <span
                    class="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-xl font-medium"
                  >
                    {{ (article.relevanceScore * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>
              }
            </div>
          </div>
          }

          <!-- Research Search Results -->
          @if (demo.type === 'research' && demo.results &&
          isResearchSearchResponse(demo.results)) {
          <div class="bg-white/5 border border-white/15 rounded-xl p-6">
            <h4 class="text-white mb-4 font-semibold">
              🔬 Research Analysis ({{ demo.results.totalSources }} sources)
            </h4>

            @if (demo.results.synthesis) {
            <div
              class="bg-blue-500/10 p-4 rounded-lg border-l-4 border-blue-500 mb-6"
            >
              <h5 class="text-blue-400 mb-2 text-base">Research Synthesis:</h5>
              <p class="text-white/90 leading-relaxed">
                {{ demo.results.synthesis }}
              </p>
            </div>
            }

            <div class="flex flex-col gap-4">
              @for (source of demo.results.sources; track source.url) {
              <div
                class="bg-white/5 p-4 rounded-lg border border-white/15 transition-all duration-300 hover:bg-white/10 hover:border-white/30"
              >
                <h6 class="mb-2">
                  <a
                    [href]="source.url"
                    target="_blank"
                    class="text-blue-400 no-underline font-medium hover:underline"
                  >
                    {{ source.title }}
                  </a>
                </h6>
                <p class="text-white/80 leading-relaxed mb-3">
                  {{ source.content.substring(0, 150) }}...
                </p>
                <div class="flex gap-4 text-sm text-white/70 flex-wrap">
                  <span [class]="getSourceTypeClass(source.type)">{{
                    source.type
                  }}</span>
                  <span [class]="getCredibilityClass(source.credibility)">{{
                    source.credibility
                  }}</span>
                  <span
                    class="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-xl font-medium"
                  >
                    {{ (source.score * 100).toFixed(1) }}%
                  </span>
                </div>
              </div>
              }
            </div>
          </div>
          } }
        </div>
        }
      </div>
      }
    </div>
  `,
})
export class SearchDemoComponent {
  demonstration = input<SearchDemonstration | null>(null);
  isExpanded = input<boolean>(false);

  searchExecuted = output<SearchConfig>();
  expandedToggled = output<void>();

  searchQuery = signal('AI development trends 2024');
  searchType = signal<'web' | 'news' | 'research'>('web');
  newsTimeframe = signal<'day' | 'week' | 'month'>('week');
  newsCategory = signal<'general' | 'tech' | 'business' | 'science' | 'health'>(
    'tech'
  );
  researchDepth = signal<'summary' | 'detailed' | 'comprehensive'>('detailed');

  onToggleExpanded(): void {
    this.expandedToggled.emit();
  }

  onExecuteSearch(): void {
    if (!this.searchQuery().trim()) return;

    const config: SearchConfig = {
      query: this.searchQuery(),
      type: this.searchType(),
      newsTimeframe: this.newsTimeframe(),
      newsCategory: this.newsCategory(),
      researchDepth: this.researchDepth(),
    };

    this.searchExecuted.emit(config);
  }

  getSearchButtonText(): string {
    const demo = this.demonstration();
    if (demo?.isLoading) {
      return 'Searching...';
    }

    const typeText = {
      web: 'Web Search',
      news: 'News Search',
      research: 'Research Search',
    };

    return `Execute ${typeText[this.searchType()]}`;
  }

  getSourceTypeClass(type: string): string {
    const classes = {
      academic:
        'px-1.5 py-0.5 rounded-xl font-medium bg-blue-500/20 text-blue-400',
      industry:
        'px-1.5 py-0.5 rounded-xl font-medium bg-yellow-500/20 text-yellow-400',
      news: 'px-1.5 py-0.5 rounded-xl font-medium bg-sky-500/20 text-sky-400',
      general:
        'px-1.5 py-0.5 rounded-xl font-medium bg-gray-500/20 text-gray-400',
    };
    return classes[type as keyof typeof classes] || classes.general;
  }

  getCredibilityClass(credibility: string): string {
    const classes = {
      high: 'px-1.5 py-0.5 rounded-xl font-medium bg-green-500/20 text-green-400',
      'medium-high':
        'px-1.5 py-0.5 rounded-xl font-medium bg-blue-500/20 text-blue-400',
      medium:
        'px-1.5 py-0.5 rounded-xl font-medium bg-yellow-500/20 text-yellow-400',
      low: 'px-1.5 py-0.5 rounded-xl font-medium bg-red-500/20 text-red-400',
    };
    return classes[credibility as keyof typeof classes] || classes.medium;
  }

  // Type guards to properly identify result types
  isWebSearchResponse(
    results: SearchResponse | NewsSearchResponse | ResearchSearchResponse
  ): results is SearchResponse {
    return 'results' in results && 'totalResults' in results;
  }

  isNewsSearchResponse(
    results: SearchResponse | NewsSearchResponse | ResearchSearchResponse
  ): results is NewsSearchResponse {
    return 'articles' in results && 'totalArticles' in results;
  }

  isResearchSearchResponse(
    results: SearchResponse | NewsSearchResponse | ResearchSearchResponse
  ): results is ResearchSearchResponse {
    return 'sources' in results && 'totalSources' in results;
  }
}
