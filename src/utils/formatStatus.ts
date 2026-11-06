/** Human-readable status text; API values and CSS state keys stay unchanged. */
export function formatStatus(value: string | null | undefined): string {
  if (!value) return 'Not available'
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return words ? words[0].toUpperCase() + words.slice(1) : 'Not available'
}

export function formatPaymentMethod(value: string): string {
  const labels: Record<string, string> = {
    mpesa_stk: 'M-Pesa STK Push',
    mpesa_paybill: 'M-Pesa Paybill',
    card: 'Card (historical)',
    cash_on_delivery: 'Cash on delivery (historical)',
  }
  return labels[value] || formatStatus(value)
}
