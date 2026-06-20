'use client'

/* ============================================================================
 * NERUM — Solar System Agent Builder
 * ----------------------------------------------------------------------------
 * The AI Commander is the sun; every integration is a planet orbiting on a ring.
 * Rings fill by capacity (3, 6, 9, 12, 15, +3…); a new ring is born when the
 * inner ones are full. Pure Canvas + requestAnimationFrame — no animation deps.
 *
 * Add Agent / Add to Ring → Integration Picker modal (22 integrations).
 * Click a planet (or a ring chip) → Node Config slide panel from the right with
 * A-to-Z credential fields, action + message config, and run-after wiring.
 * Icons are the Simple Icons CDN marks already used on the Integrations page.
 * ========================================================================== */

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AgentChatDrawer from '@/components/builder/AgentChatDrawer'
import {
  useDbConnections,
  DbConnectionModal,
  DeleteDbDialog,
  DbConnectionCard,
  DbLogo,
  DB_META,
  DB_TYPES,
  type DbConnection,
  type DbType,
  type DbModalMode,
} from '@/components/databases/DbConnections'

/* ---------------------------------- tokens -------------------------------- */
const PLASMA = {
  bg: '#07080F',
  orange: '#FF6B00',
  violet: '#7B2FFF',
  cyan: '#00D4FF',
  yellow: '#FFD60A',
  card: '#0d0f1e',
  border: '#1e2240',
  muted: '#6b7280',
  white: '#ffffff',
}

const CANVAS_FONT = 'Inter, system-ui, -apple-system, sans-serif'
const COLORS = ['#00D4FF', '#FF6B00', '#7B2FFF', '#FFD60A', '#25D366']
const PANEL_W = 340
const SUN_ICON = 'https://cdn.simpleicons.org/anthropic/FF6B00'

/* ---------------------------------- types --------------------------------- */
interface AgentNode {
  id: string
  name: string
  sub: string
  ring: number
  iconUrl: string
  brandColor: string
  nodeType: 'soldier' | 'trigger' | 'logic'
  credentials: Record<string, string>
  action: string
  message: string
  recipient: string
  subject: string
  query: string
  connectedTo: string[]
  configured: boolean
  // Database nodes: dbType marks the node as a DB integration; connectionId is
  // set once a saved connection is attached (clicking the node opens the DB
  // modal instead of the generic config panel).
  dbType?: DbType
  connectionId?: number
}

interface RingConfig {
  radius: number
  capacity: number
  color: string
  speed: number
}

interface IntMeta {
  name: string
  sub: string
  slug: string // Simple Icons slug
  hex: string // Simple Icons colour (no #)
  color: string // brand colour (with #)
}

interface Star {
  x: number // 0-1, multiply by W when drawing
  y: number // 0-1, multiply by H when drawing
  r: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

type FieldType = 'text' | 'password' | 'email' | 'textarea' | 'select' | 'toggle' | 'number' | 'date' | 'nodeselect'

interface CredField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  help?: string
  defaultValue?: string
  readonly?: boolean
  rows?: number
  options?: string[]
  showWhen?: (c: Record<string, string>) => boolean
}

interface IntCfg {
  creds: CredField[]
  actions: string[]
  message?: boolean
  recipient?: boolean
  subject?: boolean
  query?: boolean
}

/* ----- integration metadata (icon URLs match the Integrations page) ------- */
const INTEGRATIONS: IntMeta[] = [
  { name: 'WhatsApp', sub: 'Send messages', slug: 'whatsapp', hex: '25D366', color: '#25D366' },
  { name: 'Gmail', sub: 'Send emails', slug: 'gmail', hex: 'EA4335', color: '#EA4335' },
  { name: 'Telegram', sub: 'Bot messages', slug: 'telegram', hex: '2AABEE', color: '#2AABEE' },
  { name: 'Google Sheets', sub: 'Read/write data', slug: 'googlesheets', hex: '34A853', color: '#34A853' },
  { name: 'Razorpay', sub: 'Process payments', slug: 'razorpay', hex: '2D76F9', color: '#2D76F9' },
  { name: 'Webhook', sub: 'External trigger', slug: 'webhooks', hex: '00D4FF', color: '#00D4FF' },
  { name: 'Google Forms', sub: 'Collect input', slug: 'googleforms', hex: '7248B9', color: '#7248B9' },
  { name: 'SMS', sub: 'Text messages', slug: 'twilio', hex: 'F22F46', color: '#F22F46' },
  { name: 'Google Calendar', sub: 'Schedule events', slug: 'googlecalendar', hex: '4285F4', color: '#4285F4' },
  { name: 'Notion', sub: 'Update docs', slug: 'notion', hex: 'FFFFFF', color: '#ffffff' },
  { name: 'Slack', sub: 'Team alerts', slug: 'slack', hex: 'E01E5A', color: '#E01E5A' },
  { name: 'Airtable', sub: 'Database ops', slug: 'airtable', hex: '18BFFF', color: '#18BFFF' },
  { name: 'Google Drive', sub: 'File storage', slug: 'googledrive', hex: '4285F4', color: '#4285F4' },
  { name: 'Shopify', sub: 'E-commerce', slug: 'shopify', hex: '96BF48', color: '#96BF48' },
  { name: 'Discord', sub: 'Server messages', slug: 'discord', hex: '5865F2', color: '#5865F2' },
  { name: 'Stripe', sub: 'Payments', slug: 'stripe', hex: '635BFF', color: '#635BFF' },
  { name: 'HubSpot', sub: 'CRM updates', slug: 'hubspot', hex: 'FF7A59', color: '#FF7A59' },
  { name: 'Jira', sub: 'Create tickets', slug: 'jira', hex: '0052CC', color: '#0052CC' },
  { name: 'LinkedIn', sub: 'Post updates', slug: 'linkedin', hex: '0A66C2', color: '#0A66C2' },
  { name: 'YouTube', sub: 'Upload videos', slug: 'youtube', hex: 'FF0000', color: '#FF0000' },
  { name: 'MySQL', sub: 'Database queries', slug: 'mysql', hex: '4479A1', color: '#4479A1' },
  { name: 'Custom HTTP', sub: 'Any REST API', slug: 'httpie', hex: '73DC8C', color: '#73DC8C' },
]

const iconUrlFor = (m: IntMeta) => `https://cdn.simpleicons.org/${m.slug}/${m.hex}`
/* All canvas + DOM icons as static URLs, preloaded once into a module cache. */
const ICON_URLS: Record<string, string> = {
  WhatsApp: 'https://cdn.simpleicons.org/whatsapp/25D366',
  Gmail: 'https://cdn.simpleicons.org/gmail/EA4335',
  Telegram: 'https://cdn.simpleicons.org/telegram/2AABEE',
  'Google Sheets': 'https://cdn.simpleicons.org/googlesheets/34A853',
  Razorpay: 'https://cdn.simpleicons.org/razorpay/2D9CDB',
  Webhook: 'https://cdn.simpleicons.org/webhook/FF6B00',
  'Google Forms': 'https://cdn.simpleicons.org/googleforms/673AB7',
  SMS: 'https://cdn.simpleicons.org/minutemailer/FF6B00',
  'Google Calendar': 'https://cdn.simpleicons.org/googlecalendar/4285F4',
  Notion: 'https://cdn.simpleicons.org/notion/ffffff',
  Slack: 'https://cdn.simpleicons.org/slack/E01E5A',
  Airtable: 'https://cdn.simpleicons.org/airtable/18BFFF',
  'Google Drive': 'https://cdn.simpleicons.org/googledrive/4285F4',
  Shopify: 'https://cdn.simpleicons.org/shopify/96BF48',
  Discord: 'https://cdn.simpleicons.org/discord/5865F2',
  Stripe: 'https://cdn.simpleicons.org/stripe/635BFF',
  HubSpot: 'https://cdn.simpleicons.org/hubspot/FF7A59',
  Jira: 'https://cdn.simpleicons.org/jira/0052CC',
  LinkedIn: 'https://cdn.simpleicons.org/linkedin/0A66C2',
  YouTube: 'https://cdn.simpleicons.org/youtube/FF0000',
  MySQL: 'https://cdn.simpleicons.org/mysql/4479A1',
  'Custom HTTP': 'https://cdn.simpleicons.org/curl/6b7280',
  AI: 'https://cdn.simpleicons.org/anthropic/FF6B00',
}
// DOM <img> elements reuse the exact same URLs as the canvas.
const iconMap: Record<string, string> = ICON_URLS

/* Trigger + Logic palettes for the picker (name, sub, icon URL). */
interface SpecialMeta {
  name: string
  sub: string
  icon: string
}
const TRIGGERS: SpecialMeta[] = [
  { name: 'Schedule', sub: 'Run every X minutes/hours/days', icon: 'https://cdn.simpleicons.org/clockify/FFD60A' },
  { name: 'Webhook', sub: 'Triggered by HTTP POST request', icon: 'https://cdn.simpleicons.org/webhooks/FFD60A' },
  { name: 'WhatsApp Msg', sub: 'Incoming WhatsApp message', icon: 'https://cdn.simpleicons.org/whatsapp/FFD60A' },
  { name: 'Email Received', sub: 'New email in Gmail inbox', icon: 'https://cdn.simpleicons.org/gmail/FFD60A' },
  { name: 'Form Submit', sub: 'Google Form submitted', icon: 'https://cdn.simpleicons.org/googleforms/FFD60A' },
  { name: 'Payment Done', sub: 'Razorpay payment captured', icon: 'https://cdn.simpleicons.org/razorpay/FFD60A' },
  { name: 'New Sheet Row', sub: 'New row added in Google Sheets', icon: 'https://cdn.simpleicons.org/googlesheets/FFD60A' },
  { name: 'New Lead', sub: 'New contact in HubSpot/Airtable', icon: 'https://cdn.simpleicons.org/hubspot/FFD60A' },
  { name: 'Manual Run', sub: 'Triggered manually by user', icon: 'https://cdn.simpleicons.org/hand/FFD60A' },
]
const LOGIC: SpecialMeta[] = [
  { name: 'If / Else', sub: 'Branch based on a condition', icon: 'https://cdn.simpleicons.org/undertale/00D4FF' },
  { name: 'Filter', sub: 'Stop if condition not met', icon: 'https://cdn.simpleicons.org/v8/00D4FF' },
  { name: 'Switch', sub: 'Route to different paths by value', icon: 'https://cdn.simpleicons.org/traefikmesh/00D4FF' },
  { name: 'Wait', sub: 'Delay before next step runs', icon: 'https://cdn.simpleicons.org/clockify/00D4FF' },
  { name: 'Loop', sub: 'Repeat for each item in list', icon: 'https://cdn.simpleicons.org/myob/00D4FF' },
  { name: 'Split', sub: 'Run multiple paths in parallel', icon: 'https://cdn.simpleicons.org/buffer/00D4FF' },
]

// Module-level cache, keyed by URL (so identical names across categories never collide).
const GLOBAL_IMAGE_CACHE: Record<string, HTMLImageElement> = {}

function preloadAllIcons(): Promise<void[]> {
  const urls = Array.from(new Set([...Object.values(ICON_URLS), ...TRIGGERS.map((t) => t.icon), ...LOGIC.map((l) => l.icon)]))
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (GLOBAL_IMAGE_CACHE[url]?.complete) {
            resolve()
            return
          }
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            GLOBAL_IMAGE_CACHE[url] = img
            resolve()
          }
          img.onerror = () => resolve()
          img.src = url
        })
    )
  )
}
const metaByName: Record<string, IntMeta> = Object.fromEntries(INTEGRATIONS.map((m) => [m.name, m]))

/** Each integration's OWN brand colour — node border/glow/fallback use this. */
const BRAND_COLORS: Record<string, string> = {
  WhatsApp: '#25D366',
  Gmail: '#EA4335',
  Telegram: '#2AABEE',
  'Google Sheets': '#34A853',
  Razorpay: '#2D9CDB',
  Webhook: '#FF6B00',
  'Google Forms': '#673AB7',
  SMS: '#FF6B00',
  'Google Calendar': '#4285F4',
  Notion: '#ffffff',
  Slack: '#E01E5A',
  Airtable: '#18BFFF',
  'Google Drive': '#4285F4',
  Shopify: '#96BF48',
  Discord: '#5865F2',
  Stripe: '#635BFF',
  HubSpot: '#FF7A59',
  Jira: '#0052CC',
  LinkedIn: '#0A66C2',
  YouTube: '#FF0000',
  MySQL: '#4479A1',
  'Custom HTTP': '#6b7280',
  // triggers (yellow) — 'Webhook' already mapped above
  Schedule: '#FFD60A',
  'WhatsApp Msg': '#FFD60A',
  'Email Received': '#FFD60A',
  'Form Submit': '#FFD60A',
  'Payment Done': '#FFD60A',
  'New Sheet Row': '#FFD60A',
  'New Lead': '#FFD60A',
  'Manual Run': '#FFD60A',
  // logic (cyan)
  'If / Else': '#00D4FF',
  Filter: '#00D4FF',
  Switch: '#00D4FF',
  Wait: '#00D4FF',
  Loop: '#00D4FF',
  Split: '#00D4FF',
}
const OPERATORS = ['equals', 'not equals', 'contains', 'not contains', 'greater than', 'less than', 'is empty', 'is not empty']

/* Special node shapes — star for triggers, diamond for logic. */
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, isActive: boolean) {
  const spikes = 5
  const outerR = r
  const innerR = r * 0.5
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2
    const radius = i % 2 === 0 ? outerR : innerR
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = '#07080F'
  ctx.fill()
  ctx.strokeStyle = isActive ? color : color + '66'
  ctx.lineWidth = isActive ? 2 : 1
  ctx.stroke()
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, isActive: boolean) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fillStyle = '#07080F'
  ctx.fill()
  ctx.strokeStyle = isActive ? color : color + '66'
  ctx.lineWidth = isActive ? 2 : 1
  ctx.stroke()
}

/* ------- per-integration credential + action config (researched A→Z) ------ */
const PK = '-----BEGIN PRIVATE KEY-----\\n...'
const SA_EMAIL = 'name@project.iam.gserviceaccount.com'

const CONFIG: Record<string, IntCfg> = {
  WhatsApp: {
    creds: [
      { key: 'Access Token', label: 'Access Token', type: 'password', placeholder: 'EAABs...from Meta App Dashboard', help: 'Generate from Meta for Developers → WhatsApp → API Setup' },
      { key: 'Phone Number ID', label: 'Phone Number ID', type: 'text', placeholder: 'From Meta App Dashboard → WhatsApp → API Setup' },
      { key: 'WhatsApp Business Account ID', label: 'WhatsApp Business Account ID', type: 'text', placeholder: 'Your WABA ID from Meta Business Manager' },
      { key: 'Test Recipient Number', label: 'Test Recipient Number', type: 'text', placeholder: '+91XXXXXXXXXX (for testing)' },
    ],
    actions: ['Send Message', 'Send Template', 'Send Media File'],
    message: true,
    recipient: true,
  },
  Gmail: {
    creds: [
      { key: 'Gmail Address', label: 'Gmail Address', type: 'email', placeholder: 'yourname@gmail.com' },
      { key: 'App Password', label: 'App Password', type: 'password', placeholder: '16-char password from Google Account → Security → App Passwords', help: 'Enable 2FA first, then generate App Password' },
    ],
    actions: ['Send Email', 'Send with CC/BCC', 'Reply to Thread'],
    message: true,
    recipient: true,
    subject: true,
  },
  Telegram: {
    creds: [
      { key: 'Bot Token', label: 'Bot Token', type: 'password', placeholder: '110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw', help: 'Get from @BotFather on Telegram → /newbot' },
      { key: 'Default Chat ID', label: 'Default Chat ID', type: 'text', placeholder: '-1001234567890 (group) or 123456789 (user)', help: 'Use @userinfobot to find chat ID' },
    ],
    actions: ['Send Message', 'Send Photo', 'Send Document', 'Send Poll'],
    message: true,
    recipient: true,
  },
  'Google Sheets': {
    creds: [
      { key: 'Service Account Email', label: 'Service Account Email', type: 'email', placeholder: SA_EMAIL, help: 'Google Cloud Console → IAM → Service Accounts' },
      { key: 'Private Key', label: 'Private Key', type: 'textarea', rows: 3, placeholder: PK, help: 'Download JSON key file, copy private_key field' },
      { key: 'Spreadsheet ID', label: 'Spreadsheet ID', type: 'text', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', help: 'From spreadsheet URL between /d/ and /edit' },
    ],
    actions: ['Read Rows', 'Append Row', 'Update Row', 'Clear Range'],
  },
  Razorpay: {
    creds: [
      { key: 'Key ID', label: 'Key ID', type: 'text', placeholder: 'rzp_live_XXXXXXXXXX or rzp_test_XXXXXXXXXX', help: 'Razorpay Dashboard → Settings → API Keys' },
      { key: 'Key Secret', label: 'Key Secret', type: 'password', placeholder: 'Your Razorpay Key Secret' },
      { key: 'Webhook Secret', label: 'Webhook Secret', type: 'password', placeholder: 'Set in Razorpay Dashboard → Webhooks' },
    ],
    actions: ['Create Payment Link', 'Verify Payment', 'Issue Refund'],
  },
  Webhook: {
    creds: [
      { key: 'Webhook URL', label: 'Webhook URL', type: 'text', readonly: true, help: 'Copy this URL and paste in your source app' },
      { key: 'Secret Key', label: 'Secret Key', type: 'text', placeholder: 'Optional secret to verify payload' },
    ],
    actions: ['Receive Data', 'Forward to URL'],
  },
  'Google Forms': {
    creds: [
      { key: 'Form ID', label: 'Form ID', type: 'text', placeholder: 'From form URL: /forms/d/{FORM_ID}/edit' },
      { key: 'Service Account Email', label: 'Service Account Email', type: 'email', placeholder: SA_EMAIL },
      { key: 'Private Key', label: 'Private Key', type: 'textarea', rows: 3, placeholder: PK },
    ],
    actions: ['Get Responses', 'Watch New Responses'],
  },
  SMS: {
    creds: [
      { key: 'Auth Key', label: 'Auth Key', type: 'password', placeholder: 'From MSG91 Dashboard → API → Auth Key' },
      { key: 'Sender ID', label: 'Sender ID', type: 'text', placeholder: 'NERUM (6 chars)' },
      { key: 'Template ID', label: 'Template ID', type: 'text', placeholder: 'DLT approved template ID', help: 'Required for Indian numbers per TRAI regulations' },
    ],
    actions: ['Send OTP', 'Send Promotional', 'Send Transactional'],
    message: true,
    recipient: true,
  },
  'Google Calendar': {
    creds: [
      { key: 'Service Account Email', label: 'Service Account Email', type: 'email', placeholder: SA_EMAIL },
      { key: 'Private Key', label: 'Private Key', type: 'textarea', rows: 3, placeholder: PK },
      { key: 'Calendar ID', label: 'Calendar ID', type: 'text', placeholder: 'primary or email@gmail.com', help: 'Calendar Settings → Integrate Calendar → Calendar ID' },
    ],
    actions: ['Create Event', 'Get Events', 'Delete Event'],
  },
  Notion: {
    creds: [
      { key: 'Integration Token', label: 'Integration Token', type: 'password', placeholder: 'secret_XXXXXXXXXX', help: 'Notion → Settings → Connections → Develop integrations → New' },
      { key: 'Database ID', label: 'Database ID', type: 'text', placeholder: '32-char ID from database URL', help: 'Open database → copy ID from URL after last /' },
    ],
    actions: ['Create Page', 'Update Page', 'Query Database', 'Add Block'],
  },
  Slack: {
    creds: [
      { key: 'Bot Token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX', help: 'Slack App Dashboard → OAuth & Permissions → Bot User OAuth Token' },
      { key: 'Default Channel ID', label: 'Default Channel ID', type: 'text', placeholder: 'C024BE91L (not channel name)', help: 'Right-click channel → View channel details → Copy ID' },
      { key: 'Signing Secret', label: 'Signing Secret', type: 'password', placeholder: 'From Slack App Dashboard → Basic Information' },
    ],
    actions: ['Post Message', 'Post to Thread', 'Upload File', 'Set Status'],
    message: true,
  },
  Airtable: {
    creds: [
      { key: 'Personal Access Token', label: 'Personal Access Token', type: 'password', placeholder: 'patXXXXXXXXXXXXXX', help: 'Airtable → Account → Developer Hub → Personal access tokens' },
      { key: 'Base ID', label: 'Base ID', type: 'text', placeholder: 'appXXXXXXXXXXXXXX', help: 'From Airtable URL: airtable.com/{BASE_ID}/{TABLE_ID}' },
      { key: 'Table Name', label: 'Table Name', type: 'text', placeholder: 'Exact table name (case sensitive)' },
    ],
    actions: ['Create Record', 'Update Record', 'List Records', 'Delete Record'],
  },
  'Google Drive': {
    creds: [
      { key: 'Service Account Email', label: 'Service Account Email', type: 'email', placeholder: SA_EMAIL },
      { key: 'Private Key', label: 'Private Key', type: 'textarea', rows: 3, placeholder: PK },
      { key: 'Folder ID', label: 'Folder ID', type: 'text', placeholder: 'From Drive folder URL after /folders/' },
    ],
    actions: ['Upload File', 'Create Folder', 'List Files', 'Share File'],
  },
  Shopify: {
    creds: [
      { key: 'Store URL', label: 'Store URL', type: 'text', placeholder: 'yourstore.myshopify.com', help: 'Do NOT include https://' },
      { key: 'Admin API Access Token', label: 'Admin API Access Token', type: 'password', placeholder: 'shpat_XXXXXXXXXXXXXXXXXXXX', help: 'Shopify Admin → Settings → Apps → Develop apps → Create app → API credentials' },
      { key: 'API Version', label: 'API Version', type: 'text', placeholder: '2024-01', defaultValue: '2024-01' },
    ],
    actions: ['Create Order', 'Get Products', 'Update Inventory', 'Create Customer'],
  },
  Discord: {
    creds: [
      { key: 'Bot Token', label: 'Bot Token', type: 'password', placeholder: 'Your bot token from Discord Developer Portal', help: 'Discord Developer Portal → Applications → Bot → Token' },
      { key: 'Server ID', label: 'Server ID', type: 'text', placeholder: 'Right-click server → Copy Server ID (enable Developer Mode first)' },
      { key: 'Default Channel ID', label: 'Default Channel ID', type: 'text', placeholder: 'Right-click channel → Copy Channel ID' },
    ],
    actions: ['Send Message', 'Send Embed', 'Create Thread', 'Add Role'],
    message: true,
  },
  Stripe: {
    creds: [
      { key: 'Secret Key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_XXXX or sk_test_XXXX', help: 'Stripe Dashboard → Developers → API keys' },
      { key: 'Webhook Signing Secret', label: 'Webhook Signing Secret', type: 'password', placeholder: 'whsec_XXXXXXXXXXXXXXXXXXXX', help: 'Stripe Dashboard → Developers → Webhooks → Signing secret' },
      { key: 'Publishable Key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_XXXX or pk_test_XXXX' },
    ],
    actions: ['Create Payment', 'Create Invoice', 'Create Customer', 'Issue Refund'],
  },
  HubSpot: {
    creds: [
      { key: 'Private App Token', label: 'Private App Token', type: 'password', placeholder: 'pat-na1-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', help: 'HubSpot → Settings → Integrations → Private Apps → Create' },
      { key: 'Portal ID', label: 'Portal ID', type: 'text', placeholder: 'Your HubSpot Account ID (7-8 digits)', help: 'Found in HubSpot URL or Account Settings' },
    ],
    actions: ['Create Contact', 'Update Deal', 'Create Ticket', 'Log Activity'],
  },
  Jira: {
    creds: [
      { key: 'Domain', label: 'Domain', type: 'text', placeholder: 'yourcompany.atlassian.net', help: 'Do NOT include https://' },
      { key: 'Email', label: 'Email', type: 'email', placeholder: 'yourname@company.com', help: 'Atlassian account email' },
      { key: 'API Token', label: 'API Token', type: 'password', placeholder: 'ATATT3xFfGF0...', help: 'Atlassian Account → Security → Create and manage API tokens' },
      { key: 'Project Key', label: 'Project Key', type: 'text', placeholder: 'PROJ (your project key in Jira)' },
    ],
    actions: ['Create Issue', 'Update Issue', 'Add Comment', 'Transition Status'],
  },
  LinkedIn: {
    creds: [
      { key: 'Client ID', label: 'Client ID', type: 'text', placeholder: 'From LinkedIn Developer Portal → App' },
      { key: 'Client Secret', label: 'Client Secret', type: 'password', placeholder: 'From LinkedIn Developer Portal → App' },
      { key: 'Access Token', label: 'Access Token', type: 'password', placeholder: 'OAuth 2.0 access token', help: 'LinkedIn Developer Portal → OAuth 2.0 tools → Generate token' },
      { key: 'Organization ID', label: 'Organization ID', type: 'text', placeholder: 'urn:li:organization:XXXXXXX', help: 'For posting as company page' },
    ],
    actions: ['Create Post', 'Share Article', 'Get Analytics'],
  },
  YouTube: {
    creds: [
      { key: 'Client ID', label: 'Client ID', type: 'text', placeholder: 'From Google Cloud Console → APIs → Credentials' },
      { key: 'Client Secret', label: 'Client Secret', type: 'password', placeholder: 'From Google Cloud Console → APIs → Credentials' },
      { key: 'Refresh Token', label: 'Refresh Token', type: 'password', placeholder: 'Long-lived token from OAuth flow', help: 'Google Cloud Console → OAuth 2.0 → Authorized → Refresh token' },
      { key: 'Channel ID', label: 'Channel ID', type: 'text', placeholder: 'UCxxxxxxxxxxxxxxxxxxxxxxxxxx', help: 'YouTube Studio → Customization → Basic info → Channel URL' },
    ],
    actions: ['Upload Video', 'Get Analytics', 'Create Playlist'],
  },
  MySQL: {
    creds: [
      { key: 'Host', label: 'Host', type: 'text', placeholder: 'localhost or your.db.host.com' },
      { key: 'Port', label: 'Port', type: 'text', placeholder: '3306', defaultValue: '3306' },
      { key: 'Database Name', label: 'Database Name', type: 'text', placeholder: 'your_database_name' },
      { key: 'Username', label: 'Username', type: 'text', placeholder: 'db_user' },
      { key: 'Password', label: 'Password', type: 'password', placeholder: 'db_password' },
      { key: 'SSL', label: 'Use SSL connection', type: 'toggle' },
    ],
    actions: ['SELECT Query', 'INSERT Row', 'UPDATE Row', 'DELETE Row', 'Raw Query'],
    query: true,
  },
  'Custom HTTP': {
    creds: [
      { key: 'Base URL', label: 'Base URL', type: 'text', placeholder: 'https://api.yourservice.com/v1' },
      { key: 'Auth Type', label: 'Auth Type', type: 'select', defaultValue: 'No Auth', options: ['No Auth', 'API Key', 'Bearer Token', 'Basic Auth'] },
      { key: 'API Key / Token', label: 'API Key / Token', type: 'password', placeholder: 'Your API key or Bearer token', showWhen: (c) => (c['Auth Type'] || 'No Auth') !== 'No Auth' },
      { key: 'Header Name', label: 'Header Name', type: 'text', placeholder: 'Authorization or X-API-Key', showWhen: (c) => (c['Auth Type'] || 'No Auth') === 'API Key' },
    ],
    actions: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
}

/* ------------------------- AI Commander (sun) config ---------------------- */
const SUN_ORANGE = '#FF6B00'
const SUN_PROVIDERS = ['Anthropic Claude', 'OpenAI GPT', 'Google Gemini', 'Groq', 'Ollama (Local)']
const SUN_KEY_PH: Record<string, string> = {
  'Anthropic Claude': 'sk-ant-XXXXXXXXXX',
  'OpenAI GPT': 'sk-XXXXXXXXXX',
  'Google Gemini': 'AIzaSyXXXXXXXXXX',
  Groq: 'gsk_XXXXXXXXXX',
  'Ollama (Local)': 'http://localhost:11434 (no key needed)',
}
const SUN_MODELS: Record<string, string[]> = {
  'Anthropic Claude': ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-6'],
  'OpenAI GPT': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  'Google Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
  Groq: ['llama-3.3-70b', 'mixtral-8x7b'],
  'Ollama (Local)': ['llama3', 'mistral', 'codellama'],
}

interface Commander {
  provider: string
  apiKey: string
  model: string
  agentName: string
  systemPrompt: string
  maxSteps: string
  temperature: number
  configured: boolean
}
const initCommander = (): Commander => ({
  provider: 'Anthropic Claude',
  apiKey: '',
  model: SUN_MODELS['Anthropic Claude'][0],
  agentName: 'Nerum Agent',
  systemPrompt: '',
  maxSteps: '10',
  temperature: 0.7,
  configured: false,
})

/* --------------------------------- rings ---------------------------------- */
const RING_PRESETS: RingConfig[] = [
  { radius: 80, capacity: 3, color: '#00D4FF', speed: 0.007 },
  { radius: 148, capacity: 6, color: '#FF6B00', speed: 0.0035 },
  { radius: 216, capacity: 9, color: '#7B2FFF', speed: 0.0023 },
  { radius: 284, capacity: 12, color: '#FFD60A', speed: 0.00175 },
  { radius: 352, capacity: 15, color: '#25D366', speed: 0.0014 },
]

function ringConfig(ri: number): RingConfig {
  if (ri < RING_PRESETS.length) return RING_PRESETS[ri]
  // Ring 6+ : radius += 68, capacity += 3, colour cycles, speed slows.
  return {
    radius: 352 + 68 * (ri - 4),
    capacity: 15 + 3 * (ri - 4),
    color: COLORS[ri % COLORS.length],
    speed: 0.007 / (ri + 1),
  }
}

const countInRing = (list: AgentNode[], ri: number) => list.filter((n) => n.ring === ri).length

/** First ring with free space; an unused outer ring is created automatically. */
function pickRing(list: AgentNode[]): number {
  let ri = 0
  while (countInRing(list, ri) >= ringConfig(ri).capacity) ri++
  return ri
}

const genId = () =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2)

/* ----- credential + configuration field defs for trigger / logic nodes ---- */
interface SpecialDef {
  creds: CredField[]
  config: CredField[]
}
const TRIGGER_DEFS: Record<string, SpecialDef> = {
  Schedule: {
    creds: [],
    config: [
      { key: 'Frequency', label: 'Frequency', type: 'select', defaultValue: 'Every 15 min', options: ['Every minute', 'Every 5 min', 'Every 15 min', 'Every hour', 'Every day', 'Every week', 'Custom cron'] },
      { key: 'Custom Cron', label: 'Custom Cron', type: 'text', placeholder: '0 9 * * MON-FRI', showWhen: (c) => c['Frequency'] === 'Custom cron' },
      { key: 'Timezone', label: 'Timezone', type: 'select', defaultValue: 'IST', options: ['IST', 'UTC', 'GST', 'EST', 'PST'] },
      { key: 'Start Date', label: 'Start Date (optional)', type: 'date' },
    ],
  },
  Webhook: {
    creds: [{ key: 'Webhook URL', label: 'Webhook URL', type: 'text', readonly: true, help: 'Copy this URL and paste in your source app' }],
    config: [
      { key: 'Expected Method', label: 'Expected Method', type: 'select', defaultValue: 'POST', options: ['POST', 'GET', 'PUT'] },
      { key: 'Secret Key', label: 'Secret Key', type: 'text', placeholder: 'Optional verification secret' },
    ],
  },
  'WhatsApp Msg': {
    creds: [
      { key: 'Phone Number ID', label: 'Phone Number ID', type: 'text' },
      { key: 'Access Token', label: 'Access Token', type: 'password' },
    ],
    config: [{ key: 'Filter keyword', label: 'Filter keyword', type: 'text', placeholder: 'Only trigger if message contains...' }],
  },
  'Email Received': {
    creds: [
      { key: 'Gmail Address', label: 'Gmail Address', type: 'email', placeholder: 'yourname@gmail.com' },
      { key: 'App Password', label: 'App Password', type: 'password' },
    ],
    config: [
      { key: 'Filter Subject', label: 'Filter Subject', type: 'text', placeholder: 'Only trigger if subject contains...' },
      { key: 'Filter From', label: 'Filter From', type: 'text', placeholder: 'Only trigger if from this email' },
    ],
  },
  'Form Submit': {
    creds: [
      { key: 'Form ID', label: 'Form ID', type: 'text' },
      { key: 'Service Account Email', label: 'Service Account Email', type: 'email', placeholder: SA_EMAIL },
      { key: 'Private Key', label: 'Private Key', type: 'textarea', rows: 3, placeholder: PK },
    ],
    config: [],
  },
  'Payment Done': {
    creds: [
      { key: 'Razorpay Key ID', label: 'Razorpay Key ID', type: 'text' },
      { key: 'Razorpay Key Secret', label: 'Razorpay Key Secret', type: 'password' },
    ],
    config: [{ key: 'Event Type', label: 'Event Type', type: 'select', defaultValue: 'payment.captured', options: ['payment.captured', 'order.paid', 'refund.processed'] }],
  },
  'New Sheet Row': {
    creds: [
      { key: 'Service Account Email', label: 'Service Account Email', type: 'email', placeholder: SA_EMAIL },
      { key: 'Private Key', label: 'Private Key', type: 'textarea', rows: 3, placeholder: PK },
      { key: 'Spreadsheet ID', label: 'Spreadsheet ID', type: 'text' },
    ],
    config: [{ key: 'Sheet Name', label: 'Sheet Name', type: 'text', placeholder: 'Sheet1', defaultValue: 'Sheet1' }],
  },
  'New Lead': {
    creds: [{ key: 'API Token', label: 'API Token', type: 'password', placeholder: 'HubSpot / Airtable token' }],
    config: [],
  },
  'Manual Run': { creds: [], config: [] },
}

const LOGIC_DEFS: Record<string, SpecialDef> = {
  'If / Else': {
    creds: [],
    config: [
      { key: 'Condition Field', label: 'Condition Field', type: 'text', placeholder: '{{payment.amount}} or {{message.text}}' },
      { key: 'Operator', label: 'Operator', type: 'select', defaultValue: 'equals', options: OPERATORS },
      { key: 'Value', label: 'Value', type: 'text', placeholder: 'Value to compare against' },
      { key: 'True Path', label: 'True Path → connects to', type: 'nodeselect' },
      { key: 'False Path', label: 'False Path → connects to', type: 'nodeselect' },
    ],
  },
  Filter: {
    creds: [],
    config: [
      { key: 'Condition Field', label: 'Condition Field', type: 'text', placeholder: '{{status}} or {{amount}}' },
      { key: 'Operator', label: 'Operator', type: 'select', defaultValue: 'equals', options: OPERATORS },
      { key: 'Value', label: 'Value', type: 'text' },
      { key: 'Logic', label: 'Logic', type: 'select', defaultValue: 'AND', options: ['AND', 'OR'] },
      { key: 'On Fail', label: 'If condition fails', type: 'select', defaultValue: 'Stop workflow', options: ['Stop workflow', 'Continue anyway'] },
    ],
  },
  Switch: { creds: [], config: [] }, // rendered specially (dynamic case list)
  Wait: {
    creds: [],
    config: [
      { key: 'Wait For', label: 'Wait for', type: 'number', placeholder: '5' },
      { key: 'Unit', label: 'Unit', type: 'select', defaultValue: 'Minutes', options: ['Seconds', 'Minutes', 'Hours', 'Days'] },
      { key: 'Wait Until', label: 'Or wait until (optional)', type: 'date' },
    ],
  },
  Loop: {
    creds: [],
    config: [
      { key: 'Input Array Field', label: 'Input Array Field', type: 'text', placeholder: '{{sheets.rows}} or {{contacts}}' },
      { key: 'Max iterations', label: 'Max iterations', type: 'number', placeholder: '100', defaultValue: '100' },
      { key: 'Loop Body', label: 'Loop Body → connects to', type: 'nodeselect' },
      { key: 'After Loop', label: 'After loop → connects to', type: 'nodeselect' },
    ],
  },
  Split: {
    creds: [],
    config: [
      { key: 'Paths', label: 'Number of parallel paths', type: 'select', defaultValue: '2', options: ['2', '3', '4'] },
      { key: 'Path 1', label: 'Path 1 → connects to', type: 'nodeselect' },
      { key: 'Path 2', label: 'Path 2 → connects to', type: 'nodeselect' },
      { key: 'Path 3', label: 'Path 3 → connects to', type: 'nodeselect', showWhen: (c) => Number(c['Paths'] || '2') >= 3 },
      { key: 'Path 4', label: 'Path 4 → connects to', type: 'nodeselect', showWhen: (c) => Number(c['Paths'] || '2') >= 4 },
      { key: 'Merge', label: 'Merge results after', type: 'toggle' },
    ],
  },
}

function seedCreds(fields: CredField[]): Record<string, string> {
  const c: Record<string, string> = {}
  fields.forEach((f) => {
    if (f.key === 'Webhook URL') c[f.key] = `https://nerum.in/webhook/trigger/${genId()}`
    else if (f.defaultValue !== undefined) c[f.key] = f.defaultValue
  })
  return c
}

/** A DB node's subtitle — engine label plus the first masked credential field. */
function dbMaskedSub(c: DbConnection): string {
  const m = DB_META[c.db_type]
  const first = Object.entries(c.credentials_masked || {})[0]
  return first ? `${m.label} · ${first[0]}: ${String(first[1])}` : m.label
}

function createNode(meta: IntMeta, ring: number, db?: { dbType?: DbType; connectionId?: number; configured?: boolean }): AgentNode {
  const cfg = CONFIG[meta.name]
  const credentials: Record<string, string> = {}
  cfg?.creds.forEach((f) => {
    if (f.key === 'Webhook URL') credentials[f.key] = `https://nerum.in/webhook/${genId()}`
    else if (f.defaultValue !== undefined) credentials[f.key] = f.defaultValue
  })
  return {
    id: genId(),
    name: meta.name,
    sub: meta.sub,
    ring,
    iconUrl: ICON_URLS[meta.name] ?? iconUrlFor(meta),
    brandColor: BRAND_COLORS[meta.name] ?? meta.color,
    nodeType: 'soldier',
    credentials,
    action: cfg?.actions[0] ?? '',
    message: '',
    recipient: '',
    subject: '',
    query: '',
    connectedTo: [],
    configured: db?.configured ?? false,
    dbType: db?.dbType,
    connectionId: db?.connectionId,
  }
}

function createSpecialNode(meta: SpecialMeta, kind: 'trigger' | 'logic', ring: number): AgentNode {
  const def = kind === 'trigger' ? TRIGGER_DEFS[meta.name] : LOGIC_DEFS[meta.name]
  const fields = [...(def?.creds ?? []), ...(def?.config ?? [])]
  return {
    id: genId(),
    name: meta.name,
    sub: meta.sub,
    ring,
    iconUrl: meta.icon,
    brandColor: kind === 'trigger' ? '#FFD60A' : '#00D4FF',
    nodeType: kind,
    credentials: seedCreds(fields),
    action: '',
    message: '',
    recipient: '',
    subject: '',
    query: '',
    connectedTo: [],
    configured: false,
  }
}

/* -------------------------------- styles ---------------------------------- */
const fieldInput: CSSProperties = { background: '#111327', border: '0.5px solid #1e2240', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: '100%', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }
const fieldLabel: CSSProperties = { fontSize: 11, color: '#9ca3af', marginBottom: 4, display: 'block' }
const fieldHelp: CSSProperties = { fontSize: 10, color: '#4b5563', marginTop: -6, marginBottom: 8, display: 'block', lineHeight: 1.4 }
const sectionLabel: CSSProperties = { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'block', fontWeight: 600 }
const divider: CSSProperties = { borderTop: '0.5px solid #1e2240', margin: '14px 0' }

/* ============================ Node Config Panel ============================ */
function ConfigPanel({
  node,
  idx,
  nodes,
  ringColor,
  onClose,
  onChange,
  onCred,
  onRemove,
}: {
  node: AgentNode
  idx: number
  nodes: AgentNode[]
  ringColor: string
  onClose: () => void
  onChange: (patch: Partial<AgentNode>) => void
  onCred: (key: string, val: string) => void
  onRemove: () => void
}) {
  const [test, setTest] = useState<'idle' | 'testing' | 'ok'>('idle')
  const [ran, setRan] = useState(false)
  useEffect(() => {
    setTest('idle')
    setRan(false)
  }, [node.id])

  const nt = node.nodeType
  const soldierCfg = nt === 'soldier' ? CONFIG[node.name] : undefined
  const def = nt === 'trigger' ? TRIGGER_DEFS[node.name] : nt === 'logic' ? LOGIC_DEFS[node.name] : undefined
  const allFields = nt === 'soldier' ? soldierCfg?.creds ?? [] : [...(def?.creds ?? []), ...(def?.config ?? [])]
  const accent = nt === 'soldier' ? ringColor : node.brandColor

  // field values merged with their defaults — used for showWhen() logic.
  const credsView = useMemo(() => {
    const v: Record<string, string> = {}
    allFields.forEach((f) => {
      if (f.defaultValue !== undefined) v[f.key] = f.defaultValue
    })
    return { ...v, ...node.credentials }
  }, [allFields, node.credentials])

  const others = nodes.map((n, i) => ({ n, i })).filter((o) => o.i !== idx)

  const focusRing = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = accent
  }
  const blurRing = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = '#1e2240'
  }

  const renderField = (f: CredField) => {
    if (f.showWhen && !f.showWhen(credsView)) return null
    const val = credsView[f.key] ?? ''
    return (
      <div key={f.key}>
        {f.type !== 'toggle' && <label style={fieldLabel}>{f.label}</label>}
        {f.type === 'textarea' ? (
          <textarea
            className="ncfg-field"
            rows={f.rows ?? 3}
            value={val}
            placeholder={f.placeholder}
            readOnly={f.readonly}
            onChange={(e) => onCred(f.key, e.target.value)}
            onFocus={focusRing}
            onBlur={blurRing}
            style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.45, fontFamily: 'var(--font-mono, monospace)' }}
          />
        ) : f.type === 'select' ? (
          <select
            className="ncfg-field"
            value={val}
            onChange={(e) => onCred(f.key, e.target.value)}
            onFocus={focusRing}
            onBlur={blurRing}
            style={fieldInput}
          >
            {f.options?.map((o) => (
              <option key={o} value={o} style={{ background: '#111327' }}>
                {o}
              </option>
            ))}
          </select>
        ) : f.type === 'nodeselect' ? (
          <select className="ncfg-field" value={val} onChange={(e) => onCred(f.key, e.target.value)} onFocus={focusRing} onBlur={blurRing} style={fieldInput}>
            <option value="" style={{ background: '#111327' }}>— none —</option>
            {others.map(({ n }) => (
              <option key={n.id} value={n.id} style={{ background: '#111327' }}>
                {n.name}
              </option>
            ))}
          </select>
        ) : f.type === 'toggle' ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', fontSize: 12.5, color: '#cdd0dd' }}>
            <input type="checkbox" checked={val === 'true'} onChange={(e) => onCred(f.key, e.target.checked ? 'true' : 'false')} style={{ accentColor: accent }} />
            {f.label}
          </label>
        ) : (
          <input
            className="ncfg-field"
            type={f.type}
            value={val}
            placeholder={f.placeholder}
            readOnly={f.readonly}
            onChange={(e) => onCred(f.key, e.target.value)}
            onFocus={focusRing}
            onBlur={blurRing}
            style={{ ...fieldInput, ...(f.readonly ? { color: '#9ca3af', cursor: 'text' } : {}) }}
          />
        )}
        {f.help && <span style={fieldHelp}>{f.help}</span>}
      </div>
    )
  }

  const toggleConnect = (otherId: string) => {
    const set = new Set(node.connectedTo)
    if (set.has(otherId)) set.delete(otherId)
    else set.add(otherId)
    onChange({ connectedTo: Array.from(set) })
  }

  const badge = nt === 'trigger' ? { text: 'Trigger · Start', color: '#FFD60A' } : nt === 'logic' ? { text: 'Logic · Control', color: '#00D4FF' } : { text: `Ring ${node.ring + 1} · Soldier`, color: ringColor }

  const connectSection = (
    <>
      <div style={divider} />
      <span style={sectionLabel}>Connect To</span>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Runs after:</div>
      {others.length === 0 ? (
        <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 8 }}>No other agents yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
          {others.map(({ n }) => {
            const on = node.connectedTo.includes(n.id)
            return (
              <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: on ? '#1a1020' : '#111327', border: `0.5px solid ${on ? accent : '#1e2240'}` }}>
                <input type="checkbox" checked={on} onChange={() => toggleConnect(n.id)} style={{ accentColor: accent }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.iconUrl} alt={n.name} width={16} height={16} style={{ objectFit: 'contain' }} />
                <span style={{ fontSize: 12.5, color: '#fff' }}>{n.name}</span>
              </label>
            )
          })}
        </div>
      )}
    </>
  )

  const caseCount = Number(credsView['caseCount'] || '2')

  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={node.iconUrl} alt={node.name} width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ fontSize: 16, color: '#fff', fontWeight: 500, flex: 1, minWidth: 0 }}>{node.name}</div>
        <button onClick={onRemove} aria-label="Remove node" title="Remove node" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
          </svg>
        </button>
        <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
          ✕
        </button>
      </div>
      <div style={{ display: 'inline-block', fontSize: 11, color: badge.color, fontWeight: 500, marginTop: 6, border: `0.5px solid ${node.brandColor}`, borderRadius: 6, padding: '2px 8px' }}>{badge.text}</div>
      <div style={divider} />

      {/* ---------------- SOLDIER ---------------- */}
      {nt === 'soldier' && (
        <>
          <span style={sectionLabel}>Credentials</span>
          {soldierCfg?.creds.map(renderField)}
          <div style={divider} />
          <span style={sectionLabel}>Configuration</span>
          <label style={fieldLabel}>Action</label>
          <select className="ncfg-field" value={node.action} onChange={(e) => onChange({ action: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput}>
            {soldierCfg?.actions.map((a) => (
              <option key={a} value={a} style={{ background: '#111327' }}>
                {a}
              </option>
            ))}
          </select>
          {soldierCfg?.message && (
            <>
              <label style={fieldLabel}>Message Template</label>
              <textarea className="ncfg-field" rows={3} value={node.message} placeholder="Enter message... use {{variable}} for dynamic values" onChange={(e) => onChange({ message: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.45 }} />
            </>
          )}
          {soldierCfg?.recipient && (
            <>
              <label style={fieldLabel}>Send To</label>
              <input className="ncfg-field" value={node.recipient} placeholder="+91XXXXXXXXXX or email@domain.com" onChange={(e) => onChange({ recipient: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput} />
            </>
          )}
          {soldierCfg?.subject && (
            <>
              <label style={fieldLabel}>Subject</label>
              <input className="ncfg-field" value={node.subject} placeholder="Email subject line" onChange={(e) => onChange({ subject: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput} />
            </>
          )}
          {soldierCfg?.query && (
            <>
              <label style={fieldLabel}>Query</label>
              <textarea className="ncfg-field" rows={2} value={node.query} placeholder="SELECT * FROM users WHERE id = {{user_id}}" onChange={(e) => onChange({ query: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.45, fontFamily: 'var(--font-mono, monospace)' }} />
            </>
          )}
          {connectSection}
        </>
      )}

      {/* ---------------- TRIGGER ---------------- */}
      {nt === 'trigger' && node.name === 'Manual Run' && (
        <>
          <div style={{ fontSize: 12.5, color: '#cdd0dd', lineHeight: 1.5, marginBottom: 12 }}>This workflow runs when you click Run Now from the dashboard.</div>
          <button onClick={() => setRan(true)} style={{ background: '#FFD60A40', border: '0.5px solid #FFD60A', color: '#FFD60A', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {ran ? '✓ Triggered' : 'Run Now'}
          </button>
          {connectSection}
        </>
      )}
      {nt === 'trigger' && node.name !== 'Manual Run' && (
        <>
          {(def?.creds.length ?? 0) > 0 && (
            <>
              <span style={sectionLabel}>Credentials</span>
              {def?.creds.map(renderField)}
              <div style={divider} />
            </>
          )}
          <span style={sectionLabel}>Configuration</span>
          {def?.config.map(renderField)}
          {connectSection}
        </>
      )}

      {/* ---------------- LOGIC ---------------- */}
      {nt === 'logic' && node.name === 'Switch' && (
        <>
          <span style={sectionLabel}>Configuration</span>
          {renderField({ key: 'Field to check', label: 'Field to check', type: 'text', placeholder: '{{payment.status}}' })}
          {Array.from({ length: caseCount }).map((_, i) => (
            <div key={i}>
              {renderField({ key: `Case ${i + 1} Value`, label: `Case ${i + 1} value`, type: 'text', placeholder: 'Value to match' })}
              {renderField({ key: `Case ${i + 1} Route`, label: `Case ${i + 1} → route to`, type: 'nodeselect' })}
            </div>
          ))}
          {caseCount < 5 && (
            <button onClick={() => onCred('caseCount', String(caseCount + 1))} style={{ background: '#00D4FF18', border: '0.5px solid #00D4FF55', color: '#00D4FF', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}>
              + Add Case
            </button>
          )}
          {renderField({ key: 'Default Route', label: 'Default → route to', type: 'nodeselect' })}
        </>
      )}
      {nt === 'logic' && node.name !== 'Switch' && (
        <>
          <span style={sectionLabel}>Configuration</span>
          {def?.config.map(renderField)}
        </>
      )}

      <div style={divider} />

      {/* footer */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => {
            setTest('testing')
            window.setTimeout(() => setTest('ok'), 800)
          }}
          style={{ flex: 1, background: '#111327', border: `0.5px solid ${accent}`, color: accent, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          {test === 'testing' ? 'Testing…' : test === 'ok' ? '✓ Connection OK' : 'Test Node'}
        </button>
        <button
          onClick={() => onChange({ configured: true })}
          style={{ flex: 1, background: accent + '40', border: `0.5px solid ${accent}`, color: accent, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {node.configured ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ============================ AI Commander Panel ========================== */
function SunPanel({ commander, onClose, onChange }: { commander: Commander; onClose: () => void; onChange: (patch: Partial<Commander>) => void }) {
  const [test, setTest] = useState<'idle' | 'testing' | 'ok'>('idle')
  const models = SUN_MODELS[commander.provider] ?? []
  const focusRing = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = SUN_ORANGE
  }
  const blurRing = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = '#1e2240'
  }

  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SUN_ICON} alt="AI Commander" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ fontSize: 16, color: '#fff', fontWeight: 500, flex: 1, minWidth: 0 }}>AI Commander</div>
        <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
          ✕
        </button>
      </div>
      <div style={{ display: 'inline-block', fontSize: 11, color: SUN_ORANGE, fontWeight: 500, marginTop: 6, border: `0.5px solid ${SUN_ORANGE}`, borderRadius: 6, padding: '2px 8px' }}>Core · Orchestrator</div>
      <div style={divider} />

      {/* credentials */}
      <span style={sectionLabel}>Credentials</span>
      <label style={fieldLabel}>AI Provider</label>
      <select className="ncfg-field" value={commander.provider} onChange={(e) => onChange({ provider: e.target.value, model: (SUN_MODELS[e.target.value] ?? [''])[0] })} onFocus={focusRing} onBlur={blurRing} style={fieldInput}>
        {SUN_PROVIDERS.map((p) => (
          <option key={p} value={p} style={{ background: '#111327' }}>
            {p}
          </option>
        ))}
      </select>

      <label style={fieldLabel}>API Key</label>
      <input className="ncfg-field" type="password" value={commander.apiKey} placeholder={SUN_KEY_PH[commander.provider]} onChange={(e) => onChange({ apiKey: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput} />
      <span style={fieldHelp}>This is your BYOK (Bring Your Own Key)</span>

      <label style={fieldLabel}>Model</label>
      <select className="ncfg-field" value={commander.model} onChange={(e) => onChange({ model: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput}>
        {models.map((m) => (
          <option key={m} value={m} style={{ background: '#111327' }}>
            {m}
          </option>
        ))}
      </select>

      <div style={divider} />

      {/* configuration */}
      <span style={sectionLabel}>Configuration</span>
      <label style={fieldLabel}>Agent Name</label>
      <input className="ncfg-field" value={commander.agentName} placeholder="My Automation Agent" onChange={(e) => onChange({ agentName: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput} />

      <label style={fieldLabel}>System Prompt</label>
      <textarea className="ncfg-field" rows={4} value={commander.systemPrompt} placeholder="You are an automation agent for [business name]. Your job is to..." onChange={(e) => onChange({ systemPrompt: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.45 }} />

      <label style={fieldLabel}>Max Steps (how many soldier nodes to call)</label>
      <input className="ncfg-field" type="number" value={commander.maxSteps} placeholder="10" onChange={(e) => onChange({ maxSteps: e.target.value })} onFocus={focusRing} onBlur={blurRing} style={fieldInput} />

      <label style={fieldLabel}>Temperature</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <input type="range" min={0} max={1} step={0.1} value={commander.temperature} onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })} style={{ flex: 1, accentColor: SUN_ORANGE }} />
        <span style={{ fontSize: 13, color: SUN_ORANGE, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{commander.temperature.toFixed(1)}</span>
      </div>

      <div style={divider} />

      {/* footer */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => {
            setTest('testing')
            window.setTimeout(() => setTest('ok'), 800)
          }}
          style={{ flex: 1, background: '#111327', border: `0.5px solid ${SUN_ORANGE}`, color: SUN_ORANGE, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          {test === 'testing' ? 'Testing…' : test === 'ok' ? '✓ Connection OK' : 'Test Connection'}
        </button>
        <button onClick={() => onChange({ configured: true })} style={{ flex: 1, background: SUN_ORANGE + '40', border: `0.5px solid ${SUN_ORANGE}`, color: SUN_ORANGE, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {commander.configured ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ================================ component ================================ */
export default function BuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)
  const ringAnglesRef = useRef<number[]>([])
  const sunPulseRef = useRef(0)
  const canvasSizeRef = useRef({ w: 0, h: 0 })
  const iconsLoadedRef = useRef(false)
  const starsRef = useRef<Star[]>([])
  const twinkleTimeRef = useRef(0)
  const nodePositionsRef = useRef<{ idx: number; x: number; y: number }[]>([])

  const [nodes, setNodes] = useState<AgentNode[]>(() => [createNode(INTEGRATIONS[0], 0)])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [hovered, setHovered] = useState<{ idx: number; x: number; y: number } | null>(null)
  const [configIdx, setConfigIdx] = useState<number | null>(null)
  const [picker, setPicker] = useState<{ ring: number | undefined; tab: 'soldiers' | 'triggers' | 'logic' | 'database' } | null>(null)
  const [pickerQuery, setPickerQuery] = useState('')
  // database connections + add/edit modal (shared module)
  const { conns: dbConns, reload: reloadDb } = useDbConnections()
  const [dbModal, setDbModal] = useState<DbModalMode | null>(null)
  const [dbDelete, setDbDelete] = useState<DbConnection | null>(null)
  // id of the DB node whose config modal is open, so onSaved attaches the new
  // connection back to THAT node instead of creating a separate one.
  const [dbConfigNodeId, setDbConfigNodeId] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; idx: number } | null>(null)
  const [commander, setCommander] = useState<Commander>(initCommander)
  const [sunOpen, setSunOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  // Refs mirror state so the single RAF loop + native handlers read fresh values.
  const nodesRef = useRef(nodes)
  const activeIdxRef = useRef(activeIdx)
  const commanderRef = useRef(commander)
  nodesRef.current = nodes
  activeIdxRef.current = activeIdx
  commanderRef.current = commander

  const maxRing = nodes.reduce((m, n) => Math.max(m, n.ring), 0)
  const ringCount = maxRing + 1
  const panelOpen = configIdx !== null || sunOpen
  const configNode = configIdx !== null ? nodes[configIdx] : null
  const configRingColor = configNode ? ringConfig(configNode.ring).color : PLASMA.orange

  /* icons are preloaded once at mount via preloadAllIcons() — see RAF effect below */

  /* ------------------------------ mutations ------------------------------ */
  const addNode = useCallback((meta: IntMeta, ringIndex?: number, db?: { dbType?: DbType; connectionId?: number; configured?: boolean }) => {
    setNodes((prev) => {
      const ring =
        ringIndex !== undefined && countInRing(prev, ringIndex) < ringConfig(ringIndex).capacity ? ringIndex : pickRing(prev)
      return [...prev, createNode(meta, ring, db)]
    })
  }, [])

  const updateNode = useCallback((idx: number, patch: Partial<AgentNode>) => {
    setNodes((prev) => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)))
  }, [])

  const updateCred = useCallback((idx: number, key: string, val: string) => {
    setNodes((prev) => prev.map((n, i) => (i === idx ? { ...n, credentials: { ...n.credentials, [key]: val } } : n)))
  }, [])

  const openPicker = useCallback((ring?: number, tab: 'soldiers' | 'triggers' | 'logic' | 'database' = 'soldiers') => {
    setPickerQuery('')
    setPicker({ ring, tab })
  }, [])

  // Exactly one trigger per workflow; always Ring 1, first slot (prepended).
  const addTrigger = useCallback((meta: SpecialMeta) => {
    setNodes((prev) => [createSpecialNode(meta, 'trigger', 0), ...prev.filter((n) => n.nodeType !== 'trigger')])
    setConfigIdx(null)
    setActiveIdx(-1)
    setSunOpen(false)
  }, [])

  const addLogic = useCallback((meta: SpecialMeta, ringIndex?: number) => {
    setNodes((prev) => {
      const ring = ringIndex !== undefined && countInRing(prev, ringIndex) < ringConfig(ringIndex).capacity ? ringIndex : pickRing(prev)
      return [...prev, createSpecialNode(meta, 'logic', ring)]
    })
  }, [])

  // Type-tile click → drop an UNCONFIGURED DB node (no connection yet), exactly
  // like a fresh WhatsApp node. Clicking it later opens the DB modal.
  const addDbTypeNode = useCallback((dbType: DbType, ringIndex?: number) => {
    const m = DB_META[dbType]
    addNode({ name: m.label, sub: 'Click to configure', slug: m.slug, hex: m.hex, color: m.color }, ringIndex, { dbType })
  }, [addNode])

  // Existing-connection click → drop a fully CONFIGURED DB node (creds already
  // exist), synthesizing IntMeta so it wires like any other integration.
  const addDbNode = useCallback((c: DbConnection, ringIndex?: number) => {
    const m = DB_META[c.db_type]
    addNode({ name: c.name, sub: dbMaskedSub(c), slug: m.slug, hex: m.hex, color: m.color }, ringIndex, { dbType: c.db_type, connectionId: c.id, configured: true })
  }, [addNode])

  // Open the right config UI for a node: DB nodes open the DB modal (edit if a
  // connection is already attached, else create pre-locked to the node's type);
  // every other node opens the standard ConfigPanel.
  const openNodeConfig = useCallback((idx: number) => {
    const n = nodesRef.current[idx]
    if (!n) return
    setActiveIdx(idx)
    setSunOpen(false)
    if (n.dbType) {
      setConfigIdx(null)
      setDbConfigNodeId(n.id)
      const existing = n.connectionId != null ? dbConns.find((c) => c.id === n.connectionId) : undefined
      setDbModal(existing ? { kind: 'edit', conn: existing } : { kind: 'create', presetType: n.dbType, lockType: true })
      return
    }
    setConfigIdx(idx)
  }, [dbConns])

  // After a save from a node-opened modal, attach the connection to that node.
  const handleDbSaved = useCallback((conn?: DbConnection) => {
    reloadDb()
    if (!conn || !dbConfigNodeId) return
    const idx = nodesRef.current.findIndex((n) => n.id === dbConfigNodeId)
    if (idx < 0) return
    const m = DB_META[conn.db_type]
    updateNode(idx, {
      name: conn.name,
      sub: dbMaskedSub(conn),
      connectionId: conn.id,
      iconUrl: `https://cdn.simpleicons.org/${m.slug}/${m.hex}`,
      brandColor: m.color,
      configured: true,
    })
  }, [reloadDb, updateNode, dbConfigNodeId])

  /**
   * Remove a node, then compact rings: any ring left empty is dropped and the
   * outer rings shift inward (re-indexed densely). Remaining nodes redistribute
   * evenly automatically — the draw loop spaces by index within each ring.
   */
  const removeNodeAt = useCallback((idx: number) => {
    const prev = nodesRef.current
    if (idx < 0 || idx >= prev.length) return
    const filtered = prev.filter((_, i) => i !== idx)
    const usedRings = Array.from(new Set(filtered.map((n) => n.ring))).sort((a, b) => a - b)
    const remap = new Map<number, number>()
    usedRings.forEach((r, i) => remap.set(r, i))
    setNodes(filtered.map((n) => ({ ...n, ring: remap.get(n.ring) ?? n.ring })))

    // shift selection / open dropdown to track the removed + re-indexed nodes
    setConfigIdx((c) => (c === null ? null : c === idx ? null : c > idx ? c - 1 : c))
    setActiveIdx((a) => (a === idx ? -1 : a > idx ? a - 1 : a))
    setOpenDropdown((d) => (d === null ? null : remap.has(d) ? (remap.get(d) as number) : null))
    setMenu(null)
  }, [])

  /* ---------------------------- canvas resize ---------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const apply = () => {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      canvasSizeRef.current = { w, h }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  /* ----------------------- animation loop (refs only) -------------------- */
  // draw never reads useState — only refs + the module image cache — so React
  // re-renders cannot restart or disturb the RAF loop. Stable identity ([] deps).
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvasSizeRef.current.w
    const h = canvasSizeRef.current.h
    if (!w || !h) {
      animFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const CX = w / 2
    const CY = h / 2
    const ns = nodesRef.current
    const active = activeIdxRef.current
    const rings = ns.reduce((m, n) => Math.max(m, n.ring), 0) + 1

      // canvas stays transparent — the wrapper CSS paints the night sky
      ctx.clearRect(0, 0, w, h)

      // nebula glow behind the sun
      const neb = ctx.createRadialGradient(CX, CY, 0, CX, CY, 200)
      neb.addColorStop(0, 'rgba(123, 47, 255, 0.06)')
      neb.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(CX, CY, 200, 0, Math.PI * 2)
      ctx.fillStyle = neb
      ctx.fill()

      // twinkling star field (drawn first, behind everything)
      twinkleTimeRef.current += 0.01
      const twinkleTime = twinkleTimeRef.current
      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(twinkleTime * star.twinkleSpeed * 60 + star.twinkleOffset) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`
        ctx.fill()
      })

      const angles = ringAnglesRef.current
      for (let ri = 0; ri < rings; ri++) {
        if (angles[ri] === undefined) angles[ri] = 0
        angles[ri] += ringConfig(ri).speed
      }

      for (let ri = 0; ri < rings; ri++) {
        const rc = ringConfig(ri)
        ctx.beginPath()
        ctx.arc(CX, CY, rc.radius, 0, Math.PI * 2)
        ctx.strokeStyle = rc.color + '30'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // sun — the AI Commander (anthropic icon, "N" fallback)
      sunPulseRef.current += 0.04
      const pulse = Math.sin(sunPulseRef.current) * 2
      ctx.beginPath()
      ctx.arc(CX, CY, 38, 0, Math.PI * 2)
      ctx.fillStyle = '#FF6B0010'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(CX, CY, 26 + pulse, 0, Math.PI * 2)
      ctx.fillStyle = '#110800'
      ctx.fill()
      ctx.strokeStyle = '#FF6B00'
      ctx.lineWidth = 2
      ctx.stroke()
      const sunImg = GLOBAL_IMAGE_CACHE[ICON_URLS.AI]
      if (sunImg && sunImg.complete && sunImg.naturalWidth > 0) {
        ctx.drawImage(sunImg, CX - 9, CY - 9, 18, 18)
      } else {
        ctx.fillStyle = '#FF6B00'
        ctx.font = `500 16px ${CANVAS_FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('N', CX, CY)
      }
      // commander configured indicator
      if (commanderRef.current.configured) {
        ctx.beginPath()
        ctx.arc(CX + 18, CY - 18, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#25D366'
        ctx.fill()
      }

      // planets
      const positions: { idx: number; x: number; y: number }[] = []
      for (let ri = 0; ri < rings; ri++) {
        const rc = ringConfig(ri)
        const idxs: number[] = []
        ns.forEach((n, i) => {
          if (n.ring === ri) idxs.push(i)
        })
        const total = idxs.length
        idxs.forEach((gi, k) => {
          const baseAngle = (2 * Math.PI * k) / total
          const finalAngle = baseAngle + angles[ri]
          const x = CX + rc.radius * Math.cos(finalAngle)
          const y = CY + rc.radius * Math.sin(finalAngle)
          positions.push({ idx: gi, x, y })

          const node = ns[gi]
          const isActive = gi === active
          const bc = node.brandColor

          // active glow (all shapes)
          if (isActive) {
            ctx.beginPath()
            ctx.arc(x, y, 30, 0, Math.PI * 2)
            ctx.fillStyle = bc + '25'
            ctx.fill()
          }

          // shape by node type: star = trigger, diamond = logic, circle = soldier
          if (node.nodeType === 'trigger') {
            drawStar(ctx, x, y, 22, bc, isActive)
          } else if (node.nodeType === 'logic') {
            drawDiamond(ctx, x, y, 22, bc, isActive)
          } else {
            ctx.beginPath()
            ctx.arc(x, y, 22, 0, Math.PI * 2)
            ctx.fillStyle = '#07080F'
            ctx.fill()
            ctx.strokeStyle = isActive ? bc : bc + '55'
            ctx.lineWidth = isActive ? 2 : 1
            ctx.stroke()
          }

          const isz = node.nodeType === 'soldier' ? 22 : 16
          const img = GLOBAL_IMAGE_CACHE[node.iconUrl]
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, x - isz / 2, y - isz / 2, isz, isz)
          } else {
            ctx.fillStyle = bc
            ctx.font = `500 9px ${CANVAS_FONT}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(node.name.slice(0, 2).toUpperCase(), x, y)
          }

          // configured status dot
          ctx.beginPath()
          ctx.arc(x + 16, y - 16, 4, 0, Math.PI * 2)
          ctx.fillStyle = node.configured ? '#25D366' : '#FF6B00'
          ctx.fill()
        })
      }
      nodePositionsRef.current = positions

    animFrameRef.current = requestAnimationFrame(draw)
  }, [])

  // Start the loop once on mount + preload every icon upfront into the module cache.
  useEffect(() => {
    starsRef.current = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }))
    preloadAllIcons().then(() => {
      iconsLoadedRef.current = true
    })
    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [draw])

  /* ------------------------- canvas interaction -------------------------- */
  const hitNode = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { mx: 0, my: 0, hit: undefined as undefined | { idx: number; x: number; y: number } }
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const hit = nodePositionsRef.current.find((p) => Math.hypot(p.x - mx, p.y - my) <= 24)
    return { mx, my, hit }
  }

  const onMove = (e: React.MouseEvent) => {
    const { mx, my, hit } = hitNode(e)
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'default'
    setHovered(hit ? { idx: hit.idx, x: mx, y: my } : null)
  }

  const onClick = (e: React.MouseEvent) => {
    const { mx, my, hit } = hitNode(e)
    if (hit) {
      openNodeConfig(hit.idx)
      return
    }
    const { w, h } = canvasSizeRef.current
    if (Math.hypot(w / 2 - mx, h / 2 - my) <= 30) {
      // sun → open the AI Commander config panel
      setActiveIdx(-1)
      setConfigIdx(null)
      setSunOpen(true)
      return
    }
    // empty canvas → deselect everything
    setActiveIdx(-1)
    setConfigIdx(null)
    setSunOpen(false)
    setOpenDropdown(null)
  }

  const onContext = (e: React.MouseEvent) => {
    e.preventDefault()
    const { hit } = hitNode(e)
    if (hit) setMenu({ x: e.clientX, y: e.clientY, idx: hit.idx })
    else setMenu(null)
  }

  /* ----------------- close ring dropdown on outside click ---------------- */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('[data-ctx-menu]')) return
      setMenu(null)
      if (t.closest('[data-ring-ui]')) return
      if (t.tagName === 'CANVAS') return
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  /* --------------------------------- view -------------------------------- */
  const hoveredNode = hovered ? nodes[hovered.idx] : null
  const pickerRing = picker ? picker.ring ?? pickRing(nodes) : 0
  const pickerRingColor = ringConfig(pickerRing).color
  const pickerTab = picker?.tab ?? 'soldiers'
  const pickerAccent = pickerTab === 'triggers' ? '#FFD60A' : pickerTab === 'logic' ? '#00D4FF' : pickerTab === 'database' ? '#7B2FFF' : pickerRingColor
  const pickerList: SpecialMeta[] =
    pickerTab === 'soldiers' ? INTEGRATIONS.map((m) => ({ name: m.name, sub: m.sub, icon: iconMap[m.name] })) : pickerTab === 'triggers' ? TRIGGERS : pickerTab === 'logic' ? LOGIC : []
  const filteredPicker = pickerList.filter((m) => m.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
  const dbPickerList = dbConns.filter((c) => c.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
  const pickerTitle = pickerTab === 'triggers' ? 'Choose a Trigger' : pickerTab === 'logic' ? 'Choose Logic' : pickerTab === 'database' ? 'Choose a Database' : 'Choose an Integration'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* ============================ TOPBAR ============================ */}
      <div
        data-ring-ui
        style={{ background: '#0d0f1e', borderBottom: '0.5px solid #1e2240', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
      >
        <button
          onClick={() => openPicker(undefined, 'soldiers')}
          style={{ background: '#7B2FFF22', border: '0.5px solid #7B2FFF55', borderRadius: 8, padding: '6px 14px', color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          + Add Agent
        </button>
        <button
          onClick={() => openPicker(undefined, 'triggers')}
          style={{ background: '#FFD60A22', border: '0.5px solid #FFD60A55', borderRadius: 8, padding: '6px 14px', color: '#FFD60A', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          ⚡ Add Trigger
        </button>
        <button
          onClick={() => openPicker(undefined, 'logic')}
          style={{ background: '#00D4FF22', border: '0.5px solid #00D4FF55', borderRadius: 8, padding: '6px 14px', color: '#00D4FF', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          🔀 Add Logic
        </button>

        {Array.from({ length: ringCount }).map((_, ri) => {
          const rc = ringConfig(ri)
          const count = countInRing(nodes, ri)
          const open = openDropdown === ri
          return (
            <button
              key={ri}
              onClick={() => setOpenDropdown(open ? null : ri)}
              style={{ background: open ? '#1a1020' : '#111327', border: `0.5px solid ${open ? rc.color : '#1e2240'}`, borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', color: '#cdd0dd', fontSize: 12 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: rc.color, flexShrink: 0 }} />
              <span>Ring {ri + 1}</span>
              <span style={{ color: rc.color, fontSize: 11, fontWeight: 600 }}>
                {count}/{rc.capacity}
              </span>
              <span style={{ color: PLASMA.muted, fontSize: 10 }}>▾</span>
            </button>
          )
        })}

        <div style={{ marginLeft: 'auto', fontSize: 11, color: PLASMA.muted }}>
          {nodes.length} agent{nodes.length !== 1 ? 's' : ''} · {ringCount} ring{ringCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ===================== RING INLINE NODE LIST ===================== */}
      {openDropdown !== null && (
        <div data-ring-ui style={{ background: '#0d0f1e', borderBottom: '0.5px solid #1e2240', padding: '8px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {nodes
            .map((n, i) => ({ n, i }))
            .filter((o) => o.n.ring === openDropdown)
            .map(({ n, i }) => (
              <div
                key={n.id}
                onClick={() => openNodeConfig(i)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = n.brandColor)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = i === activeIdx ? n.brandColor : '#1e2240')}
                style={{ background: '#111327', border: `0.5px solid ${i === activeIdx ? n.brandColor : '#1e2240'}`, borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.iconUrl} alt={n.name} width={18} height={18} style={{ objectFit: 'contain' }} />
                <span style={{ fontSize: 12, color: '#fff' }}>{n.name}</span>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.configured ? '#25D366' : '#FF6B00' }} />
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    removeNodeAt(i)
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                  title="Remove node"
                  style={{ color: '#6b7280', fontSize: 13, lineHeight: 1, cursor: 'pointer', marginLeft: 2 }}
                >
                  ✕
                </span>
              </div>
            ))}
          {countInRing(nodes, openDropdown) < ringConfig(openDropdown).capacity && (
            <div
              onClick={() => openPicker(openDropdown)}
              style={{ background: '#7B2FFF18', border: '0.5px solid #7B2FFF55', borderRadius: 8, padding: '6px 10px', color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              + Add to Ring {openDropdown + 1}
            </div>
          )}
        </div>
      )}

      {/* ===================== CANVAS + CONFIG PANEL ===================== */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <div
          ref={wrapRef}
          style={{ position: 'absolute', top: 0, left: 0, bottom: chatOpen ? 'max(46vh, 300px)' : 0, width: panelOpen ? `calc(100% - ${PANEL_W}px)` : '100%', background: '#020408', overflow: 'hidden', transition: 'width 0.25s ease, bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={onMove}
            onMouseLeave={() => setHovered(null)}
            onClick={onClick}
            onContextMenu={onContext}
            style={{ display: 'block', width: '100%', height: '100%', background: 'transparent' }}
          />

          {hoveredNode && hovered && (
            <div
              style={{ position: 'absolute', left: hovered.x + 20, top: hovered.y - 20, background: '#0d0f1e', border: '0.5px solid #2a2d45', borderRadius: 10, padding: '8px 12px', pointerEvents: 'none', zIndex: 5, maxWidth: 220 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hoveredNode.iconUrl} alt={hoveredNode.name} width={16} height={16} style={{ objectFit: 'contain' }} />
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{hoveredNode.name}</span>
              </div>
              <div style={{ fontSize: 11, color: PLASMA.muted, marginTop: 2 }}>{hoveredNode.sub}</div>
              <div style={{ fontSize: 10, color: ringConfig(hoveredNode.ring).color, fontWeight: 500, marginTop: 3 }}>Ring {hoveredNode.ring + 1}</div>
            </div>
          )}
        </div>

        {/* config slide panel */}
        <aside
          className="ncfg-scroll"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: PANEL_W, background: '#0d0f1e', borderLeft: '0.5px solid #1e2240', transform: panelOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease', overflowY: 'auto', zIndex: 6 }}
        >
          {configNode && configIdx !== null && (
            <ConfigPanel
              node={configNode}
              idx={configIdx}
              nodes={nodes}
              ringColor={configRingColor}
              onClose={() => {
                setConfigIdx(null)
                setActiveIdx(-1)
              }}
              onChange={(patch) => updateNode(configIdx, patch)}
              onCred={(key, val) => updateCred(configIdx, key, val)}
              onRemove={() => removeNodeAt(configIdx)}
            />
          )}
          {sunOpen && <SunPanel commander={commander} onClose={() => setSunOpen(false)} onChange={(p) => setCommander((c) => ({ ...c, ...p }))} />}
        </aside>
      </div>

      {/* ===================== INTEGRATION PICKER ====================== */}
      {picker && (
        <div
          onClick={() => setPicker(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(7,8,15,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#0d0f1e', border: '0.5px solid #1e2240', borderRadius: 16, padding: 24, width: 500, maxWidth: '94vw', maxHeight: 540, overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>{pickerTitle}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Select a node to add{picker.ring !== undefined ? ` to Ring ${picker.ring + 1}` : ''}
                </div>
              </div>
              <button onClick={() => setPicker(null)} aria-label="Close" style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid #1e2240', marginTop: 12 }}>
              {(['soldiers', 'triggers', 'logic', 'database'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPicker((p) => (p ? { ...p, tab: t } : p))}
                  style={{ background: 'none', border: 'none', borderBottom: pickerTab === t ? '2px solid #FF6B00' : '2px solid transparent', color: pickerTab === t ? '#fff' : '#6b7280', fontSize: 13, fontWeight: 500, padding: '8px 14px', cursor: 'pointer', textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              className="ncfg-field"
              autoFocus
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search..."
              style={{ background: '#111327', border: '0.5px solid #1e2240', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: '100%', margin: '12px 0', outline: 'none', boxSizing: 'border-box' }}
            />

            {pickerTab === 'database' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* type tiles — always shown; each opens the modal pre-set to that engine */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {DB_TYPES.map((ty) => {
                    const m = DB_META[ty]
                    return (
                      <div
                        key={ty}
                        onClick={() => { addDbTypeNode(ty, picker.ring); setPicker(null) }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = m.color)}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2240')}
                        style={{ background: '#111327', border: '0.5px solid #1e2240', borderRadius: 10, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'border-color 0.15s' }}
                      >
                        <DbLogo type={ty} size={28} />
                        <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{m.label}</div>
                      </div>
                    )
                  })}
                </div>

                {/* existing saved connections — selecting one drops it on the canvas */}
                {dbConns.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your databases</div>
                    {dbPickerList.map((c) => (
                      <div key={c.id} onClick={() => { addDbNode(c, picker.ring); setPicker(null) }} style={{ cursor: 'pointer' }}>
                        <DbConnectionCard conn={c} onEdit={(x) => setDbModal({ kind: 'edit', conn: x })} onDelete={(x) => setDbDelete(x)} />
                      </div>
                    ))}
                    {dbPickerList.length === 0 && <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, padding: 12 }}>No matches.</div>}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {filteredPicker.map((m) => (
                  <div
                    key={m.name}
                    onClick={() => {
                      if (pickerTab === 'soldiers') addNode(metaByName[m.name], picker.ring)
                      else if (pickerTab === 'triggers') addTrigger(m)
                      else addLogic(m, picker.ring)
                      setPicker(null)
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = pickerAccent)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e2240')}
                    style={{ background: '#111327', border: '0.5px solid #1e2240', borderRadius: 10, padding: 12, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', transition: 'border-color 0.15s' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.icon} alt={m.name} width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.visibility = 'hidden')} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, lineHeight: 1.2 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.2, marginTop: 2 }}>{m.sub}</div>
                    </div>
                  </div>
                ))}
                {filteredPicker.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', fontSize: 12, padding: 24 }}>No matches.</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* shared database add/edit modal + delete confirm (overlay the picker) */}
      {dbModal && <DbConnectionModal mode={dbModal} onClose={() => { setDbModal(null); setDbConfigNodeId(null) }} onSaved={handleDbSaved} />}
      {dbDelete && <DeleteDbDialog conn={dbDelete} onCancel={() => setDbDelete(null)} onDeleted={() => { setDbDelete(null); reloadDb() }} />}

      {/* ===================== RIGHT-CLICK CONTEXT MENU ================ */}
      {menu && (
        <div data-ctx-menu style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 300, background: '#0d0f1e', border: '0.5px solid #1e2240', borderRadius: 8, padding: 4 }}>
          <div
            onClick={() => removeNodeAt(menu.idx)}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1020')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            style={{ color: '#ef4444', fontSize: 13, padding: '6px 12px', cursor: 'pointer', borderRadius: 6, whiteSpace: 'nowrap' }}
          >
            Remove node
          </div>
        </div>
      )}

      {/* ===================== BOTTOM CHAT DRAWER ===================== */}
      <AgentChatDrawer configOpen={panelOpen} open={chatOpen} onOpenChange={setChatOpen} />

      <style>{`
        .ncfg-field::placeholder { color: #4b5563; }
        .ncfg-scroll::-webkit-scrollbar { width: 8px; }
        .ncfg-scroll::-webkit-scrollbar-thumb { background: #1e2240; border-radius: 4px; }
      `}</style>
    </div>
  )
}
