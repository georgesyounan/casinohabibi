# Phase 0 — Business model and launch market

## Purpose

Decide how Northplay will operate as a white-label casino platform and identify the first Canadian market before implementing market-specific real-money rules.

This is a planning brief for discussion with the project partner and qualified Canadian legal/regulatory advisers. It does not establish licensing eligibility or confirm regulatory approval.

## Current direction

- Product direction: white-label casino platform for separately branded operators.
- Player languages: English primary and Canadian French secondary.
- Initial currency target: CAD.
- Game content: supplied by approved external game providers after the appropriate approvals and access are obtained.
- Current software: sandbox prototype using simulated funds only.
- First real-money province or territory: **Open decision**.
- Contracting and licensing model: **Open decision**.

## Work package 0.1 — Operating model

Select the intended operating model and document who is accountable for each regulated and operational activity.

| Decision | Options to assess | Current status |
|---|---|---|
| Platform role | Technology supplier to licensed operators, casino operator, or another approved model | Open |
| Contracting party | Platform company, operator, or separate group entity | Open |
| Player relationship | Which entity contracts with the player and owns player support | Open |
| Regulatory accountability | Which entity holds each registration, license, approval, or operating agreement | Open, requires qualified advice |
| Funds and settlement | Which entity holds player funds and is responsible for payment reconciliation | Open |
| Game supply | Which entity contracts with each game provider and controls game availability | Open |
| Customer support | Which team handles player questions, complaints, and escalations | Open |
| Data roles | Which entities determine data use, provide privacy notices, and respond to requests | Open, requires privacy advice |

**Deliverable**

- Approved operating-model diagram
- Responsibility matrix covering licensing, KYC/age verification, AML, geolocation, responsible gambling, payments, game providers, customer support, privacy, reporting, and incident response
- List of responsibilities that require external counsel or specialist confirmation

## Work package 0.2 — First market selection

Choose one launch province or territory for the first real-money release. Assess each candidate against current rules with qualified local advice.

| Assessment item | Evidence needed | Status |
|---|---|---|
| Market entry route | Applicable regulator, approvals, registrations, agreements, and eligibility | Open |
| Operator requirements | Requirements for the entity operating the player-facing casino | Open |
| Minimum age and identity checks | Confirmed threshold, verification method, timing, and exceptions | Open |
| Location controls | Approved geolocation method, precision, frequency, and blocked locations | Open |
| Responsible gambling | Required limits, player tools, notices, exclusions, and support links | Open |
| AML and fraud | Applicable controls, thresholds, escalation, and recordkeeping | Open |
| Games | Required provider and game approvals, testing, certification, and market restrictions | Open |
| Payments | Allowed payment flows, payment provider requirements, and settlement duties | Open |
| Reporting | Required operational, player, financial, and regulatory reports | Open |
| French-language obligations | Which player content and support must be available in French for the selected market | Open |
| Privacy and retention | Applicable privacy notices, access controls, retention, and deletion requirements | Open |
| Launch timeline and cost | Expected approval lead times, external review costs, and operating costs | Open |

**Deliverable**

- Selected first market with documented rationale
- Market requirements register with source, owner, confirmation date, and status
- External approvals and lead-time checklist

## Work package 0.3 — White-label operator policy

Define who can use the platform and how each operator tenant is approved and managed.

**Decisions**

- Operator eligibility and due-diligence requirements
- Required evidence of legal authority to operate in each market
- Operator setup, review, activation, suspension, and offboarding process
- Tenant-specific provider, payment, branding, content, and support configuration
- Platform access to operator data and the process for support access
- Service boundaries, incident notifications, and service-level expectations

**Deliverable**

- Operator onboarding checklist
- Tenant lifecycle policy
- Draft responsibility and service-boundary schedule for partner/legal review

## Work package 0.4 — First release scope

Agree what belongs in the first release and what remains out of scope until approvals and vendors are available.

**Working scope**

- One operator tenant for the first end-to-end market pilot
- White-label brand settings and tenant domain support
- English and Canadian French player experience
- CAD display and account history
- Player registration and account management
- Eligibility and responsible-gambling workflows designed for the selected market
- Simulated payments and funds during development
- Provider-neutral game catalog and lobby
- Real provider integration after provider approval, sandbox access, and technical documentation

**Not enabled for the current sandbox**

- Real-money deposits or withdrawals
- Production game launches
- Production provider credentials
- Market-specific eligibility decisions until confirmed for the selected market

**Deliverable**

- Prioritized release scope with must-have, should-have, and later items
- Explicit launch gates for real money, providers, and each new market

## Work package 0.5 — Vendor and approval register

Track the external dependencies that affect architecture and delivery.

| Dependency | Needed for | Owner | Status |
|---|---|---|---|
| Legal/regulatory review | Operating model and first market | To assign | Not started |
| Identity and age-verification provider | Player eligibility | To assign | Not selected |
| Geolocation provider | Market eligibility | To assign | Not selected |
| Payment provider | Deposits, withdrawals, settlement | To assign | Not selected |
| Game provider(s) | Catalog, launch, and round settlement | To assign | Intentionally deferred until approval |
| Hosting and secret-management services | Production platform security | To assign | Not selected |
| French Canadian language/legal review | Player content and regulated notices | To assign | Not started |

## Phase 0 decision log

| ID | Decision | Decision owner | Evidence/review needed | Status |
|---|---|---|---|---|
| D0-01 | Select the first province or territory | Project partners | Qualified legal/regulatory assessment | Open |
| D0-02 | Confirm platform/operator licensing and contracting model | Project partners | Qualified legal advice | Open |
| D0-03 | Assign responsibility for player funds and payment obligations | Project partners | Legal and payment-provider review | Open |
| D0-04 | Confirm first-tenant requirements and launch scope | Project partners | Product and operations review | Open |
| D0-05 | Confirm who owns player support and compliance operations | Project partners | Operating-model review | Open |

## Phase 0 completion gate

Phase 0 is complete when:

1. The operating model and responsibility matrix are reviewed by the project partners.
2. A first market is selected and its requirements are documented with qualified advice.
3. Operator onboarding and tenant lifecycle expectations are agreed.
4. First-release scope and external dependencies have owners.
5. Real-money and production-provider activation gates are documented.

## Next work after Phase 0

Start Phase 1 with tenant identity, tenant isolation, configuration versioning, environments, and API foundations. Design those shared services around the agreed operator model. Keep jurisdiction-specific decisions configurable and traceable to their approved requirements.
