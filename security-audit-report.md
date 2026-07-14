# Security Audit Report

**Generated:** 2026-07-14T09:40:50.982Z
**Base URL:** https://wmos.buildingcultureid.space
**Verdict:** PASS (8 pass, 4 warn, 0 fail)

| Status | Check | Detail |
|--------|-------|--------|
| WARN | npm audit (root) | 14 high/critical — run npm audit fix |
| WARN | npm audit (enagement) | 3 high/critical — run npm audit fix |
| WARN | npm audit (agentx) | 3 high/critical — run npm audit fix |
| PASS | Settlement endpoint locked | HTTP 401 |
| PASS | Worker tick locked | HTTP 401 |
| PASS | Internal superfan award locked | HTTP 403 |
| PASS | Admin dashboard locked | HTTP 401 |
| PASS | Place prediction requires session | HTTP 401 |
| PASS | Webacy API key valid | sanctions endpoint returned 200 for test wallet |
| WARN | Health reports Webacy configured | API key present locally but /api/health.webacyConfigured is not true |
| PASS | Security headers on /api/health | X-Content-Type-Options, X-Frame-Options, Content-Security-Policy |
| PASS | HSTS on HTTPS | max-age=31536000; includeSubDomains |

Re-run: `BASE_URL=https://wmos.buildingcultureid.space npm run security:audit`