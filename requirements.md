# AvaPharmacy — Backend API Requirements Document

**Module:** Product Catalog, Search, Cart, Checkout, Payment Integration, Inventory Sync, Order Push & Real-Time Availability
**Version:** 1.0
**Prepared by:** Engineering Team
**Date:** March 9, 2026

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Product Catalog](#3-product-catalog)
4. [Search & Filtering](#4-search--filtering)
5. [Shopping Cart](#5-shopping-cart)
6. [Checkout](#6-checkout)
7. [Payment Integration](#7-payment-integration)
8. [Inventory Sync](#8-inventory-sync)
9. [Order Push & Order Management](#9-order-push--order-management)
10. [Real-Time Availability](#10-real-time-availability)
11. [Webhooks & Events](#11-webhooks--events)
12. [Error Codes Reference](#12-error-codes-reference)

---

## 1. Global Conventions

### 1.1 Base URL
```x
https://api.avapharmacy.co.ke/v1
```

### 1.2 Standard Response Envelope
Every API response MUST follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  },
  "message": "Optional human-readable message"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The requested product does not exist.",
    "field": "product_id"
  }
}
```

### 1.3 Authentication Headers
```
Authorization: Bearer <access_token>
X-Client-Version: 1.0.0
X-Platform: web
```

### 1.4 Currency
All monetary values are in **KES (Kenyan Shillings)** as integers (cents not used). Example: `KES 499` is sent as `499`.

### 1.5 Timestamps
All timestamps use **ISO 8601** format in UTC: `2026-03-09T14:30:00Z`

---

## 2. Authentication & Authorization

### 2.1 User Roles
The following roles are defined in the system. APIs must enforce role-based access:

| Role | Description |
|---|---|
| `patient` | Regular customer (shop, order, consult) |
| `admin` | Full system access |
| `pharmacist` | Manage prescriptions, inventory |
| `doctor` | Handle consultations, write prescriptions |
| `pediatrician` | Handle pediatric consultations |
| `lab_technician` | Process lab requests |
| `lab_partner` | Manage a lab branch |

### 2.2 Token Specification
- **Access Token:** JWT, expires in 15 minutes
- **Refresh Token:** Opaque token, expires in 30 days
- Stored client-side under localStorage key `ava_user`

### 2.3 Customer Registration

#### `POST /auth/register`
Creates a new patient account.

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Mwangi",
  "email": "jane@example.com",
  "phone": "0712345678",
  "password": "StrongPass123!",
  "date_of_birth": "1995-04-12",
  "gender": "female",
  "agreed_to_terms": true,
  "agreed_to_marketing": false
}
```

**Validation Rules:**
- `email` must be unique and valid format
- `phone` must be a valid Kenyan number (07xx or 01xx, 10 digits)
- `password` minimum 8 characters, at least one uppercase, one number
- `agreed_to_terms` must be `true` — reject registration if `false`

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "first_name": "Jane",
      "last_name": "Mwangi",
      "email": "jane@example.com",
      "phone": "0712345678",
      "role": "patient",
      "email_verified": false,
      "created_at": "2026-03-09T10:00:00Z"
    },
    "access_token": "eyJ...",
    "refresh_token": "rt_..."
  }
}
```

**Post-registration Actions (backend must handle):**
1. Send verification email with a time-limited link (expires 24 hours)
2. Send welcome SMS: "Welcome to AvaPharmacy, Jane! Start shopping at avapharmacy.co.ke"
3. Create an empty server-side cart for the new user
4. Merge any guest cart if `X-Session-ID` header is present in the request

---

#### `POST /auth/verify-email`
Confirms the user's email address using the token from the verification email.

**Request:**
```json
{ "token": "ev_abc123xyz" }
```

**Response:**
```json
{
  "success": true,
  "data": { "email_verified": true }
}
```

---

#### `POST /auth/resend-verification`
Resends the email verification link. Rate-limited to 3 requests per hour per account.

**Request:**
```json
{ "email": "jane@example.com" }
```

---

#### `POST /auth/login`
Authenticates an existing user.

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "StrongPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "first_name": "Jane",
      "last_name": "Mwangi",
      "email": "jane@example.com",
      "phone": "0712345678",
      "role": "patient",
      "email_verified": true
    },
    "access_token": "eyJ...",
    "refresh_token": "rt_..."
  }
}
```

**Login Rules:**
- Block login after 5 consecutive failed attempts for 15 minutes (return `ACCOUNT_LOCKED` error)
- If `role` is `doctor` or `pediatrician` and profile `status` is `Pending`, return `PROFESSIONAL_PENDING_APPROVAL`
- If `role` is `doctor` or `pediatrician` and profile `status` is `Suspended`, return `ACCOUNT_SUSPENDED`
- If `role` is `lab_technician` and the parent lab partner is not `Verified`, return `LAB_PARTNER_NOT_VERIFIED`

---

#### `POST /auth/forgot-password`
Sends a password reset link to the user's email.

**Request:**
```json
{ "email": "jane@example.com" }
```

Always returns `200 OK` regardless of whether the email exists (to prevent user enumeration).

---

#### `POST /auth/reset-password`
Sets a new password using the reset token from email.

**Request:**
```json
{
  "token": "pr_xyz789",
  "new_password": "NewStrongPass456!"
}
```

---

#### `POST /auth/refresh`
Issues a new access token using a valid refresh token.

**Request:**
```json
{ "refresh_token": "rt_..." }
```

---

#### `POST /auth/logout`
Invalidates the current refresh token server-side.

---

#### `GET /auth/me`
Returns the currently authenticated user's profile. Called on app load to restore session.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "first_name": "Jane",
      "last_name": "Mwangi",
      "email": "jane@example.com",
      "phone": "0712345678",
      "role": "patient",
      "email_verified": true,
      "avatar_url": null,
      "default_address_id": "addr_001"
    }
  }
}
```

---

### 2.4 Account Profile Management

#### `GET /account/profile`
Returns the full profile for the logged-in user.

#### `PUT /account/profile`
Updates profile fields.

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Mwangi",
  "phone": "0712345678",
  "date_of_birth": "1995-04-12",
  "gender": "female"
}
```

#### `POST /account/change-password`
Changes password for authenticated users.

**Request:**
```json
{
  "current_password": "StrongPass123!",
  "new_password": "NewStrongPass456!"
}
```

#### `DELETE /account`
Soft-deletes the account. Sets `is_active: false` and anonymizes personal data after 30 days per data retention policy.

---

### 2.5 Auth Endpoints Summary

```
POST /auth/register
POST /auth/verify-email
POST /auth/resend-verification
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/refresh
POST /auth/logout
GET  /auth/me
GET  /account/profile
PUT  /account/profile
POST /account/change-password
DELETE /account
```

---

## 3. Product Catalog

### 3.1 Data Model

```typescript
interface Product {
  id: number                      // Unique integer ID
  slug: string                    // URL-friendly identifier e.g. "vitamin-c-1000mg"
  sku: string                     // Stock Keeping Unit e.g. "VIT-C-1000"
  name: string                    // Full product name
  brand: string                   // Brand name
  category: string                // Human-readable category name
  category_slug: string           // e.g. "health-wellness"
  subcategory_slugs: string[]     // e.g. ["vitamins-supplements"]
  price: number                   // Current selling price in KES
  original_price: number | null   // Pre-discount price (null if no discount)
  discount_percent: number | null // Calculated discount percentage
  images: {
    primary: string               // Main product image URL
    gallery: string[]             // Additional product images
  }
  rating: number                  // Average rating 0.0 - 5.0
  review_count: number
  badge: string | null            // e.g. "New", "Best Seller", "Prescription Required"
  stock: {
    source: "branch" | "warehouse" | "out_of_stock"
    quantity: number
    low_stock_threshold: number   // Trigger "Only X left" UI warning
    is_available: boolean
  }
  content: {
    short_description: string
    description: string           // Full HTML or markdown description
    features: string[]            // Bullet points e.g. ["Boosts immunity", "Vegan"]
    directions: string            // Usage instructions
    warnings: string              // Safety warnings
  }
  flags: {
    requires_prescription: boolean
    is_featured: boolean
    is_deal: boolean
    is_new: boolean
  }
  meta: {
    weight_grams: number | null
    dimensions: string | null
    created_at: string
    updated_at: string
  }
}
```

### 3.2 Category Data Model

```typescript
interface Category {
  id: number
  name: string                    // e.g. "Health & Wellness"
  slug: string                    // e.g. "health-wellness"
  path: string                    // URL path e.g. "/category/health-wellness"
  image_url: string | null
  product_count: number
  subcategories: {
    id: number
    name: string
    slug: string
    product_count: number
  }[]
}
```

Defined categories from the UI:

| Category | Slug | Subcategories |
|---|---|---|
| Health & Wellness | `health-wellness` | Vitamins & Supplements, Pain Relief, Cough & Cold, Digestive Health, Diabetes Care, Heart & Blood Pressure, Eye Care, First Aid |
| Beauty & Skincare | `beauty-skincare` | Face Care, Body Care, Hair Care, Sun Protection, Lip Care, Fragrances |
| Mother & Baby Care | `mother-baby` | Baby Nutrition, Baby Bath & Skin, Maternity, Baby Accessories, Family Planning |
| Self-Care & Lifestyle | `self-care-lifestyle` | Personal Care, Fitness & Nutrition, Lifestyle Devices, Medical Devices |

### 3.3 API Endpoints

#### `GET /products`
Returns paginated product catalog.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | int | Page number, default `1` |
| `per_page` | int | Items per page, default `20`, max `100` |
| `category_slug` | string | Filter by category |
| `subcategory_slug` | string | Filter by subcategory |
| `brand` | string | Filter by brand name |
| `min_price` | int | Minimum price filter |
| `max_price` | int | Maximum price filter |
| `in_stock` | bool | Only show available products |
| `is_featured` | bool | Only featured products (for homepage) |
| `is_deal` | bool | Products on promotion |
| `sort` | string | `price_asc`, `price_desc`, `rating_desc`, `newest`, `name_asc` |

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [ ...Product[] ]
  },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

#### `GET /products/:id`
Returns a single product by numeric ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "product": { ...Product },
    "related_products": [ ...Product[] ]
  }
}
```

---

#### `GET /products/slug/:slug`
Returns a single product by URL slug. Used for SEO-friendly routing like `/product/vitamin-c-1000mg`.

---

#### `GET /categories`
Returns all categories with subcategories and product counts.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [ ...Category[] ]
  }
}
```

---

#### `GET /brands`
Returns all unique brand names and logo URLs.

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": [
      { "name": "Sandoz", "slug": "sandoz", "logo_url": "...", "product_count": 12 }
    ]
  }
}
```

---

### 3.4 Admin Product Management

> All routes below require `admin` or `pharmacist` role.

#### `POST /admin/products`
Creates a new product. Multipart form data to allow image upload.

**Request Body:**
```json
{
  "name": "Vitamin C 1000mg",
  "sku": "VIT-C-1000",
  "brand": "Sandoz",
  "category_slug": "health-wellness",
  "subcategory_slugs": ["vitamins-supplements"],
  "price": 499,
  "original_price": 650,
  "short_description": "...",
  "description": "...",
  "features": ["Boosts immunity"],
  "directions": "Take 1 tablet daily",
  "warnings": "Keep out of reach of children",
  "requires_prescription": false,
  "is_featured": true,
  "is_deal": false,
  "stock_quantity": 200,
  "low_stock_threshold": 20
}
```

#### `PUT /admin/products/:id`
Updates an existing product.

#### `DELETE /admin/products/:id`
Soft-deletes a product (marks `is_active: false`). Products are never hard-deleted.

#### `POST /admin/products/:id/images`
Uploads product images. Accepts `multipart/form-data` with field `images[]`.

---

## 4. Search & Filtering

### 4.1 Requirements

The product listing page shows:
- Search by product name or brand
- Category and subcategory filters
- Price range filter
- In-stock filter
- Sort options

### 4.2 API Endpoint

#### `GET /products/search`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Search query — matches product name, brand, SKU, description |
| `category_slug` | string | Optional category constraint |
| `subcategory_slug` | string | Optional subcategory constraint |
| `min_price` | int | Optional price floor |
| `max_price` | int | Optional price ceiling |
| `in_stock` | bool | Filter out-of-stock items |
| `brand` | string | Comma-separated brand slugs e.g. `sandoz,pfizer` |
| `sort` | string | Same sort options as catalog |
| `page` | int | Pagination |
| `per_page` | int | Items per page |

**Search Behavior:**
- Full-text search on `name`, `brand`, `sku`, `short_description`
- Minimum query length: **2 characters**
- Return empty results (not 400) for queries with no matches
- Return `did_you_mean` suggestions when query has typos (optional v2 feature)
- Record search term in analytics (no PII — session-based)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "vitamin c",
    "products": [ ...Product[] ],
    "facets": {
      "categories": [
        { "slug": "health-wellness", "name": "Health & Wellness", "count": 12 }
      ],
      "brands": [
        { "name": "Sandoz", "count": 4 }
      ],
      "price_range": { "min": 150, "max": 2500 }
    }
  },
  "meta": { "total": 18, "page": 1, "per_page": 20 }
}
```

---

#### `GET /products/search/suggestions`
Live autocomplete — called as user types (debounced 300ms client-side).

**Query Parameters:** `q` (min 2 chars)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      { "text": "Vitamin C 1000mg", "type": "product", "id": 5, "slug": "vitamin-c-1000mg" },
      { "text": "Vitamin D3", "type": "product", "id": 12, "slug": "vitamin-d3" },
      { "text": "Vitamins & Supplements", "type": "category", "slug": "vitamins-supplements" }
    ]
  }
}
```

---

## 5. Shopping Cart

### 5.1 Design Decision: Server-Side Cart
The current UI uses localStorage for the cart (`ava_cart_items`). The backend MUST implement a server-side cart that:
- Persists across devices for logged-in users
- Merges localStorage cart into server cart on login
- Validates stock availability in real time
- Detects price changes since items were added

### 5.2 Cart Item Data Model

```typescript
interface CartItem {
  id: string                        // Cart item UUID
  product_id: number
  product_snapshot: {               // Snapshot at time of adding
    name: string
    brand: string
    image_url: string
    sku: string
  }
  price_at_add: number              // Price when added (for change detection)
  current_price: number             // Current price (may differ)
  price_changed: boolean            // True if current_price != price_at_add
  quantity: number
  max_quantity: number              // Based on current stock
  stock_source: "branch" | "warehouse"
  requires_prescription: boolean
  prescription_id: string | null    // Linked approved prescription
  added_at: string
}
```

### 5.3 Cart Summary Model

```typescript
interface CartSummary {
  items: CartItem[]
  item_count: number                // Total quantity
  subtotal: number                  // Sum of item prices
  discount: number                  // Applied promo discount
  delivery_fee: number              // Calculated based on address
  total: number                     // subtotal - discount + delivery_fee
  promo_code: string | null
  warnings: string[]                // e.g. "2 items have changed price since you added them"
  prescription_required: boolean    // True if any item needs prescription
}
```

### 5.4 API Endpoints

#### `GET /cart`
Returns the current user's cart. For anonymous users, accepts `X-Session-ID` header to identify guest cart.

**Response:**
```json
{
  "success": true,
  "data": { ...CartSummary }
}
```

---

#### `POST /cart/items`
Adds a product to the cart.

**Request:**
```json
{
  "product_id": 5,
  "quantity": 2,
  "prescription_id": null
}
```

**Business Rules:**
- If `requires_prescription: true` and no approved `prescription_id` is provided, return `PRESCRIPTION_REQUIRED` error
- If item is already in cart, increment quantity
- Cannot add more than `stock.quantity` units
- If stock is `out_of_stock`, return `OUT_OF_STOCK` error

**Response:** Returns updated `CartSummary`

---

#### `PUT /cart/items/:cart_item_id`
Updates quantity of a specific cart item.

**Request:**
```json
{ "quantity": 3 }
```

- Setting `quantity: 0` is equivalent to removing the item
- Validate against current stock

---

#### `DELETE /cart/items/:cart_item_id`
Removes an item from cart.

---

#### `DELETE /cart`
Clears the entire cart (used post-order placement).

---

#### `POST /cart/merge`
Merges a guest/localStorage cart into the authenticated user's server cart. Called immediately after login.

**Request:**
```json
{
  "items": [
    { "product_id": 5, "quantity": 2 },
    { "product_id": 12, "quantity": 1 }
  ]
}
```

**Merge Strategy:** For each item, add to existing quantity if product already in cart, otherwise add as new item.

---

#### `POST /cart/promo`
Applies a promotional code to the cart.

**Request:**
```json
{ "promo_code": "SAVE20" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "promo_code": "SAVE20",
    "discount_type": "percent",
    "discount_value": 20,
    "discount_amount": 300,
    "cart": { ...CartSummary }
  }
}
```

---

#### `DELETE /cart/promo`
Removes applied promo code.

---

## 6. Checkout

### 6.1 Checkout Flow

The UI checkout flow has these steps:
1. **Review Cart** — confirm items and quantities
2. **Delivery Address** — select saved address or add new
3. **Delivery Method** — choose delivery type
4. **Payment** — select payment method and confirm
5. **Order Confirmation** — display order reference

### 6.2 Address Data Model

```typescript
interface DeliveryAddress {
  id: string
  label: string                     // e.g. "Home", "Work"
  recipient_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  area: string                      // Sub-area/neighborhood e.g. "Westlands"
  county: string
  postal_code: string | null
  lat: number | null
  lng: number | null
  is_default: boolean
}
```

### 6.3 Delivery Options

```typescript
interface DeliveryOption {
  id: string
  name: string                      // e.g. "Standard Delivery", "Express Delivery", "Same Day"
  description: string
  estimated_days: string            // e.g. "2-3 business days" or "Today, 2-5pm"
  fee: number                       // In KES
  is_available: boolean             // Based on address area
}
```

### 6.4 Order Data Model

```typescript
interface Order {
  id: string                        // e.g. "ORD-2026-004821"
  reference: string                 // Short reference shown to customer
  patient_id: string
  status: OrderStatus
  dispatch_status: DispatchStatus
  items: OrderItem[]
  delivery_address: DeliveryAddress
  delivery_option: DeliveryOption
  pricing: {
    subtotal: number
    discount: number
    delivery_fee: number
    total: number
    promo_code: string | null
  }
  payment: {
    method: PaymentMethod
    status: "pending" | "paid" | "failed" | "refunded"
    transaction_id: string | null
    paid_at: string | null
  }
  prescriptions: string[]           // IDs of linked prescriptions
  notes: string | null              // Customer order notes
  created_at: string
  updated_at: string
  estimated_delivery: string | null
}

type OrderStatus = "pending" | "confirmed" | "processing" | "packed" | "dispatched" | "delivered" | "cancelled" | "returned"

type DispatchStatus = "not_started" | "queued" | "packed" | "dispatched" | "delivered"

interface OrderItem {
  id: string
  product_id: number
  product_name: string
  product_sku: string
  product_image: string
  brand: string
  quantity: number
  unit_price: number
  total_price: number
}
```

### 6.5 API Endpoints

#### `GET /checkout/delivery-options`
Returns available delivery methods based on address.

**Query Parameters:** `address_id` or `lat` + `lng`

**Response:**
```json
{
  "success": true,
  "data": {
    "delivery_options": [ ...DeliveryOption[] ]
  }
}
```

---

#### `POST /checkout/validate`
Pre-submission validation — checks stock, prescriptions, address. Called before showing payment step.

**Request:**
```json
{
  "delivery_address_id": "addr_001",
  "delivery_option_id": "standard",
  "promo_code": "SAVE20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "order_summary": {
      "items": [ ...OrderItem[] ],
      "pricing": { "subtotal": 1850, "discount": 370, "delivery_fee": 250, "total": 1730 }
    },
    "validation_errors": []
  }
}
```

**Validation Errors (array of strings):**
- `"Item 'Vitamin C 1000mg' is now out of stock"`
- `"Item 'Panadol Extra' now costs KES 350 (was KES 300)"`
- `"Prescription RX-2041 has not been approved yet"`

---

#### `POST /orders`
Creates an order and initiates payment.

**Request:**
```json
{
  "delivery_address_id": "addr_001",
  "delivery_option_id": "standard",
  "payment_method": "mpesa",
  "mpesa_phone": "0712345678",
  "promo_code": "SAVE20",
  "notes": "Please ring doorbell twice"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "ORD-2026-004821",
    "reference": "AVA-4821",
    "status": "pending",
    "payment": {
      "method": "mpesa",
      "status": "pending",
      "mpesa_checkout_request_id": "ws_CO_...",
      "instructions": "Enter your M-Pesa PIN to complete payment"
    },
    "total": 1730
  }
}
```

---

#### `GET /orders`
Returns the current user's order history.

**Query Parameters:** `page`, `per_page`, `status`

---

#### `GET /orders/:order_id`
Returns full order details.

---

#### `POST /orders/:order_id/cancel`
Cancels an order. Only allowed when `status` is `pending` or `confirmed`.

**Request:**
```json
{ "reason": "Changed my mind" }
```

---

#### `GET /orders/:order_id/tracking`
Returns tracking information for a dispatched order.

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "ORD-2026-004821",
    "current_status": "dispatched",
    "estimated_delivery": "2026-03-10T14:00:00Z",
    "tracking_steps": [
      { "status": "confirmed", "label": "Order Confirmed", "completed_at": "2026-03-09T10:00:00Z", "is_done": true },
      { "status": "processing", "label": "Being Prepared", "completed_at": "2026-03-09T12:00:00Z", "is_done": true },
      { "status": "packed", "label": "Packed", "completed_at": "2026-03-09T14:00:00Z", "is_done": true },
      { "status": "dispatched", "label": "On The Way", "completed_at": "2026-03-09T15:00:00Z", "is_done": true },
      { "status": "delivered", "label": "Delivered", "completed_at": null, "is_done": false }
    ]
  }
}
```

---

## 7. Payment Integration

### 7.1 Supported Payment Methods

| Method | Code | Notes |
|---|---|---|
| M-Pesa STK Push | `mpesa` | Primary payment method in Kenya |
| Card (Visa/Mastercard) | `card` | Via payment gateway |
| Cash on Delivery | `cod` | For eligible areas/amounts |
| Insurance | `insurance` | Future phase |

### 7.2 M-Pesa Integration

The primary payment method based on the Kenyan market context.

#### Flow:
1. Customer selects M-Pesa, enters phone number
2. Backend calls **Safaricom Daraja API** STK Push
3. Customer receives PIN prompt on their phone
4. Safaricom sends callback to backend webhook
5. Backend updates order status and notifies frontend via polling or WebSocket

#### `POST /payments/mpesa/initiate`
**Request:**
```json
{
  "order_id": "ORD-2026-004821",
  "phone": "254712345678",
  "amount": 1730
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkout_request_id": "ws_CO_09032026_001",
    "merchant_request_id": "29115-34620561-1",
    "response_code": "0",
    "response_description": "Success. Request accepted for processing",
    "customer_message": "Success. Request accepted for processing"
  }
}
```

#### `POST /payments/mpesa/callback` (Daraja Webhook)
Receives payment confirmation from Safaricom. This is an internal endpoint called by Safaricom — it must:
- Verify the callback source IP
- Parse `ResultCode` (0 = success, anything else = failure)
- Update order `payment.status` to `paid` or `failed`
- Update order `status` to `confirmed` if paid
- Trigger order push to fulfillment
- Notify frontend via WebSocket event `payment.completed`

#### `GET /payments/mpesa/status/:checkout_request_id`
Polls payment status. Frontend polls this every 3 seconds for up to 2 minutes.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "paid",
    "transaction_id": "RGX92HBSC3",
    "amount": 1730,
    "paid_at": "2026-03-09T10:30:00Z"
  }
}
```

---

### 7.3 Card Payment Integration

Integrate with a PCI-compliant payment gateway. Recommended: **Flutterwave** or **Pesapal** for East Africa.

#### `POST /payments/card/initiate`
**Request:**
```json
{
  "order_id": "ORD-2026-004821",
  "card": {
    "number": "...",
    "expiry_month": "12",
    "expiry_year": "2028",
    "cvv": "...",
    "name_on_card": "John Doe"
  }
}
```

> **Security Note:** Card details MUST be tokenized client-side via the payment gateway's SDK (e.g., Flutterwave inline JS). The backend never receives raw card numbers.

#### `POST /payments/card/callback`
Webhook from payment gateway confirming charge result.

---

### 7.4 Payment Method Management (Account)

#### `GET /account/payment-methods`
Returns saved payment methods for the user.

#### `POST /account/payment-methods`
Saves a new payment method (card token — never raw card data).

#### `DELETE /account/payment-methods/:id`
Removes a saved payment method.

---

### 7.5 Refunds

#### `POST /admin/payments/refund`
Initiates a refund for a cancelled or returned order.

**Request:**
```json
{
  "order_id": "ORD-2026-004821",
  "amount": 1730,
  "reason": "Order cancelled by customer"
}
```

---

## 8. Inventory Sync

### 8.1 Overview

The backend must support two stock source types:

| Source | Code | Description |
|---|---|---|
| Branch | `branch` | Physical store stock, immediate availability |
| Warehouse | `warehouse` | Central warehouse, delivery only |
| Out of Stock | `out_of_stock` | No stock available anywhere |

### 8.2 Inventory Data Model

```typescript
interface InventoryRecord {
  product_id: number
  sku: string
  branch_stock: {
    branch_id: string
    branch_name: string
    quantity: number
    reserved: number              // Held for pending orders
    available: number             // quantity - reserved
  }[]
  warehouse_stock: {
    quantity: number
    reserved: number
    available: number
  }
  total_available: number
  stock_source: "branch" | "warehouse" | "out_of_stock"
  low_stock_threshold: number
  is_low_stock: boolean
  last_synced_at: string
}
```

### 8.3 API Endpoints

#### `GET /admin/inventory`
Returns all inventory records for admin/pharmacist.

**Query Parameters:** `page`, `per_page`, `low_stock=true`, `out_of_stock=true`, `search`

---

#### `GET /admin/inventory/:product_id`
Returns detailed inventory for one product.

---

#### `PUT /admin/inventory/:product_id`
Updates stock levels manually (e.g., after physical count).

**Request:**
```json
{
  "branch_id": "branch_nairobi_01",
  "adjustment_type": "set",
  "quantity": 150,
  "reason": "Stock count correction",
  "reference": "STOCKCOUNT-2026-03"
}
```

---

#### `POST /admin/inventory/bulk-update`
Batch stock update — used when syncing from external ERP or supplier import.

**Request:**
```json
{
  "updates": [
    { "sku": "VIT-C-1000", "warehouse_quantity": 500, "branch_id": "branch_01", "branch_quantity": 45 },
    { "sku": "PAN-EXTRA-24", "warehouse_quantity": 200, "branch_id": "branch_01", "branch_quantity": 30 }
  ],
  "source": "erp_import",
  "import_reference": "ERP-20260309-001"
}
```

---

#### `GET /admin/inventory/movements/:product_id`
Returns stock movement history (sales, adjustments, returns).

**Response:**
```json
{
  "success": true,
  "data": {
    "movements": [
      {
        "id": "mov_001",
        "type": "sale",
        "quantity_change": -2,
        "quantity_after": 148,
        "reason": "Order ORD-2026-004821",
        "reference": "ORD-2026-004821",
        "created_at": "2026-03-09T10:30:00Z",
        "created_by": "system"
      }
    ]
  }
}
```

---

#### `POST /admin/inventory/reserve`
Reserves stock when an order is placed (prevents overselling). Called internally during order creation.

**Request:**
```json
{
  "order_id": "ORD-2026-004821",
  "items": [
    { "product_id": 5, "quantity": 2 },
    { "product_id": 12, "quantity": 1 }
  ]
}
```

---

#### `POST /admin/inventory/release`
Releases reserved stock when an order is cancelled.

---

#### `POST /admin/inventory/deduct`
Permanently deducts reserved stock when order is dispatched.

---

### 8.4 Low Stock Alerts

When `available <= low_stock_threshold`, the system must:
1. Set product `is_low_stock: true` in the product record
2. Send a notification to admin/pharmacist (email or in-app)
3. Return the `"Only X left"` flag in product API responses

---

## 9. Order Push & Order Management

### 9.1 Order Lifecycle

```
pending → confirmed → processing → packed → dispatched → delivered
                          ↓
                       cancelled
```

### 9.2 Order Push to Fulfillment

When an order payment is confirmed (`payment.status = paid`):
1. Order status changes to `confirmed`
2. Stock reservation is converted to a firm deduction (`inventory/reserve` → `inventory/deduct`)
3. An internal fulfillment event is published
4. Order appears in pharmacist's queue
5. Notification is sent to customer: "Your order has been confirmed"
6. If any item requires a prescription, order status holds at `confirmed` until prescription is verified

### 9.3 Admin Order Management

#### `GET /admin/orders`
Returns all orders with filters.

**Query Parameters:**

| Param | Type |
|---|---|
| `status` | `pending`, `confirmed`, `processing`, `packed`, `dispatched`, `delivered`, `cancelled` |
| `dispatch_status` | `not_started`, `queued`, `packed`, `dispatched`, `delivered` |
| `date_from` | ISO date string |
| `date_to` | ISO date string |
| `search` | Order ID, customer name, or phone |
| `page`, `per_page` | Pagination |

---

#### `GET /admin/orders/:order_id`
Returns full order details for admin.

---

#### `PUT /admin/orders/:order_id/status`
Updates order status. Must respect valid state transitions only.

**Request:**
```json
{
  "status": "processing",
  "dispatch_status": "queued",
  "note": "Being prepared by pharmacist"
}
```

**State Transition Rules:**
- `pending` → `confirmed` (after payment)
- `confirmed` → `processing` (pharmacist starts)
- `processing` → `packed` (ready to dispatch)
- `packed` → `dispatched` (handed to courier)
- `dispatched` → `delivered` (confirmed delivery)
- Any state except `delivered` → `cancelled` (with reason)

---

#### `POST /admin/orders/:order_id/notes`
Adds an internal note to an order.

---

### 9.4 Order Push Notifications to Customer

At each status change, notify the customer:

| Status | Message |
|---|---|
| `confirmed` | "Your order #AVA-4821 has been confirmed." |
| `processing` | "We're preparing your order #AVA-4821." |
| `dispatched` | "Your order is on the way! Expected by [date]." |
| `delivered` | "Your order has been delivered. Enjoy!" |
| `cancelled` | "Your order #AVA-4821 has been cancelled. [Reason]" |

**Channels:** Push notification (FCM), SMS, Email (in that priority order)

---

### 9.5 Returns

#### `POST /orders/:order_id/return`
Initiates a return request.

**Request:**
```json
{
  "items": [
    { "order_item_id": "item_001", "quantity": 1, "reason": "Damaged product" }
  ],
  "reason_category": "damaged",
  "description": "The packaging was torn on arrival",
  "images": ["base64_image_or_upload_url"]
}
```

---

## 10. Real-Time Availability

### 10.1 Use Cases

The frontend needs real-time availability information in these scenarios:

| Scenario | Trigger | Data Needed |
|---|---|---|
| Product detail page load | User opens product page | Current stock status, quantity |
| Cart validation | User opens cart | Stock status for all cart items |
| Checkout validation | User reaches payment step | Final stock check before order |
| Checkout page open | Concurrent sessions | Detect if item became unavailable |
| Admin inventory page | Admin is on stock page | Live stock changes |

### 10.2 WebSocket Events

**Connection:** `wss://api.avapharmacy.co.ke/v1/ws`
**Auth:** Pass JWT as query param `?token=<access_token>`

#### Client → Server: Subscribe to product availability
```json
{
  "action": "subscribe",
  "channel": "product.availability",
  "product_ids": [5, 12, 23]
}
```

#### Server → Client: Stock update broadcast
Sent when stock for a subscribed product changes (sale, restock, adjustment):
```json
{
  "event": "product.availability.updated",
  "data": {
    "product_id": 5,
    "stock_source": "warehouse",
    "is_available": true,
    "quantity": 148,
    "is_low_stock": false
  },
  "timestamp": "2026-03-09T10:30:00Z"
}
```

#### Server → Client: Cart item unavailable
Sent to a specific user when a cart item becomes unavailable:
```json
{
  "event": "cart.item.unavailable",
  "data": {
    "cart_item_id": "ci_abc123",
    "product_id": 5,
    "product_name": "Vitamin C 1000mg",
    "previous_stock": 2,
    "current_stock": 0
  }
}
```

#### Server → Client: Payment confirmed
```json
{
  "event": "payment.completed",
  "data": {
    "order_id": "ORD-2026-004821",
    "status": "paid",
    "transaction_id": "RGX92HBSC3"
  }
}
```

#### Server → Client: Order status changed
```json
{
  "event": "order.status.changed",
  "data": {
    "order_id": "ORD-2026-004821",
    "status": "dispatched",
    "dispatch_status": "dispatched",
    "message": "Your order is on the way!"
  }
}
```

---

### 10.3 Polling Fallback
For clients that cannot use WebSocket, provide a polling endpoint:

#### `GET /products/availability`
Returns live stock status for multiple products.

**Query Parameters:** `product_ids=5,12,23`

**Response:**
```json
{
  "success": true,
  "data": {
    "availability": [
      { "product_id": 5, "is_available": true, "stock_source": "warehouse", "quantity": 148 },
      { "product_id": 12, "is_available": false, "stock_source": "out_of_stock", "quantity": 0 },
      { "product_id": 23, "is_available": true, "stock_source": "branch", "quantity": 12, "is_low_stock": true }
    ]
  }
}
```

---

## 11. Webhooks & Events

For external system integrations (ERP, courier, SMS provider):

### 11.1 Outbound Webhook Events

| Event | Trigger | Payload |
|---|---|---|
| `order.created` | New order placed | Full order object |
| `order.confirmed` | Payment verified | Order ID + payment details |
| `order.dispatched` | Dispatched to courier | Order ID + tracking info |
| `order.delivered` | Delivered | Order ID + delivery timestamp |
| `order.cancelled` | Order cancelled | Order ID + reason |
| `inventory.low_stock` | Stock hits threshold | Product ID + quantity |
| `inventory.out_of_stock` | Stock reaches zero | Product ID |
| `payment.received` | Payment confirmed | Order ID + amount + method |
| `payment.failed` | Payment failed | Order ID + reason |
| `payment.refunded` | Refund issued | Order ID + refund amount |

### 11.2 Webhook Registration

#### `POST /admin/webhooks`
```json
{
  "url": "https://erp.avapharmacy.co.ke/webhook",
  "events": ["order.created", "order.confirmed", "inventory.low_stock"],
  "secret": "whsec_..."
}
```

All webhook payloads include an `X-Ava-Signature` header (HMAC-SHA256) for verification.

---

## 12. Error Codes Reference

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token missing or invalid |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `PRODUCT_NOT_FOUND` | 404 | Product ID does not exist |
| `OUT_OF_STOCK` | 422 | Product has no available stock |
| `PRESCRIPTION_REQUIRED` | 422 | Item needs a verified prescription |
| `PRESCRIPTION_NOT_APPROVED` | 422 | Linked prescription is not yet approved |
| `CART_ITEM_NOT_FOUND` | 404 | Cart item ID not found |
| `INVALID_QUANTITY` | 422 | Quantity exceeds available stock |
| `PRICE_CHANGED` | 422 | Product price changed since item was added |
| `PROMO_INVALID` | 422 | Promo code does not exist |
| `PROMO_EXPIRED` | 422 | Promo code has expired |
| `PROMO_ALREADY_USED` | 422 | Promo code already used by this account |
| `ORDER_NOT_FOUND` | 404 | Order ID does not exist |
| `INVALID_STATUS_TRANSITION` | 422 | Status change is not allowed |
| `PAYMENT_FAILED` | 402 | Payment could not be processed |
| `PAYMENT_TIMEOUT` | 408 | M-Pesa STK push timed out |
| `INVALID_PHONE` | 422 | Phone number format is invalid |
| `ADDRESS_NOT_FOUND` | 404 | Delivery address does not exist |
| `DELIVERY_UNAVAILABLE` | 422 | Delivery not available for this address |
| `STOCK_RESERVATION_FAILED` | 422 | Could not reserve stock (concurrent order) |
| `VALIDATION_ERROR` | 422 | General request validation failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

*End of Requirements Document — v1.0*
