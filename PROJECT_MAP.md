# PROJECT_MAP

## [TECH_STACK]

- Framework: Next.js App Router 15.5.18.
- Runtime: Node >=20 required by `package.json`; local shell currently reports Node v22.14.0 while `.nvmrc` requests Node 20.
- UI: React 19.1.5, Tailwind CSS 4.1.13, shadcn/ui-style components via `components.json`, Radix UI, lucide-react.
- Auth: Supabase Auth through `@supabase/ssr`; routes currently use `/login`, `/signup`, and `/auth/callback`.
- Database: Supabase local config exists under `supabase/`; initial migration creates `customers` and `subscriptions`.
- Billing: Paddle via `@paddle/paddle-js` and `@paddle/paddle-node-sdk`; checkout route is `/checkout/[priceId]`; webhook route is `/api/webhook`.
- AI: Not implemented in the starter kit.
- PDF: Not implemented in the starter kit.
- Email: Not implemented in the starter kit.
- Deployment: Vercel-compatible Next.js starter; production environment values are not configured locally.

## [SYSTEM_FLOW]

### Visitor Flow

1. Landing page
2. Start builder
3. Fill resume
4. Preview
5. Export gate
6. Subscribe or guest purchase
7. Download PDF

### Authenticated User Flow

1. Sign in
2. Dashboard
3. Create resume
4. Edit resume
5. Use AI
6. Export PDF
7. Manage subscription

### Guest Purchase Flow

1. Build resume
2. Enter email
3. Pay
4. Generate PDF
5. Send email
6. Temporary download link

## [ARCHITECTURE]

- Public pages: Current starter has `/`, `/login`, `/signup`, `/checkout/[priceId]`, `/checkout/success`; required CV pages still need to be added.
- Dashboard pages: Current starter has `/dashboard`, `/dashboard/subscriptions`, `/dashboard/subscriptions/[subscriptionId]`, `/dashboard/payments`, `/dashboard/payments/[subscriptionId]`.
- Resume feature: Not present yet. Planned under `src/features/resume-builder` or the closest local convention.
- Billing feature: Existing billing code is split across `src/constants/pricing-tier.ts`, `src/components/home/pricing`, `src/components/checkout`, `src/components/dashboard/subscriptions`, `src/components/dashboard/payments`, and `src/utils/paddle`.
- AI feature: Not present yet. Must be server-side for provider keys and usage enforcement.
- PDF feature: Not present yet. Needs A4, Arabic/RTL, and entitlement-gated export logging.
- Email feature: Not present yet. Needed for guest order delivery.
- Database tables: Existing starter tables are `customers` and `subscriptions`; planned additions are `resumes`, `resume_versions`, `resume_templates`, `ai_usage`, `resume_exports`, `guest_orders`, `ats_reports`.
- RLS policies: Current migration grants authenticated users broad read access to `customers` and `subscriptions`; CV tables must use user-owned RLS and `guest_orders` must not be exposed directly to clients.

## [PLAN_LIMITS]

- Free: Local/limited creation, preview, very limited AI, no paid PDF export without watermark if enabled.
- Basic: 3 saved resumes, 10 monthly AI uses, 5 monthly PDF exports, basic templates, watermark-free exports.
- Professional: Unlimited resumes, 50 monthly AI uses, 30 monthly PDF exports, ATS, Cover Letter, all templates, multiple versions.
- Premium: Unlimited resumes, 150 monthly AI uses, unlimited PDF exports, executive templates, priority processing.
- Guest purchase: One PDF purchase with email, temporary download link, and email delivery.

## [MILESTONES]

- M1: Repository Audit & Product Map. Fetch/inspect starter kit, identify stack and risks, update this map, and stop before M2.
- M2: Branding, RTL, Pricing. Completed: Arabic-first branding, RTL shell, CV pricing tiers, localized auth/dashboard/checkout success surfaces, Paddle checkout price IDs preserved.
- M3: Database & Entitlements. Add migrations, RLS, central plan limits, and entitlement helpers without breaking Paddle tables.
- M4: Resume Dashboard & CRUD. Build authenticated resume list and create/edit/delete/duplicate flows.
- M5: Editor, Preview, Templates. Build editor, live preview, five templates, responsive mobile/desktop layouts.
- M6: Wizard. Build step-by-step resume creation and conversion to `ResumeData`.
- M7: PDF Export. Add entitlement-gated A4 PDF export, export records, and failure-safe accounting.
- M8: Guest Checkout. Add no-account checkout, Paddle webhook handling, temporary download, and email delivery.
- M9: AI Tools. Add core AI tools with usage tracking, plan limits, and apply-before-replace UX.
- M10: Final Verification. Ensure `PROJECT_MAP.md` is current, pending items are empty, and build/lint/typecheck pass.

## [VERIFICATION_COMMANDS]

- Read protocol: `Get-Content -Raw -Encoding UTF8 C:\Users\MohaMt\.codex\attachments\8a46a956-c04e-47df-9ee4-6723398ca39d\pasted-text-1.txt` -> read successfully.
- Fetch starter: `git clone --depth 1 https://github.com/PaddleHQ/paddle-nextjs-starter-kit.git C:\tmp\paddle-nextjs-starter-kit-...` -> succeeded.
- Current date: `Get-Date -Format 'yyyy-MM'` -> `2026-06`.
- Workspace listing: `Get-ChildItem -Force` -> `.github`, `public`, `src`, `supabase`, `package.json`, `pnpm-lock.yaml`, and supporting config files now present.
- Package manifest: `Get-Content package.json` -> package name `@paddle/nextjs-starter-kit`, scripts `dev`, `build`, `lint`, `prettier:check`, `test`.
- Node version: `node --version` -> `v22.14.0`; `.nvmrc` -> `20`.
- Package manager: `pnpm --version` -> unavailable; `corepack.cmd pnpm --version` attempted but network to npm registry was blocked in sandbox.
- npm version: `npm.cmd --version` -> `10.9.2`.
- Dependencies installed: `pnpm install --frozen-lockfile` via Corepack/pnpm 10.32.1 -> succeeded.
- Type check: `.\node_modules\.bin\tsc.cmd --noEmit --pretty false` -> passed.
- Lint: `.\node_modules\.bin\next.cmd lint` -> passed with one pre-existing warning in `src/components/checkout/checkout-contents.tsx` about `react-hooks/exhaustive-deps`; `next lint` is deprecated by Next.js.
- Build: `.\node_modules\.bin\next.cmd build` with placeholder Supabase/Paddle env values -> passed; warnings came from the starter/Supabase edge import trace, not M2 changes.
- Prettier: targeted check on M2-touched files -> passed. Full-repo check still reports many starter-kit files as not formatted, so broad formatting was not applied.
- Test: Full `pnpm test` not run because it would run full-repo Prettier check, which currently fails on untouched starter-kit files.
- Database verification: Local migration inspected; remote Supabase connector still lacks permission for project `rdaldkgdwkvmzdonzlow`.

## [ASSUMPTIONS]

- M2 intentionally keeps existing Paddle `priceId` values so checkout behavior remains wired to the starter configuration until real Paddle price IDs are provided.
- Paddle price IDs in `src/constants/pricing-tier.ts` are starter/sample IDs until the user provides real Paddle price IDs.
- The current hardcoded GitHub OAuth redirect in `src/app/login/actions.ts` is starter-kit configuration and must be replaced before production use.

## [ORPHANS & PENDING]

- Configure required environment variables from `.env.local.example`: Supabase URL, anon key, service role key, Paddle environment, Paddle API key, Paddle webhook secret, Paddle client token.
- Remote Supabase project `rdaldkgdwkvmzdonzlow` could not be inspected due connector permission errors.
- Security review needed: starter migration currently allows any authenticated user to read all rows in `customers` and `subscriptions` via `using (true)`.
- Production auth config needed: `signInWithGithub` redirects to `https://paddle-billing.vercel.app/auth/callback`.
- Required CV product routes, database tables, entitlements, resume builder, PDF, guest checkout, email, and AI features are not implemented yet.
