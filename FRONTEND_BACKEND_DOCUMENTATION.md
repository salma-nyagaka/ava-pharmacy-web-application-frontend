#  Frontend -> Backend Implementation Guide

This document describes what the frontend expects from the backend. The current frontend uses local storage and mock services. Replace those with real API endpoints that return the same shapes.

## 1. Overview
The app is a React + Vite storefront with authenticated flows for customers, medical staff, and admins. Data is currently loaded from files under `src/data` and in-browser storage. The backend should become the source of truth for all dynamic data.

## 2. Roles and Access Control
Roles used in the frontend:
`patient`, `doctor`, `pediatrician`, `pharmacist`, `admin`, `lab_technician`

Access rules used by the router:
- Protected pages require login.
- Admin pages require `role === admin`.

Recommended auth endpoints:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/refresh`

## 3. Global Conventions
- Currency: `KSh` (Kenya Shilling).
- Stock source: `branch`, `warehouse`, `out`.
- IDs in UI examples use prefixes like `ORD-`, `RX-`, `LAB-`, `SUP-`, `DOC-`, `PAY-`.
- Dates are displayed as human-readable strings but should be ISO 8601 in API responses.

## 4. Top-Level Routes and Backend Needs (Start From The Top)

### 4.1 Home (`/`)
Data required:
- Categories for the homepage carousel.
- Featured products and promotional offers.
- Promotions for price adjustments and badges.
- Optional banner slides.
- Newsletter signup.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/catalog/categories` | Load categories and subcategories. |
| GET | `/catalog/products?featured=true` | Featured products. |
| GET | `/promotions/active` | Active promotions. |
| GET | `/content/banners` | Top banner message. |
| POST | `/marketing/newsletter` | Newsletter signup. |

### 4.2 Header Search, Categories, Brands, Concerns
Data required:
- Category tree and subcategories.
- Health concerns list.
- Top banner message.
- Cart count and favourites count for the logged-in user.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/catalog/categories` | Category tree. |
| GET | `/catalog/health-concerns` | Health concerns. |
| GET | `/content/banners` | Banner message and link. |
| GET | `/cart` | Cart items to compute count. |
| GET | `/favourites` | Favourite items to compute count. |

### 4.3 Product Listing (`/products`, `/category/:category`)
Filtering and sorting in UI:
- Search query, category, subcategory, price range, brand, rating, availability.
- Sort by price, rating, newest.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/catalog/products` | List products with query params for filters. |
| GET | `/catalog/brands` | Brand list for filter UI. |

### 4.4 Product Detail (`/product/:id`)
Data required:
- Product details, gallery, features, warnings, stock source.
- Related products are optional but recommended.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/catalog/products/:id` | Product detail. |
| GET | `/catalog/products/:id/related` | Related products. |

### 4.5 Cart (`/cart`)
Data required:
- Cart items, quantity updates, remove items.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/cart` | Get cart items. |
| POST | `/cart/items` | Add item to cart. |
| PATCH | `/cart/items/:id` | Update quantity. |
| DELETE | `/cart/items/:id` | Remove item. |
| DELETE | `/cart` | Clear cart. |

### 4.6 Checkout (`/checkout`)
Frontend expects:
- Shipping address details.
- Payment methods: M-Pesa (STK or Paybill), Card, Cash on Delivery.
- Confirmation of payment before order placement.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/checkout/shipping` | Validate/save shipping address. |
| POST | `/payments/mpesa/stk` | Initiate STK push. |
| POST | `/payments/mpesa/paybill` | Register paybill reference. |
| POST | `/payments/card/authorize` | Card authorization. |
| POST | `/orders` | Place order. |

### 4.7 Order Confirmation and Tracking (`/order-confirmation`, `/track-order`)
Data required:
- Order summary, tracking steps, courier details.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/orders/:id` | Order details and tracking data. |
| GET | `/orders/:id/tracking` | Tracking timeline. |

### 4.8 Account (`/account/*`)
Account pages:
- `/account` summary
- `/account/orders`, `/account/orders/:id`
- `/account/addresses`
- `/account/payment`
- `/account/settings`
- `/account/prescriptions`
- `/account/consultations`
- `/account/lab-tests`
- `/account/favourites`

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/users/me` | Profile summary. |
| GET | `/users/me/orders` | Order history. |
| GET | `/users/me/orders/:id` | Order details. |
| GET | `/users/me/addresses` | Saved addresses. |
| POST | `/users/me/addresses` | Add address. |
| PATCH | `/users/me/addresses/:id` | Update address or set default. |
| DELETE | `/users/me/addresses/:id` | Remove address. |
| GET | `/users/me/payment-methods` | Saved payment methods. |
| POST | `/users/me/payment-methods` | Add payment method. |
| DELETE | `/users/me/payment-methods/:id` | Remove payment method. |
| GET | `/users/me/favourites` | Favourite items. |
| GET | `/users/me/prescriptions` | Prescription history. |
| GET | `/users/me/consultations` | Consultation history. |
| GET | `/users/me/lab-requests` | Lab requests and results. |

### 4.9 Wishlist (`/wishlist`) and Favourites
The UI uses the same concept as favourites. It expects add, remove, and toggle.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/favourites` | List favourites. |
| POST | `/favourites` | Add favourite. |
| DELETE | `/favourites/:id` | Remove favourite. |

### 4.10 Offers (`/offers`)
The offers page is built from catalog products + active promotions.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/promotions/active` | Active promotions. |
| GET | `/catalog/products?hasDiscount=true` | Discounted products. |

### 4.11 Prescriptions (`/prescriptions`, `/prescriptions/history`)
Flows:
- Customer uploads prescription files.
- Pharmacist reviews, approves, or requests clarification.
- Dispatch status updates.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/prescriptions` | Upload new prescription. |
| GET | `/prescriptions` | List prescriptions by user or role. |
| GET | `/prescriptions/:id` | Prescription detail. |
| PATCH | `/prescriptions/:id` | Update status, items, dispatch. |
| POST | `/prescriptions/:id/audit` | Append audit entry. |

### 4.12 Lab Services (`/lab-tests`, `/lab/dashboard`, `/admin/lab-*`)
Flows:
- Browse lab tests.
- Book a lab request with schedule and patient details.
- Track status and results.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/labs/tests` | Lab test catalog. |
| GET | `/labs/requests` | Lab requests list. |
| POST | `/labs/requests` | Create lab request. |
| PATCH | `/labs/requests/:id` | Update status or assignment. |
| POST | `/labs/results` | Upload or update result. |
| GET | `/labs/results/:id` | Result detail. |
| POST | `/labs/requests/:id/mark-received` | Mark result as received. |

### 4.13 Telemedicine (`/doctor-consultation`, `/pediatric-consultation`)
Flows:
- Doctor and pediatrician consultation sessions.
- Messaging threads and prescriptions.

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/telemedicine/doctors` | Doctor directory. |
| GET | `/telemedicine/consultations` | Consultation list. |
| POST | `/telemedicine/consultations` | Create consultation. |
| GET | `/telemedicine/consultations/:id/messages` | Message thread. |
| POST | `/telemedicine/consultations/:id/messages` | Send message. |
| GET | `/telemedicine/prescriptions` | Doctor prescriptions. |
| POST | `/telemedicine/prescriptions` | Create doctor prescription. |

### 4.14 Admin (`/admin/*`)
Admin modules include:
- Products, categories, inventory
- Users
- Orders
- Prescriptions
- Doctors
- Deals and promotions
- Payouts
- Lab tests, lab requests, lab partners
- Support tickets
- Settings
- Reports

Suggested endpoints:
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/users` | List users. |
| POST | `/admin/users` | Create user. |
| GET | `/admin/users/:id` | User detail. |
| PATCH | `/admin/users/:id` | Update user. |
| GET | `/admin/products` | Product list. |
| POST | `/admin/products` | Create product. |
| PATCH | `/admin/products/:id` | Update product. |
| DELETE | `/admin/products/:id` | Delete product. |
| GET | `/admin/categories` | Admin categories tree. |
| POST | `/admin/categories` | Create category or subcategory. |
| GET | `/admin/orders` | Order management list. |
| PATCH | `/admin/orders/:id` | Update order status. |
| GET | `/admin/prescriptions` | Prescription management list. |
| PATCH | `/admin/prescriptions/:id` | Update prescription. |
| GET | `/admin/doctors` | Doctor management list. |
| PATCH | `/admin/doctors/:id` | Update doctor status. |
| GET | `/admin/promotions` | Deals management. |
| POST | `/admin/promotions` | Create promotion. |
| PATCH | `/admin/promotions/:id` | Update promotion. |
| GET | `/admin/payouts` | Payout management. |
| PATCH | `/admin/payouts/:id` | Update payout. |
| GET | `/admin/labs/tests` | Lab tests management. |
| POST | `/admin/labs/tests` | Create lab test. |
| GET | `/admin/labs/requests` | Lab requests management. |
| PATCH | `/admin/labs/requests/:id` | Update request status or assignment. |
| GET | `/admin/labs/partners` | Lab partners management. |
| POST | `/admin/labs/partners` | Create lab partner. |
| GET | `/admin/support` | Support tickets list. |
| PATCH | `/admin/support/:id` | Update support ticket. |
| GET | `/admin/reports` | Sales, inventory, consultations. |
| GET | `/admin/settings` | Global admin settings. |

## 5. Data Models Used By The Frontend
The following types are the exact shapes used in the UI. The backend should return compatible JSON.

### 5.1 Product
| Field | Type |
| --- | --- |
| id | number |
| slug | string |
| sku | string |
| name | string |
| brand | string |
| category | string |
| categorySlug | string |
| subcategorySlugs | string[] |
| price | number |
| originalPrice | number or null |
| image | string |
| gallery | string[] |
| rating | number |
| reviews | number |
| badge | string or null |
| stockSource | `branch` or `warehouse` or `out` |
| shortDescription | string |
| description | string |
| features | string[] |
| directions | string |
| warnings | string |

### 5.2 Category
| Field | Type |
| --- | --- |
| name | string |
| slug | string |
| path | string |
| subcategories | Array of `{ name, slug }` |

### 5.3 Promotion
| Field | Type |
| --- | --- |
| id | string |
| title | string |
| type | `percentage` or `amount` |
| value | number |
| scope | `all` or `category` or `brand` or `product` |
| targets | string[] |
| startDate | string |
| endDate | string |
| status | `active` or `draft` |
| badge | string or null |

### 5.4 Cart Item
| Field | Type |
| --- | --- |
| id | number |
| name | string |
| brand | string |
| price | number |
| quantity | number |
| image | string or null |
| stockSource | `branch` or `warehouse` |
| prescriptionId | string or null |

### 5.5 Favourite Item
| Field | Type |
| --- | --- |
| id | number |
| name | string |
| brand | string |
| price | number |
| originalPrice | number or null |
| image | string or null |
| stockSource | `branch` or `warehouse` or `out` |

### 5.6 Order
| Field | Type |
| --- | --- |
| id | string |
| date | string |
| status | `Processing` or `In Transit` or `Delivered` or `Cancelled` |
| items | number |
| total | number |
| trackingNumber | string or null |
| products | string[] |
| productItems | Array of `{ name, qty, price }` |
| estimatedDelivery | string or null |
| deliveredDate | string or null |
| address | string |
| payment | string |
| courier | `{ name, phone }` or null |

### 5.7 Prescription
| Field | Type |
| --- | --- |
| id | string |
| patient | string |
| pharmacist | string |
| status | `Pending` or `Approved` or `Clarification` or `Rejected` |
| dispatchStatus | `Not started` or `Queued` or `Packed` or `Dispatched` or `Delivered` |
| submitted | string |
| doctor | string |
| files | string[] |
| items | Array of `{ name, dose, frequency, qty }` |
| notes | string |
| audit | Array of `{ time, action }` |

### 5.8 Support Ticket
| Field | Type |
| --- | --- |
| id | string |
| customer | string |
| email | string |
| channel | `Order` or `Prescription` or `Consultation` |
| referenceId | string |
| subject | string |
| priority | `Low` or `Medium` or `High` |
| status | `Open` or `In Progress` or `Resolved` |
| assignedTo | string |
| createdAt | string |
| notes | Array of `{ time, author, message }` |

### 5.9 Lab Test, Request, Result
LabTest:
| Field | Type |
| --- | --- |
| id | string |
| name | string |
| category | string |
| price | number |
| turnaround | string |
| sampleType | string |
| description | string |

LabRequest:
| Field | Type |
| --- | --- |
| id | string |
| patientName | string |
| patientPhone | string |
| patientEmail | string or null |
| testId | string |
| status | `Awaiting sample` or `Sample collected` or `Processing` or `Result ready` or `Completed` or `Cancelled` |
| requestedAt | string |
| scheduledAt | string |
| paymentStatus | `Paid` or `Pending` |
| priority | `Routine` or `Priority` |
| channel | `Walk-in` or `Collection` |
| orderingDoctor | string or null |
| notes | string or null |
| assignedTechnician | string or null |
| labPartnerId | string or null |
| labTechId | string or null |
| resultId | string or null |
| audit | Array of `{ time, action }` |

LabResult:
| Field | Type |
| --- | --- |
| id | string |
| requestId | string |
| summary | string |
| fileName | string |
| uploadedAt | string |
| flags | string[] |
| abnormal | boolean |
| recommendation | string or null |
| reviewedBy | string |

### 5.10 Telemedicine
DoctorProfile:
| Field | Type |
| --- | --- |
| id | string |
| name | string |
| type | `Doctor` or `Pediatrician` |
| specialty | string |
| email | string |
| phone | string |
| license | string |
| facility | string |
| submitted | string |
| status | `Active` or `Pending` or `Suspended` |
| commission | number |
| consultFee | number |
| rating | number |
| availability | string |
| languages | string[] |
| documents | Array of `{ name, status, note? }` |

Consultation:
| Field | Type |
| --- | --- |
| id | string |
| doctorId | string |
| patientName | string |
| patientAge | number |
| issue | string |
| status | `Waiting` or `In progress` or `Completed` or `Cancelled` |
| scheduledAt | string |
| channel | `Chat` |
| priority | `Routine` or `Priority` |
| lastMessageAt | string |
| pediatric | boolean or null |
| guardianName | string or null |
| childName | string or null |
| childAge | number or null |
| weightKg | number or null |
| consentStatus | `Pending` or `Granted` |
| dosageAlert | boolean |

DoctorMessageThread:
| Field | Type |
| --- | --- |
| id | string |
| doctorId | string |
| patientName | string |
| lastMessage | string |
| lastMessageAt | string |
| unreadCount | number |
| status | `Open` or `Resolved` |
| messages | Array of `{ id, sender, text, time }` |

DoctorPrescription:
| Field | Type |
| --- | --- |
| id | string |
| doctorId | string |
| patientName | string |
| createdAt | string |
| status | `Draft` or `Sent` or `Dispensed` or `Cancelled` |
| notes | string |
| pediatric | boolean or null |
| items | Array of `{ name, dosage, quantity }` |

### 5.11 Payouts
PayoutRule:
| Field | Type |
| --- | --- |
| role | `Doctor` or `Pediatrician` or `Lab Technician` or `Lab Partner` or `Pharmacist` |
| amount | number |
| currency | `KSh` |
| active | boolean |

AdminPayout:
| Field | Type |
| --- | --- |
| id | string |
| recipientId | string or null |
| recipientName | string |
| role | string |
| period | string |
| amount | number |
| method | `Bank Transfer` or `M-Pesa` or `Card` or `Cheque` or `Cash` |
| reference | string |
| status | `Pending` or `Paid` or `Failed` |
| requestedAt | string |
| paidAt | string or null |
| notes | string or null |
| source | `Automatic` or `Manual` |
| taskType | `Consultation` or `Lab Result` or `Lab Delivery` or `Prescription` |
| taskId | string or null |
| completedAt | string or null |

### 5.12 Banner
| Field | Type |
| --- | --- |
| id | string |
| message | string |
| link | string or null |
| status | `active` or `inactive` |

## 6. Integration Notes
- Replace local storage usage with API calls in services under `src/services`.
- Keep the shapes above stable to avoid frontend changes.
- Implement server-side validation for checkout, prescriptions, and lab requests.
- Consider webhooks for M-Pesa and card payment confirmations.

## 7. End-to-End Workflows (Logic)
This section explains the business flow the frontend assumes. Use it to design backend orchestration and status transitions.

### 7.1 Authentication (Login, Register, Logout)
Flow:
1. User submits login or registration form.
2. Backend validates credentials and returns a session/token plus the user role.
3. Frontend stores user in session (currently local storage) and unlocks protected routes.
4. Logout clears session and redirects to public pages.

Backend responsibilities:
- Return `User` with `role` after login/register.
- Provide `/auth/me` for session restoration on reload.
- Support role-based access for protected/admin routes.

### 7.2 Product Discovery and Search
Flow:
1. Home page loads categories, promotions, featured products.
2. Header search sends user to `/products?query=...`.
3. Product listing filters by category, subcategory, brand, rating, price, availability.
4. Product detail loads full product data and stock source.

Backend responsibilities:
- Fast catalog search and filtering.
- Return promotion-adjusted pricing or raw pricing + promotions.

### 7.3 Cart
Flow:
1. Add to cart from listing or product detail.
2. Cart shows items with quantities.
3. User can update quantity or remove items.
4. Cart count updates globally in header.

Backend responsibilities:
- Persist cart per user/session.
- Validate stock before add/update.

### 7.4 Checkout and Order Placement
Flow:
1. Step 1: Shipping details validated.
2. Step 2: Payment method selected.
   - M-Pesa STK: initiate payment, wait for confirmation.
   - M-Pesa Paybill: generate account reference, wait for confirmation.
   - Card: initiate authorization and confirm.
   - Cash: auto-confirm.
3. Step 3: Review order summary.
4. Place order only if payment is confirmed (except cash).
5. On success, cart is cleared and user is redirected to order confirmation.

Backend responsibilities:
- Validate shipping address and delivery rules.
- Create payment intents or references.
- Create order only after payment confirmation.
- Return order id and status.

### 7.5 Order Tracking and History
Flow:
1. User views orders in `/account/orders` or `/orders`.
2. Order detail shows status, tracking number, courier, estimated delivery.
3. Tracking page shows progress through steps.
4. User can download receipt and leave reviews (UI only for now).

Backend responsibilities:
- Maintain order status timeline.
- Provide tracking metadata and courier details.

### 7.6 Favourites (Wishlist)
Flow:
1. User toggles favourite on product.
2. Wishlist page lists favourites.
3. Header badge shows count.

Backend responsibilities:
- Store favourites per user.

### 7.7 Prescriptions (Customer -> Pharmacist)
Flow:
1. Customer uploads prescription files with details.
2. Record created with `Pending` status and `Not started` dispatch.
3. Pharmacist reviews, approves, requests clarification, or rejects.
4. Approved prescriptions move through dispatch statuses: `Queued` -> `Packed` -> `Dispatched` -> `Delivered`.
5. Audit log is appended on each action.

Backend responsibilities:
- Store files and metadata.
- Enforce status transitions.
- Provide audit trail.

### 7.8 Lab Services (Booking -> Results)
Flow:
1. User browses lab tests and books a request.
2. Request status starts at `Awaiting sample`.
3. Lab staff updates status: `Sample collected` -> `Processing` -> `Result ready`.
4. Lab result is uploaded and attached to the request.
5. User marks result as received, status becomes `Completed`.

Backend responsibilities:
- Validate booking details.
- Manage status transitions.
- Store results and attach to requests.

### 7.9 Telemedicine (Consultations)
Flow:
1. Customer requests consultation.
2. Doctor/pediatrician handles chat-based session.
3. Doctor can issue a prescription.
4. Consultation is marked completed for payouts/reporting.

Backend responsibilities:
- Session creation and message storage.
- Doctor availability and assignment.
- Prescription creation tied to consultation.

### 7.10 Admin Workflows
Key flows:
- Products: create/update/delete, manage images and stock source.
- Categories: update category tree and subcategories.
- Orders: update order status, manage refunds or cancellations.
- Prescriptions: approve/reject and manage dispatch updates.
- Doctors: verify or suspend accounts.
- Promotions: create and schedule deals.
- Lab tests/partners: manage catalog and partner network.
- Support: manage tickets and responses.
- Payouts: generate and mark payments as paid.

Backend responsibilities:
- Role-based admin authorization.
- Audit log for admin actions.

## 8. Professional Registrations and Approvals
This section documents the professional onboarding flows and the login gates that depend on approval status.

Pharmacists are not part of the professional self-registration flow. They are created by admins in the admin module, then invited by email to log in and access the pharmacist portal.

### 8.1 Login Gates For Professionals
The login page enforces approval rules based on stored profiles.

Doctors/Pediatricians:
1. Login looks up a matching `DoctorProfile` by email.
2. If status is `Pending`, login is blocked with a review message.
3. If status is `Suspended`, login is blocked with a suspension message.
4. If status is `Active`, user is logged in with role `doctor` or `pediatrician` and routed to their dashboard.

Lab Technicians:
1. Login finds the lab technician by email inside a `LabPartner.techs[]` list.
2. If the lab partner is not `Verified`, login is blocked.
3. If technician status is not `Active`, login is blocked.
4. If both are OK, user is logged in with role `lab_technician`.

Lab Partners:
- There is no direct “lab partner” login role in the current UI. Lab partners exist for admin management and for attaching lab technicians.

### 8.2 Professional Registration – Roles and Fields
All roles share basic identity fields and then diverge.

Common fields:
- Full name or contact name
- Email
- Phone
- Years of experience
- County (optional)
- Address (optional)
- Payout method (`M-Pesa` or `Bank Transfer`)
- Payout account (required)
- Background consent (required)
- Compliance declaration (required)
- Agreement to terms (required)
- Supporting documents checklist (role-specific)
- File uploads (documents)
- CV uploads

Doctor registration fields:
- License number (required)
- Licensing board (required)
- License country
- License expiry (required)
- ID/Passport number (required)
- Specialty (required)
- Affiliated facility
- Availability hours
- Languages spoken
- Consultation modes (Video/Chat/Phone)
- Consultation fee (optional)
- References (2 optional contacts: name/email/phone)

Pediatrician registration fields:
- Same as Doctor, but uses the pediatric specialty list.
- Document checklist uses pediatric-specific items.

Lab Partner registration fields:
- Lab name (required)
- Lab location (required)
- Accreditation number (required)
- Facility license number (required)
- Contact name, email, phone (required)
- Years in operation
- Notes / bio (optional)

Lab Technician registration fields:
- License number (required)
- Licensing board (required)
- License country
- License expiry (required)
- ID/Passport number (required)
- Lab specialty (required)
- Lab partner selection (required)
- Availability hours

### 8.3 What Gets Created On Submit (Current Frontend Logic)
Doctors/Pediatricians:
- A `DoctorProfile` is created with status `Pending`.
- Documents are stored with status `Submitted`.
- Saved in local storage (`ava_doctor_profiles`).

Lab Partners:
- A `LabPartner` record is created with status `Pending`.
- Saved in local storage (`ava_lab_partners`).

Lab Technicians:
- A `LabTechnician` record is added under the selected `LabPartner.techs` list.
- Technician status is set to `Active` immediately (no explicit approval flow in UI).

### 8.4 Admin Approval Flow
Doctors/Pediatricians (Admin > Doctor Management):
- Pending applications are reviewed.
- Admin can: `Approve` (status -> `Active`, sets `verifiedAt`), `Request documents` (adds `statusNote`), or `Reject` (status -> `Suspended`, sets `rejectionNote`).
- Actions are logged in the admin audit log.

Lab Partners (Admin > Lab Partner Management):
- Pending lab partners can be `Verified` (status -> `Verified`, sets `verifiedAt`) or managed to `Suspended`.
- Actions are logged in the admin audit log.

Lab Technicians:
- No dedicated approval queue. Technicians become active immediately on registration.
- Admin can add or remove technicians via Lab Partner Management.

### 8.5 Backend Request Shape (Recommended)
The frontend currently saves directly to local storage. For backend implementation, treat submission as a new “application” and send it to an admin review queue.

Suggested endpoints:
- `POST /professionals/applications` for Doctor/Pediatrician/Lab Partner/Lab Technician
- `GET /admin/professionals/applications?status=pending`
- `PATCH /admin/professionals/applications/:id` with actions: `approve`, `request_docs`, `reject`

Suggested payload (example for Doctor):
```json
{
  "type": "Doctor",
  "name": "Dr. Jane Mwangi",
  "email": "doctor@example.com",
  "phone": "+254700000000",
  "license": "KMD-12345",
  "licenseBoard": "KMPDC",
  "licenseCountry": "Kenya",
  "licenseExpiry": "2027-01-31",
  "idNumber": "12345678",
  "specialty": "General Medicine",
  "facility": "Nairobi Hospital",
  "availability": "Mon–Fri, 9am–5pm",
  "languages": ["English", "Swahili"],
  "consultModes": ["Video", "Chat"],
  "payoutMethod": "M-Pesa",
  "payoutAccount": "+254700000000",
  "references": [
    { "name": "Ref 1", "email": "ref1@example.com", "phone": "+254700000001" }
  ],
  "documents": ["Medical licence (KMB-issued)", "National ID / Passport"],
  "files": ["license.pdf", "id.png"],
  "cvFiles": ["cv.pdf"],
  "backgroundConsent": true,
  "complianceDeclaration": true,
  "agreedToTerms": true
}
```
