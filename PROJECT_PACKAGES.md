# Northplay white-label casino platform

## Project delivery packages

Each package defines its goal, modules, outputs, acceptance criteria, and dependencies. A white-label tenant is an independent operator with its own brand, domain, settings, staff, providers, games, and reports. Real-money operation depends on the selected Canadian jurisdiction, approvals, and vendor readiness.

## Package 0 — Business model and launch market

**Goal**  
Agree how the service operates and which market the first release will serve.

**Modules**
- Operating model and platform/operator responsibility matrix
- First province or territory requirements
- Operator onboarding and acceptance criteria
- Initial languages, CAD, device, game-category, and support scope
- Vendor and approval dependency register

**Deliverables**  
Operating model, first-market brief, responsibility matrix, release scope, and risk/assumption register.

**Acceptance**  
First market selected. Responsibility for licensing, identity checks, AML, payments, providers, support, and reporting assigned. Market-specific rules marked confirmed or pending qualified advice.

**Depends on**  
None. This package gates market-specific real-money work.

## Package 1 — Shared platform foundation

**Goal**  
Support multiple independent operators on shared platform services.

**Modules**
- Tenant identity, lifecycle, and configuration versioning
- Tenant-scoped data, APIs, jobs, caches, files, and logs
- Environment separation for development, staging, and production
- API validation, errors, versioning, health checks, and request context
- Database migration and deployment foundation

**Deliverables**  
Tenant-aware data model, service patterns, environment configuration, health endpoints, and isolation verification approach.

**Acceptance**  
Tenant-owned records and requests have explicit scope. Cross-tenant access is blocked. Configuration changes are traceable. Environment credentials are separate.

**Depends on**  
Package 0.

## Package 2 — White-label brand and player experience

**Goal**  
Deliver a player site that can be branded and localized per operator.

**Modules**
- Design system and responsive components
- Tenant branding, logo, colors, typography, and content
- Domain routing, HTTPS, and tenant resolution
- English and Canadian French localization and locale-aware formatting
- Content management and publishing workflow
- Player pages for lobby, account, cashier, history, help, and policies
- Accessibility for keyboard, screen reader, contrast, and mobile use

**Deliverables**  
Brand configuration, responsive site, localization catalog, content workflow, and accessibility review.

**Acceptance**  
Two sample tenants have distinct branding without code changes. Supported journeys work in English and French Canadian. Locale formats and mobile/accessibility checks pass.

**Depends on**  
Packages 0 and 1.

## Package 3 — Operator administration and staff access

**Goal**  
Give platform and operator staff safe, role-appropriate tools.

**Modules**
- Staff accounts, invitations, MFA, recovery, and sessions
- Role-based permissions for platform admin, operator admin, support, compliance, finance, and content
- Operator configuration console
- Review/approval flows for sensitive actions
- Audit history that never exposes secret values

**Deliverables**  
Staff identity model, permission matrix, operator console, approval workflows, and audit search/export.

**Acceptance**  
Staff actions use individual accounts, access is role- and tenant-scoped, and sensitive actions have complete actor/approval records.

**Depends on**  
Packages 1 and 2.

## Package 4 — Player accounts, eligibility, and compliance

**Goal**  
Manage players and enforce the selected market's entry and play rules.

**Modules**
- Registration, login, recovery, sessions, and abuse controls
- Player profile, verified contacts, language, and consent
- Age and identity verification adapter
- Location eligibility and market rules
- AML/fraud case review
- Responsible-gambling controls and backend enforcement
- Complaints, evidence references, and retention

**Deliverables**  
Player lifecycle, eligibility checks, verification adapter boundary, review queues, safety controls, and complaints workflow.

**Acceptance**  
Restricted, ineligible, unverified, or self-excluded users are blocked consistently. Staff review is permissioned. Rules have an identified source and approval status.

**Depends on**  
Packages 0–3.

## Package 5 — Wallet, payments, and finance

**Goal**  
Manage funds through an auditable ledger and finance workflow.

**Modules**
- Wallet ledger for deposits, withdrawals, wagers, wins, reversals, and adjustments
- Idempotent transaction orchestration and retry handling
- Player deposit and withdrawal cashier
- Approved payment-provider adapters and signed callbacks
- Refunds, reversals, disputes, reconciliation, and finance approvals

**Deliverables**  
Ledger model, cashier flows, payment adapter interface, finance console, and reconciliation reports.

**Acceptance**  
Every balance change is traceable. Duplicate callbacks cannot duplicate postings. Failures and reversals retain history. Real payments stay disabled until approvals and vendor readiness.

**Depends on**  
Packages 0, 1, 3, and 4. Payment integration also needs an approved provider and documentation.

## Package 6 — Provider management and game catalog

**Goal**  
Connect approved game providers and manage their games per operator.

**Modules**
- Tenant-scoped provider registry and environment status
- Secret storage, access control, and credential rotation
- Provider-specific authentication, catalog, launch, callback, and settlement adapters
- Catalog synchronization and localized metadata
- Lobby curation and market/device availability
- Short-lived player launch sessions
- Signed callback validation, settlement, retries, and reconciliation
- Provider health and incident operations

**Deliverables**  
Provider adapter, catalog tools, launch flow, settlement processing, and operations dashboard.

**Acceptance**  
Keys are tenant/environment isolated and never sent to browsers. Catalog sync is repeatable. Only eligible players can launch enabled games. Callbacks are authenticated and idempotent. Provider reports reconcile.

**Depends on**  
Packages 0, 1, 3, 4, and 5. Requires provider approval, documentation, sandbox credentials, and applicable certification.

## Package 7 — Promotions and player communications

**Goal**  
Provide controlled player engagement tools for each operator.

**Modules**
- Market- and tenant-scoped promotion rules, eligibility, expiry, and terms
- Bonus accounting and restrictions where applicable
- Optional points or loyalty tiers
- Transactional email and in-app notifications
- Marketing preference and consent history
- English/French Canadian message templates

**Deliverables**  
Promotion configuration, bonus accounting if required, localized templates, and consent controls.

**Acceptance**  
Offers are tenant/market scoped, backend eligibility is enforced, and communication respects player preferences.

**Depends on**  
Packages 1–5. Game-specific promotions also depend on Package 6.

## Package 8 — Customer support and operations

**Goal**  
Equip staff to handle player and service issues.

**Modules**
- Support workspace and case history
- Account restrictions, cooling-off, and reinstatement workflows
- Dashboards for service health, payments, game launches, and queues
- Provider/payment exception queues
- Incident response, alerts, escalation, and runbooks
- Tenant-aware support permissions

**Deliverables**  
Support console, operations dashboards, alert definitions, incident process, and staff runbooks.

**Acceptance**  
Support views respect roles. Restrictions are traceable. Failures route to owners with actionable alerts. Incident outcomes are recorded.

**Depends on**  
Packages 1, 3, 4, 5, and 6.

## Package 9 — Reporting and analytics

**Goal**  
Provide regulatory reports and operator business views.

**Modules**
- Market-specific regulatory reporting and review
- Finance and provider settlement reporting
- Tenant-scoped product analytics and dashboards
- Retention, access history, export, deletion, and legal holds

**Deliverables**  
Report catalog, reconciled finance reports, operator dashboards, and privacy/retention workflows.

**Acceptance**  
Each report has an owner, source, schedule, and review process. Tenant data stays isolated. Finance reports reconcile to source ledgers and statements.

**Depends on**  
Packages 0, 1, 3, 5, 6, and 8.

## Package 10 — Security, reliability, and launch readiness

**Goal**  
Demonstrate readiness for a specific operator and approved market.

**Modules**
- Threat modeling, access review, dependency management, and vulnerability response
- Automated unit, integration, end-to-end, load, accessibility, and localization checks
- Backup, restore drills, recovery targets, and runbooks
- Reviewed build/deployment pipeline, migrations, staged release, and rollback
- Independent testing, provider certification, and market approvals
- Staff training, support coverage, and monitored rollout

**Deliverables**  
Security findings, quality/load evidence, recovery evidence, deployment runbooks, external approvals, and launch checklist.

**Acceptance**  
Critical workflows pass in both languages. Tenant isolation is verified. Restore drills succeed. External approvals are documented. Launch is explicitly enabled for the approved tenant and market.

**Depends on**  
All earlier packages.

## Recommended sequence

1. Complete Package 0.
2. Build Packages 1–3 as the shared platform and operator control plane.
3. Build Packages 2 and 4 together for the player experience and account controls.
4. Implement Package 5 with simulated funds before approved payment integrations.
5. Complete Package 6 after provider approval and sandbox access.
6. Deliver Packages 7–9 based on operator and market needs.
7. Pass Package 10 for each production tenant and market.

## Current prototype status

The current project is an early sandbox with a branded lobby, English/French text, player accounts, simulated funds, basic play-protection controls, provider-key storage, audit records, and a provider-neutral catalog foundation. Production tenant isolation, staff roles, identity/location verification, payment processing, provider connections, and real-money game launches remain to be built.
