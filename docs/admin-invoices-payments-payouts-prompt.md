# Admin Invoices, Payments, Payouts, and Reporting — Implementation Prompt

Use this prompt when extending the Ava Pharmacy admin finance module.

## Master prompt

Build a production-ready **Invoices & Payments** section in the Ava Pharmacy admin module. It must be the single finance workspace for customer invoices and receipts, incoming customer payments, provider earnings, outgoing payouts, reconciliation, exceptions, and finance reports.

The workspace must support doctors, pediatricians, pharmacists where applicable, lab technicians, and laboratory partners. Use backend APIs as the system of record; do not use browser local storage for financial records. Every financial mutation must be permission-controlled, validated server-side, idempotent, and recorded in an immutable audit trail.

### 1. Customer invoices and receipts

- List order, consultation, prescription, laboratory, delivery, and other chargeable invoices.
- Show invoice number, customer, service/order reference, issue date, due/paid date, gross amount, discounts, tax, fees, refunds, net amount, currency, payment method, payment status, and fulfillment status.
- Open a complete invoice and allow PDF/CSV download, printing, and authorized resend by email.
- Link each invoice to its M-Pesa/card/payment transaction and electronic receipt.
- Support unpaid, pending, paid, partially paid, partially refunded, refunded, failed, cancelled, and disputed states.
- Never mark an invoice paid only from the browser. Confirm against a verified callback, provider query, or authorized manual reconciliation with evidence.

### 2. Provider earnings and payout ledger

- Generate earnings from completed and eligible work: completed consultations, released lab results, completed lab services, dispensed prescriptions where a pharmacist fee applies, deliveries, adjustments, bonuses, and reversals.
- Keep the earning event separate from the payout. An earning can be pending, approved, held, disputed, payable, paid, reversed, or cancelled.
- Show provider, role, source task, source reference, completion date, gross earning, platform commission, tax/withholding, deductions, adjustments, and net payable.
- Prevent duplicate earnings for the same provider and source event with a server-side uniqueness/idempotency key.
- Support configurable payout rules by role, service, branch, provider contract, effective date, percentage/fixed formula, minimum threshold, and currency.
- Preserve historical calculations when payout rules change.

### 3. Payout workflow

- Support draft payout batches by pay period, provider type, branch, and currency.
- Workflow: generated → reviewed → approved → submitted → processing → paid/failed/reversed.
- Require maker-checker approval: the creator cannot be the final approver for material payouts.
- Allow authorized holds with reason, evidence, expiry/review date, and release action.
- Validate recipient details before submission: M-Pesa name/number or bank account, account ownership status, provider status, and missing compliance documents.
- Store provider transaction ID, M-Pesa receipt/reference, batch ID, submitted/processed timestamps, failure code, failure message, retry count, and reconciliation state.
- Retries must be idempotent and must not create a second payment after an uncertain timeout.
- Allow a failed item to be retried independently without resubmitting successful items.
- Send provider payout notifications and remittance advice after verified success.

### 4. Reconciliation

- Provide three-way matching between source earning, internal payout, and payment-provider/bank transaction.
- Import or sync M-Pesa/bank statements and automatically match by reference, amount, recipient, and date tolerance.
- Queues: unmatched incoming payments, unmatched outgoing payments, amount mismatch, duplicate reference, stale pending transaction, callback/query disagreement, and reversed transaction.
- Allow authorized manual match/unmatch with notes and attached evidence.
- Display reconciliation totals: opening balance, inflows, refunds, payouts, fees, reversals, closing balance, matched, and unmatched.
- Lock reconciled periods; reopening requires elevated permission and an audit reason.

### 5. Reports and tracking

- Dashboard KPIs: invoiced, collected, outstanding, failed collections, refunds, provider gross earnings, commissions, net payable, paid payouts, pending payouts, failed payouts, held amounts, and unmatched transactions.
- Trends by day/week/month and comparisons with the previous period.
- Filters: date basis, branch, provider role, provider, service type, source task, payment channel, status, currency, and reconciliation state.
- Drill down from every chart/KPI to the underlying ledger entries.
- Reports: invoice aging, payment collections, M-Pesa receipts, refunds, provider earnings, payout register, payout failures, commissions, withholding/tax, reconciliation exceptions, and audit activity.
- Export the exact filtered dataset to CSV/XLSX/PDF, including generation timestamp, filters, timezone, and requesting administrator.
- Scheduled reports must record recipients, cadence, last run, next run, delivery result, and failure reason.

### 6. Controls, audit, and security

- Permissions: finance viewer, payout maker, payout reviewer, payout approver, reconciler, report exporter, and finance administrator.
- Record before/after values, actor, timestamp, IP/device metadata, reason, evidence, and related references for every change.
- Mask bank and phone details except for authorized roles; encrypt sensitive payout account data at rest.
- Require step-up authentication for approval, payout submission, bank-detail changes, reversals, period reopening, and large exports.
- Add approval limits and escalation thresholds by role and amount.
- Do not delete finance records. Use reversals and status transitions.
- Prevent formula manipulation, negative payouts without an approved adjustment, invalid state transitions, and edits after reconciliation.

### 7. Exception and operational flows often missed

- Provider changes payout details after earnings are generated but before payout approval.
- A provider is suspended, deactivated, or loses verification while money is payable.
- One task is shared by a lab partner and lab technician and requires a split.
- A consultation/order is refunded after the provider earning was approved or paid.
- M-Pesa says successful but the callback is delayed, duplicated, or lost.
- A payout request times out and its final status is unknown.
- Partial batch success, charge/fee differences, wrong recipient, reversal, duplicate task completion, currency mismatch, and overpayment recovery.
- Backdated adjustments and rule changes must not silently recalculate closed periods.
- Email/SMS delivery failure must not roll back a successful payment; notifications need retry tracking.
- Timezone must be Africa/Nairobi for display and period cutoffs while timestamps remain unambiguous in storage.

### 8. Minimum acceptance criteria

- No standalone Payouts navigation item; payments live under **Invoices & Payments**.
- The old `/admin/payouts` URL redirects to the provider-payments tab.
- All finance data persists through authenticated APIs and survives browser/device changes.
- Duplicate callbacks, retries, and double-clicks do not duplicate receipts, earnings, or payouts.
- Every paid record has a provider transaction reference, paid timestamp, actor/source, and electronic receipt/remittance trail.
- Totals in dashboard, exports, invoice details, payout batches, and reconciliation agree for the same filters.
- Automated tests cover permissions, state transitions, duplicate prevention, callback replay, partial failure, refund/reversal, reconciliation, and exports.
- Empty, loading, error, retry, offline, and unauthorized states are clear and accessible.

## Delivery sequence prompt

Implement this in phases: (1) canonical finance models and state machines, (2) API permissions and idempotency, (3) invoice and receipt linkage, (4) earnings generation, (5) payout batches and approvals, (6) provider integration and reconciliation, (7) reports/exports, (8) notifications, audit, security hardening, and automated tests. Include migrations, API documentation, rollback notes, environment variables, and an operations runbook for failed or uncertain payments.
