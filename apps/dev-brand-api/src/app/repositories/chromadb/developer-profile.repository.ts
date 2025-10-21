import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
  Profiled,
  Retry,
  Cached,
} from '@hive-academy/nestjs-chromadb';
import { DeveloperProfileEntity } from '../../entities/chromadb/developer-profile.entity';

/**
 * GitHubProfile - Raw GitHub API data
 */
export interface GitHubProfile {
  username: string;
  name: string;
  email: string;
  bio?: string;
  company?: string;
  location?: string;
  repositories: {
    total: number;
    stars: number;
    forks: number;
    languages: Record<string, number>;
  };
  activity: {
    commits: number;
    pullRequests: number;
    issues: number;
    reviews: number;
  };
  followers: number;
  following: number;
  contributions: number;
}

/**
 * CodingAnalysis - Analyzed profile with patterns and recommendations
 */
export interface CodingAnalysis {
  profile: DeveloperProfileEntity;
  patterns: {
    primaryLanguages: string[];
    frameworkExpertise: string[];
    architecturalPatterns: string[];
    codingStyle: string;
  };
  recommendations: {
    skillGaps: string[];
    learningPath: string[];
    careerOpportunities: string[];
    networkingRecommendations: string[];
  };
  similarDevelopers: DeveloperProfileEntity[];
}

/**
 * DeveloperProfileRepository - Analytics-focused repository for developer profiles
 *
 * NOTE: Simple queries (findById, search) use auto-generated repo.
 * This custom repo contains complex GitHub analysis and pattern recognition.
 */
@Injectable()
export class DeveloperProfileRepository extends ChromaDBRepository<DeveloperProfileEntity> {
  constructor(chromaDB: ChromaDBService) {
    super(DeveloperProfileEntity, 'developer-profiles', chromaDB);
  }

  /**
   * Analyze GitHub profile and create developer profile with coding patterns
   *
   * @param githubData - Raw GitHub API data
   * @returns Comprehensive coding analysis with patterns and recommendations
   */
  @Profiled({ slowQueryThreshold: 200 })
  @Retry({ maxAttempts: 3, strategy: 'exponential' })
  async analyzeCodingPatterns(
    githubData: GitHubProfile
  ): Promise<CodingAnalysis> {
    // 1. Classify experience level
    const experience = this.classifyExperienceLevel(githubData);

    // 2. Extract specializations and patterns
    const specializations = this.extractSpecializations(githubData);
    const codingPatterns = this.identifyCodingPatterns(githubData);
    const leadershipIndicators = this.detectLeadershipIndicators(githubData);

    // 3. Calculate contribution score
    const contributionScore = this.calculateContributionScore(githubData);

    // 4. Analyze technical breadth and depth
    const technicalBreadth = this.calculateTechnicalBreadth(githubData);
    const technicalDepth = this.calculateTechnicalDepth(githubData);

    // 5. Determine collaboration style
    const collaborationStyle = this.analyzeCollaborationStyle(githubData);

    // 6. Generate rich content for semantic search
    const content = this.generateProfileContent(githubData, {
      experience,
      specializations,
      codingPatterns,
    });

    // 7. Create profile entity
    const profile = await this.create({
      content,
      metadata: {
        githubUsername: githubData.username,
        name: githubData.name,
        email: githubData.email,
        expertise: specializations,
        experience,
        specializations,
        topLanguages: this.extractTopLanguages(githubData),
        contributionScore,
        repositories: githubData.repositories,
        activity: githubData.activity,
        analysis: {
          codingPatterns,
          leadershipIndicators,
          collaborationStyle,
          technicalBreadth,
          technicalDepth,
        },
      },
    });

    // 8. Find similar developers for pattern comparison
    const similarDevs = await this.search(content, { limit: 10 });

    // 9. Generate recommendations
    const recommendations = this.generateRecommendations(
      profile,
      similarDevs,
      githubData
    );

    return {
      profile,
      patterns: {
        primaryLanguages: this.extractTopLanguages(githubData),
        frameworkExpertise: this.extractFrameworks(githubData),
        architecturalPatterns: codingPatterns,
        codingStyle: collaborationStyle,
      },
      recommendations,
      similarDevelopers: similarDevs,
    };
  }

  /**
   * Find all developers at a specific experience level
   *
   * @param level - Experience level (junior, mid, senior, lead, principal)
   * @returns Array of developer profiles
   */
  @Cached({
    ttl: 300000, // 5 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 100 })
  async findByExperienceLevel(
    level: string
  ): Promise<DeveloperProfileEntity[]> {
    return await this.findAll({
      where: { experience: level } as any,
      limit: 100,
    });
  }

  /**
   * Find developers with specific specialization
   *
   * @param specialization - Technology or domain specialization
   * @returns Array of developer profiles
   */
  @Cached({
    ttl: 600000, // 10 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 100 })
  async findBySpecialization(
    specialization: string
  ): Promise<DeveloperProfileEntity[]> {
    // Use semantic search for fuzzy matching
    return await this.search(specialization, { limit: 50 });
  }

  /**
   * Find top contributors based on contribution score
   *
   * @param limit - Maximum number of contributors to return
   * @returns Array of top contributor profiles
   */
  @Cached({
    ttl: 300000, // 5 minutes
    keyStrategy: 'collection_aware',
    collectionAware: true,
  })
  @Profiled({ slowQueryThreshold: 100 })
  async findTopContributors(limit = 10): Promise<DeveloperProfileEntity[]> {
    const allProfiles = await this.findAll({ limit: 1000 });

    // Sort by contribution score and return top N
    return allProfiles
      .sort(
        (a, b) => b.metadata.contributionScore - a.metadata.contributionScore
      )
      .slice(0, limit);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Classify developer experience level based on GitHub metrics
   */
  private classifyExperienceLevel(
    githubData: GitHubProfile
  ): 'junior' | 'mid' | 'senior' | 'lead' | 'principal' {
    const { repositories, activity, contributions, followers } = githubData;

    // Calculate experience score
    let score = 0;
    score += Math.min(repositories.total / 20, 1) * 20; // Max 20 points
    score += Math.min(repositories.stars / 100, 1) * 15; // Max 15 points
    score += Math.min(activity.commits / 1000, 1) * 20; // Max 20 points
    score += Math.min(activity.pullRequests / 100, 1) * 15; // Max 15 points
    score += Math.min(contributions / 500, 1) * 15; // Max 15 points
    score += Math.min(followers / 100, 1) * 15; // Max 15 points

    // Classify based on score
    if (score >= 80) return 'principal';
    if (score >= 65) return 'lead';
    if (score >= 45) return 'senior';
    if (score >= 25) return 'mid';
    return 'junior';
  }

  /**
   * Extract specializations from repository languages and topics
   */
  private extractSpecializations(githubData: GitHubProfile): string[] {
    const specializations = new Set<string>();

    // Add primary languages
    const topLanguages = this.extractTopLanguages(githubData);
    topLanguages.forEach((lang) => specializations.add(lang));

    // Add domain specializations based on language combinations
    if (
      topLanguages.includes('TypeScript') ||
      topLanguages.includes('JavaScript')
    ) {
      specializations.add('Web Development');
    }
    if (topLanguages.includes('Python')) {
      specializations.add('Data Science');
      specializations.add('Machine Learning');
    }
    if (topLanguages.includes('Rust') || topLanguages.includes('C++')) {
      specializations.add('Systems Programming');
    }

    return Array.from(specializations);
  }

  /**
   * Extract top programming languages
   */
  private extractTopLanguages(githubData: GitHubProfile): string[] {
    const languages = githubData.repositories.languages;
    return Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang]) => lang);
  }

  /**
   * Identify coding patterns from repository data
   */
  private identifyCodingPatterns(githubData: GitHubProfile): string[] {
    const patterns: string[] = [];

    // High PR activity indicates collaboration
    if (githubData.activity.pullRequests > 50) {
      patterns.push('Collaborative Development');
    }

    // High commit count indicates active development
    if (githubData.activity.commits > 500) {
      patterns.push('Active Development');
    }

    // High star count indicates quality/popular projects
    if (githubData.repositories.stars > 100) {
      patterns.push('Open Source Leadership');
    }

    // Issue activity indicates community engagement
    if (githubData.activity.issues > 50) {
      patterns.push('Community Engagement');
    }

    return patterns;
  }

  /**
   * Detect leadership indicators from GitHub activity
   */
  private detectLeadershipIndicators(githubData: GitHubProfile): string[] {
    const indicators: string[] = [];

    if (githubData.repositories.total > 10) {
      indicators.push('Project Creator');
    }

    if (githubData.repositories.stars > 50) {
      indicators.push('Influential Contributor');
    }

    if (githubData.followers > 50) {
      indicators.push('Community Leader');
    }

    if (githubData.activity.reviews && githubData.activity.reviews > 20) {
      indicators.push('Code Reviewer');
    }

    return indicators;
  }

  /**
   * Calculate overall contribution score
   */
  private calculateContributionScore(githubData: GitHubProfile): number {
    let score = 0;

    score += Math.min(githubData.repositories.total * 2, 20);
    score += Math.min(githubData.repositories.stars / 10, 20);
    score += Math.min(githubData.activity.commits / 50, 20);
    score += Math.min(githubData.activity.pullRequests * 0.5, 15);
    score += Math.min(githubData.followers * 0.3, 15);
    score += Math.min(githubData.contributions / 10, 10);

    return Math.min(score, 100);
  }

  /**
   * Calculate technical breadth (number of different technologies)
   */
  private calculateTechnicalBreadth(githubData: GitHubProfile): number {
    const languageCount = Object.keys(githubData.repositories.languages).length;
    return Math.min(languageCount / 10, 1);
  }

  /**
   * Calculate technical depth (proficiency in primary language)
   */
  private calculateTechnicalDepth(githubData: GitHubProfile): number {
    const languages = githubData.repositories.languages;
    const totalBytes = Object.values(languages).reduce(
      (sum, bytes) => sum + bytes,
      0
    );
    const maxLanguageBytes = Math.max(...Object.values(languages));

    return maxLanguageBytes / totalBytes;
  }

  /**
   * Analyze collaboration style from activity patterns
   */
  private analyzeCollaborationStyle(githubData: GitHubProfile): string {
    const prRatio =
      githubData.activity.pullRequests / (githubData.activity.commits || 1);

    if (prRatio > 0.3) return 'Highly Collaborative';
    if (prRatio > 0.1) return 'Team Player';
    return 'Independent Contributor';
  }

  /**
   * Extract framework expertise from language data
   */
  private extractFrameworks(githubData: GitHubProfile): string[] {
    const frameworks: string[] = [];
    const languages = this.extractTopLanguages(githubData);

    if (languages.includes('TypeScript') || languages.includes('JavaScript')) {
      frameworks.push('React', 'Node.js', 'NestJS');
    }
    if (languages.includes('Python')) {
      frameworks.push('Django', 'FastAPI', 'TensorFlow');
    }
    if (languages.includes('Java')) {
      frameworks.push('Spring', 'Hibernate');
    }

    return frameworks;
  }

  /**
   * Generate rich profile content for semantic search
   */
  private generateProfileContent(
    githubData: GitHubProfile,
    analysis: {
      experience: string;
      specializations: string[];
      codingPatterns: string[];
    }
  ): string {
    return `${githubData.name} - ${
      analysis.experience
    } developer specializing in ${analysis.specializations.join(', ')}.
${githubData.repositories.total} repositories with ${
      githubData.repositories.stars
    } stars.
Active contributor with ${githubData.activity.commits} commits.
Coding patterns: ${analysis.codingPatterns.join(', ')}.
${githubData.bio || ''}`;
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    profile: DeveloperProfileEntity,
    similarDevs: DeveloperProfileEntity[],
    githubData: GitHubProfile
  ): {
    skillGaps: string[];
    learningPath: string[];
    careerOpportunities: string[];
    networkingRecommendations: string[];
  } {
    const recommendations = {
      skillGaps: [] as string[],
      learningPath: [] as string[],
      careerOpportunities: [] as string[],
      networkingRecommendations: [] as string[],
    };

    // Analyze skill gaps based on similar developers
    const commonSkills = this.findCommonSkills(similarDevs);
    const profileSkills = new Set(profile.metadata.expertise);
    recommendations.skillGaps = commonSkills.filter(
      (skill) => !profileSkills.has(skill)
    );

    // Generate learning path based on experience level
    if (
      profile.metadata.experience === 'junior' ||
      profile.metadata.experience === 'mid'
    ) {
      recommendations.learningPath.push('Advanced architectural patterns');
      recommendations.learningPath.push('System design fundamentals');
    }
    if (
      profile.metadata.experience === 'senior' ||
      profile.metadata.experience === 'lead'
    ) {
      recommendations.learningPath.push('Team leadership and mentoring');
      recommendations.learningPath.push('Strategic technical planning');
    }

    // Career opportunities based on profile
    if (profile.metadata.analysis.leadershipIndicators.length > 2) {
      recommendations.careerOpportunities.push('Tech Lead positions');
      recommendations.careerOpportunities.push('Engineering Manager roles');
    }
    if (profile.metadata.contributionScore > 70) {
      recommendations.careerOpportunities.push('Senior+ positions');
      recommendations.careerOpportunities.push('Architecture roles');
    }

    // Networking recommendations
    if (githubData.followers < 50) {
      recommendations.networkingRecommendations.push(
        'Increase community engagement through open source'
      );
    }
    if (
      profile.metadata.analysis.codingPatterns.includes(
        'Open Source Leadership'
      )
    ) {
      recommendations.networkingRecommendations.push('Speak at conferences');
      recommendations.networkingRecommendations.push(
        'Write technical blog posts'
      );
    }

    return recommendations;
  }

  /**
   * Find common skills among similar developers
   */
  private findCommonSkills(developers: DeveloperProfileEntity[]): string[] {
    const skillCounts = new Map<string, number>();

    developers.forEach((dev) => {
      dev.metadata.expertise.forEach((skill) => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
    });

    return Array.from(skillCounts.entries())
      .filter(([, count]) => count / developers.length > 0.5)
      .map(([skill]) => skill);
  }
}
