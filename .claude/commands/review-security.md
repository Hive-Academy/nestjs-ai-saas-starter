# Security Review

Automatically reviews changed files for potential security issues including API keys, credentials, sensitive data, and common security vulnerabilities.

Review the changed files for security vulnerabilities and issues. Focus on:

## Security Assessment Areas

### 1. Credential Detection
Look for hardcoded API keys, passwords, tokens, secrets, database connection strings, or other sensitive credentials

### 2. Environment Variables
Check for exposed sensitive environment variables or improper handling of secrets

### 3. SQL Injection
Identify potential SQL injection vulnerabilities in database queries

### 4. XSS Vulnerabilities
Look for cross-site scripting risks in frontend code

### 5. Authentication/Authorization
Review auth logic for bypass vulnerabilities or weak implementations

### 6. Data Exposure
Check for sensitive data being logged, exposed in APIs, or improperly handled

### 7. Dependency Vulnerabilities
Flag suspicious or potentially vulnerable dependencies

### 8. Configuration Issues
Review security-related configuration files for misconfigurations

### 9. Input Validation
Ensure proper validation and sanitization of user inputs

### 10. CORS/Security Headers
Check for proper security header configurations

## Required Reporting

For each security issue found:
- Clearly identify the file and line number
- Explain the security risk and potential impact
- Provide specific remediation recommendations
- Rate the severity (Critical/High/Medium/Low)

If no security issues are found, confirm that the changes appear secure from a security perspective.

## Target File Types

This security review applies to:
- `**/*.ts` - TypeScript files
- `**/*.js` - JavaScript files
- `**/*.tsx` - React TypeScript files
- `**/*.jsx` - React JavaScript files
- `**/*.json` - JSON configuration files
- `**/*.env` - Environment variable files
- `**/*.yml` - YAML configuration files
- `**/*.yaml` - YAML configuration files
- `**/*.md` - Markdown documentation
- `**/*.sql` - SQL files
- `**/*.prisma` - Prisma schema files