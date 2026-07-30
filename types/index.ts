// ─── Core Entities ───────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// ─── Clients / CRM ───────────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive' | 'churned'
export type ServiceType =
  | 'social_media'
  | 'paid_ads'
  | 'seo'
  | 'content'
  | 'email'
  | 'branding'
  | 'web'
  | 'consulting'
  | 'strategy'

export interface Client {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  website?: string
  avatar?: string
  status: ClientStatus
  services: ServiceType[]
  monthlyValue: number
  currency: string
  startDate: Date
  endDate?: Date
  industry?: string
  country?: string
  tags: string[]
  notes?: string
  planType?: 'unico' | 'personalizado' | null
  planNotes?: string
  assignedTo?: string
  contacts: Contact[]
  createdAt: Date
  updatedAt: Date
}

export interface Contact {
  id: string
  clientId: string
  name: string
  role: string
  email: string
  phone?: string
  isPrimary: boolean
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  assignee?: User
  clientId?: string
  client?: Pick<Client, 'id' | 'name' | 'company' | 'avatar'>
  dueDate?: Date
  startDate?: Date
  estimatedHours?: number
  tags: string[]
  checklist: ChecklistItem[]
  attachments: Attachment[]
  comments: Comment[]
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  order: number
}

export interface Attachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: Date
}

export interface Comment {
  id: string
  content: string
  authorId: string
  author?: User
  createdAt: Date
  updatedAt: Date
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type LeadSource = 'referral' | 'inbound' | 'outbound' | 'social' | 'ads' | 'event' | 'other'
export type LeadPriority = 'high' | 'medium' | 'low'

export interface Lead {
  id: string
  name: string
  company: string
  email?: string
  phone?: string
  website?: string
  status: LeadStatus
  source: LeadSource
  priority: LeadPriority
  potentialValue: number
  currency: string
  services: ServiceType[]
  notes?: string
  nextAction?: string
  nextActionDate?: Date
  assignedTo?: string
  assignee?: User
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// ─── Events / Calendar ───────────────────────────────────────────────────────

export type EventType = 'meeting' | 'deadline' | 'publication' | 'followup' | 'internal' | 'other'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: EventType
  startDate: Date
  endDate: Date
  allDay: boolean
  clientId?: string
  client?: Pick<Client, 'id' | 'name' | 'company'>
  taskId?: string
  attendees: string[]
  location?: string
  meetingUrl?: string
  createdById: string
  createdAt: Date
  updatedAt: Date
}

// ─── SOPs / Documents ────────────────────────────────────────────────────────

export type DocType = 'sop' | 'guide' | 'template' | 'checklist' | 'prompt' | 'resource'

export interface Document {
  id: string
  title: string
  content: string
  type: DocType
  category: string
  tags: string[]
  isFavorite: boolean
  isPublished: boolean
  authorId: string
  author?: User
  views: number
  createdAt: Date
  updatedAt: Date
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export type AIFunction =
  | 'weekly_summary'
  | 'campaign_analysis'
  | 'content_ideas'
  | 'copywriting'
  | 'meeting_summary'
  | 'task_generator'
  | 'client_analysis'
  | 'strategy'
  | 'message_draft'
  | 'chat'

export interface AIConversation {
  id: string
  title: string
  function: AIFunction
  messages: AIMessage[]
  contextId?: string
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

// ─── Activity ────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'client_created'
  | 'client_updated'
  | 'task_created'
  | 'task_completed'
  | 'lead_created'
  | 'lead_won'
  | 'lead_lost'
  | 'doc_created'
  | 'comment_added'
  | 'payment_received'

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description?: string
  userId: string
  user?: User
  entityId?: string
  entityType?: string
  createdAt: Date
}

// ─── Dashboard KPIs ──────────────────────────────────────────────────────────

export interface DashboardStats {
  activeClients: number
  activeClientsGrowth: number
  monthlyRevenue: number
  monthlyRevenueARS: number
  monthlyRevenueUSD: number
  monthlyRevenueGrowth: number
  pendingTasks: number
  criticalTasks: number
  activeLeads: number
  leadsValue: number
  leadsValueGrowth: number
  upcomingEvents: number
  tasksCompletedThisWeek: number
  newClientsThisMonth: number
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'grid' | 'table'

export interface Notification {
  id: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}
