# Project Context

## Project

- Name: `Velosnak Atelier`
- Repo folder: `/home/sayem/Downloads/web shoe`
- Purpose: branded shoe storefront with collection browsing, product detail flows, wishlist, checkout UI, and a local Node backend for catalog and order APIs.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7
- Testing: Vitest, Testing Library
- Linting/formatting: ESLint, Prettier
- Backend: Node.js HTTP server in `backend/src/server.js`

## Key Commands

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run type-check`
- `npm run backend:start`
- `npm run backend:dev`

## Repo Areas

- Frontend app entry: `src/App.tsx`
- Home route: `src/pages/Home.tsx`
- Collection route: `src/pages/CollectionPage.tsx`
- Product detail route: `src/pages/ProductDetailPage.tsx`
- Wishlist route: `src/pages/WishlistPage.tsx`
- Checkout route: `src/pages/CheckoutPage.tsx`
- Shared route header: `src/features/shared/ui/CommerceRouteHeader.tsx`
- Cart and checkout UI: `src/features/cart/components/CartDrawer.tsx`
- Home collection section: `src/features/home/sections/CollectionSection.tsx`
- Backend entry: `backend/src/server.js`

## Current Product State

- The storefront has recent visual upgrades across the main commerce routes.
- The frontend is Vercel-friendly as a Vite build.
- The backend currently uses local JSON-file persistence for orders and is not production-safe for a direct Vercel deployment.
- Local review evidence exists as screenshots under `output/firefox-review/` and `output/firefox-review-playwright/`.

## Important Repo Documents

- `SESSION_HANDOFF.md`
- `VISUAL_REVIEW_PLAN.md`
- `VERCEL_PUBLISH_PLAN.md`
- `backend/BACKEND_PLAN.md`

## Working Rules

- Read `SESSION_HANDOFF.md` first before continuing work.
- Verify assumptions from the repo before proposing changes.
- Prefer minimal, safe edits over broad rewrites.
- Keep repo files as the source of truth when chat memory is incomplete.
- Before ending a session, update `SESSION_HANDOFF.md` with findings, tests, changed files, and next steps.

## Known Constraints

- The current backend writes orders to `backend/data/orders.json`.
- That storage model is acceptable for local development but not for durable serverless production use.
- Project chat memory is useful for continuity, but exact technical state must still be written into repo files.
