import { expect, test, type Page } from '@playwright/test'

const apiBase = 'http://localhost:8000/api'

const cartItem = {
  id: 501,
  quantity: 2,
  unit_price: '450.00',
  prescription_id: null,
  product: {
    id: 10,
    name: 'Vitamin C 1000mg',
    brand_name: 'AVA',
    image: '',
    inventory_status: 'in_stock',
    stock_source: 'branch',
  },
  variant: {
    id: 42,
    name: 'Vitamin C 1000mg - 30 tablets',
  },
}

const order = {
  id: 9001,
  order_number: 'AVA-9001',
  status: 'draft',
  payment_method: 'cash_on_delivery',
  payment_status: 'pending',
  payment_reference: '',
  delivery_method: 'doorstep_delivery',
  shipping_first_name: 'Buyer',
  shipping_last_name: 'Customer',
  shipping_email: 'buyer@example.com',
  shipping_phone: '0727808457',
  shipping_street: 'Moi Avenue',
  shipping_city: 'Westlands',
  shipping_county: 'Nairobi',
  subtotal: '900.00',
  discount_total: '0.00',
  shipping_fee: '300.00',
  total: '1200.00',
  shipping_address: 'Moi Avenue, Westlands, Nairobi',
  shipping_method: {
    id: 1,
    code: 'doorstep_delivery',
    name: 'Doorstep delivery',
    description: 'Courier delivery',
    fee: '300.00',
    free_shipping_threshold: '3000.00',
    estimated_delivery_window: '1-2 days',
  },
  items: [],
  payment_intents: [],
  created_at: '2026-04-29T09:00:00Z',
  updated_at: '2026-04-29T09:00:00Z',
}

async function mockCommonApi(page: Page) {
  await page.route(`${apiBase}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api', '')

    if (path === '/site-settings/') {
      return route.fulfill({
        json: {
          data: {
            base_delivery_fee: 300,
            free_delivery_threshold: 3000,
            active_delivery_zones: 'Nairobi, Kiambu',
          },
        },
      })
    }

    if (['/catalog-categories/', '/brands/', '/health-concerns/'].includes(path)) {
      return route.fulfill({ json: { data: [] } })
    }

    if (path === '/auth/me/addresses/') {
      return route.fulfill({ json: { data: [] } })
    }

    if (path === '/shipping-methods/') {
      return route.fulfill({
        json: {
          data: [
            {
              id: 1,
              code: 'doorstep_delivery',
              name: 'Doorstep delivery',
              description: 'Courier delivery',
              fee: '300.00',
              free_shipping_threshold: '3000.00',
              estimated_delivery_window: '1-2 days',
            },
            {
              id: 2,
              code: 'store_pickup',
              name: 'Store pickup',
              description: 'Collect from store',
              fee: '0.00',
              free_shipping_threshold: null,
              estimated_delivery_window: 'Today',
            },
          ],
        },
      })
    }

    if (path === '/cart/') {
      return route.fulfill({ json: { data: { items: [cartItem] } } })
    }

    if (path === '/wishlist/') {
      return route.fulfill({ json: { data: [] } })
    }

    if (path === '/products/availability/') {
      return route.fulfill({
        json: {
          availability: [
            {
              product_id: 10,
              is_available: true,
              stock_source: 'branch',
              quantity: 8,
              is_low_stock: false,
            },
          ],
        },
      })
    }

    if (path === '/checkout/draft/' && request.method() === 'POST') {
      return route.fulfill({ status: 201, json: { data: order } })
    }

    if (path === '/checkout/9001/finalize/' && request.method() === 'POST') {
      return route.fulfill({
        json: { data: { ...order, status: 'pending', placed_at: '2026-04-29T09:02:00Z' } },
      })
    }

    if (path.startsWith('/admin/products')) {
      return route.fulfill({
        json: {
          data: [
            {
              id: 10,
              name: 'Vitamin C 1000mg',
              sku: 'VIT-C-30',
              slug: 'vitamin-c-1000mg',
              price: '450.00',
              final_price: '450.00',
              discount_total: '0.00',
              stock_quantity: 8,
              available_quantity: 8,
              low_stock_threshold: 3,
              stock_source: 'branch',
              inventory_status: 'in_stock',
              inventories: [],
              variants: [],
              is_active: true,
              requires_prescription: false,
              description: 'Immune support',
              short_description: '',
              features: [],
              directions: '',
              warnings: '',
              badge: null,
              image: null,
              category: null,
              category_name: null,
              subcategory_id: null,
              subcategory_name: null,
              brand: { id: 1, name: 'AVA', slug: 'ava', logo: null, description: '', is_active: true },
              brand_name: 'AVA',
              allow_backorder: false,
              health_concerns: [],
              created_at: '2026-04-29T09:00:00Z',
              updated_at: '2026-04-29T09:00:00Z',
              created_by: null,
              created_by_name: 'system',
              updated_by: null,
              updated_by_name: 'system',
            },
          ],
          meta: {},
        },
      })
    }

    if (path.startsWith('/admin/brands') || path.startsWith('/admin/categories') || path.startsWith('/admin/sub-categories') || path.startsWith('/admin/health-concerns')) {
      return route.fulfill({ json: { data: [] } })
    }

    return route.fulfill({ status: 404, json: { detail: `Unhandled ${path}` } })
  })
}

test.beforeEach(async ({ page }) => {
  await mockCommonApi(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('ava_access_token', 'test-access')
    window.localStorage.setItem('ava_refresh_token', 'test-refresh')
    window.localStorage.setItem('ava_user', JSON.stringify({
      id: 1,
      name: 'Buyer Customer',
      email: 'buyer@example.com',
      role: 'customer',
      phone: '0727808457',
    }))
  })
})

test('customer can complete a cash checkout with server-backed cart validation', async ({ page }) => {
  await page.goto('/checkout')

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  await expect(page.getByText('Vitamin C 1000mg')).toBeVisible()

  const checkoutForm = page.locator('.co-form')
  await checkoutForm.locator('input[type="text"]').nth(0).fill('Buyer')
  await checkoutForm.locator('input[type="text"]').nth(1).fill('Customer')
  await page.locator('input[type="email"]').fill('buyer@example.com')
  await checkoutForm.locator('input[type="tel"]').first().fill('0727808457')
  await checkoutForm.locator('input[type="text"]').nth(2).fill('Moi Avenue')
  await checkoutForm.locator('select').nth(1).selectOption('Nairobi')
  await checkoutForm.locator('select').nth(2).selectOption('Westlands')
  await page.getByRole('button', { name: /Continue to Payment/ }).click()

  await page.getByText('Cash on Delivery').click()
  await page.getByRole('button', { name: /Proceed to Review/ }).click()
  await expect(page.getByRole('heading', { name: 'Review Your Order' })).toBeVisible()
  await page.getByRole('button', { name: /Place Order/ }).click()

  await expect(page).toHaveURL(/order-confirmation/)
})

test('admin products page lists products from the admin catalog API', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('ava_user', JSON.stringify({
      id: 2,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    }))
  })

  await page.goto('/admin/products')

  await expect(page.getByText('Vitamin C 1000mg')).toBeVisible()
  await expect(page.getByText('VIT-C-30')).toBeVisible()
})
