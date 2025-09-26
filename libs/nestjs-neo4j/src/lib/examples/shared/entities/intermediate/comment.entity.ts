/**
 * @fileoverview Comment Entity - Nested Relationships & Validation
 *
 * This entity demonstrates:
 * - @Neo4jEntity.Timestamped for automatic timestamp management
 * - Nested relationship structure (comment threads)
 * - Content moderation and validation
 * - Like/dislike social features
 * - Threading and reply functionality
 *
 * Complexity Level: INTERMEDIATE
 * Decorators Used: 7+ relationship and validation decorators
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
 * Comment entity for post comments and threading
 *
 * Features:
 * - ✅ Hierarchical comment threading (replies to comments)
 * - ✅ Content moderation and validation
 * - ✅ Social engagement (likes, dislikes, reports)
 * - ✅ Author relationship mapping
 * - ✅ Automatic timestamp management
 */
@Neo4jEntity.Timestamped('Comment', {
  description: 'Comment entity with threading and social features',
  tags: ['intermediate', 'comment', 'social', 'threaded'],
  constraints: {
    index: ['postId', 'userId', 'status', 'parentCommentId', 'isDeleted'],
  }
})
export class Comment {
  @Id()
  id: string;

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  postId: string; // The post this comment belongs to

  @Neo4jProp()
  @NotNull()
  @PropIndex()
  userId: string; // The user who wrote this comment

  @Neo4jProp()
  @PropIndex()
  parentCommentId?: string; // For threaded comments (replies)

  @Neo4jProp()
  @NotNull()
  @Validate({
    validation: {
      custom: {
        validator: (content: string) => content.trim().length >= 1 && content.length <= 2000,
        message: 'Comment content must be between 1 and 2000 characters'
      }
    }
  })
  content: string;

  @Neo4jProp()
  @PropIndex()
  status: 'active' | 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';

  @Neo4jProp()
  @PropIndex()
  isDeleted: boolean;

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
        validator: (dislikes: number) => dislikes >= 0,
        message: 'Dislikes count cannot be negative'
      }
    }
  })
  dislikes: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (replies: number) => replies >= 0,
        message: 'Reply count cannot be negative'
      }
    }
  })
  replyCount: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (reports: number) => reports >= 0,
        message: 'Report count cannot be negative'
      }
    }
  })
  reportCount: number;

  @Neo4jProp()
  depth: number; // How deep in the thread (0 = top-level, 1 = reply, etc.)

  @Neo4jProp()
  threadOrder: number; // Order within the thread

  @Neo4jProp()
  isEdited: boolean;

  @Neo4jProp()
  editedAt?: Date;

  @Neo4jProp()
  editReason?: string;

  @Neo4jProp()
  moderatedAt?: Date;

  @Neo4jProp()
  moderatedBy?: string; // User ID of moderator

  @Neo4jProp()
  moderationReason?: string;

  @Neo4jProp()
  ipAddress?: string; // For moderation purposes

  @Neo4jProp()
  userAgent?: string; // Browser/client info

  @Neo4jProp()
  isHighlighted: boolean; // Highlighted by post author

  @Neo4jProp()
  isPinned: boolean; // Pinned by moderator

  @JsonProperty()
  metadata?: {
    language?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    toxicityScore?: number; // 0-1, higher = more toxic
    mentionedUsers?: string[]; // @username mentions
    hashtags?: string[];
  };

  @JsonProperty()
  moderationFlags?: Array<{
    type: 'spam' | 'inappropriate' | 'hate-speech' | 'harassment' | 'off-topic';
    reportedBy: string;
    reportedAt: Date;
    reason?: string;
  }>;

  @CreatedAt() // Auto-generated from @Neo4jEntity.Timestamped
  createdAt: Date;

  @UpdatedAt() // Auto-generated from @Neo4jEntity.Timestamped
  updatedAt: Date;

  @Neo4jProp()
  deletedAt?: Date;

  @Neo4jProp()
  deletedBy?: string; // User who deleted (can be author or moderator)

  // Relationship to the post this comment belongs to
  @Neo4jRelationship({
    type: 'COMMENT_ON',
    direction: 'OUT',
    target: () => Object, // Post in real implementation
    optional: false
  })
  post?: any;

  // Relationship to the comment author
  @Neo4jRelationship({
    type: 'AUTHORED_BY',
    direction: 'OUT',
    target: () => Object, // User in real implementation
    optional: false
  })
  author?: any;

  // Relationship to parent comment (for threading)
  @Neo4jRelationship({
    type: 'REPLY_TO',
    direction: 'OUT',
    target: () => Comment,
    optional: true
  })
  parentComment?: Comment;

  // Relationship to child comments (replies)
  @Neo4jRelationship({
    type: 'REPLY_TO',
    direction: 'IN',
    target: () => Comment,
    isArray: true,
    optional: true
  })
  replies?: Comment[];

  // Relationship to users who liked this comment
  @Neo4jRelationship({
    type: 'LIKED_BY',
    direction: 'IN',
    target: () => Object, // User in real implementation
    isArray: true,
    optional: true
  })
  likedBy?: any[];

  // Relationship to users who disliked this comment
  @Neo4jRelationship({
    type: 'DISLIKED_BY',
    direction: 'IN',
    target: () => Object, // User in real implementation
    isArray: true,
    optional: true
  })
  dislikedBy?: any[];

  constructor(data?: Partial<Comment>) {
    if (data) {
      Object.assign(this, data);
    }

    // Default values
    this.likes = this.likes || 0;
    this.dislikes = this.dislikes || 0;
    this.replyCount = this.replyCount || 0;
    this.reportCount = this.reportCount || 0;
    this.depth = this.depth || 0;
    this.threadOrder = this.threadOrder || 0;
    this.isDeleted = this.isDeleted !== undefined ? this.isDeleted : false;
    this.isEdited = this.isEdited !== undefined ? this.isEdited : false;
    this.isHighlighted = this.isHighlighted !== undefined ? this.isHighlighted : false;
    this.isPinned = this.isPinned !== undefined ? this.isPinned : false;
    this.status = this.status || 'active';
  }

  /**
   * Business logic methods
   */
  like(): void {
    this.likes += 1;
  }

  unlike(): void {
    this.likes = Math.max(0, this.likes - 1);
  }

  dislike(): void {
    this.dislikes += 1;
  }

  undislike(): void {
    this.dislikes = Math.max(0, this.dislikes - 1);
  }

  reply(childComment: Comment): void {
    childComment.parentCommentId = this.id;
    childComment.depth = this.depth + 1;
    childComment.threadOrder = this.replyCount;
    this.replyCount += 1;
  }

  edit(newContent: string, reason?: string): void {
    const oldContent = this.content;
    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    this.editReason = reason;

    // Reset moderation if content significantly changed
    if (this.hasSignificantContentChange(oldContent, newContent)) {
      this.status = 'pending';
      this.moderatedAt = undefined;
      this.moderatedBy = undefined;
    }
  }

  softDelete(deletedBy: string): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.status = 'hidden';
  }

  restore(): void {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.status = 'active';
  }

  moderate(status: 'approved' | 'rejected' | 'flagged', moderatorId: string, reason?: string): void {
    this.status = status;
    this.moderatedAt = new Date();
    this.moderatedBy = moderatorId;
    this.moderationReason = reason;
  }

  report(reportedBy: string, type: string, reason?: string): void {
    if (!this.moderationFlags) {
      this.moderationFlags = [];
    }

    this.moderationFlags.push({
      type: type as any,
      reportedBy,
      reportedAt: new Date(),
      reason
    });

    this.reportCount += 1;

    // Auto-flag if multiple reports
    if (this.reportCount >= 3) {
      this.status = 'flagged';
    }
  }

  highlight(): void {
    this.isHighlighted = true;
  }

  unhighlight(): void {
    this.isHighlighted = false;
  }

  pin(): void {
    this.isPinned = true;
  }

  unpin(): void {
    this.isPinned = false;
  }

  isTopLevel(): boolean {
    return this.depth === 0 && !this.parentCommentId;
  }

  isReply(): boolean {
    return this.depth > 0 && !!this.parentCommentId;
  }

  canBeEdited(userId: string): boolean {
    return this.userId === userId && !this.isDeleted && ['active', 'approved'].includes(this.status);
  }

  canBeDeleted(userId: string, isModeratorOrAdmin = false): boolean {
    return (this.userId === userId || isModeratorOrAdmin) && !this.isDeleted;
  }

  getScore(): number {
    return this.likes - this.dislikes;
  }

  getEngagementScore(): number {
    // Engagement includes likes, replies, and controversy (high dislikes can also indicate engagement)
    const likeWeight = 1;
    const replyWeight = 2;
    const controversyBonus = this.dislikes > 0 && this.likes > 0 ? Math.min(this.likes, this.dislikes) * 0.5 : 0;

    return (this.likes * likeWeight) + (this.replyCount * replyWeight) + controversyBonus;
  }

  isControversial(): boolean {
    // A comment is controversial if it has significant likes AND dislikes
    return this.likes >= 5 && this.dislikes >= 5 && Math.abs(this.likes - this.dislikes) <= Math.max(this.likes, this.dislikes) * 0.5;
  }

  needsModeration(): boolean {
    return ['pending', 'flagged'].includes(this.status) || this.reportCount >= 2;
  }

  getDisplayStatus(): string {
    if (this.isDeleted) return 'Deleted';
    if (this.isPinned) return 'Pinned';
    if (this.isHighlighted) return 'Highlighted';
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  getThreadPath(): string {
    // Returns a path like "0.2.1" indicating position in thread
    return `${this.depth}.${this.threadOrder}`;
  }

  private hasSignificantContentChange(oldContent: string, newContent: string): boolean {
    // Simple check - in practice, might use more sophisticated text comparison
    const threshold = 0.5; // 50% change
    const maxLength = Math.max(oldContent.length, newContent.length);
    if (maxLength === 0) return false;

    // Rough similarity check
    let changes = 0;
    const minLength = Math.min(oldContent.length, newContent.length);

    for (let i = 0; i < minLength; i++) {
      if (oldContent[i] !== newContent[i]) changes++;
    }

    changes += Math.abs(oldContent.length - newContent.length);

    return (changes / maxLength) > threshold;
  }
}

/**
 * Expected Neo4j Storage Format:
 *
 * Labels: [:Comment:Timestamped]
 *
 * {
 *   id: "uuid-generated-string",
 *   postId: "post-123",
 *   userId: "user-456",
 *   parentCommentId: "comment-parent-789", // null for top-level comments
 *   content: "Great article! This really helped me understand Neo4j better.",
 *   status: "active",
 *   isDeleted: false,
 *   likes: 15,
 *   dislikes: 2,
 *   replyCount: 3,
 *   reportCount: 0,
 *   depth: 1,
 *   threadOrder: 0,
 *   isEdited: false,
 *   isHighlighted: false,
 *   isPinned: false,
 *   metadata: "{\"language\":\"en\",\"sentiment\":\"positive\",\"mentionedUsers\":[\"@john_doe\"]}",
 *   createdAt: "2024-01-10T15:30:00.000Z",
 *   updatedAt: "2024-01-10T15:30:00.000Z"
 * }
 *
 * Relationship Examples:
 * - (Comment)-[:COMMENT_ON]->(Post)
 * - (Comment)-[:AUTHORED_BY]->(User)
 * - (Comment)-[:REPLY_TO]->(Comment) // Parent comment
 * - (Comment)<-[:REPLY_TO]-(Comment) // Child comments (replies)
 * - (Comment)<-[:LIKED_BY]-(User)
 * - (Comment)<-[:DISLIKED_BY]-(User)
 *
 * Threading Example:
 * Post
 * ├─ Comment A (depth: 0, threadOrder: 0)
 * │  ├─ Reply A1 (depth: 1, threadOrder: 0)
 * │  └─ Reply A2 (depth: 1, threadOrder: 1)
 * │     └─ Reply A2a (depth: 2, threadOrder: 0)
 * └─ Comment B (depth: 0, threadOrder: 1)
 */
