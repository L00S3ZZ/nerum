// Shared landing content. Brand logos via Simple Icons CDN (cdn.simpleicons.org/<slug>/<hex>).
// Hex values are picked to stay legible on the near-black #07080F canvas.

export interface Integration {
  slug: string
  name: string
  color: string
}

export const INTEGRATIONS: Integration[] = [
  { slug: 'whatsapp', name: 'WhatsApp', color: '25D366' },
  { slug: 'gmail', name: 'Gmail', color: 'EA4335' },
  { slug: 'telegram', name: 'Telegram', color: '26A5E4' },
  { slug: 'googlesheets', name: 'Google Sheets', color: '34A853' },
  { slug: 'razorpay', name: 'Razorpay', color: '3395FF' },
  { slug: 'slack', name: 'Slack', color: '36C5F0' },
  { slug: 'notion', name: 'Notion', color: 'FFFFFF' },
  { slug: 'zoho', name: 'Zoho', color: 'E42527' },
  { slug: 'tally', name: 'Tally', color: 'FFD60A' },
  { slug: 'shopify', name: 'Shopify', color: '7AB55C' },
]

export const iconUrl = (slug: string, color: string): string =>
  `https://cdn.simpleicons.org/${slug}/${color}`
