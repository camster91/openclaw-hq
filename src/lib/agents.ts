export const AGENTS = {
  claw: { id: 'claw', name: 'Claw', emoji: '🦞', role: 'System Admin', model: 'deepseek-reasoner', color: '#ef4444', bg: '#fef2f2' },
  bernard: { id: 'bernard', name: 'Bernard', emoji: '🔨', role: 'Developer', model: 'deepseek-reasoner', color: '#f59e0b', bg: '#fffbeb' },
  vale: { id: 'vale', name: 'Vale', emoji: '📣', role: 'Marketer', model: 'deepseek-chat', color: '#8b5cf6', bg: '#f5f3ff' },
  gumbo: { id: 'gumbo', name: 'Gumbo', emoji: '🎯', role: 'Assistant', model: 'deepseek-chat', color: '#06b6d4', bg: '#ecfeff' },
  unassigned: { id: 'unassigned', name: 'Unassigned', emoji: '❓', role: '', model: '', color: '#6b7280', bg: '#f9fafb' },
} as const;

export const STATUSES = {
  queued: { label: 'Queued', color: '#6b7280', icon: '○' },
  in_progress: { label: 'In Progress', color: '#f59e0b', icon: '◑' },
  needs_info: { label: 'Needs Info', color: '#a855f7', icon: '?' },
  done: { label: 'Done', color: '#10b981', icon: '●' },
  blocked: { label: 'Blocked', color: '#ef4444', icon: '✕' },
} as const;

export const PRIORITIES = {
  low: { label: 'Low', color: '#6b7280' },
  medium: { label: 'Medium', color: '#3b82f6' },
  high: { label: 'High', color: '#f59e0b' },
  urgent: { label: 'Urgent', color: '#ef4444' },
} as const;

export const CATEGORIES = [
  'general', 'infrastructure', 'development', 'content', 'marketing', 'admin', 'client', 'design'
];

export const CLIENT_STATUSES = {
  lead: { label: 'Lead', color: '#3b82f6' },
  active: { label: 'Active', color: '#10b981' },
  paused: { label: 'Paused', color: '#f59e0b' },
  completed: { label: 'Completed', color: '#6b7280' },
  archived: { label: 'Archived', color: '#374151' },
} as const;

export const PROJECT_TYPES = {
  'web-design': { label: 'Web Design', color: '#06b6d4' },
  'branding': { label: 'Branding', color: '#8b5cf6' },
  'shopify': { label: 'Shopify', color: '#10b981' },
  'wordpress': { label: 'WordPress', color: '#3b82f6' },
  'maintenance': { label: 'Maintenance', color: '#f59e0b' },
  'seo': { label: 'SEO', color: '#ef4444' },
  'custom-dev': { label: 'Custom Dev', color: '#ec4899' },
  'packaging': { label: 'Packaging', color: '#14b8a6' },
  'other': { label: 'Other', color: '#6b7280' },
} as const;

export const PLATFORMS = {
  wordpress: { label: 'WordPress', icon: '🔵' },
  shopify: { label: 'Shopify', icon: '🟢' },
  other: { label: 'Other', icon: '⚪' },
} as const;

export const SOURCES = {
  upwork: { label: 'Upwork', color: '#14a800' },
  direct: { label: 'Direct', color: '#3b82f6' },
  referral: { label: 'Referral', color: '#8b5cf6' },
  ashbi: { label: 'Ashbi', color: '#06b6d4' },
  other: { label: 'Other', color: '#6b7280' },
} as const;
