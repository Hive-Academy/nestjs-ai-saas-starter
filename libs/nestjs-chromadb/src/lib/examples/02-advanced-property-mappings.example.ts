/**
 * @fileoverview Advanced Property Mappings Example
 *
 * Demonstrates:
 * - Email normalization (auto-detected)
 * - Timestamp transformations and custom formats
 * - JSON serialization with @JsonProperty
 * - Custom transformations (toChroma/fromChroma)
 * - Property validation and smart defaults
 * - Complex property relationships
 *
 * Key Concepts:
 * - Smart property detection and auto-configuration
 * - Custom transformation functions
 * - Validation patterns and error handling
 * - Type-safe property mapping
 * - Metadata serialization strategies
 */

import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import {
  BaseChromaEntity,
  ChromaDBModule,
  ChromaEntity,
  ChromaId,
  ChromaProp,
  CreatedAt,
  JsonProperty,
  UpdatedAt,
} from '../../index';

// ============================================================================
// 1. METADATA TYPE DEFINITIONS
// ============================================================================

/**
 * Complex preferences object demonstrating nested JSON handling
 */
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showLastSeen: boolean;
  };
  interests: string[];
  location?: {
    country: string;
    timezone: string;
  };
}

/**
 * Metadata type for Advanced User entity
 */
interface AdvancedUserMetadata {
  name: string;
  email: string;
  age: number;
  preferences: UserPreferences;
  tags: string[];
  verified: boolean;
  lastLoginAt: Date;
  profileScore: number;
}

/**
 * Metadata type for Event entity
 */
interface EventMetadata {
  title: string;
  eventDate: Date;
  duration: number;
  timeZone: string;
}

// ============================================================================
// 2. COMPLEX ENTITY WITH ADVANCED PROPERTY MAPPINGS
// ============================================================================

/**
 * User Profile entity demonstrating advanced property mapping patterns
 * Shows smart defaults, custom transformations, and validation
 */
@ChromaEntity({
  collection: 'user_profiles',
  description: 'Advanced user profile with complex property mappings',
  autoEmbed: true,
  embeddingFields: ['content', 'bio'],
  autoTimestamp: true,
  autoGenerateIds: true,
  idStrategy: 'uuid',
})
export class AdvancedUserEntity extends BaseChromaEntity<AdvancedUserMetadata> {
  @ChromaId()
  declare id: string;

  /**
   * Main content for embedding generation
   * Combines bio and interests for semantic search
   */
  @ChromaProp({
    description: 'User biography and interests for semantic matching',
    optional: false,
  })
  declare content: string;

  /**
   * Separate bio field with custom transformation
   * Shows how to handle rich text content
   */
  @ChromaProp({
    name: 'user_bio',
    description: 'Rich text biography with HTML stripping',
    transform: {
      toChroma: (bio: string) => {
        return (
          bio
            ?.replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim() || ''
        );
      },
      fromChroma: (bio: string) => bio || '',
    },
    validate: (value: string) => {
      if (!value || value.length < 10) {
        return 'Bio must be at least 10 characters';
      }
      return true;
    },
  })
  declare bio: string;

  /**
   * Email with automatic normalization (auto-detected by property name)
   * ChromaDB decorator automatically detects 'email' pattern and applies normalization
   */
  @ChromaProp({
    description: 'Auto-normalized email address',
    validate: (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) || 'Invalid email format';
    },
  })
  declare email: string;

  /**
   * Name with custom capitalization transformation
   */
  @ChromaProp({
    name: 'display_name',
    description: 'Properly capitalized display name',
    transform: {
      toChroma: (name: string) => {
        return (
          name
            ?.split(' ')
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(' ') || ''
        );
      },
      fromChroma: (name: string) => name || '',
    },
  })
  declare name: string;

  /**
   * Age with range validation
   */
  @ChromaProp({
    description: 'User age with validation',
    validate: (age: number) => {
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        return 'Age must be between 13 and 120';
      }
      return true;
    },
    transform: {
      toChroma: (age: number) => Math.floor(Number(age)),
      fromChroma: (age: string | number) => Number(age),
    },
  })
  declare age: number;

  /**
   * Complex nested object with JSON serialization
   * Uses @JsonProperty for automatic JSON handling
   */
  @JsonProperty({
    description: 'User preferences stored as JSON',
    validate: (prefs: UserPreferences) => {
      if (!prefs || typeof prefs !== 'object') {
        return 'Preferences must be a valid object';
      }
      return true;
    },
  })
  declare preferences: UserPreferences;

  /**
   * Array field with custom transformation
   * Demonstrates handling of array data
   */
  @ChromaProp({
    name: 'interest_tags',
    description: 'User interest tags (normalized and deduplicated)',
    transform: {
      toChroma: (tags: string[]) => {
        if (!Array.isArray(tags)) return '';
        const normalized = [
          ...new Set(
            tags
              .map((tag) => tag.toLowerCase().trim())
              .filter((tag) => tag.length > 0)
          ),
        ];
        return normalized.join(',');
      },
      fromChroma: (tagsStr: string) => {
        if (!tagsStr) return [];
        return tagsStr.split(',').filter((tag) => tag.length > 0);
      },
    },
  })
  declare tags: string[];

  /**
   * Boolean with string conversion handling
   */
  @ChromaProp({
    description: 'Email verification status',
    transform: {
      toChroma: (verified: boolean) => Boolean(verified),
      fromChroma: (verified: string | boolean) => {
        if (typeof verified === 'boolean') return verified;
        return verified === 'true' || verified === '1';
      },
    },
  })
  declare verified: boolean;

  /**
   * Custom date field (separate from auto-timestamps)
   * Shows manual date handling with validation
   */
  @ChromaProp({
    name: 'last_login_timestamp',
    description: 'Last login timestamp with validation',
    transform: {
      toChroma: (date: Date) => {
        if (!date) return null;
        return date instanceof Date
          ? date.toISOString()
          : new Date(date).toISOString();
      },
      fromChroma: (dateStr: string) => {
        if (!dateStr) return new Date(0);
        return new Date(dateStr);
      },
    },
    validate: (date: Date) => {
      const dateObj = new Date(date);
      const now = new Date();
      if (dateObj > now) {
        return 'Last login cannot be in the future';
      }
      return true;
    },
  })
  declare lastLoginAt: Date;

  /**
   * Calculated field with custom logic
   * Shows computed properties with caching
   */
  @ChromaProp({
    name: 'engagement_score',
    description: 'Calculated user engagement score',
    transform: {
      toChroma: (score: number) => {
        return Math.max(
          0,
          Math.min(100, Math.round(Number(score) * 100) / 100)
        );
      },
      fromChroma: (score: string | number) => Number(score) || 0,
    },
  })
  declare profileScore: number;

  declare metadata: AdvancedUserMetadata;
  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

/**
 * Entity demonstrating timestamp-focused transformations
 * Shows different timestamp handling strategies
 */
@ChromaEntity({
  collection: 'events',
  description: 'Event entity with complex timestamp handling',
  autoEmbed: true,
  embeddingFields: ['content'],
  autoTimestamp: true,
})
export class EventEntity extends BaseChromaEntity<EventMetadata> {
  @ChromaId()
  declare id: string;

  @ChromaProp()
  declare content: string;

  /**
   * Event date with timezone-aware transformation
   */
  @ChromaProp({
    name: 'scheduled_date',
    description: 'Event date with timezone handling',
    transform: {
      toChroma: (date: Date) => {
        if (!date) return null;
        return {
          utc: new Date(date).toISOString(),
          local: date.toString(),
          timestamp: new Date(date).getTime(),
        };
      },
      fromChroma: (dateObj: any) => {
        if (!dateObj) return new Date();
        if (typeof dateObj === 'string') return new Date(dateObj);
        return new Date(dateObj.timestamp || dateObj.utc);
      },
    },
  })
  declare eventDate: Date;

  /**
   * Duration in minutes with validation
   */
  @ChromaProp({
    description: 'Event duration in minutes',
    validate: (duration: number) => {
      const dur = Number(duration);
      if (isNaN(dur) || dur < 5 || dur > 1440) {
        return 'Duration must be between 5 minutes and 24 hours';
      }
      return true;
    },
    transform: {
      toChroma: (duration: number) => Math.max(5, Math.floor(Number(duration))),
      fromChroma: (duration: string | number) => Number(duration) || 30,
    },
    defaultValue: 30,
  })
  declare duration: number;

  /**
   * Timezone with normalization
   */
  @ChromaProp({
    name: 'event_timezone',
    description: 'Event timezone (normalized)',
    transform: {
      toChroma: (tz: string) => {
        if (!tz) return 'UTC';
        return tz.replace(/[^a-zA-Z0-9/+-]/g, '');
      },
      fromChroma: (tz: string) => tz || 'UTC',
    },
    defaultValue: 'UTC',
  })
  declare timeZone: string;

  declare metadata: EventMetadata;
  declare embedding?: readonly number[];

  @CreatedAt()
  declare createdAt?: string;

  @UpdatedAt()
  declare updatedAt?: string;

  declare version?: number;
}

// ============================================================================
// 3. DEMONSTRATION SERVICE
// ============================================================================

/**
 * Service demonstrating advanced property mapping patterns
 */
@Injectable()
export class AdvancedPropertyMappingsDemoService implements OnModuleInit {
  async onModuleInit() {
    console.log('\n🎯 Advanced Property Mappings Demo\n');
    await this.demonstrateEmailNormalization();
    await this.demonstrateCustomTransformations();
    await this.demonstrateJsonSerialization();
    await this.demonstrateValidationPatterns();
    await this.demonstrateTimestampHandling();
  }

  /**
   * Demonstrates automatic email normalization
   */
  private async demonstrateEmailNormalization(): Promise<void> {
    console.log('📧 Email Normalization Demo:');

    try {
      const testEmails = [
        'JOHN.DOE@EXAMPLE.COM',
        '  jane.smith@test.org  ',
        'BOB@DOMAIN.NET',
      ];

      console.log('  📥 Processing test emails:');

      for (const email of testEmails) {
        const user = new AdvancedUserEntity();
        user.email = email;
        user.name = 'Test User';
        user.bio = 'Test biography for demonstration purposes';
        user.content = 'Test user for email normalization demo';
        user.age = 30;
        user.preferences = {
          theme: 'light',
          language: 'en',
          notifications: { email: true, push: false, sms: false },
          privacy: {
            profileVisible: true,
            showEmail: false,
            showLastSeen: true,
          },
          interests: ['technology', 'music'],
        };
        user.tags = ['developer', 'music-lover'];
        user.verified = false;
        user.lastLoginAt = new Date();
        user.profileScore = 85.5;

        const chromaFormat = user.toChroma();

        console.log(`    📧 Original: "${email}"`);
        console.log(`    ✅ Normalized: "${chromaFormat.metadata?.email}"`);
        console.log('    ---');
      }
    } catch (error) {
      console.error(
        '  ❌ Error in email normalization:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates custom transformation functions
   */
  private async demonstrateCustomTransformations(): Promise<void> {
    console.log('🔄 Custom Transformations Demo:');

    try {
      const user = new AdvancedUserEntity();

      user.name = 'john doe smith';
      user.bio =
        '<p>I am a <strong>software developer</strong> with 5+ years of experience.</p>';
      user.content =
        'Software developer passionate about AI and machine learning';
      user.email = 'john@example.com';
      user.age = 28.7;
      user.tags = ['Developer', 'AI', 'Machine Learning', 'developer'];
      user.verified = false;
      user.lastLoginAt = new Date('2024-01-15T10:30:00Z');
      user.profileScore = 87.659;
      user.preferences = {
        theme: 'dark',
        language: 'en',
        notifications: { email: true, push: true, sms: false },
        privacy: { profileVisible: true, showEmail: false, showLastSeen: true },
        interests: ['AI', 'Machine Learning', 'Web Development'],
      };

      console.log('  📝 Original values:');
      console.log(`    Name: "${user.name}"`);
      console.log(`    Bio: "${user.bio}"`);
      console.log(`    Age: ${user.age}`);
      console.log(`    Tags: [${user.tags.join(', ')}]`);
      console.log(`    Score: ${user.profileScore}`);

      const chromaFormat = user.toChroma();

      console.log('  ✅ Transformed values:');
      console.log(`    Name: "${chromaFormat.metadata?.display_name}"`);
      console.log(`    Bio: "${chromaFormat.metadata?.user_bio}"`);
      console.log(`    Age: ${chromaFormat.metadata?.age}`);
      console.log(`    Tags: "${chromaFormat.metadata?.interest_tags}"`);
      console.log(`    Score: ${chromaFormat.metadata?.engagement_score}`);

      const restored = AdvancedUserEntity.fromChroma(chromaFormat);
      console.log('  🔄 Round-trip test:');
      console.log(`    Name intact: ${restored.name === 'John Doe Smith'}`);
      console.log(`    Bio clean: ${restored.bio.includes('<') === false}`);
      console.log(`    Age integer: ${Number.isInteger(restored.age)}`);
      console.log(`    Tags array: ${Array.isArray(restored.tags)}`);
    } catch (error) {
      console.error(
        '  ❌ Error in transformations:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates JSON serialization patterns
   */
  private async demonstrateJsonSerialization(): Promise<void> {
    console.log('📄 JSON Serialization Demo:');

    try {
      const complexPreferences: UserPreferences = {
        theme: 'auto',
        language: 'en-US',
        notifications: {
          email: true,
          push: false,
          sms: true,
        },
        privacy: {
          profileVisible: false,
          showEmail: false,
          showLastSeen: true,
        },
        interests: ['TypeScript', 'NestJS', 'ChromaDB', 'Vector Search'],
        location: {
          country: 'US',
          timezone: 'America/New_York',
        },
      };

      const user = new AdvancedUserEntity();
      user.preferences = complexPreferences;
      user.name = 'Jane Developer';
      user.email = 'jane@dev.com';
      user.bio = 'Full-stack developer specializing in AI applications';
      user.content =
        'Experienced developer working with vector databases and AI';
      user.age = 32;
      user.tags = ['typescript', 'nestjs', 'ai'];
      user.verified = true;
      user.lastLoginAt = new Date();
      user.profileScore = 95.0;

      console.log('  📥 Complex preferences object:');
      console.log(`    Theme: ${complexPreferences.theme}`);
      console.log(
        `    Notifications: ${
          Object.keys(complexPreferences.notifications).length
        } settings`
      );
      console.log(
        `    Interests: ${complexPreferences.interests.length} items`
      );
      console.log(`    Has location: ${!!complexPreferences.location}`);

      const chromaFormat = user.toChroma();

      console.log('  ✅ JSON serialization successful');
      console.log(
        `    Preferences stored as: ${typeof chromaFormat.metadata
          ?.preferences}`
      );

      if (typeof chromaFormat.metadata?.preferences === 'string') {
        const parsed = JSON.parse(chromaFormat.metadata.preferences);
        console.log(`    Parsed theme: ${parsed.theme}`);
        console.log(
          `    Parsed interests count: ${parsed.interests?.length || 0}`
        );
      }

      const restored = AdvancedUserEntity.fromChroma(chromaFormat);
      console.log('  🔄 Deserialization test:');
      console.log(
        `    Theme preserved: ${
          restored.preferences.theme === complexPreferences.theme
        }`
      );
      console.log(`    Location preserved: ${!!restored.preferences.location}`);
      console.log(
        `    Interests count: ${restored.preferences.interests.length}`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in JSON serialization:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates validation patterns and error handling
   */
  private async demonstrateValidationPatterns(): Promise<void> {
    console.log('✅ Validation Patterns Demo:');

    try {
      console.log('  🧪 Testing validation scenarios:');

      try {
        const user1 = new AdvancedUserEntity();
        user1.email = 'invalid-email';
        user1.name = 'Test User';
        user1.bio = 'Valid bio';
        user1.content = 'Valid content';
        user1.age = 25;

        console.log('    📧 Invalid email test: Validation should catch this');
      } catch (error) {
        console.log(
          `    ✅ Email validation: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      console.log('    🎂 Age validation tests:');
      const ageTests = [12, 25, 121];

      for (const age of ageTests) {
        const user = new AdvancedUserEntity();
        user.age = age;
        const chromaFormat = user.toChroma();
        console.log(
          `      Age ${age} → Stored as: ${chromaFormat.metadata?.age} (${
            age >= 13 && age <= 120 ? 'valid' : 'invalid range'
          })`
        );
      }

      const bioTests = [
        'Short',
        'This is a valid biography that meets the minimum length requirement',
      ];

      console.log('    📝 Bio validation tests:');
      for (const bio of bioTests) {
        console.log(
          `      Bio "${bio.substring(0, 20)}..." → ${
            bio.length >= 10 ? 'valid' : 'too short'
          }`
        );
      }

      console.log('    📅 Date validation tests:');
      const dateTests = [
        new Date('2020-01-01'),
        new Date(),
        new Date(Date.now() + 86400000),
      ];

      for (const date of dateTests) {
        const isValid = date <= new Date();
        console.log(
          `      ${date.toISOString().split('T')[0]} → ${
            isValid ? 'valid' : 'future date (invalid)'
          }`
        );
      }
    } catch (error) {
      console.error(
        '  ❌ Error in validation demo:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }

  /**
   * Demonstrates complex timestamp handling
   */
  private async demonstrateTimestampHandling(): Promise<void> {
    console.log('⏰ Timestamp Handling Demo:');

    try {
      const event = new EventEntity();
      event.content =
        'Annual team meeting to discuss quarterly goals and objectives';
      event.eventDate = new Date('2024-03-15T14:30:00-05:00');
      event.duration = 90;
      event.timeZone = 'America/New_York';

      event.metadata = {
        title: 'Q1 Team Meeting',
        eventDate: event.eventDate,
        duration: event.duration,
        timeZone: event.timeZone,
      };

      console.log('  📅 Original event data:');
      console.log(`    Date: ${event.eventDate.toISOString()}`);
      console.log(`    Local: ${event.eventDate.toString()}`);
      console.log(`    Duration: ${event.duration} minutes`);
      console.log(`    Timezone: ${event.timeZone}`);

      const chromaFormat = event.toChroma();

      console.log('  ✅ Transformed for storage:');
      const storedDate = chromaFormat.metadata?.scheduled_date;
      if (typeof storedDate === 'object' && storedDate !== null) {
        console.log(`    UTC: ${storedDate.utc}`);
        console.log(`    Local: ${storedDate.local}`);
        console.log(`    Timestamp: ${storedDate.timestamp}`);
      }
      console.log(`    Duration: ${chromaFormat.metadata?.duration} minutes`);
      console.log(`    Timezone: ${chromaFormat.metadata?.event_timezone}`);

      const restored = EventEntity.fromChroma(chromaFormat);
      console.log('  🔄 Restored event:');
      console.log(
        `    Date matches: ${
          restored.eventDate.getTime() === event.eventDate.getTime()
        }`
      );
      console.log(
        `    Duration preserved: ${restored.duration === event.duration}`
      );
      console.log(
        `    Timezone preserved: ${restored.timeZone === event.timeZone}`
      );
    } catch (error) {
      console.error(
        '  ❌ Error in timestamp handling:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log('');
  }
}

// ============================================================================
// 4. MODULE DEFINITION
// ============================================================================

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: process.env.CHROMADB_HOST || 'localhost',
        port: parseInt(process.env.CHROMADB_PORT || '8000', 10),
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          model: 'text-embedding-3-small',
        },
      },
      enableHealthCheck: false,
    }),
  ],
  providers: [AdvancedPropertyMappingsDemoService],
  exports: [AdvancedPropertyMappingsDemoService],
})
export class AdvancedPropertyMappingsExampleModule {}

// ============================================================================
// 5. ADVANCED PATTERNS AND BEST PRACTICES
// ============================================================================

/**
 * Advanced Property Mapping Best Practices:
 *
 * 1. **Smart Defaults**: Leverage auto-detection for common patterns (email, timestamps)
 * 2. **Validation**: Always validate critical business data at the property level
 * 3. **Transformations**: Use bidirectional transforms for data normalization
 * 4. **JSON Handling**: Use @JsonProperty for complex nested objects
 * 5. **Type Safety**: Maintain TypeScript types through all transformations
 * 6. **Error Handling**: Provide meaningful validation error messages
 * 7. **Performance**: Cache validation results for computed properties
 * 8. **Consistency**: Use consistent naming patterns for ChromaDB field names
 *
 * Common Advanced Patterns:
 *
 * ```typescript
 * // ✅ Rich transformation with validation
 * @ChromaProp({
 *   transform: {
 *     toChroma: (value) => processForStorage(value),
 *     fromChroma: (value) => processFromStorage(value),
 *   },
 *   validate: (value) => businessRuleValidation(value),
 *   description: 'Clear description of the field purpose',
 * })
 *
 * // ✅ Smart defaults with fallbacks
 * @ChromaProp({
 *   defaultValue: () => calculateDefaultValue(),
 *   optional: true,
 * })
 *
 * // ✅ Complex JSON with nested validation
 * @JsonProperty({
 *   validate: (obj) => validateComplexObject(obj),
 *   description: 'Structured data with business rules',
 * })
 * ```
 */
