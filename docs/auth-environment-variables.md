# Authentication Environment Variables

## Required Variables

### WorkOS Configuration

```bash
# WorkOS API Key (from WorkOS Dashboard → API Keys)
WORKOS_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WorkOS Client ID (from WorkOS Dashboard → Configuration)
WORKOS_CLIENT_ID=client_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OAuth Redirect URI (where WorkOS redirects after authentication)
# Development: http://localhost:3000/api/auth/callback
# Production: https://yourdomain.com/api/auth/callback
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Optional: Logout redirect URI
WORKOS_LOGOUT_REDIRECT_URI=http://localhost:4200

```

### JWT Configuration

```bash
# JWT Secret (generate a strong random string)
# Example: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-changeme

# JWT Expiration Time (default: 7d)
JWT_EXPIRES_IN=7d
```

### Frontend Configuration

```bash
# Frontend URL (for redirect after authentication)
# Development:
FRONTEND_URL=http://localhost:4200

# Production:
# FRONTEND_URL=https://yourdomain.com
```

## Setup Instructions

### 1. Create WorkOS Account

1. Sign up at [workos.com](https://workos.com/)
2. Create a new organization
3. Navigate to **API Keys** and copy your API key
4. Navigate to **Configuration** and copy your ClientID
5. Add redirect URIs to your WorkOS application

### 2. Configure Environment Variables

1. Copy `.env.app.example` to `.env.app` (if not already done)
2. Add the variables above to `.env.app`
3. **IMPORTANT**: Never commit `.env.app` to version control!

### 3. Generate JWT Secret

```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

## Testing

### Test Authentication Flow

1. Start the server: `npx nx serve dev-brand-api`
2. Visit `http://localhost:3000/api/auth/login`
3. Complete WorkOS authentication
4. You should be redirected to `http://localhost:4200` with an `access_token` cookie
5. Test protected endpoint: `curl http://localhost:3000/api/auth/me` (with cookie)

### Test Protected Routes

All endpoints with `@UseGuards(JwtAuthGuard)` require authentication:

- `GET /api/auth/me` - Get current user info
- `GET /api/research/conversation/list` - User's conversations
- `GET /api/research/conversation/history/:threadId` - Conversation history
- `POST /api/research/conversation` - Create new conversation

### Expected Response (GET /api/auth/me)

```json
{
  "id": "user_xxxxxxxxxxxxx",
  "email": "user@example.com",
  "tenantId": "org_xxxxxxxxxxxxx",
  "organizationId": "org_xxxxxxxxxxxxx",
  "roles": ["user"],
  "permissions": ["read:docs", "write:docs"],
  "tier": "pro"
}
```

## Security Notes

1. **HTTP-Only Cookies**: JWT tokens are stored in HTTP-only cookies to prevent XSS attacks
2. **HTTPS in Production**: Always use HTTPS in production (`secure: true` cookie flag)
3. **SameSite Protection**: Cookies use `sameSite: 'lax'` to prevent CSRF attacks
4. **Token Expiration**: JWTs expire after 7 days by default (configurable via `JWT_EXPIRES_IN`)
5. **Secret Rotation**: Rotate `JWT_SECRET` periodically for enhanced security

## Multi-Tenant Isolation

The JWT payload includes `tenantId` which is used for:

- **Neo4j**: `@TenantIsolation` decorator filters queries by `tenantId`
- **ChromaDB**: `@TenantAware` decorator creates tenant-specific collections
- **LangGraph**: User context injected into `RunnableConfig` for workflow isolation
- **HITL**: Approvals scoped to user's tenant

## Troubleshooting

### "No authentication token provided"

- Check that the login flow completed successfully
- Verify `access_token` cookie is set in browser DevTools → Application → Cookies
- Ensure frontend is making requests with credentials: `credentials: 'include'`

### "Invalid or expired token"

- Token may have expired (check `JWT_EXPIRES_IN`)
- JWT secret may have changed (invalidates all existing tokens)
- Re-authenticate via `/api/auth/login`

### "WorkOS API Key not configured"

- Verify `WORKOS_API_KEY` is set in `.env.app`
- Check that EnvLoader is correctly loading `.env.app`
- Restart the server after updating environment variables

### Neo4j "No request context available"

- This error should now be FIXED ✅
- Verify `@UseGuards(JwtAuthGuard)` is applied to the endpoint
- Check that `request.user` is populated (add logging if needed)
