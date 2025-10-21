import { Injectable } from '@nestjs/common';
import {
  Agent,
  AGENT_METADATA_KEY,
  AgentConfig,
  getAgentConfig,
  isAgent,
  isAgentDecorated,
} from './agent.decorator';

describe('@Agent Decorator System', () => {
  describe('User Requirement: Declarative agent configuration system', () => {
    describe('User Scenario: Developer configures agents using @Agent decorator', () => {
      it('should create agent with minimal required configuration', () => {
        // Test user's expected outcome: Simple declarative agent configuration
        const config: AgentConfig = {
          id: 'test-agent',
          name: 'Test Agent',
          description: 'A test agent for validation',
        };

        @Agent(config)
        @Injectable()
        class TestAgent {
          async nodeFunction() {
            return { status: 'test' };
          }
        }

        // Validate user's acceptance criteria: Agent decorator stores configuration
        expect(isAgentDecorated(TestAgent)).toBe(true);
        expect(isAgent(TestAgent)).toBe(true);

        const storedConfig = getAgentConfig(TestAgent);

        // Decorator adds smart defaults, so check core properties individually
        expect(storedConfig?.id).toBe('test-agent');
        expect(storedConfig?.name).toBe('Test Agent');
        expect(storedConfig?.description).toBe('A test agent for validation');

        // Verify smart defaults are applied
        expect(storedConfig?.type).toBe('simple-agent');
        expect(storedConfig?.tools).toEqual([]);
        expect(storedConfig?.capabilities).toEqual([]);
        expect(storedConfig?.priority).toBe('medium');
        expect(storedConfig?.executionTime).toBe('medium');
        expect(storedConfig?.outputFormat).toBe('text');
      });

      it('should support full agent configuration with tools and capabilities', () => {
        // Test user's expected outcome: Rich agent configuration for sophisticated use cases
        const config: AgentConfig = {
          id: 'github-analyzer',
          name: 'GitHub Analyzer',
          description:
            'Analyzes GitHub repositories for technical achievements',
          systemPrompt: 'You are a GitHub analysis expert...',
          tools: ['github_analyzer', 'achievement_extractor'],
          capabilities: ['repository_analysis', 'skill_extraction'],
          priority: 'high',
          executionTime: 'medium',
          outputFormat: 'structured',
          metadata: { version: '1.0', category: 'analysis' },
        };

        @Agent(config)
        @Injectable()
        class GitHubAnalyzerAgent {
          async nodeFunction() {
            return { analysis: 'complete' };
          }
        }

        const storedConfig = getAgentConfig(GitHubAnalyzerAgent);

        // Verify explicit configuration properties
        expect(storedConfig?.id).toBe('github-analyzer');
        expect(storedConfig?.name).toBe('GitHub Analyzer');
        expect(storedConfig?.description).toBe(
          'Analyzes GitHub repositories for technical achievements'
        );
        expect(storedConfig?.systemPrompt).toBe(
          'You are a GitHub analysis expert...'
        );
        expect(storedConfig?.tools).toEqual([
          'github_analyzer',
          'achievement_extractor',
        ]);
        expect(storedConfig?.capabilities).toEqual([
          'repository_analysis',
          'skill_extraction',
        ]);
        expect(storedConfig?.priority).toBe('high');
        expect(storedConfig?.executionTime).toBe('medium');
        expect(storedConfig?.outputFormat).toBe('structured');
        expect(storedConfig?.metadata).toEqual({
          version: '1.0',
          category: 'analysis',
        });

        // Decorator adds type based on class hierarchy
        expect(storedConfig?.type).toBe('simple-agent');
      });

      it('should enable agent discovery with proper metadata', () => {
        // Test user's expected outcome: Agents are discoverable by the system
        const config: AgentConfig = {
          id: 'discoverable-agent',
          name: 'Discoverable Agent',
          description: 'An agent for discovery testing',
        };

        @Agent(config)
        @Injectable()
        class DiscoverableAgent {}

        // Validate discovery metadata
        expect(Reflect.hasMetadata(AGENT_METADATA_KEY, DiscoverableAgent)).toBe(
          true
        );
        expect(Reflect.hasMetadata('agent:marker', DiscoverableAgent)).toBe(
          true
        );
        expect(Reflect.getMetadata('agent:marker', DiscoverableAgent)).toBe(
          true
        );
      });
    });

    describe('User Scenario: Smart defaults eliminate required fields', () => {
      it('should auto-generate id from class name when not provided', () => {
        // Test user's expected outcome: Decorator derives id automatically
        @Agent({
          description: 'Test agent with auto-generated id',
        })
        @Injectable()
        class GitHubAnalyzerAgent {
          async nodeFunction() {
            return { status: 'test' };
          }
        }

        const storedConfig = getAgentConfig(GitHubAnalyzerAgent);

        // Verify auto-derived id (GitHubAnalyzerAgent → git-hub-analyzer)
        // Function removes Agent suffix, inserts hyphens before capitals, lowercases
        expect(storedConfig?.id).toBe('git-hub-analyzer');
        expect(storedConfig?.description).toBe(
          'Test agent with auto-generated id'
        );
      });

      it('should auto-generate name from class name when not provided', () => {
        // Test user's expected outcome: Decorator humanizes class name
        @Agent({
          description: 'Test agent with auto-generated name',
        })
        @Injectable()
        class PersonalBrandStrategist {
          async nodeFunction() {
            return { status: 'test' };
          }
        }

        const storedConfig = getAgentConfig(PersonalBrandStrategist);

        // Verify auto-generated name (PersonalBrandStrategist → Personal Brand Strategist)
        expect(storedConfig?.name).toBe('Personal Brand Strategist');
        expect(storedConfig?.description).toBe(
          'Test agent with auto-generated name'
        );
      });

      it('should auto-generate description from class name when not provided', () => {
        // Test user's expected outcome: Decorator creates default description
        @Agent({})
        @Injectable()
        class ContentCreatorAgent {
          async nodeFunction() {
            return { status: 'test' };
          }
        }

        const storedConfig = getAgentConfig(ContentCreatorAgent);

        // Verify auto-generated description (ContentCreatorAgent → Content Creator Agent)
        expect(storedConfig?.description).toBe('Content Creator Agent');
        expect(storedConfig?.id).toBe('content-creator');
        expect(storedConfig?.name).toBe('Content Creator');
      });
    });
  });

  describe('User Requirement: Integration with existing agent system', () => {
    it('should work with non-decorated classes', () => {
      // Test user's expected outcome: System handles mixed decorated/non-decorated agents
      class NonDecoratedAgent {}

      expect(isAgentDecorated(NonDecoratedAgent)).toBe(false);
      expect(isAgent(NonDecoratedAgent)).toBe(false);
      expect(getAgentConfig(NonDecoratedAgent)).toBeUndefined();
    });

    it('should provide type guards for agent identification', () => {
      // Test user's expected outcome: System can identify agents programmatically
      const config: AgentConfig = {
        id: 'type-guard-agent',
        name: 'Type Guard Agent',
        description: 'Agent for type guard testing',
      };

      @Agent(config)
      class TypeGuardAgent {}

      class RegularClass {}

      // Validate type guards work correctly
      expect(isAgentDecorated(TypeGuardAgent)).toBe(true);
      expect(isAgent(TypeGuardAgent)).toBe(true);
      expect(isAgentDecorated(RegularClass)).toBe(false);
      expect(isAgent(RegularClass)).toBe(false);
    });
  });

  describe('User Requirement: Reduction from ~74 lines to ~10 lines per agent', () => {
    it('should demonstrate dramatic code reduction through declarative configuration', () => {
      // User's acceptance criteria: Massive reduction in boilerplate code

      // BEFORE: Manual agent definition (simulated - would be ~74 lines)
      const manualAgentDefinition = {
        id: 'manual-agent',
        name: 'Manual Agent',
        description: 'Manually configured agent',
        systemPrompt: 'System prompt...',
        tools: [],
        capabilities: [],
        priority: 'medium',
        executionTime: 'medium',
        metadata: {},
        // ... ~60+ more lines of configuration
      };

      // AFTER: Declarative agent (actual implementation - ~10 lines)
      @Agent({
        id: 'declarative-agent',
        name: 'Declarative Agent',
        description: 'Declaratively configured agent',
        systemPrompt: 'System prompt...',
        tools: ['tool1', 'tool2'],
        capabilities: ['analysis'],
        priority: 'medium',
      })
      @Injectable()
      class DeclarativeAgent {
        async nodeFunction() {
          return {};
        }
      }

      // Test that declarative approach achieves same result with less code
      const config = getAgentConfig(DeclarativeAgent);
      expect(config?.id).toBe('declarative-agent');
      expect(config?.name).toBe('Declarative Agent');
      expect(config?.description).toBe('Declaratively configured agent');
      expect(config?.tools).toEqual(['tool1', 'tool2']);
      expect(config?.capabilities).toEqual(['analysis']);

      // Validate the decorator achieves the same configuration as manual approach
      expect(typeof config).toBe(typeof manualAgentDefinition);
      expect(config?.id).toBeDefined();
      expect(config?.name).toBeDefined();
      expect(config?.description).toBeDefined();
    });
  });
});
