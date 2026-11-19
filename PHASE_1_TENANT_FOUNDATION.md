# Phase 1 — Tenant foundation design

## Goal

Prepare the platform to host multiple casino operators safely on shared services. Every operator is a tenant with independent players, staff, branding, policies, provider configuration, catalog, and reporting.

This design does not select a launch province, legal operating model, payment vendor, or game provider. Those decisions remain in `PHASE_0_LAUNCH_BRIEF.md`.

## Architecture decisions

### Tenant identity and lifecycle

Each tenant has an immutable internal ID, a human-readable display name, a unique operator slug, a lifecycle state, and timestamps. Suggested states are `pending`, `active`, `suspended`, and `closed`. State transitions are explicit and recorded in an audit log.

Operator slugs and custom domains are lookup identifiers. They are not authorization credentials. Production APIs must resolve a request's tenant from a verified host/domain mapping or a verified staff/player session, never from an untrusted `tenantId` supplied in request JSON or a client-controlled header.

### Request tenant context

At the start of each request, middleware resolves the canonical domain and loads an active tenant context. After authentication, the session's tenant must match that request context. Platform staff access uses a separate, explicit platform role and is audited. Missing, unknown, suspended, or conflicting tenant context fails closed.

The tenant context is passed explicitly through route handlers and data-access functions. Avoid ambient global tenant state because asynchronous work can interleave across requests.

### Data ownership and isolation

Every tenant-owned record carries a non-null `tenant_id`. Examples include players, player sessions, ledger entries, provider records, catalog entries, staff memberships, content, reports, and support cases. Shared platform tables such as supported locales may be global, but tenant ownership must be explicit.

Data access rules:

- Require tenant context for tenant-owned reads and writes.
- Include `tenant_id` in queries, updates, deletes, and uniqueness rules.
- Prefer composite unique keys such as `(tenant_id, email)` or `(tenant_id, provider, external_game_id)` where the business rule is tenant-local.
- Use foreign keys that preserve tenant ownership where the database supports them.
- Do not infer tenant ownership from a player ID, provider name, slug, or URL parameter alone.
- Keep platform-wide operations in separately named and separately permissioned services.

### Configuration and branding

Tenant settings are versioned configuration, not scattered environment variables. A configuration version should include branding, locale availability, support contacts, domain mappings, market enablement, content references, and feature flags. Secret values are never stored in general tenant configuration.

Publish configuration changes atomically. Record who changed a setting, the version, review status, and effective time. Sensitive settings can require an approval step.

### Domains and host resolution

Maintain a verified domain-to-tenant mapping with verification status and lifecycle. Do not trust an arbitrary `Host`, forwarded-host, slug, or query-string value unless it has passed the trusted proxy and domain verification rules. Unknown hostnames return a generic not-found response without revealing tenant existence.

### Secrets and provider configuration

Tenant provider credentials are stored in a secret manager under a tenant-specific reference. The database stores only secret references and non-sensitive metadata. Secrets are separated between sandbox and production, masked in administrative screens, access-controlled, rotated, and audited. No endpoint returns secret values after creation.

### Sessions, cache, jobs, and files

- Player and staff sessions include tenant identity and role scope.
- Cache keys include tenant ID and relevant configuration version.
- Background jobs carry tenant ID explicitly and validate it before work.
- File paths and object-storage keys include an internal tenant namespace with access checks.
- Logs, traces, metrics, and exports preserve tenant context without recording passwords, tokens, or provider secrets.

### Audit and operational access

Audit records include actor, tenant, action, target, timestamp, outcome, and correlation ID. Staff support access to player data is limited, reasoned, and logged. Platform support must not silently inherit tenant administrator privileges.

## Initial data model

| Entity | Ownership | Notes |
|---|---|---|
| `tenants` | Platform | Immutable ID, slug, display name, state, timestamps |
| `tenant_domains` | Tenant | Domain, verification state, primary flag |
| `tenant_config_versions` | Tenant | Versioned non-secret configuration and publication state |
| `tenant_staff_memberships` | Tenant | Staff identity, role, membership state |
| `players` | Tenant | Player identity unique within tenant unless a later identity model is approved |
| `player_sessions` | Tenant | Session expiry, player, revocation state |
| `providers` | Tenant | Provider name, environment, secret reference, state |
| `game_catalog` | Tenant | Provider external ID, localized metadata, category, availability |
| `ledger_entries` | Tenant | Player, transaction identity, amount, type, timestamps |
| `audit_events` | Tenant or platform | Explicit scope, actor, action, target, outcome, correlation ID |

This is a logical model. Production database technology and physical schema require a separate decision. The current SQLite sandbox is not considered a production tenant-isolation implementation.

## Implementation work packages

### 1.1 Tenant and domain model

Create tenant records, lifecycle state, domain mappings, and configuration versions. Add migration and bootstrap tooling for local development.

### 1.2 Tenant resolution middleware

Resolve tenant context from verified domain mappings. Reject missing, unknown, inactive, or conflicting tenant context. Keep local development explicit with a configured sandbox tenant.

### 1.3 Tenant-scoped data access

Introduce repository/service APIs that require tenant context. Add tenant IDs and tenant-local constraints to tenant-owned data. Avoid direct unscoped access from route handlers.

### 1.4 Tenant-bound authentication

Bind player and staff sessions to a tenant. Verify tenant match on every authenticated request. Separate platform staff roles from operator roles.

### 1.5 Configuration and branding service

Add versioned tenant settings, safe publication, and non-secret brand configuration. Keep secrets in a dedicated secret manager integration.

### 1.6 Isolation and audit verification

Build tests and operational checks for cross-tenant access, cache collisions, background-job context, file access, and audit completeness.

## Acceptance criteria

Phase 1 is complete when:

1. Tenant lifecycle, domain mapping, and configuration versions are implemented.
2. All tenant-owned database operations require explicit tenant context.
3. Player and staff sessions cannot cross tenant boundaries.
4. Unknown or inactive tenants fail closed.
5. Cross-tenant isolation checks cover API, database, cache, jobs, files, and reports.
6. Audit records identify tenant/platform scope and actor for privileged actions.
7. Tenant branding can be loaded from published configuration without exposing secrets.
8. Local development can use an explicit sandbox tenant without weakening production resolution.

## Current implementation slice

The sandbox now has tenant, verified-domain, and versioned-configuration tables. Existing player, session, ledger, provider, provider-event, and catalog rows receive the `sandbox` tenant during startup migration. Requests resolve a tenant from the verified host mapping. Player lookup, signup, sessions, balances, ledger history, provider writes and reads, audit history, and catalog sync and visibility are tenant-scoped. Player email uniqueness, provider names, and provider game external IDs are tenant-local. Provider/catalog foreign keys include tenant identity. An unmapped host is rejected. A legacy database migration was exercised with existing provider/catalog records, and the foreign-key check returned no violations; duplicate provider names and game IDs were accepted for a second tenant.

The admin page can edit a tenant's brand name, accent color, and support contact in a versioned draft, then publish it. The public tenant-config endpoint exposes only the published settings, and the lobby applies the published name and accent color and shows a localized mail link when the published support email is present. English Canadian remains primary and French Canadian is retained as a required secondary locale. Newly mapped tenants receive a default published configuration on their first request.

A separate platform token protects backend endpoints for creating pending tenants, assigning an initial operator admin, issuing DNS TXT ownership challenges, verifying domains, changing tenant lifecycle state, listing tenants, and reviewing platform events. Activation requires a verified domain. Suspended tenants stop resolving through their domains; closed tenants cannot be reopened. This onboarding API currently uses a shared platform token and the existing sandbox host as its entry point.

The sandbox also has individual staff identities, tenant memberships, four tenant roles, eight-hour HttpOnly sessions, staff add/disable controls, audit events, and encrypted TOTP authenticator setup and login verification. A bootstrap sandbox operator admin can be provisioned using server environment variables; platform onboarding can assign an initial operator admin for each additional tenant. API authorization is enforced server-side for branding/configuration and provider/catalog actions.

The HTTP service exposes tenant-independent `/healthz` and database-backed `/readyz` checks. Every response has an `X-Request-ID`; JSON errors echo it, structured request logs include it with tenant and request metadata, and staff/platform audit records store it as a correlation ID. Logs omit query strings and request payloads.

Startup now supports `development`, `staging`, and `production` settings loaded from ignored environment files. Staging and production require explicit data paths, bind hosts, secure cookies, and encryption keys; each database folder is marked with its environment and rejects use under a different environment. Example files contain placeholders only, and startup validates ports, secrets, and required environment settings before opening SQLite.

SQLite operations now include an online snapshot backup, integrity/hash verification, and non-destructive restore preparation into a new data directory. Backups carry an environment marker and checksum manifest; the CLI never replaces the active database. Scheduling, encrypted off-host retention, recovery objectives, and regular restore drills still need operational ownership.

This is an initial implementation slice, not production multi-tenant readiness. Tenant and domain lifecycle management is API-only; domain replacement/removal and verified-domain operational support are incomplete. Staff authentication is a local implementation rather than a production identity provider, platform controls still use a shared token, and secrets remain encrypted in SQLite rather than a managed secret store. Local sandbox tenant mapping is preconfigured for localhost only. Do not expose this sandbox as a production tenant service.

## Dependencies and open decisions

- Package 0: operating model and first-market requirements.
- Production database and hosting choices.
- Domain replacement/removal and operational verification process.
- Production staff identity/MFA provider.
- Secret manager and key-rotation approach.
- Whether player identity is separate per operator or uses a future shared identity federation model.

Until the open decisions are resolved, keep implementation interfaces provider-neutral and avoid production deployment claims.
