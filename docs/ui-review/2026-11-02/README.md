# AvaPharmacy UI review — 2 November 2026

**Latest:** [Full-scope implementation and verification follow-up](FOLLOWUP.md) extends this first-pass report.

Implemented frontend improvements and reviewed the running local application. This is a UI review with selected interaction checks, not acceptance of every scenario in the end-to-end checklist or production release approval.

## Changes

- Catalog: collapse filters on mobile/tablet so products are immediately reachable; retain desktop filters. Bound the full brand list to a keyboard-focusable scroll region. Put mobile search on its own row so sorting remains readable. Label price, rating, search, sorting, view controls, and filter-removal actions. Correct “presciption”.
- Shared searchable selects: arrow navigation, Enter selection/toggling, Escape dismissal, Tab dismissal, focus return, active option highlighting/scrolling, listbox semantics, selected states, explicit labels, trimmed search, readable placeholders, and 44px option/trigger heights.
- Product form: labeled dialog and fields, initial focus, keyboard containment, Escape dismissal, launch-button focus restoration, labeled close button, announced form error, and prevention of dismissal while saving. No product was saved during verification.
- Navigation: name mobile header actions and dashboard links, expose expanded states, close header menus after route/query navigation, recover focus with Escape, name collapsed professional navigation and logout, expose current account/professional navigation state, and collapse compact professional navigation after choosing a section.
- Keyboard/readability: shared focus indicator, skip links to focusable main content, reduced-motion rules, darker secondary/muted text, and more predictable shared heading wrapping. Removed duplicate/nested main landmarks in the homepage, product listing, and account shell; supplied page headings for health services and saved payment methods.
- Content consistency: homepage payment message reflects M-Pesa STK/Paybill. Default delivery message and homepage threshold use configured settings (observed KSh 3,000), pharmacist hours use configured availability, and floating WhatsApp uses configured contact information. Custom published promotional banner messages remain under content control.
- Newsletter: responsive labeled input/button layout, clear pending state, immediate duplicate-submit guard, cleared stale feedback, preserved input on failure, and associated error/help text.
- Staff controls: added accessible names to doctor/pediatrician searches, pharmacist prescription/order filters, inventory search/location filter, and admin dashboard/catalog filters.

## Verification

- `npm run build`: passed (TypeScript and Vite production build).
- `npm run lint`: passed with 0 errors and 23 existing warnings, chiefly hook dependency and React Fast Refresh warnings.
- `git diff --check`: passed.
- Browser used existing `http://localhost:3000` and backend on port 8000. A temporary frontend on port 3001 was stopped after discovering it was outside the configured local CORS origin. No CORS/security settings were changed.
- Viewport overrides: 390×844, 768×1024, 1440×1000. Existing browser zoom produced effective CSS widths of approximately 354, 698, and 1309px; JSON records show measured widths. These cover mobile/tablet/desktop layouts, not exact CSS widths of 390/768/1440px.
- JSON files contain 102 route/viewport observations: public/entry pages, 11 admin views, 14 customer/care views, lab operational views and the inventory overview. No document horizontal overflow was observed. These are page/DOM measurements, some during loading, not 102 completed user journeys or proof of no internal clipping. Global overflow hiding can also conceal internal problems; key changed layouts were inspected visually.
- Existing synthetic QA admin, customer, doctor, pediatrician, and pharmacist accounts were used. Credentials are not stored in this report. Lab operational screens were inspected with admin access; lab partner view explicitly showed admin preview mode.

### Interaction checks performed

1. Real shared components in a temporary isolated fixture: single selection via two ArrowDown presses and Enter selected the second option and returned focus; multiple selection retained two options; Escape and Tab returned to normal navigation. Temporary fixture was removed.
2. Real product form: initial focus reached product name; Shift+Tab wrapped to the final action; Tab wrapped to close; Escape dismissed and returned focus to Add Product. No submit occurred.
3. Mobile catalog: show/hide filters works; brand list measured 224px with loaded brands; products remain accessible with filters closed; sort text remains visible in the revised toolbar.
4. Catalog: a synthetic unmatched search showed “No products found”; clear search restored populated results. Long product names, fallback images and out-of-stock states were visible in the live catalog.
5. Mobile header: navigation expanded and Escape collapsed it with focus returned to its toggle.
6. QA login/logout and role landing screens were exercised. Doctor earnings and pharmacist order follow-up navigation opened their corresponding views; collapsed professional controls retained accessible names.

## Coverage boundaries and remaining verification

| Module | Current review coverage | Still unverified in this run |
|---|---|---|
| Accounts | QA sign-in/out, account overview/settings/address/payment layouts | Registration/email delivery, reset/change-password, suspension, activation and deactivation workflows |
| Products/inventory | Loaded catalog, filters/search, empty results, product form focus, admin and overview layouts | Product saving, exact-variant cart flow, concurrent stock changes, reservation/release and POS sync |
| Orders/payments | Admin orders/invoices layouts, pharmacist follow-up, empty cart | Checkout/payment/retry, fulfillment, cancellation, returns/refunds and reconciliation |
| Prescriptions | Customer upload/history and staff management/review layouts | File upload, clarification, approval, dispensing and linked checkout |
| Consultations | Customer doctor/pediatric entry layouts; QA clinician dashboards and doctor earnings | Paid booking, guardian consent submission, chat/attachments, prescribing, completion and linked records |
| Labs | Customer catalog/history layouts and admin operational views | Actual partner/technician permissions, collection code, result upload/download and notifications |
| Payouts | Admin payout view and professional earnings UI | Calculation, maker-checker approval, status changes and actual receipt/transfer |
| Notifications/support/settings | Customer/admin layouts; configured display values | Delivery/read/preference persistence, ticket changes, compliance uploads and settings writes |

No new business transactions, stock adjustments, clinical records, notifications, refunds, payouts or external POS actions were initiated. Existing payment/POS holds remain outside this UI verification. All six connected acceptance journeys still require a dedicated end-to-end run with matching record references. This review does not inherit previous checklist passes.

Further review should cover other dialogs for equivalent focus behavior, screen-reader testing, all data-dependent states, remaining hardcoded page styles, 320px CSS layouts, and cross-browser checks. Before/after image pairs were not captured for all fixes; screenshots below show the resulting catalog.

## Evidence

- [Mobile catalog](catalog-mobile.png)
- [Desktop catalog](catalog-desktop.png)
- [Public route observations](responsive-checks.json) — unauthenticated lab route redirected to login.
- [Admin route observations](admin-responsive-checks.json)
- [Customer route observations](customer-responsive-checks.json)
- [Operations route observations](operations-responsive-checks.json) — lab partner is admin preview.
