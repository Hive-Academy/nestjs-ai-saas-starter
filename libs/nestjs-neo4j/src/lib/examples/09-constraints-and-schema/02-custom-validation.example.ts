/**
 * @fileoverview Custom Validation Examples
 *
 * This file demonstrates comprehensive usage patterns for the @Validate decorator including:
 * - Business logic validation with custom rules
 * - Async validation scenarios with external services
 * - Cross-field validation patterns
 * - Format validation with industry-specific requirements
 * - Complex validation workflows
 *
 * Real-world scenarios covered:
 * - E-commerce product validation with business rules
 * - Financial data validation with regulatory compliance
 * - User registration with complex password policies
 * - Content validation with moderation rules
 * - Multi-tenant data validation with context awareness
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProp,
  Validate,
  Email,
  Range,
  Length,
  Pattern,
  Custom,
  Id,
  CreatedAt,
  UpdatedAt,
  InjectNeo4j,
  Neo4jService
} from '../../../index';

// =============================================================================
// E-COMMERCE PRODUCT VALIDATION WITH BUSINESS RULES
// =============================================================================

/**
 * Product entity with comprehensive business validation
 */
@Neo4jEntity('ValidatedProduct')
export class ValidatedProductEntity {
  @Id()
  id: string;

  @Neo4jProp()
  @Length({ min: 5, max: 100 }, {
    errorMessage: 'Product name must be between 5 and 100 characters'
  })
  @Custom({
    validator: async (value: string) => {
      // Check for prohibited words
      const prohibited = ['spam', 'fake', 'scam', 'illegal'];
      const lowerValue = value.toLowerCase();
      return !prohibited.some(word => lowerValue.includes(word));
    },
    message: 'Product name contains prohibited content'
  })
  name: string;

  @Neo4jProp()
  @Pattern(/^[A-Z0-9]{3,}-[A-Z0-9]{3,}$/, {
    errorMessage: 'SKU must follow format XXX-XXX with uppercase letters and numbers'
  })
  @Custom({
    async: true,
    validator: async (value: string, entity: ValidatedProductEntity) => {
      // Validate SKU uniqueness (would typically check database)
      // This is a simplified example
      if (value === 'TEST-SKU') {
        return false;
      }
      return true;
    },
    message: 'SKU must be unique'
  })
  sku: string;

  @Neo4jProp()
  @Range({ min: 0.01, max: 999999.99 }, {
    errorMessage: 'Price must be between $0.01 and $999,999.99'
  })
  @Custom({
    validator: (value: number, entity: ValidatedProductEntity) => {
      // Business rule: Digital products can't exceed $500
      if (entity.category === 'DIGITAL' && value > 500) {
        return 'Digital products cannot exceed $500.00';
      }

      // Business rule: Physical products must be at least $1
      if (entity.category === 'PHYSICAL' && value < 1) {
        return 'Physical products must be at least $1.00';
      }

      return true;
    },
    message: 'Price violates business rules'
  })
  price: number;

  @Neo4jProp()
  @Validate({
    validation: {
      format: { pattern: /^(PHYSICAL|DIGITAL|SERVICE)$/ },
      required: true
    },
    errorMessage: 'Category must be PHYSICAL, DIGITAL, or SERVICE'
  })
  category: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';

  @Neo4jProp()
  @Length({ min: 10, max: 2000 }, {
    errorMessage: 'Description must be between 10 and 2000 characters'
  })
  @Custom({
    validator: (value: string) => {
      // Check description quality
      const wordCount = value.split(/\s+/).length;
      const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

      if (wordCount < 5) {
        return 'Description must contain at least 5 words';
      }

      if (sentences < 2 && wordCount > 20) {
        return 'Longer descriptions should contain multiple sentences';
      }

      // Check for repetitive content
      const words = value.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      if (uniqueWords.size / words.length < 0.5 && words.length > 20) {
        return 'Description appears to be too repetitive';
      }

      return true;
    },
    message: 'Description does not meet quality standards'
  })
  description: string;

  @Neo4jProp()
  @Range({ min: 0, max: 999999 }, {
    errorMessage: 'Inventory must be between 0 and 999,999'
  })
  @Custom({
    validator: (value: number, entity: ValidatedProductEntity) => {
      // Digital products don't need inventory tracking
      if (entity.category === 'DIGITAL' && value !== -1) {
        return 'Digital products should have inventory set to -1 (unlimited)';
      }

      // Physical products need positive inventory
      if (entity.category === 'PHYSICAL' && value < 0) {
        return 'Physical products must have non-negative inventory';
      }

      return true;
    },
    message: 'Inventory value is invalid for product category'
  })
  inventory: number;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (value: string[]) => {
          if (!Array.isArray(value)) {
            return 'Tags must be an array';
          }

          if (value.length > 10) {
            return 'Maximum 10 tags allowed';
          }

          // Check tag format
          const invalidTags = value.filter(tag =>
            typeof tag !== 'string' ||
            tag.length < 2 ||
            tag.length > 30 ||
            !/^[a-zA-Z0-9\s-]+$/.test(tag)
          );

          if (invalidTags.length > 0) {
            return `Invalid tags: ${invalidTags.join(', ')}. Tags must be 2-30 characters, alphanumeric with spaces and dashes only`;
          }

          return true;
        },
        message: 'Invalid tags format'
      }
    }
  })
  tags?: string[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// FINANCIAL DATA VALIDATION WITH REGULATORY COMPLIANCE
// =============================================================================

/**
 * Bank account entity with strict financial validation
 */
@Neo4jEntity('BankAccount')
export class BankAccountEntity {
  @Id()
  id: string;

  @Neo4jProp()
  @Pattern(/^\d{10,12}$/, {
    errorMessage: 'Account number must be 10-12 digits'
  })
  @Custom({
    async: true,
    validator: async (value: string) => {
      // Luhn algorithm check (simplified)
      const digits = value.split('').map(Number);
      let sum = 0;
      let alternate = false;

      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = digits[i];

        if (alternate) {
          digit *= 2;
          if (digit > 9) {
            digit = Math.floor(digit / 10) + (digit % 10);
          }
        }

        sum += digit;
        alternate = !alternate;
      }

      return sum % 10 === 0;
    },
    message: 'Account number fails checksum validation'
  })
  accountNumber: string;

  @Neo4jProp()
  @Pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/, {
    errorMessage: 'Invalid IBAN format'
  })
  @Custom({
    validator: (value: string) => {
      // IBAN validation (simplified)
      const rearranged = value.substring(4) + value.substring(0, 4);
      const numericString = rearranged.replace(/[A-Z]/g, (char) => {
        return (char.charCodeAt(0) - 55).toString();
      });

      // Mod 97 check
      let remainder = '';
      for (let i = 0; i < numericString.length; i++) {
        remainder = (remainder + numericString[i]).replace(/^0+/, '');
        if (remainder.length >= 7) {
          remainder = (parseInt(remainder) % 97).toString();
        }
      }

      return parseInt(remainder) % 97 === 1;
    },
    message: 'IBAN fails validation check'
  })
  iban?: string;

  @Neo4jProp()
  @Pattern(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    errorMessage: 'Invalid SWIFT/BIC code format'
  })
  swiftCode?: string;

  @Neo4jProp()
  @Validate({
    validation: {
      format: { pattern: /^[A-Z]{3}$/ },
      required: true
    },
    errorMessage: 'Currency must be a valid 3-letter ISO code'
  })
  @Custom({
    validator: (value: string) => {
      const supportedCurrencies = [
        'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'
      ];
      return supportedCurrencies.includes(value);
    },
    message: 'Currency is not supported'
  })
  currency: string;

  @Neo4jProp()
  @Range({ min: -1000000, max: 1000000 }, {
    errorMessage: 'Balance must be within allowed limits'
  })
  @Custom({
    validator: (value: number, entity: BankAccountEntity) => {
      // Regulatory compliance: Check for large deposits
      if (value > 100000) {
        // In a real system, this would trigger additional reporting
        console.log(`Large balance detected: ${value} ${entity.currency}`);
      }

      // Business rule: Savings accounts can't go negative
      if (entity.accountType === 'SAVINGS' && value < 0) {
        return 'Savings accounts cannot have negative balances';
      }

      return true;
    },
    message: 'Balance violates account type rules'
  })
  balance: number;

  @Neo4jProp()
  @Validate({
    validation: {
      format: { pattern: /^(CHECKING|SAVINGS|CREDIT|INVESTMENT)$/ },
      required: true
    }
  })
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT';

  @Neo4jProp()
  @Custom({
    validator: (value: string, entity: BankAccountEntity) => {
      if (!value) return true; // Optional field

      // Tax ID format validation by country
      const countryFormats = {
        'US': /^\d{3}-\d{2}-\d{4}$/, // SSN format
        'GB': /^[A-Z]{2}\d{6}[A-Z]$/, // UK National Insurance
        'DE': /^\d{2}\s\d{3}\s\d{3}\s\d{3}$/, // German tax number
      };

      // Simplified country detection from IBAN
      const country = entity.iban?.substring(0, 2) || 'US';
      const format = countryFormats[country];

      if (format && !format.test(value)) {
        return `Tax ID format invalid for country ${country}`;
      }

      return true;
    },
    message: 'Tax ID format is invalid'
  })
  taxId?: string;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// USER REGISTRATION WITH COMPLEX PASSWORD POLICIES
// =============================================================================

/**
 * User registration entity with comprehensive password validation
 */
@Neo4jEntity('SecureUser')
export class SecureUserEntity {
  @Id()
  id: string;

  @Neo4jProp()
  @Length({ min: 2, max: 50 })
  @Pattern(/^[a-zA-Z\s'-]+$/, {
    errorMessage: 'Name can only contain letters, spaces, apostrophes, and hyphens'
  })
  @Custom({
    validator: (value: string) => {
      // Check for suspicious patterns
      if (/(.)\1{3,}/.test(value)) {
        return 'Name cannot contain more than 3 consecutive identical characters';
      }

      // Check for common test values
      const testNames = ['test', 'admin', 'user', 'demo'];
      if (testNames.some(name => value.toLowerCase().includes(name))) {
        return 'Name appears to be a test value';
      }

      return true;
    },
    message: 'Name format is suspicious'
  })
  name: string;

  @Neo4jProp()
  @Email({ required: true })
  @Custom({
    async: true,
    validator: async (value: string) => {
      // Check email domain against blocklist
      const domain = value.split('@')[1];
      const blockedDomains = [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'mailinator.com', 'throwaway.email'
      ];

      if (blockedDomains.includes(domain)) {
        return 'Temporary email addresses are not allowed';
      }

      // Check if domain has MX record (simplified check)
      // In a real implementation, you'd use DNS resolution
      if (domain.endsWith('.test') || domain.endsWith('.invalid')) {
        return 'Invalid email domain';
      }

      return true;
    },
    message: 'Email address is not acceptable'
  })
  email: string;

  @Neo4jProp()
  @Length({ min: 12, max: 128 }, {
    errorMessage: 'Password must be between 12 and 128 characters'
  })
  @Custom({
    validator: (value: string, entity: SecureUserEntity) => {
      const errors = [];

      // Character type requirements
      if (!/[a-z]/.test(value)) {
        errors.push('at least one lowercase letter');
      }

      if (!/[A-Z]/.test(value)) {
        errors.push('at least one uppercase letter');
      }

      if (!/\d/.test(value)) {
        errors.push('at least one number');
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        errors.push('at least one special character');
      }

      // Common password patterns
      if (/123456|password|qwerty|abc123/i.test(value)) {
        errors.push('no common password patterns');
      }

      // Dictionary words (simplified check)
      const commonWords = ['password', 'admin', 'user', 'login', 'welcome'];
      if (commonWords.some(word => value.toLowerCase().includes(word))) {
        errors.push('no common dictionary words');
      }

      // Personal information check
      if (entity.name && value.toLowerCase().includes(entity.name.toLowerCase())) {
        errors.push('no personal information (name)');
      }

      if (entity.email) {
        const emailParts = entity.email.split('@')[0];
        if (value.toLowerCase().includes(emailParts.toLowerCase())) {
          errors.push('no personal information (email)');
        }
      }

      // Repeated characters
      if (/(.)\1{2,}/.test(value)) {
        errors.push('no more than 2 consecutive identical characters');
      }

      // Sequential characters
      if (/012|123|234|345|456|567|678|789|abc|bcd|cde|def/i.test(value)) {
        errors.push('no sequential characters');
      }

      if (errors.length > 0) {
        return `Password must contain ${errors.join(', ')}`;
      }

      return true;
    },
    message: 'Password does not meet security requirements'
  })
  password: string;

  @Neo4jProp()
  @Pattern(/^\+?[\d\s\-()]+$/, {
    errorMessage: 'Invalid phone number format'
  })
  @Length({ min: 10, max: 15 })
  @Custom({
    validator: (value: string) => {
      // Remove all non-digits
      const digitsOnly = value.replace(/\D/g, '');

      // Check minimum digit count
      if (digitsOnly.length < 10) {
        return 'Phone number must contain at least 10 digits';
      }

      // Check for suspicious patterns
      if (/^(\d)\1+$/.test(digitsOnly)) {
        return 'Phone number cannot be all the same digit';
      }

      if (digitsOnly === '1234567890' || digitsOnly === '0123456789') {
        return 'Phone number appears to be a test number';
      }

      return true;
    },
    message: 'Phone number format is invalid'
  })
  phone?: string;

  @Neo4jProp()
  @Custom({
    validator: (value: Date) => {
      if (!value) return true; // Optional field

      const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      if (age < 13) {
        return 'User must be at least 13 years old';
      }

      if (age > 120) {
        return 'Invalid birth date (too old)';
      }

      if (value > new Date()) {
        return 'Birth date cannot be in the future';
      }

      return true;
    },
    message: 'Invalid birth date'
  })
  dateOfBirth?: Date;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}

// =============================================================================
// CONTENT VALIDATION WITH MODERATION RULES
// =============================================================================

/**
 * Content entity with comprehensive moderation validation
 */
@Neo4jEntity('ModeratedContent')
export class ModeratedContentEntity {
  @Id()
  id: string;

  @Neo4jProp()
  @Length({ min: 5, max: 200 })
  @Custom({
    validator: (value: string) => {
      // Title quality checks
      if (value.toUpperCase() === value && value.length > 10) {
        return 'Title cannot be all uppercase';
      }

      if (!/[a-zA-Z]/.test(value)) {
        return 'Title must contain at least some letters';
      }

      // Check for clickbait patterns
      const clickbaitPhrases = [
        'you won\'t believe',
        'shocking truth',
        'doctors hate',
        'one weird trick',
        'this will blow your mind'
      ];

      const lowerTitle = value.toLowerCase();
      if (clickbaitPhrases.some(phrase => lowerTitle.includes(phrase))) {
        return 'Title appears to be clickbait';
      }

      return true;
    },
    message: 'Title does not meet content standards'
  })
  title: string;

  @Neo4jProp()
  @Length({ min: 50, max: 50000 })
  @Custom({
    async: true,
    validator: async (value: string) => {
      // Content quality analysis
      const wordCount = value.split(/\s+/).length;
      const sentences = value.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const avgWordsPerSentence = wordCount / sentences;

      // Readability checks
      if (avgWordsPerSentence > 30) {
        return 'Content may be difficult to read (sentences too long)';
      }

      // Spam detection (simplified)
      const repeatedPhrases = this.findRepeatedPhrases(value);
      if (repeatedPhrases.length > 0) {
        return `Repeated phrases detected: ${repeatedPhrases.join(', ')}`;
      }

      // Profanity check (would use external service in production)
      const profanityWords = ['badword1', 'badword2']; // Simplified
      const containsProfanity = profanityWords.some(word =>
        value.toLowerCase().includes(word)
      );

      if (containsProfanity) {
        return 'Content contains inappropriate language';
      }

      return true;
    },
    message: 'Content does not meet moderation standards'
  })
  body: string;

  @Neo4jProp()
  @Validate({
    validation: {
      custom: {
        validator: (value: string[]) => {
          if (!Array.isArray(value)) return 'Tags must be an array';

          if (value.length > 15) {
            return 'Maximum 15 tags allowed';
          }

          // Check for tag spam
          const tagCounts = new Map<string, number>();
          value.forEach(tag => {
            const count = tagCounts.get(tag.toLowerCase()) || 0;
            tagCounts.set(tag.toLowerCase(), count + 1);
          });

          const duplicateTags = Array.from(tagCounts.entries())
            .filter(([tag, count]) => count > 1)
            .map(([tag]) => tag);

          if (duplicateTags.length > 0) {
            return `Duplicate tags found: ${duplicateTags.join(', ')}`;
          }

          return true;
        },
        message: 'Invalid tags configuration'
      }
    }
  })
  tags?: string[];

  @Neo4jProp()
  @Validate({
    validation: {
      format: { pattern: /^(DRAFT|PENDING|APPROVED|REJECTED|PUBLISHED)$/ },
      required: true
    }
  })
  @Custom({
    validator: (value: string, entity: ModeratedContentEntity) => {
      // Status transition rules
      if (value === 'PUBLISHED' && !entity.body) {
        return 'Content body is required for publication';
      }

      if (value === 'PUBLISHED' && entity.body && entity.body.length < 100) {
        return 'Published content must be at least 100 characters';
      }

      return true;
    },
    message: 'Status transition is not allowed'
  })
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  // Utility method for repeated phrase detection
  private findRepeatedPhrases(text: string): string[] {
    const phrases = new Map<string, number>();
    const words = text.toLowerCase().split(/\s+/);

    // Check for 3-word phrases
    for (let i = 0; i <= words.length - 3; i++) {
      const phrase = words.slice(i, i + 3).join(' ');
      phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
    }

    return Array.from(phrases.entries())
      .filter(([phrase, count]) => count >= 3)
      .map(([phrase]) => phrase);
  }
}

// =============================================================================
// VALIDATION SERVICE DEMONSTRATING USAGE PATTERNS
// =============================================================================

/**
 * Service demonstrating how to use validation in practice
 */
@Injectable()
export class ValidationDemonstrationService {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  /**
   * Create product with comprehensive validation
   */
  async createValidatedProduct(productData: any): Promise<ValidatedProductEntity> {
    // Create entity instance
    const product = new ValidatedProductEntity();
    Object.assign(product, productData);

    // Run all validations
    const validationResult = await this.validateAllProperties(product);

    if (!validationResult.valid) {
      throw new BadRequestException(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Save to database (simplified)
    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        CREATE (p:ValidatedProduct $props)
        RETURN p
      `, { props: product });

      return result.records[0].get('p').properties;
    });
  }

  /**
   * Validate user registration
   */
  async validateUserRegistration(userData: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const user = new SecureUserEntity();
    Object.assign(user, userData);

    const validationResult = await this.validateAllProperties(user);
    const warnings = [];

    // Additional business validation
    if (user.email && await this.isEmailAlreadyRegistered(user.email)) {
      validationResult.valid = false;
      validationResult.errors.push('Email address is already registered');
    }

    // Password strength warnings
    if (user.password && user.password.length < 16) {
      warnings.push('Consider using a longer password for better security');
    }

    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings
    };
  }

  /**
   * Validate content for moderation
   */
  async validateContentForModeration(contentData: any): Promise<{
    valid: boolean;
    errors: string[];
    moderationFlags: string[];
    recommendedStatus: string;
  }> {
    const content = new ModeratedContentEntity();
    Object.assign(content, contentData);

    const validationResult = await this.validateAllProperties(content);
    const moderationFlags = [];
    let recommendedStatus = 'APPROVED';

    // Additional moderation checks
    if (content.body) {
      const suspiciousWords = this.checkForSuspiciousContent(content.body);
      if (suspiciousWords.length > 0) {
        moderationFlags.push(`Suspicious words: ${suspiciousWords.join(', ')}`);
        recommendedStatus = 'PENDING';
      }

      const readabilityScore = this.calculateReadabilityScore(content.body);
      if (readabilityScore < 30) {
        moderationFlags.push('Content may be difficult to read');
      }
    }

    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      moderationFlags,
      recommendedStatus
    };
  }

  /**
   * Generic property validation method
   */
  private async validateAllProperties(entity: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const constructor = entity.constructor;

    // Get all validation methods on the entity
    const propertyNames = Object.getOwnPropertyNames(entity);

    for (const prop of propertyNames) {
      const validationMethodName = `validateProperty_${prop}`;

      if (typeof entity[validationMethodName] === 'function') {
        try {
          const result = await entity[validationMethodName]();
          if (!result.valid) {
            errors.push(...result.errors);
          }
        } catch (error) {
          errors.push(`Validation error for ${prop}: ${error.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if email is already registered (simplified)
   */
  private async isEmailAlreadyRegistered(email: string): Promise<boolean> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (u:SecureUser {email: $email})
        RETURN count(u) > 0 as exists
      `, { email });

      return result.records[0].get('exists');
    });
  }

  /**
   * Check for suspicious content patterns
   */
  private checkForSuspiciousContent(text: string): string[] {
    const suspicious = [];
    const lowerText = text.toLowerCase();

    // Check for excessive capitalization
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (upperCaseRatio > 0.3) {
      suspicious.push('excessive capitalization');
    }

    // Check for excessive exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 5) {
      suspicious.push('excessive exclamation marks');
    }

    // Check for spam patterns
    const spamPatterns = [
      'buy now', 'limited time', 'act now', 'free money', 'get rich quick'
    ];

    spamPatterns.forEach(pattern => {
      if (lowerText.includes(pattern)) {
        suspicious.push(`spam pattern: ${pattern}`);
      }
    });

    return suspicious;
  }

  /**
   * Calculate basic readability score (simplified Flesch formula)
   */
  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    // Simplified Flesch Reading Ease formula
    return 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  }

  /**
   * Count syllables in text (simplified)
   */
  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
      .replace(/^y/, '')
      .match(/[aeiouy]{1,2}/g)?.length || 1;
  }
}

// Export all entities and services for use in other modules
export {
  ValidatedProductEntity,
  BankAccountEntity,
  SecureUserEntity,
  ModeratedContentEntity,
  ValidationDemonstrationService
};

/**
 * Custom Validation Best Practices Summary:
 *
 * 1. **Business Rule Integration**:
 *    - Use custom validators for business-specific rules
 *    - Validate cross-field dependencies
 *    - Implement industry-specific compliance checks
 *
 * 2. **Async Validation**:
 *    - Use for database uniqueness checks
 *    - External service validation (email, addresses)
 *    - Complex calculations and lookups
 *
 * 3. **Error Message Quality**:
 *    - Provide specific, actionable error messages
 *    - Include context about what's expected
 *    - Use consistent error message formats
 *
 * 4. **Performance Considerations**:
 *    - Cache validation results when appropriate
 *    - Combine related validations efficiently
 *    - Use sync validation when possible
 *
 * 5. **Security Integration**:
 *    - Validate against security patterns
 *    - Check for suspicious content
 *    - Implement rate limiting for validation-heavy operations
 *
 * 6. **Composition Patterns**:
 *    - Combine multiple validation decorators
 *    - Use shorthand decorators for common patterns
 *    - Create reusable validation functions
 */
