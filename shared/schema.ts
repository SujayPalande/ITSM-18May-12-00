import { pgTable, text, integer, boolean, timestamp, json, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with role-based access control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
});

// Tickets table
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
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
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  subcategoryId: integer("subcategory_id").references(() => categories.id),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  dueDate: timestamp("due_date"), // Adding due date for reports filtering
  attachmentUrl: text("attachment_url"), // File attachment URL
  attachmentName: text("attachment_name"), // Original file name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments on tickets
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// FAQs for knowledge base
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chatbot messages for persistent chat history
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isFromBot: boolean("is_from_bot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allowed domains for registration restriction
export const allowedDomains = pgTable("allowed_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  companyName: text("company_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Journey Documentation System Tables

// User Journey Templates/Types
export const journeyTemplates = pgTable("journey_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "onboarding", "feature-workflow", "error-recovery", "admin", "returning-user"
  color: text("color").default("#3B82F6"), // Color for visual identification
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Journeys (instances of templates)
export const userJourneys = pgTable("user_journeys", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => journeyTemplates.id),
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
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  lastUpdatedById: integer("last_updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Journey Steps (the actual workflow steps)
export const journeySteps = pgTable("journey_steps", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => userJourneys.id).notNull(),
  stepNumber: integer("step_number").notNull(),
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
export const journeyComments = pgTable("journey_comments", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => userJourneys.id),
  stepId: integer("step_id").references(() => journeySteps.id), // Optional: comment on specific step
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").default("comment"), // "comment", "suggestion", "issue"
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journey exports/shares
export const journeyExports = pgTable("journey_exports", {
  id: serial("id").primaryKey(),
  journeyId: integer("journey_id").references(() => userJourneys.id).notNull(),
  exportType: text("export_type").notNull(), // "pdf", "markdown", "share-link"
  exportData: json("export_data").$type<any>().default({}), // Metadata about the export
  shareToken: text("share_token"), // For shareable links
  expiresAt: timestamp("expires_at"), // For shareable links
  createdById: integer("created_by_id").references(() => users.id).notNull(),
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
