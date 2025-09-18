/**
 * Memory Operations Simulator
 * Simulates ChromaDB vector operations and Neo4j graph queries with realistic timing
 */

const fs = require('fs');
const path = require('path');

class MemoryOperationsSimulator {
  constructor(io) {
    this.io = io;
    this.memoryData = this.loadMockMemoryData();
    this.activeQueries = new Map();
  }

  /**
   * Load mock memory data from JSON file
   */
  loadMockMemoryData() {
    try {
      const dataPath = path.join(__dirname, '../data/mock-memory-data.json');
      const rawData = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error('Failed to load mock memory data:', error);
      return { episodicMemories: [], semanticMemories: [], proceduralMemories: [], workingMemories: [] };
    }
  }

  /**
   * Simulate ChromaDB vector search operation
   */
  async simulateChromaDBQuery(agentId, query, options = {}) {
    const queryId = `chroma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { topK = 5, threshold = 0.3 } = options;

    console.log(`ChromaDB query started: ${queryId} for agent ${agentId}`);

    // Simulate query processing delay (100-500ms)
    const delay = Math.floor(Math.random() * 400) + 100;

    this.activeQueries.set(queryId, {
      type: 'chromadb',
      agentId,
      query,
      startTime: Date.now()
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        const results = this.generateChromaDBResults(query, topK, threshold);
        this.activeQueries.delete(queryId);

        // Broadcast memory update
        this.io.emit('memory_update', {
          type: 'memory_update',
          timestamp: new Date(),
          data: {
            contexts: results,
            operation: 'activate'
          }
        });

        console.log(`ChromaDB query completed: ${queryId} (${delay}ms) - ${results.length} results`);
        resolve(results);
      }, delay);
    });
  }

  /**
   * Simulate Neo4j graph query operation
   */
  async simulateNeo4jQuery(agentId, cypherQuery, options = {}) {
    const queryId = `neo4j_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { limit = 10 } = options;

    console.log(`Neo4j query started: ${queryId} for agent ${agentId}`);

    // Simulate query processing delay (50-200ms)
    const delay = Math.floor(Math.random() * 150) + 50;

    this.activeQueries.set(queryId, {
      type: 'neo4j',
      agentId,
      query: cypherQuery,
      startTime: Date.now()
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        const results = this.generateNeo4jResults(cypherQuery, limit);
        this.activeQueries.delete(queryId);

        // Broadcast memory update
        this.io.emit('memory_update', {
          type: 'memory_update',
          timestamp: new Date(),
          data: {
            contexts: results,
            operation: 'add'
          }
        });

        console.log(`Neo4j query completed: ${queryId} (${delay}ms) - ${results.length} results`);
        resolve(results);
      }, delay);
    });
  }

  /**
   * Generate ChromaDB-style results with relevance scoring
   */
  generateChromaDBResults(query, topK, threshold) {
    const allMemories = [
      ...this.memoryData.semanticMemories,
      ...this.memoryData.episodicMemories
    ];

    // Simulate semantic similarity scoring
    const scoredResults = allMemories.map(memory => ({
      ...memory,
      relevanceScore: this.calculateRelevanceScore(query, memory.content, memory.tags)
    }))
    .filter(memory => memory.relevanceScore >= threshold)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topK);

    return scoredResults;
  }

  /**
   * Generate Neo4j-style results
   */
  generateNeo4jResults(cypherQuery, limit) {
    // Extract query intent from Cypher-like query
    const queryLower = cypherQuery.toLowerCase();
    let relevantMemories = [];

    if (queryLower.includes('agent') || queryLower.includes('relationship')) {
      relevantMemories = this.memoryData.proceduralMemories;
    } else if (queryLower.includes('workflow') || queryLower.includes('task')) {
      relevantMemories = this.memoryData.workingMemories;
    } else {
      relevantMemories = [
        ...this.memoryData.proceduralMemories,
        ...this.memoryData.workingMemories
      ];
    }

    return relevantMemories
      .slice(0, limit)
      .map(memory => ({
        ...memory,
        source: 'neo4j'
      }));
  }

  /**
   * Calculate relevance score for semantic search
   */
  calculateRelevanceScore(query, content, tags) {
    const queryWords = query.toLowerCase().split(' ');
    const contentWords = content.toLowerCase().split(' ');
    const tagWords = tags.map(tag => tag.toLowerCase());

    let score = 0;
    let matchCount = 0;

    // Check for word matches in content
    queryWords.forEach(word => {
      if (contentWords.some(contentWord => contentWord.includes(word))) {
        score += 0.3;
        matchCount++;
      }
    });

    // Check for tag matches (higher weight)
    queryWords.forEach(word => {
      if (tagWords.some(tag => tag.includes(word))) {
        score += 0.5;
        matchCount++;
      }
    });

    // Add some randomness to simulate embedding similarity
    score += Math.random() * 0.2;

    // Normalize and clamp score
    const normalizedScore = Math.min(score / queryWords.length, 1.0);
    
    // Ensure minimum relevance if there are matches
    return matchCount > 0 ? Math.max(normalizedScore, 0.3) : Math.random() * 0.2;
  }

  /**
   * Simulate memory retrieval for agent context
   */
  async retrieveAgentMemoryContext(agentId, contextType = 'all') {
    console.log(`Retrieving memory context for agent ${agentId}, type: ${contextType}`);

    const delay = Math.floor(Math.random() * 100) + 50;

    return new Promise((resolve) => {
      setTimeout(() => {
        let contexts = [];

        switch (contextType) {
          case 'working':
            contexts = this.memoryData.workingMemories;
            break;
          case 'episodic':
            contexts = this.memoryData.episodicMemories;
            break;
          case 'semantic':
            contexts = this.memoryData.semanticMemories;
            break;
          case 'procedural':
            contexts = this.memoryData.proceduralMemories;
            break;
          default:
            contexts = [
              ...this.memoryData.workingMemories,
              ...this.memoryData.episodicMemories.slice(0, 2),
              ...this.memoryData.semanticMemories.slice(0, 2)
            ];
        }

        // Filter for agent-relevant memories
        const agentContexts = contexts.filter(context => 
          context.relatedAgents.includes(agentId) || 
          context.relatedAgents.includes('agent_coordinator_001') // Include coordinator contexts
        );

        resolve(agentContexts);
      }, delay);
    });
  }

  /**
   * Get active query status
   */
  getActiveQueries() {
    const queries = [];
    this.activeQueries.forEach((query, id) => {
      queries.push({
        id,
        ...query,
        duration: Date.now() - query.startTime
      });
    });
    return queries;
  }

  /**
   * Generate random memory access activity
   */
  generateRandomMemoryActivity(agentId) {
    const activities = [
      () => this.simulateChromaDBQuery(agentId, 'semantic search for related concepts'),
      () => this.simulateNeo4jQuery(agentId, 'MATCH (a:Agent)-[:COLLABORATES_WITH]->(b:Agent) RETURN a, b'),
      () => this.retrieveAgentMemoryContext(agentId, 'working'),
      () => this.retrieveAgentMemoryContext(agentId, 'episodic')
    ];

    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    return randomActivity();
  }
}

module.exports = MemoryOperationsSimulator;