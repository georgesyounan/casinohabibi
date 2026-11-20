# Northplay white-label casino platform

This roadmap breaks the product into modules that can be built, reviewed, and released independently. Each operator receives its own branded tenant. A real-money launch requires market-specific legal, regulatory, provider, and operational readiness.

## Phase 0 — Business model and launch market

| Module | Scope | Completion outcome |
|---|---|---|
| Operating model | Define platform provider versus casino operator responsibilities, contracts, support ownership, and service boundaries. | A clear responsibility matrix. |
| Jurisdiction selection | Choose the first province or territory and identify applicable approvals, age rules, geolocation, reporting, and responsible-gambling requirements with qualified counsel. | Approved launch-market requirements. |
| Operator onboarding policy | Define which operators can use the platform and what evidence and approvals they must provide. | Operator acceptance criteria. |
| Product scope | Set initial languages, CAD requirements, devices, game categories, and support hours. | A first-release scope. |

## Phase 1 — Shared platform foundation

| Module | Scope | Completion outcome |
|---|---|---|
| Tenant identity | Create operator tenants with stable IDs, lifecycle status, and configuration versions. | Tenant records and lifecycle operations. |
| Tenant isolation | Scope database access, APIs, jobs, caching, logs, and storage by tenant. | Automated cross-tenant isolation checks. |
| Configuration service | Store tenant branding, market, languages, support details, enabled modules, and operational settings. | Versioned tenant configuration. |
| Environment separation | Separate development, staging, and production configuration and credentials. | Reproducible, isolated environments. |
| API foundation | Standard request validation, error responses, versioning, health checks, and audit context. | Consistent service interfaces. |

## Phase 2 — White-label brand and player experience

| Module | Scope | Completion outcome |
|---|---|---|
| Design system | Shared responsive components, typography, color tokens, spacing, motion, and accessibility states. | Reusable UI foundation. |
| Brand theming | Tenant logos, colors, typography choices, favicon, and brand-specific content. | Operators can configure their own presentation. |
| Domains and routing | Tenant domain mapping, HTTPS, canonical URLs, and safe tenant resolution. | Each tenant opens on its own domain. |
| Localization | English default and French Canadian locale, translations, locale-aware CAD/date/number formats, and language persistence. | Complete bilingual player journeys. |
| Content management | Localized landing pages, help, lobby text, banners, terms links, and publishing workflow. | Authorized staff can manage approved content. |
| Player website | Landing, lobby, account, cashier shell, history, help, policy, and error pages. | Complete responsive site shell. |
| Accessibility | Keyboard navigation, screen reader labels, contrast, focus states, and mobile usability. | Accessible core journeys in both languages. |

## Phase 3 — Operator administration and access control

| Module | Scope | Completion outcome |
|---|---|---|
| Staff identity | Staff accounts, invitations, MFA, password recovery, and session management. | Individual staff identities. |
| Role-based permissions | Platform administrator, operator administrator, support, compliance, finance, and content roles. | Least-privilege staff access. |
| Operator console | Tenant configuration, staff management, domains, branding, and operational status. | Operator self-service administration. |
| Approval workflows | Two-person review for sensitive actions such as production credentials, account adjustments, and provider activation. | Traceable approvals. |
| Audit history | Record actor, tenant, action, target, timestamp, and outcome without exposing secrets. | Searchable staff activity history. |

## Phase 4 — Player accounts, eligibility, and compliance

| Module | Scope | Completion outcome |
|---|---|---|
| Registration and login | Secure signup, verification, recovery, session management, and abuse controls. | Secure player account lifecycle. |
| Player profile | Contact details, language preference, account settings, and consent records. | Self-service player profile. |
| Age and identity checks | Integrate approved identity/age vendor and manage review outcomes. | Market-ready verification decisions. |
| Location eligibility | Determine whether a player may register or play from their current location according to the chosen market rules. | Enforced geographic eligibility. |
| AML and fraud cases | Risk indicators, review queues, case notes, escalation, and evidence references. | Staff-managed risk review. |
| Responsible gambling | Market-configured limits, session reminders, breaks, cooling-off, self-exclusion, and support links. | Enforced player protection controls. |
| Complaints and records | Complaint intake, investigation workflow, retention schedule, and export support. | Documented player issue handling. |

## Phase 5 — Wallet, payments, and finance

| Module | Scope | Completion outcome |
|---|---|---|
| Wallet ledger | Immutable entries for deposits, withdrawals, wagers, wins, reversals, and adjustments. | Auditable balance calculations. |
| Transaction orchestration | Idempotency, pending states, retries, timeouts, and reconciliation-safe transitions. | Consistent transaction processing. |
| Cashier experience | Deposit, withdrawal, transaction status, receipts, and player-facing failure recovery. | Usable player cashier. |
| Payment provider adapters | Provider-specific requests, signed callbacks, refunds, reversals, and disputes. | Approved payment integrations. |
| Finance console | Reconciliation, settlement reports, exception queues, approvals, and tenant-scoped exports. | Finance operations workflow. |

## Phase 6 — Provider management and game catalog

This phase uses the approved game provider’s documentation, sandbox, credentials, and any required certification. Until then, the catalog remains a provider-neutral foundation.

| Module | Scope | Completion outcome |
|---|---|---|
| Provider registry | Tenant-scoped provider configuration, environment status, credential references, and enabled markets. | Managed provider records. |
| Secret management | Store provider credentials in a secret manager, separated by tenant and environment, with rotation and access audit. | Credentials never exposed to browser clients. |
| Provider adapters | Implement each provider’s authentication, catalog, launch, callback, and settlement contract. | Independently testable provider connector. |
| Catalog synchronization | Import localized titles, categories, identifiers, availability, and approved metadata. | Provider catalog in shared format. |
| Lobby curation | Search, categories, filters, featured placement, and market/device availability. | Tenant-managed game discovery. |
| Game launch sessions | Create short-lived provider sessions with the player, tenant, locale, and market context. | Secure provider game launch. |
| Round settlement | Validate signatures, process wager/win/cancel/rollback events, handle retries, and reconcile. | Reliable game accounting. |
| Provider operations | Health state, callback failures, catalog sync status, incident notes, and credential rotation. | Supportable integrations. |

## Phase 7 — Promotions and player communications

| Module | Scope | Completion outcome |
|---|---|---|
| Promotion rules | Tenant and market-scoped eligibility, expiry, limits, and terms. | Configurable approved offers. |
| Bonus accounting | Separate bonus funds and restrictions from cash balances where applicable. | Auditable promotional balances. |
| Loyalty | Optional points/tiers with clear earning and redemption rules. | Operator-configurable loyalty. |
| Messaging | Transactional email and in-app notifications in English and French Canadian. | Localized player communications. |
| Consent preferences | Marketing preferences and communication history distinct from essential service messages. | Recorded consent and preference handling. |

## Phase 8 — Customer support and operations

The current prototype includes a first operational dashboard slice showing tenant player, demo activity, support, and catalog totals. It also includes a first support slice: signed-in players can submit and continue tenant-scoped ticket conversations, while operator admins and support staff can triage priority, assign requests to active support staff, add private case notes, reply, and close or reopen requests. It does not yet include the full lookup, escalation, notification, or retention workflows below.

| Module | Scope | Completion outcome |
|---|---|---|
| Support workspace | Player lookup, permitted account context, contact history, case notes, and escalation. | Support teams can resolve cases. |
| Player restrictions | Controlled account holds, document requests, cooling-off, and reinstatement workflows. | Consistent restriction management. |
| Operational dashboards | Service health, payments, provider launches, settlement exceptions, support queues, and risk queues. | Tenant and platform visibility. |
| Incident management | Alerts, ownership, timelines, evidence, communications, and post-incident review. | Repeatable incident response. |

## Phase 9 — Reporting and analytics

| Module | Scope | Completion outcome |
|---|---|---|
| Regulatory reporting | Market-specific reports, review steps, retention, and export formats. | Required reports can be produced and reconciled. |
| Financial reporting | Ledger summaries, payments, provider settlements, adjustments, and exceptions. | Finance can reconcile activity. |
| Product analytics | Aggregated usage and funnel metrics with tenant boundaries and privacy controls. | Operators can understand product usage. |
| Data retention and privacy | Retention schedules, access history, data export, deletion, and legal holds. | Managed lifecycle for personal data. |

## Phase 10 — Security, reliability, and release readiness

| Module | Scope | Completion outcome |
|---|---|---|
| Security engineering | Threat modeling, dependency management, secrets, session security, access reviews, and vulnerability handling. | Reviewed security controls. |
| Quality engineering | Unit, integration, end-to-end, load, accessibility, localization, and failure-recovery checks. | Release evidence for supported workflows. |
| Backups and recovery | Encrypted backups, restore drills, recovery targets, and operational runbooks. | Demonstrated recovery capability. |
| Deployment pipeline | Reviewed builds, migrations, staged rollout, rollback, and environment promotion. | Controlled releases. |
| Independent review and certification | Complete applicable testing, provider certification, and market-specific approvals. | Required external readiness evidence. |
| Launch operations | Staff training, support coverage, player communications, and monitored rollout. | Controlled first-market launch. |

## Build sequence and dependencies

1. Confirm Phase 0 before implementing market-specific real-money rules.
2. Build Phases 1–3 as the multi-tenant platform and operator control plane.
3. Build Phase 2 player experience alongside Phase 4 account and compliance workflows.
4. Implement Phase 5 with simulated funds first, then approved payment adapters.
5. Complete Phase 6 after provider approval and sandbox access.
6. Add Phases 7–9 as operator requirements and market obligations are confirmed.
7. Pass Phase 10 readiness gates before each production tenant and market launch.

## Current prototype status

The current build is a presentation demo with operator-managed bilingual lobby announcements and FAQs with configurable localized policy links and footer text, plus bilingual brand identity with an operator-uploaded favicon, four built-in simulated games with operator-managed featured placement, player account and support flows, simulated balances and ledger history, player-protection examples, tenant branding, staff roles and tools, and a provider catalog import preview. Imported provider listings do not launch games. The project is not intended for real-money operation; identity/location checks, payment processing, live provider integrations, licensing, and production launch work are outside the demo scope.
