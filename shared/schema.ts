import { mysqlTable, text, int, boolean, timestamp, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with role-based access control
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"), // "admin", "agent", "user"
  companyName: text("company_name"),
  department: text("department"),
  contactNumber: text("contact_number"),
  designation: text("designation"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories for tickets
export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  parentId: int("parent_id"),
});

// Tickets table
export const tickets = mysqlTable("tickets", {
  id: int("id").primaryKey().autoincrement(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // "open", "in-progress", "resolved", "closed"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  supportType: text("support_type").notNull().default("remote"), // "remote", "telephonic", "onsite_visit", "other"
  contactEmail: text("contact_email"), // Email for contact field
  contactName: text("contact_name"), // Name associated with contact email
  contactPhone: text("contact_phone"), // Phone number for contact
  contactDepartment: text("contact_department"), // Department for contact
  companyName: text("company_name").notNull(), // Company name associated with ticket (mandatory)
  location: text("location").notNull(), // Location associated with ticket (mandatory)
  categoryId: int("category_id").references(() => categories.id).notNull(),
  subcategoryId: int("subcategory_id").references(() => categories.id),
  createdById: int("created_by_id").references(() => users.id).notNull(),
  assignedToId: int("assigned_to_id").references(() => users.id),
  dueDate: timestamp("due_date"), // Adding due date for reports filtering
  attachmentUrl: text("attachment_url"), // File attachment URL
  attachmentName: text("attachment_name"), // Original file name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments on tickets
export const comments = mysqlTable("comments", {
  id: int("id").primaryKey().autoincrement(),
  ticketId: int("ticket_id").references(() => tickets.id).notNull(),
  userId: int("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// FAQs for knowledge base
export const faqs = mysqlTable("faqs", {
  id: int("id").primaryKey().autoincrement(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  categoryId: int("category_id").references(() => categories.id),
  viewCount: int("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chatbot messages for persistent chat history
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isFromBot: boolean("is_from_bot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allowed domains for registration restriction
export const allowedDomains = mysqlTable("allowed_domains", {
  id: int("id").primaryKey().autoincrement(),
  domain: text("domain").notNull().unique(),
  companyName: text("company_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdById: int("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Journey Documentation System Tables

// User Journey Templates/Types
export const journeyTemplates = mysqlTable("journey_templates", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "onboarding", "feature-workflow", "error-recovery", "admin", "returning-user"
  color: text("color").default("#3B82F6"), // Color for visual identification
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Journeys (instances of templates)
export const userJourneys = mysqlTable("user_journeys", {
  id: int("id").primaryKey().autoincrement(),
  templateId: int("template_id").references(() => journeyTemplates.id),
  title: text("title").notNull(),
  description: text("description"),
  version: text("version").default("1.0"),
  status: text("status").notNull().default("draft"), // "draft", "in-review", "approved", "archived"
  personas: json("personas").$type<string[]>().default([]), // Array of user persona names
  prerequisites: text("prerequisites"),
  entryPoints: json("entry_points").$type<string[]>().default([]), // Where users can start this journey
  successCriteria: text("success_criteria"),
  painPoints: text("pain_points"),
  improvementNotes: text("improvement_notes"),
  createdById: int("created_by_id").references(() => users.id).notNull(),
  lastUpdatedById: int("last_updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Journey Steps (the actual workflow steps)
export const journeySteps = mysqlTable("journey_steps", {
  id: int("id").primaryKey().autoincrement(),
  journeyId: int("journey_id").references(() => userJourneys.id).notNull(),
  stepNumber: int("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  userActions: json("user_actions").$type<string[]>().default([]), // Array of required user actions
  systemResponses: json("system_responses").$type<string[]>().default([]), // Array of system responses
  expectedOutcomes: json("expected_outcomes").$type<string[]>().default([]), // Array of expected outcomes
  errorScenarios: json("error_scenarios").$type<{ scenario: string, handling: string }[]>().default([]), // Error handling
  screenshotPlaceholder: text("screenshot_placeholder"), // Placeholder for screenshot/mockup
  notes: text("notes"),
  isOptional: boolean("is_optional").default(false),
  estimatedDuration: text("estimated_duration"), // e.g., "2 minutes", "30 seconds"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments and collaboration on journeys
export const journeyComments = mysqlTable("journey_comments", {
  id: int("id").primaryKey().autoincrement(),
  journeyId: int("journey_id").references(() => userJourneys.id),
  stepId: int("step_id").references(() => journeySteps.id), // Optional: comment on specific step
  userId: int("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").default("comment"), // "comment", "suggestion", "issue"
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journey exports/shares
export const journeyExports = mysqlTable("journey_exports", {
  id: int("id").primaryKey().autoincrement(),
  journeyId: int("journey_id").references(() => userJourneys.id).notNull(),
  exportType: text("export_type").notNull(), // "pdf", "markdown", "share-link"
  exportData: json("export_data").$type<any>().default({}), // Metadata about the export
  shareToken: text("share_token"), // For shareable links
  expiresAt: timestamp("expires_at"), // For shareable links
  createdById: int("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAllowedDomainSchema = createInsertSchema(allowedDomains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Journey Documentation Schema Validation
export const insertJourneyTemplateSchema = createInsertSchema(journeyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserJourneySchema = createInsertSchema(userJourneys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJourneyStepSchema = createInsertSchema(journeySteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJourneyCommentSchema = createInsertSchema(journeyComments).omit({
  id: true,
  createdAt: true,
});

export const insertJourneyExportSchema = createInsertSchema(journeyExports).omit({
  id: true,
  createdAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AllowedDomain = typeof allowedDomains.$inferSelect;
export type InsertAllowedDomain = z.infer<typeof insertAllowedDomainSchema>;

// Custom types for API responses
export type TicketWithRelations = Ticket & {
  category: Category;
  subcategory?: Category;
  createdBy: User;
  assignedTo?: User;
  comments: (Comment & { user: User })[];
};

export type DashboardStats = {
  summary: any;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  totalTickets: number;
  pendingTickets: number;
  avgResponseTime: string;
  slaComplianceRate: string;
};
