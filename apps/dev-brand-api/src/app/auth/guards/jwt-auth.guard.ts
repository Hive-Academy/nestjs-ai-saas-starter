import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { AuthService } from '../services/auth.service';

/**
 * JWT Authentication Guard
 *
 * Protects routes by validating JWT tokens from HTTP-only cookies.
 * Attaches validated user information to the request object and CLS context.
 *
 * **CRITICAL**: This guard populates both `request.user` and ClsService('user'),
 * which are required by:
 * - Neo4j security decorators (`@RequireAuth`, `@TenantIsolation`)
 * - ChromaDB `@TenantAware` decorator
 * - LangGraph workflow context injection
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly cls: ClsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract JWT token from HTTP-only cookie
    const token = request.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException(
        'No authentication token provided. Please login.'
      );
    }

    try {
      // Validate token and extract user information
      const user = await this.authService.validateToken(token);

      // Attach user to request object
      request.user = user;

      // Set user in CLS async context for Neo4j/ChromaDB security decorators
      this.cls.set('user', user);

      return true;
    } catch (error: any) {
      throw new UnauthorizedException(
        `Authentication failed: ${error.message}`
      );
    }
  }
}
