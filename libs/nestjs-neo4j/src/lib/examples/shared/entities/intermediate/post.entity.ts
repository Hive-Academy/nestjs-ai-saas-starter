/**
 * @fileoverview Post Entity - Intermediate Decorators & Relationships
 *
 * This entity demonstrates:
 * - @Neo4jEntity.Timestamped with automatic timestamps
 * - Complex relationship mapping to users and comments
 * - Content validation and business logic
 * - Social media features (likes, views, shares)
 * - Publishing workflow and status management
 *
 * Complexity Level: INTERMEDIATE
 * Decorators Used: 8+ relationship and validation decorators
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Neo4jRelationship,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty,
  PropIndex,
  NotNull,
  Validate,
} from '../../../../../index';

/**
 * Post entity for content management and social features
 *
 * Features:
 * - ✅ Automatic timestamp management with @Neo4jEntity.Timestamped
 * - ✅ Complex relationship modeling (author, comments, likes)
 * - ✅ Content validation and moderation
 * - ✅ Publishing workflow with status tracking
 * - ✅ Social engagement metrics
 */
@Neo4jEntity.Timestamped('Post', {
  description: 'Content post with social features and relationships',
  tags: ['intermediate', 'content', 'social', 'timestamped'],
  constraints: {
    index: ['authorId', 'status', 'published', 'featured', 'categoryId'],
  }
})
export class Post {
  @Id()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  authorId: string;

  @Neo4jProp()
  @NotNull()
  @Validate({
    validation: {
      custom: {
        validator: (title: string) => title.length >= 5 && title.length <= 200,
        message: 'Post title must be between 5 and 200 characters'
      }
    }
  })
  title: string;

  @Neo4jProp()
  slug?: string; // URL-friendly version of title

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (content: string) => content.length >= 10,
        message: 'Post content must be at least 10 characters long'
      }
    }
  })
  content?: string;

  @Neo4jProp()
  excerpt?: string; // Short summary for previews

  @Neo4jProp()
  @PropIndex()
  @NotNull()
  status: 'draft' | 'published' | 'scheduled' | 'archived' | 'deleted';

  @Neo4jProp()
  @PropIndex()
  published: boolean; // Quick boolean for published status

  @Neo4jProp()
  @PropIndex()
  featured: boolean; // Featured posts get priority display

  @Neo4jProp()
  @PropIndex()
  categoryId?: string;

  @JsonProperty()
  tags?: string[];

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (likes: number) => likes >= 0,
        message: 'Likes count cannot be negative'
      }
    }
  })
  likes: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (views: number) => views >= 0,
        message: 'Views count cannot be negative'
      }
    }
  })
  views: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (shares: number) => shares >= 0,
        message: 'Shares count cannot be negative'
      }
    }
  })
  shares: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (comments: number) => comments >= 0,
        message: 'Comments count cannot be negative'
      }
    }
  })
  commentCount: number;

  @Neo4jProp()
  featuredImageUrl?: string;

  @JsonProperty()
  images?: string[];

  @JsonProperty()
  metadata?: {
    readingTimeMinutes?: number;
    wordCount?: number;
    language?: string;
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
  };

  @Neo4jProp()
  publishedAt?: Date;

  @Neo4jProp()
  scheduledAt?: Date; // For scheduled posts

  @Neo4jProp()
  lastViewedAt?: Date;

  @Neo4jProp()
  lastCommentAt?: Date;

  @Neo4jProp()
  allowComments: boolean;

  @Neo4jProp()
  moderationRequired: boolean;

  @Neo4jProp()
  isPrivate: boolean; // Private posts visible only to author

  @Neo4jProp()
  isPinned: boolean; // Pinned posts stay at top

  @Neo4jProp()
  editedAt?: Date;

  @Neo4jProp()
  editReason?: string;

  @CreatedAt() // Auto-generated from @Neo4jEntity.Timestamped
  createdAt: Date;

  @UpdatedAt() // Auto-generated from @Neo4jEntity.Timestamped
  updatedAt: Date;

  // Relationship to the author
  @Neo4jRelationship({
    type: 'AUTHORED_BY',
    direction: 'OUT',
    target: () => Object, // User in real implementation
    optional: false
  })
  author?: any;

  // Relationship to comments
  @Neo4jRelationship({
    type: 'HAS_COMMENT',
    direction: 'OUT',
    target: () => Object, // Comment in real implementation
    isArray: true,
    optional: true
  })
  comments?: any[];

  // Relationship to users who liked this post
  @Neo4jRelationship({
    type: 'LIKED_BY',
    direction: 'IN',
    target: () => Object, // User in real implementation
    isArray: true,
    optional: true
  })
  likedBy?: any[];

  // Relationship to category
  @Neo4jRelationship({
    type: 'IN_CATEGORY',
    direction: 'OUT',
    target: () => Object, // Category in real implementation
    optional: true
  })
  category?: any;

  // Relationship to related posts
  @Neo4jRelationship({
    type: 'RELATED_TO',
    direction: 'BOTH',
    target: () => Post,
    isArray: true,
    optional: true
  })
  relatedPosts?: Post[];

  constructor(data?: Partial<Post>) {
    if (data) {
      Object.assign(this, data);
    }

    // Default values
    this.likes = this.likes || 0;
    this.views = this.views || 0;
    this.shares = this.shares || 0;
    this.commentCount = this.commentCount || 0;
    this.published = this.published !== undefined ? this.published : false;
    this.featured = this.featured !== undefined ? this.featured : false;
    this.allowComments = this.allowComments !== undefined ? this.allowComments : true;
    this.moderationRequired = this.moderationRequired !== undefined ? this.moderationRequired : false;
    this.isPrivate = this.isPrivate !== undefined ? this.isPrivate : false;
    this.isPinned = this.isPinned !== undefined ? this.isPinned : false;
    this.status = this.status || 'draft';

    // Generate slug from title if not provided
    if (!this.slug && this.title) {
      this.slug = this.generateSlug(this.title);
    }
  }

  /**
   * Business logic methods
   */
  publish(): void {
    this.status = 'published';
    this.published = true;
    this.publishedAt = new Date();
  }

  unpublish(): void {
    this.status = 'draft';
    this.published = false;
    this.publishedAt = undefined;
  }

  schedule(publishDate: Date): void {
    this.status = 'scheduled';
    this.scheduledAt = publishDate;
    this.published = false;
  }

  archive(): void {
    this.status = 'archived';
    this.published = false;
  }

  incrementViews(): void {
    this.views += 1;
    this.lastViewedAt = new Date();
  }

  incrementLikes(): void {
    this.likes += 1;
  }

  decrementLikes(): void {
    this.likes = Math.max(0, this.likes - 1);
  }

  incrementShares(): void {
    this.shares += 1;
  }

  addComment(): void {
    this.commentCount += 1;
    this.lastCommentAt = new Date();
  }

  removeComment(): void {
    this.commentCount = Math.max(0, this.commentCount - 1);
  }

  isPublished(): boolean {
    return this.status === 'published' && this.published;
  }

  isScheduled(): boolean {
    return this.status === 'scheduled' && this.scheduledAt !== undefined;
  }

  shouldBePublished(): boolean {
    return this.isScheduled() && this.scheduledAt! <= new Date();
  }

  canBeEdited(): boolean {
    return ['draft', 'published'].includes(this.status);
  }

  getEngagementScore(): number {
    // Simple engagement calculation
    const likeWeight = 1;
    const shareWeight = 3;
    const commentWeight = 5;
    const viewWeight = 0.1;

    return (this.likes * likeWeight) +
           (this.shares * shareWeight) +
           (this.commentCount * commentWeight) +
           (this.views * viewWeight);
  }

  calculateReadingTime(): number {
    if (!this.content) return 0;

    // Average reading speed: 200 words per minute
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  updateMetadata(): void {
    if (!this.metadata) {
      this.metadata = {};
    }

    this.metadata.wordCount = this.content ? this.content.split(/\s+/).length : 0;
    this.metadata.readingTimeMinutes = this.calculateReadingTime();

    if (!this.metadata.seoTitle) {
      this.metadata.seoTitle = this.title;
    }

    if (!this.metadata.seoDescription && this.excerpt) {
      this.metadata.seoDescription = this.excerpt;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  edit(updates: Partial<Post>, reason?: string): void {
    Object.assign(this, updates);
    this.editedAt = new Date();
    this.editReason = reason;
    this.updateMetadata();

    // Update slug if title changed
    if (updates.title) {
      this.slug = this.generateSlug(updates.title);
    }
  }

  getDisplayStatus(): string {
    if (this.isPublished()) return 'Published';
    if (this.isScheduled()) return `Scheduled for ${this.scheduledAt?.toLocaleDateString()}`;
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }
}

/**
 * Expected Neo4j Storage Format:
 *
 * Labels: [:Post:Timestamped]
 *
 * {
 *   id: "uuid-generated-string",
 *   authorId: "user-123",
 *   title: "Introduction to Neo4j",
 *   slug: "introduction-to-neo4j",
 *   content: "Neo4j is a graph database...",
 *   excerpt: "Learn the basics of Neo4j graph database",
 *   status: "published",
 *   published: true,
 *   featured: false,
 *   categoryId: "tech-category-1",
 *   tags: "[\"neo4j\",\"database\",\"graph\",\"tutorial\"]",
 *   likes: 42,
 *   views: 1250,
 *   shares: 15,
 *   commentCount: 8,
 *   featuredImageUrl: "https://example.com/neo4j-intro.jpg",
 *   images: "[\"image1.jpg\",\"image2.jpg\"]",
 *   metadata: "{\"readingTimeMinutes\":5,\"wordCount\":1200,\"language\":\"en\",\"seoTitle\":\"Neo4j Tutorial\"}",
 *   publishedAt: "2024-01-10T14:30:00.000Z",
 *   allowComments: true,
 *   moderationRequired: false,
 *   isPrivate: false,
 *   isPinned: false,
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-15T10:30:00.000Z",
 *   lastViewedAt: "2024-01-15T10:25:00.000Z",
 *   lastCommentAt: "2024-01-14T16:45:00.000Z"
 * }
 *
 * Relationship Examples:
 * - (Post)-[:AUTHORED_BY]->(User)
 * - (Post)-[:HAS_COMMENT]->(Comment)
 * - (Post)<-[:LIKED_BY]-(User)
 * - (Post)-[:IN_CATEGORY]->(Category)
 * - (Post)-[:RELATED_TO]-(Post)
 */
