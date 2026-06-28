# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub Issue for security vulnerabilities.**

Instead, email the maintainers with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive a response within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Security Considerations

### Authentication

- **Password hashing**: PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt, 32-byte hash. Stored as `hex(salt).hex(hash)`.
- **JWT tokens**: HS256 algorithm via the jose library, 24-hour expiry. Payload contains user ID, codename, role, and clearance level.
- **JWT_SECRET**: The default value in `wrangler.toml` is a placeholder. You **must** change it before deploying to production.

### CORS

- CORS origins are configured via the `CORS_ORIGINS` environment variable in `wrangler.toml`.
- Supports exact match and wildcard subdomain patterns (e.g., `https://*.scp.lat`).
- Credentials are enabled for authenticated cross-origin requests.
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS.

### Input Validation

All user input is validated server-side before database operations:

- **Codenames**: 3-32 characters, alphanumeric and underscore only (`/^[a-zA-Z0-9_]+$/`)
- **Passwords**: 8-128 characters
- **Profile updates**: Current password required when changing password

### Database

- Uses Cloudflare D1 (SQLite-based) with parameterized queries.
- 12 tables: `users`, `scp_entries`, `crawl_state`, `browsing_history`, `bookmarks`, `proposals`, `proposal_votes`, `entry_reports`, `system_logs`, `ai_conversations`, `tag_categories`, `tags`, `entry_tags`.
- Unique constraint on `users.codename`.
- Index on codename for efficient lookups.

## Production Checklist

Before deploying to production:

1. [ ] Change `JWT_SECRET` in `wrangler.toml` to a strong, unique secret
2. [ ] Set `GLM_API_KEY` for AI chat functionality
3. [ ] Verify `CORS_ORIGINS` only includes your actual domains
4. [ ] Ensure D1 database bindings are correctly configured
5. [ ] Verify Durable Object bindings are configured
6. [ ] Review and test all authentication flows
7. [ ] Enable Cloudflare's built-in DDoS protection
