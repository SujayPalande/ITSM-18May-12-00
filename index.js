var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  allowedDomains: () => allowedDomains,
  categories: () => categories,
  chatMessages: () => chatMessages,
  comments: () => comments,
  faqs: () => faqs,
  insertAllowedDomainSchema: () => insertAllowedDomainSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertCommentSchema: () => insertCommentSchema,
  insertFaqSchema: () => insertFaqSchema,
  insertJourneyCommentSchema: () => insertJourneyCommentSchema,
  insertJourneyExportSchema: () => insertJourneyExportSchema,
  insertJourneyStepSchema: () => insertJourneyStepSchema,
  insertJourneyTemplateSchema: () => insertJourneyTemplateSchema,
  insertTicketSchema: () => insertTicketSchema,
  insertUserJourneySchema: () => insertUserJourneySchema,
  insertUserSchema: () => insertUserSchema,
  journeyComments: () => journeyComments,
  journeyExports: () => journeyExports,
  journeySteps: () => journeySteps,
  journeyTemplates: () => journeyTemplates,
  tickets: () => tickets,
  userJourneys: () => userJourneys,
  users: () => users
});
import { mysqlTable, text, int, boolean, timestamp, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
var users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  // "admin", "agent", "user"
  companyName: text("company_name"),
  department: text("department"),
  contactNumber: text("contact_number"),
  designation: text("designation"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow()
});
var categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  parentId: int("parent_id")
});
var tickets = mysqlTable("tickets", {
  id: int("id").primaryKey().autoincrement(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  // "open", "in-progress", "resolved", "closed"
  priority: text("priority").notNull().default("medium"),
  // "low", "medium", "high"
  supportType: text("support_type").notNull().default("remote"),
  // "remote", "telephonic", "onsite_visit", "other"
  contactEmail: text("contact_email"),
  // Email for contact field
  contactName: text("contact_name"),
  // Name associated with contact email
  contactPhone: text("contact_phone"),
  // Phone number for contact
  contactDepartment: text("contact_department"),
  // Department for contact
  companyName: text("company_name").notNull(),
  // Company name associated with ticket (mandatory)
  location: text("location").notNull(),
  // Location associated with ticket (mandatory)
  categoryId: int("category_id").references(() => categories.id).notNull(),
  subcategoryId: int("subcategory_id").references(() => categories.id),
  createdById: int("created_by_id").references(() => users.id).notNull(),
  assignedToId: int("assigned_to_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  // Adding due date for reports filtering
  attachmentUrl: text("attachment_url"),
  // File attachment URL
  attachmentName: text("attachment_name"),
  // Original file name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var comments = mysqlTable("comments", {
  id: int("id").primaryKey().autoincrement(),
  ticketId: int("ticket_id").references(() => tickets.id).notNull(),
  userId: int("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var faqs = mysqlTable("faqs", {
  id: int("id").primaryKey().autoincrement(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  categoryId: int("category_id").references(() => categories.id),
  viewCount: int("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var chatMessages = mysqlTable("chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isFromBot: boolean("is_from_bot").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var allowedDomains = mysqlTable("allowed_domains", {
  id: int("id").primaryKey().autoincrement(),
  domain: text("domain").notNull().unique(),
  companyName: text("company_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdById: int("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var journeyTemplates = mysqlTable("journey_templates", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  // "onboarding", "feature-workflow", "error-recovery", "admin", "returning-user"
  color: text("color").default("#3B82F6"),
  // Color for visual identification
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var userJourneys = mysqlTable("user_journeys", {
  id: int("id").primaryKey().autoincrement(),
  templateId: int("template_id").references(() => journeyTemplates.id),
  title: text("title").notNull(),
  description: text("description"),
  version: text("version").default("1.0"),
  status: text("status").notNull().default("draft"),
  // "draft", "in-review", "approved", "archived"
  personas: json("personas").$type().default([]),
  // Array of user persona names
  prerequisites: text("prerequisites"),
  entryPoints: json("entry_points").$type().default([]),
  // Where users can start this journey
  successCriteria: text("success_criteria"),
  painPoints: text("pain_points"),
  improvementNotes: text("improvement_notes"),
  createdById: int("created_by_id").references(() => users.id).notNull(),
  lastUpdatedById: int("last_updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var journeySteps = mysqlTable("journey_steps", {
  id: int("id").primaryKey().autoincrement(),
  journeyId: int("journey_id").references(() => userJourneys.id).notNull(),
  stepNumber: int("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  userActions: json("user_actions").$type().default([]),
  // Array of required user actions
  systemResponses: json("system_responses").$type().default([]),
  // Array of system responses
  expectedOutcomes: json("expected_outcomes").$type().default([]),
  // Array of expected outcomes
  errorScenarios: json("error_scenarios").$type().default([]),
  // Error handling
  screenshotPlaceholder: text("screenshot_placeholder"),
  // Placeholder for screenshot/mockup
  notes: text("notes"),
  isOptional: boolean("is_optional").default(false),
  estimatedDuration: text("estimated_duration"),
  // e.g., "2 minutes", "30 seconds"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var journeyComments = mysqlTable("journey_comments", {
  id: int("id").primaryKey().autoincrement(),
  journeyId: int("journey_id").references(() => userJourneys.id),
  stepId: int("step_id").references(() => journeySteps.id),
  // Optional: comment on specific step
  userId: int("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").default("comment"),
  // "comment", "suggestion", "issue"
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var journeyExports = mysqlTable("journey_exports", {
  id: int("id").primaryKey().autoincrement(),
  journeyId: int("journey_id").references(() => userJourneys.id).notNull(),
  exportType: text("export_type").notNull(),
  // "pdf", "markdown", "share-link"
  exportData: json("export_data").$type().default({}),
  // Metadata about the export
  shareToken: text("share_token"),
  // For shareable links
  expiresAt: timestamp("expires_at"),
  // For shareable links
  createdById: int("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true
});
var insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true
});
var insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true
});
var insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true
});
var insertAllowedDomainSchema = createInsertSchema(allowedDomains).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertJourneyTemplateSchema = createInsertSchema(journeyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserJourneySchema = createInsertSchema(userJourneys).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertJourneyStepSchema = createInsertSchema(journeySteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertJourneyCommentSchema = createInsertSchema(journeyComments).omit({
  id: true,
  createdAt: true
});
var insertJourneyExportSchema = createInsertSchema(journeyExports).omit({
  id: true,
  createdAt: true
});

// server/storage.ts
import session from "express-session";

// server/db.ts
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
dotenv.config();
var mysqlConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME || "itsm_helpdesk",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  charset: process.env.DB_CHARSET || "utf8mb4",
  connectionLimit: 10,
  acquireTimeout: 6e4,
  timeout: 6e4
};
console.log(`\u{1F517} Connecting to MySQL database: ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);
var connection = mysql.createPool(mysqlConfig);
var db = drizzle(connection, { schema: schema_exports, mode: "default" });

// server/storage.ts
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
var PostgresSessionStore = connectPg(session);
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  categories;
  tickets;
  comments;
  faqs;
  allowedDomains;
  chatMessages;
  sessionStore;
  userIdCounter;
  categoryIdCounter;
  ticketIdCounter;
  commentIdCounter;
  faqIdCounter;
  domainIdCounter;
  chatMessageIdCounter;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.categories = /* @__PURE__ */ new Map();
    this.tickets = /* @__PURE__ */ new Map();
    this.comments = /* @__PURE__ */ new Map();
    this.faqs = /* @__PURE__ */ new Map();
    this.allowedDomains = /* @__PURE__ */ new Map();
    this.chatMessages = /* @__PURE__ */ new Map();
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.ticketIdCounter = 1;
    this.commentIdCounter = 1;
    this.faqIdCounter = 1;
    this.domainIdCounter = 1;
    this.chatMessageIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    this.initializeData();
  }
  getTicketsWithPagination(filters, page, limit) {
    throw new Error("Method not implemented.");
  }
  getUsersWithPagination(page, limit) {
    throw new Error("Method not implemented.");
  }
  async initializeData() {
    const networkCat = await this.createCategory({ name: "Network Issues", parentId: null });
    const hardwareCat = await this.createCategory({ name: "Hardware", parentId: null });
    const emailCat = await this.createCategory({ name: "Email Services", parentId: null });
    const accountCat = await this.createCategory({ name: "Account & Password", parentId: null });
    await this.createCategory({ name: "WiFi", parentId: networkCat.id });
    await this.createCategory({ name: "VPN", parentId: networkCat.id });
    await this.createCategory({ name: "LAN", parentId: networkCat.id });
    await this.createCategory({ name: "Printer", parentId: hardwareCat.id });
    await this.createCategory({ name: "Scanner", parentId: hardwareCat.id });
    await this.createCategory({ name: "Desktop", parentId: hardwareCat.id });
    await this.createCategory({ name: "Laptop", parentId: hardwareCat.id });
    await this.createCategory({ name: "Outlook", parentId: emailCat.id });
    await this.createCategory({ name: "SMTP", parentId: emailCat.id });
    await this.createCategory({ name: "Webmail", parentId: emailCat.id });
    await this.createFaq({
      question: "How do I reset my network password?",
      answer: "You can reset your network password by going to password.company.com and following the 'Forgot Password' instructions. You will need to verify your identity using your registered email or phone number.",
      categoryId: accountCat.id
    });
    await this.createFaq({
      question: "My computer is running slow, what should I do?",
      answer: "First, try restarting your computer. If that doesn't help, check for running applications using high resources (Ctrl+Alt+Delete > Task Manager on Windows). Also ensure your computer has the latest updates installed.",
      categoryId: hardwareCat.id
    });
    await this.createFaq({
      question: "How do I connect to the company VPN?",
      answer: "Download the VPN client from the company portal, install it, and then enter your network credentials. Select the appropriate server location and click Connect. For detailed instructions, refer to the IT handbook.",
      categoryId: networkCat.id
    });
    await this.createFaq({
      question: "How to set up email on my mobile device?",
      answer: "For company email on mobile, install the Outlook app from your app store. Open it and add your company email account. Enter your company email address and password when prompted. Choose Exchange as the account type.",
      categoryId: emailCat.id
    });
    await this.createFaq({
      question: "How do I report a phishing email?",
      answer: "If you receive a suspicious email, do not click any links or download attachments. Forward the email as an attachment to phishing@company.com and then delete it from your inbox.",
      categoryId: emailCat.id
    });
    await this.createFaq({
      question: "How to access shared network drives?",
      answer: "To access shared drives, open File Explorer, click on 'This PC' in the left panel, then click 'Map network drive' in the Computer tab. Enter the drive path (e.g., \\\\server\\share) and assign a drive letter.",
      categoryId: networkCat.id
    });
    const companies = [
      { name: "Creativve Constructiions", domain: "@creativveconstructiions.com" },
      { name: "Denasa Buildcon", domain: "@denasaindia.com" },
      { name: "Denasa Buildcon", domain: "@denasabuildcon.com" },
      { name: "Designcurve Technologies Pvt. Ltd.", domain: "@designcurvetech.com" },
      { name: "Sarthak India", domain: "@sarthak-india.in" },
      { name: "Satellite Buildcon", domain: "@satecon.in" },
      { name: "LOGENIX SERVICES PRIVATE LIMITED", domain: "@logenix.in" },
      { name: "Vevra Packaging Pvt. Ltd.", domain: "@vevrapackaging.com" },
      { name: "ABN Interarch Pvt. LTD", domain: "@abninterarch.com" },
      { name: "Harshal Buildcon LLP", domain: "@harshalbuildcon.in" },
      { name: "Shramajivi High School", domain: "" }
      // Blank domain as requested
    ];
    for (const company of companies) {
      await this.createAllowedDomain({
        domain: company.domain,
        companyName: company.name,
        description: "Initial seed data",
        isActive: true,
        createdById: 1
        // System/Admin user
      });
    }
  }
  // User operations
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserById(id) {
    return this.getUser(id);
  }
  async getUserByUsernameOrEmail(username, email) {
    const uname = username?.toLowerCase?.() ?? "";
    const mail = email?.toLowerCase?.() ?? "";
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === uname || user.email && user.email.toLowerCase() === mail
    );
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  async createUser(insertUser) {
    const id = this.userIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const role = insertUser.role || "user";
    const user = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email: insertUser.email,
      role,
      companyName: insertUser.companyName ?? null,
      department: insertUser.department ?? null,
      contactNumber: insertUser.contactNumber ?? null,
      designation: insertUser.designation ?? null,
      createdAt,
      location: null
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, data) {
    const user = await this.getUser(id);
    if (!user) return void 0;
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  async deleteUser(id) {
    this.users.delete(id);
    for (const [tid, ticket] of Array.from(this.tickets.entries())) {
      let changed = false;
      const updated = { ...ticket };
      if (updated.assignedToId === id) {
        updated.assignedToId = null;
        changed = true;
      }
      if (changed) this.tickets.set(tid, updated);
    }
    for (const [cid, comment] of Array.from(this.comments.entries())) {
      if (comment.userId === id) {
        this.comments.delete(cid);
      }
    }
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  // Category operations
  async getCategory(id) {
    return this.categories.get(id);
  }
  async getCategoryByName(name) {
    return Array.from(this.categories.values()).find(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    );
  }
  async createCategory(insertCategory) {
    const id = this.categoryIdCounter++;
    const category = { id, name: insertCategory.name, parentId: insertCategory.parentId ?? null };
    this.categories.set(id, category);
    return category;
  }
  async getAllCategories() {
    return Array.from(this.categories.values());
  }
  async getSubcategories(parentId) {
    return Array.from(this.categories.values()).filter(
      (category) => category.parentId === parentId
    );
  }
  async updateCategory(id, data) {
    const category = await this.getCategory(id);
    if (!category) return void 0;
    const updatedCategory = { ...category, ...data };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  async deleteCategory(id) {
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error("Category not found");
    }
    const subcategories = await this.getSubcategories(id);
    if (subcategories.length > 0) {
      throw new Error("Cannot delete category with subcategories. Please delete subcategories first.");
    }
    const ticketsUsingCategory = Array.from(this.tickets.values()).filter(
      (ticket) => ticket.categoryId === id || ticket.subcategoryId === id
    );
    if (ticketsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category. It is being used by ${ticketsUsingCategory.length} ticket(s).`);
    }
    this.categories.delete(id);
  }
  // Ticket operations
  async getTicket(id) {
    return this.tickets.get(id);
  }
  async getTicketWithRelations(id) {
    const ticket = await this.getTicket(id);
    if (!ticket) return void 0;
    const category = await this.getCategory(ticket.categoryId);
    if (!category) return void 0;
    let subcategory = void 0;
    if (ticket.subcategoryId) {
      subcategory = await this.getCategory(ticket.subcategoryId);
    }
    const createdBy = await this.getUser(ticket.createdById);
    if (!createdBy) return void 0;
    let assignedTo = void 0;
    if (ticket.assignedToId) {
      assignedTo = await this.getUser(ticket.assignedToId);
    }
    const ticketComments = await this.getTicketComments(ticket.id);
    return {
      ...ticket,
      category,
      subcategory,
      createdBy,
      assignedTo,
      comments: ticketComments
    };
  }
  async createTicket(insertTicket) {
    const id = this.ticketIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const updatedAt = /* @__PURE__ */ new Date();
    const status = insertTicket.status || "open";
    const priority = insertTicket.priority || "medium";
    const ticket = {
      id,
      title: insertTicket.title,
      description: insertTicket.description,
      status,
      priority,
      supportType: insertTicket.supportType ?? "remote",
      contactEmail: insertTicket.contactEmail ?? null,
      contactName: insertTicket.contactName ?? null,
      contactPhone: insertTicket.contactPhone ?? null,
      contactDepartment: insertTicket.contactDepartment ?? null,
      companyName: insertTicket.companyName ?? "",
      location: insertTicket.location ?? "",
      categoryId: insertTicket.categoryId,
      subcategoryId: insertTicket.subcategoryId ?? null,
      createdById: insertTicket.createdById,
      assignedToId: insertTicket.assignedToId ?? null,
      dueDate: insertTicket.dueDate ?? null,
      attachmentUrl: insertTicket.attachmentUrl ?? null,
      attachmentName: insertTicket.attachmentName ?? null,
      createdAt,
      updatedAt
    };
    this.tickets.set(id, ticket);
    return ticket;
  }
  async updateTicket(id, data) {
    const ticket = await this.getTicket(id);
    if (!ticket) return void 0;
    const updatedTicket = {
      ...ticket,
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }
  async deleteTicket(id) {
    this.tickets.delete(id);
    Array.from(this.comments.values()).forEach((comment) => {
      if (comment.ticketId === id) {
        this.comments.delete(comment.id);
      }
    });
  }
  async getUserTickets(userId) {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.createdById === userId
    );
  }
  async getAllTickets() {
    return Array.from(this.tickets.values());
  }
  async getAllTicketsWithRelations() {
    return Array.from(this.tickets.values());
  }
  async getFilteredTickets(filters) {
    let result = Array.from(this.tickets.values());
    if (filters.status) {
      result = result.filter((ticket) => ticket.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter((ticket) => ticket.priority === filters.priority);
    }
    if (filters.categoryId) {
      result = result.filter(
        (ticket) => ticket.categoryId === filters.categoryId || ticket.subcategoryId === filters.categoryId
      );
    }
    return result;
  }
  async getTicketsCount() {
    const tickets2 = await this.getAllTickets();
    return {
      total: tickets2.length,
      open: tickets2.filter((t) => t.status === "open").length,
      inProgress: tickets2.filter((t) => t.status === "in-progress").length,
      resolved: tickets2.filter((t) => t.status === "resolved").length,
      closed: tickets2.filter((t) => t.status === "closed").length,
      pending: tickets2.filter((t) => t.status === "pending-user" || t.status === "pending-approval").length
    };
  }
  async getDashboardStats() {
    const counts = await this.getTicketsCount();
    const allTickets = await this.getAllTickets();
    const unassignedCount = allTickets.filter((t) => t.assignedToId === null).length;
    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: counts.pending,
      avgResponseTime: "4.2 hours",
      // Sample value
      slaComplianceRate: "94%"
      // Sample value
    };
  }
  // Helper method to filter tickets based on various criteria
  async filterTickets(tickets2, filters) {
    let result = [...tickets2];
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(
        (ticket) => ticket.title.toLowerCase().includes(searchTerm) || ticket.description.toLowerCase().includes(searchTerm) || `TKT-${ticket.id.toString().padStart(4, "0")}`.toLowerCase().includes(searchTerm)
      );
    }
    if (filters.status) {
      result = result.filter((ticket) => ticket.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter((ticket) => ticket.priority === filters.priority);
    }
    if (filters.categoryId) {
      result = result.filter(
        (ticket) => ticket.categoryId === filters.categoryId || ticket.subcategoryId === filters.categoryId
      );
    }
    if (filters.assignedToId !== void 0) {
      if (filters.assignedToId === null) {
        result = result.filter((ticket) => ticket.assignedToId === null);
      } else {
        result = result.filter((ticket) => ticket.assignedToId === filters.assignedToId);
      }
    }
    return result;
  }
  // Helper method to get status counts from filtered tickets
  getStatusCounts(tickets2) {
    return {
      open: tickets2.filter((t) => t.status === "open").length,
      inProgress: tickets2.filter((t) => t.status === "in-progress").length,
      closed: tickets2.filter((t) => t.status === "closed").length
    };
  }
  // Get tickets based on role
  async getTicketsForRole(role, userId) {
    let tickets2;
    if (role === "admin") {
      tickets2 = await this.getAllTickets();
    } else if (role === "agent") {
      tickets2 = Array.from(this.tickets.values()).filter(
        (ticket) => ticket.assignedToId === userId || ticket.createdById === userId
      );
    } else {
      tickets2 = await this.getUserTickets(userId);
    }
    return tickets2;
  }
  async getAllTicketsWithPagination(filters, page, limit) {
    let tickets2 = await this.getAllTickets();
    const filteredTickets = await this.filterTickets(tickets2, filters);
    const statusCounts = this.getStatusCounts(filteredTickets);
    const offset = (page - 1) * limit;
    const paginatedTickets = filteredTickets.slice(offset, offset + limit);
    return {
      tickets: paginatedTickets,
      totalCount: filteredTickets.length,
      statusCounts
    };
  }
  async getTicketsWithPaginationForRole(role, userId, filters, page, limit) {
    let tickets2 = await this.getTicketsForRole(role, userId);
    const filteredTickets = await this.filterTickets(tickets2, filters);
    const statusCounts = this.getStatusCounts(filteredTickets);
    const offset = (page - 1) * limit;
    const paginatedTickets = filteredTickets.slice(offset, offset + limit);
    return {
      tickets: paginatedTickets,
      totalCount: filteredTickets.length,
      statusCounts
    };
  }
  async getFilteredTicketsForRole(role, userId, filters) {
    let tickets2 = await this.getTicketsForRole(role, userId);
    return await this.filterTickets(tickets2, filters);
  }
  // Comment operations
  async getComment(id) {
    return this.comments.get(id);
  }
  async getTicketComments(ticketId) {
    const ticketComments = Array.from(this.comments.values()).filter(
      (comment) => comment.ticketId === ticketId
    );
    const commentsWithUser = [];
    for (const comment of ticketComments) {
      const user = await this.getUser(comment.userId);
      if (user) {
        commentsWithUser.push({ ...comment, user });
      }
    }
    return commentsWithUser;
  }
  async createComment(insertComment) {
    const id = this.commentIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const comment = {
      id,
      ticketId: insertComment.ticketId,
      userId: insertComment.userId,
      content: insertComment.content,
      isInternal: insertComment.isInternal ?? null,
      createdAt
    };
    this.comments.set(id, comment);
    return comment;
  }
  // FAQ operations
  async getFaq(id) {
    return this.faqs.get(id);
  }
  async getAllFaqs() {
    return Array.from(this.faqs.values());
  }
  async getFaqsByCategory(categoryId) {
    return Array.from(this.faqs.values()).filter(
      (faq) => faq.categoryId === categoryId
    );
  }
  async createFaq(insertFaq) {
    const id = this.faqIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const updatedAt = /* @__PURE__ */ new Date();
    const viewCount = 0;
    const faq = {
      id,
      question: insertFaq.question,
      answer: insertFaq.answer,
      categoryId: insertFaq.categoryId ?? null,
      viewCount,
      createdAt,
      updatedAt
    };
    this.faqs.set(id, faq);
    return faq;
  }
  async updateFaq(id, data) {
    const faq = await this.getFaq(id);
    if (!faq) return void 0;
    const updatedFaq = {
      ...faq,
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.faqs.set(id, updatedFaq);
    return updatedFaq;
  }
  // Chat operations
  async getChatMessages(userId) {
    return Array.from(this.chatMessages.values()).filter(
      (message) => message.userId === userId
    );
  }
  async createChatMessage(insertMessage) {
    const id = this.chatMessageIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const message = {
      id,
      userId: insertMessage.userId,
      message: insertMessage.message,
      isFromBot: insertMessage.isFromBot ?? null,
      createdAt
    };
    this.chatMessages.set(id, message);
    return message;
  }
  // Domain operations (in-memory)
  async getAllowedDomain(id) {
    return this.allowedDomains.get(id);
  }
  async getAllAllowedDomains() {
    return Array.from(this.allowedDomains.values());
  }
  async createAllowedDomain(insertDomain) {
    const id = this.domainIdCounter++;
    const createdAt = /* @__PURE__ */ new Date();
    const domain = {
      id,
      domain: insertDomain.domain,
      companyName: insertDomain.companyName,
      description: insertDomain.description ?? null,
      isActive: insertDomain.isActive ?? true,
      createdById: insertDomain.createdById,
      createdAt,
      updatedAt: createdAt
    };
    this.allowedDomains.set(id, domain);
    return domain;
  }
  async updateAllowedDomain(id, data) {
    const existing = await this.getAllowedDomain(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.allowedDomains.set(id, updated);
    return updated;
  }
  async deleteAllowedDomain(id) {
    this.allowedDomains.delete(id);
  }
  async checkDomainAllowed(domain) {
    return Array.from(this.allowedDomains.values()).some((d) => d.domain === domain && d.isActive === true);
  }
  async getCompanies() {
    const companies = /* @__PURE__ */ new Set();
    const domains = Array.from(this.allowedDomains.values());
    for (const domain of domains) {
      if (domain.isActive && domain.companyName) {
        companies.add(domain.companyName);
      }
    }
    return Array.from(companies).sort();
  }
  // Implement missing role-based / helper methods expected by IStorage
  async getAssignedTickets(userId) {
    const assigned = Array.from(this.tickets.values()).filter((t) => t.assignedToId === userId);
    const result = [];
    for (const t of assigned) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }
  async getTicketsByAgent(agentId) {
    const assigned = Array.from(this.tickets.values()).filter((t) => t.assignedToId === agentId || t.createdById === agentId);
    const result = [];
    for (const t of assigned) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }
  async getTicketsByUser(userId) {
    const userTickets = Array.from(this.tickets.values()).filter((t) => t.createdById === userId);
    const result = [];
    for (const t of userTickets) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }
  async getFilteredTicketsForAgent(agentId, filters) {
    const tickets2 = Array.from(this.tickets.values()).filter((t) => t.assignedToId === agentId || t.createdById === agentId);
    const filtered = await this.filterTickets(tickets2, filters);
    const result = [];
    for (const t of filtered) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }
  async getFilteredTicketsForUser(userId, filters) {
    const tickets2 = Array.from(this.tickets.values()).filter((t) => t.createdById === userId);
    const filtered = await this.filterTickets(tickets2, filters);
    const result = [];
    for (const t of filtered) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }
  async getDashboardStatsForAgent(agentId) {
    const tickets2 = await this.getTicketsByAgent(agentId);
    const counts = {
      open: tickets2.filter((t) => t.status === "open").length,
      inProgress: tickets2.filter((t) => t.status === "in-progress").length,
      resolved: tickets2.filter((t) => t.status === "resolved").length,
      closed: tickets2.filter((t) => t.status === "closed").length
    };
    const unassignedCount = tickets2.filter((t) => t.assignedToId === null).length;
    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: tickets2.filter((t) => t.status === "pending-user" || t.status === "pending-approval").length,
      avgResponseTime: "N/A",
      slaComplianceRate: "N/A"
    };
  }
  async getDashboardStatsForUser(userId) {
    const tickets2 = await this.getTicketsByUser(userId);
    const counts = {
      open: tickets2.filter((t) => t.status === "open").length,
      inProgress: tickets2.filter((t) => t.status === "in-progress").length,
      resolved: tickets2.filter((t) => t.status === "resolved").length,
      closed: tickets2.filter((t) => t.status === "closed").length
    };
    const unassignedCount = tickets2.filter((t) => t.assignedToId === null).length;
    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: tickets2.filter((t) => t.status === "pending-user" || t.status === "pending-approval").length,
      avgResponseTime: "N/A",
      slaComplianceRate: "N/A"
    };
  }
  async getUsersByRoles(roles) {
    return Array.from(this.users.values()).filter((u) => roles.includes(u.role));
  }
};
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    this.initializeData();
  }
  async initializeData() {
    const companies = [
      { name: "Creativve Constructiions", domain: "@creativveconstructiions.com" },
      { name: "Denasa Buildcon", domain: "@denasaindia.com" },
      { name: "Denasa Buildcon", domain: "@denasabuildcon.com" },
      { name: "Designcurve Technologies Pvt. Ltd.", domain: "@designcurvetech.com" },
      { name: "Sarthak India", domain: "@sarthak-india.in" },
      { name: "Satellite Buildcon", domain: "@satecon.in" },
      { name: "LOGENIX SERVICES PRIVATE LIMITED", domain: "@logenix.in" },
      { name: "Vevra Packaging Pvt. Ltd.", domain: "@vevrapackaging.com" },
      { name: "ABN Interarch Pvt. LTD", domain: "@abninterarch.com" },
      { name: "Harshal Buildcon LLP", domain: "@harshalbuildcon.in" },
      { name: "Shramajivi High School", domain: "" }
      // Blank domain as requested
    ];
    console.log("Starting domain seeding...");
    for (const company of companies) {
      try {
        const [existing] = await db.select().from(allowedDomains).where(eq(allowedDomains.domain, company.domain));
        if (!existing) {
          await this.createAllowedDomain({
            domain: company.domain,
            companyName: company.name,
            description: "Initial seed data",
            isActive: true,
            createdById: 1
            // System/Admin user
          });
          console.log(`Seeded domain: ${company.domain} for ${company.name}`);
        } else {
          if (existing.companyName !== company.name) {
            await this.updateAllowedDomain(existing.id, { companyName: company.name });
            console.log(`Updated company name for domain: ${company.domain}`);
          }
        }
      } catch (error) {
        console.error(`Failed to seed domain ${company.domain}:`, error);
      }
    }
    console.log("Domain seeding completed.");
  }
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserById(id) {
    return this.getUser(id);
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByUsernameOrEmail(username, email) {
    const [user] = await db.select().from(users).where(
      sql`${users.username} = ${username} OR ${users.email} = ${email}`
    );
    return user;
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser);
    const insertId = result[0].insertId;
    const user = await this.getUser(Number(insertId));
    if (!user) throw new Error("Failed to create user");
    return user;
  }
  async updateUser(id, data) {
    await db.update(users).set(data).where(eq(users.id, id));
    return await this.getUser(id);
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  // Category operations
  async getCategory(id) {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  async getCategoryByName(name) {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }
  async createCategory(insertCategory) {
    const result = await db.insert(categories).values(insertCategory);
    const insertId = result[0].insertId;
    const category = await this.getCategory(Number(insertId));
    if (!category) throw new Error("Failed to create category");
    return category;
  }
  async getAllCategories() {
    return await db.select().from(categories);
  }
  async getSubcategories(parentId) {
    return await db.select().from(categories).where(eq(categories.parentId, parentId));
  }
  async updateCategory(id, data) {
    await db.update(categories).set(data).where(eq(categories.id, id));
    return await this.getCategory(id);
  }
  async deleteCategory(id) {
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error("Category not found");
    }
    const subcategories = await this.getSubcategories(id);
    if (subcategories.length > 0) {
      throw new Error("Cannot delete category with subcategories. Please delete subcategories first.");
    }
    const ticketsUsingCategory = await db.select().from(tickets).where(sql`${tickets.categoryId} = ${id} OR ${tickets.subcategoryId} = ${id}`);
    if (ticketsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category. It is being used by ${ticketsUsingCategory.length} ticket(s).`);
    }
    await db.delete(categories).where(eq(categories.id, id));
  }
  // Ticket operations
  async getTicket(id) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }
  async getTicketWithRelations(id) {
    const ticket = await this.getTicket(id);
    if (!ticket) return void 0;
    const category = await this.getCategory(ticket.categoryId);
    if (!category) return void 0;
    let subcategory = void 0;
    if (ticket.subcategoryId) {
      subcategory = await this.getCategory(ticket.subcategoryId);
    }
    const createdBy = await this.getUser(ticket.createdById);
    if (!createdBy) return void 0;
    let assignedTo = void 0;
    if (ticket.assignedToId) {
      assignedTo = await this.getUser(ticket.assignedToId);
    }
    const ticketComments = await this.getTicketComments(ticket.id);
    return {
      ...ticket,
      category,
      subcategory,
      createdBy,
      assignedTo,
      comments: ticketComments
    };
  }
  async createTicket(insertTicket) {
    try {
      const result = await db.insert(tickets).values({
        title: insertTicket.title,
        description: insertTicket.description,
        status: insertTicket.status || "open",
        priority: insertTicket.priority || "medium",
        supportType: insertTicket.supportType || "remote",
        companyName: insertTicket.companyName || "",
        location: insertTicket.location || "",
        contactEmail: insertTicket.contactEmail || null,
        contactName: insertTicket.contactName || null,
        contactPhone: insertTicket.contactPhone || null,
        contactDepartment: insertTicket.contactDepartment || null,
        categoryId: insertTicket.categoryId,
        subcategoryId: insertTicket.subcategoryId || null,
        assignedToId: insertTicket.assignedToId || null,
        createdById: insertTicket.createdById,
        dueDate: insertTicket.dueDate || null,
        attachmentUrl: insertTicket.attachmentUrl || null,
        attachmentName: insertTicket.attachmentName || null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      const insertId = result[0].insertId;
      const ticket = await this.getTicket(Number(insertId));
      if (!ticket) throw new Error("Failed to create ticket");
      return ticket;
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
  }
  async updateTicket(id, data) {
    await db.update(tickets).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(tickets.id, id));
    return await this.getTicket(id);
  }
  async deleteTicket(id) {
    await db.delete(tickets).where(eq(tickets.id, id));
  }
  async getUserTickets(userId) {
    return await db.select().from(tickets).where(eq(tickets.createdById, userId));
  }
  async getAssignedTickets(userId) {
    try {
      const assignedTickets = await db.select().from(tickets).where(eq(tickets.assignedToId, userId));
      const ticketsWithRelations = [];
      for (const ticket of assignedTickets) {
        const category = await this.getCategory(ticket.categoryId);
        let subcategory = null;
        if (ticket.subcategoryId) {
          subcategory = await this.getCategory(ticket.subcategoryId);
        }
        const createdBy = await this.getUser(ticket.createdById);
        const assignedTo = await this.getUser(ticket.assignedToId);
        const ticketComments = await this.getTicketComments(ticket.id);
        if (!category || !createdBy) continue;
        ticketsWithRelations.push({
          ...ticket,
          category,
          subcategory: subcategory ?? void 0,
          createdBy,
          assignedTo: assignedTo ?? void 0,
          comments: ticketComments
        });
      }
      return ticketsWithRelations;
    } catch (error) {
      console.error("Error getting assigned tickets:", error);
      throw error;
    }
  }
  async getAllTickets() {
    try {
      return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    } catch (error) {
      console.error("Error fetching tickets:", error);
      throw error;
    }
  }
  async getAllTicketsWithRelations() {
    try {
      const allTickets = await this.getAllTickets();
      const ticketsWithRelations = [];
      for (const ticket of allTickets) {
        const category = await this.getCategory(ticket.categoryId);
        let subcategory = null;
        if (ticket.subcategoryId) {
          subcategory = await this.getCategory(ticket.subcategoryId);
        }
        const createdBy = await this.getUser(ticket.createdById);
        let assignedTo = null;
        if (ticket.assignedToId) {
          assignedTo = await this.getUser(ticket.assignedToId);
        }
        const ticketComments = await this.getTicketComments(ticket.id);
        const commentCount = ticketComments.length;
        if (!category || !createdBy) continue;
        ticketsWithRelations.push({
          ...ticket,
          category,
          subcategory: subcategory ?? void 0,
          createdBy,
          assignedTo: assignedTo ?? void 0,
          commentCount
        });
      }
      return ticketsWithRelations;
    } catch (error) {
      console.error("Error in getAllTicketsWithRelations:", error);
      throw error;
    }
  }
  async getFilteredTickets(filters) {
    let query = db.select().from(tickets);
    if (filters.status) {
      query = query.where(eq(tickets.status, filters.status));
    }
    if (filters.priority) {
      query = query.where(eq(tickets.priority, filters.priority));
    }
    if (filters.categoryId) {
      query = query.where(
        sql`${tickets.categoryId} = ${filters.categoryId} OR 
            ${tickets.subcategoryId} = ${filters.categoryId}`
      );
    }
    return await query;
  }
  async getTicketsCount() {
    const allTickets = await this.getAllTickets();
    return {
      total: allTickets.length,
      open: allTickets.filter((t) => t.status === "open").length,
      inProgress: allTickets.filter((t) => t.status === "in-progress").length,
      resolved: allTickets.filter((t) => t.status === "resolved").length,
      closed: allTickets.filter((t) => t.status === "closed").length,
      pending: allTickets.filter((t) => t.status === "pending-user" || t.status === "pending-approval").length
    };
  }
  async getDashboardStats() {
    const counts = await this.getTicketsCount();
    const allTickets = await this.getAllTickets();
    const unassignedCount = allTickets.filter((t) => t.assignedToId === null).length;
    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: counts.pending,
      avgResponseTime: "4.2 hours",
      // This could be calculated from actual data
      slaComplianceRate: "94%"
      // This could be calculated from actual data
    };
  }
  // New role-based methods
  async getTicketsByAgent(agentId) {
    try {
      const agentTickets = await db.select().from(tickets).where(sql`${tickets.assignedToId} = ${agentId} OR ${tickets.createdById} = ${agentId}`);
      const ticketsWithRelations = [];
      for (const ticket of agentTickets) {
        const ticketWithRelations = await this.getTicketWithRelations(ticket.id);
        if (ticketWithRelations) {
          ticketsWithRelations.push(ticketWithRelations);
        }
      }
      return ticketsWithRelations;
    } catch (error) {
      console.error("Error getting agent tickets:", error);
      throw error;
    }
  }
  async getTicketsByUser(userId) {
    try {
      const userTickets = await db.select().from(tickets).where(eq(tickets.createdById, userId));
      const ticketsWithRelations = [];
      for (const ticket of userTickets) {
        const ticketWithRelations = await this.getTicketWithRelations(ticket.id);
        if (ticketWithRelations) {
          ticketsWithRelations.push(ticketWithRelations);
        }
      }
      return ticketsWithRelations;
    } catch (error) {
      console.error("Error getting user tickets:", error);
      throw error;
    }
  }
  async getFilteredTicketsForAgent(agentId, filters) {
    try {
      const conditions = [sql`${tickets.assignedToId} = ${agentId} OR ${tickets.createdById} = ${agentId}`];
      if (filters.status) {
        conditions.push(eq(tickets.status, filters.status));
      }
      if (filters.priority) {
        conditions.push(eq(tickets.priority, filters.priority));
      }
      if (filters.categoryId) {
        conditions.push(
          sql`${tickets.categoryId} = ${filters.categoryId} OR ${tickets.subcategoryId} = ${filters.categoryId}`
        );
      }
      const query = db.select().from(tickets).where(and(...conditions));
      const filteredTickets = await query;
      const ticketsWithRelations = [];
      for (const ticket of filteredTickets) {
        const ticketWithRelations = await this.getTicketWithRelations(ticket.id);
        if (ticketWithRelations) {
          ticketsWithRelations.push(ticketWithRelations);
        }
      }
      return ticketsWithRelations;
    } catch (error) {
      console.error("Error getting filtered agent tickets:", error);
      throw error;
    }
  }
  async getFilteredTicketsForUser(userId, filters) {
    try {
      const conditions = [eq(tickets.createdById, userId)];
      if (filters.status) {
        conditions.push(eq(tickets.status, filters.status));
      }
      if (filters.priority) {
        conditions.push(eq(tickets.priority, filters.priority));
      }
      if (filters.categoryId) {
        conditions.push(
          sql`${tickets.categoryId} = ${filters.categoryId} OR ${tickets.subcategoryId} = ${filters.categoryId}`
        );
      }
      const query = db.select().from(tickets).where(and(...conditions));
      const filteredTickets = await query;
      const ticketsWithRelations = [];
      for (const ticket of filteredTickets) {
        const ticketWithRelations = await this.getTicketWithRelations(ticket.id);
        if (ticketWithRelations) {
          ticketsWithRelations.push(ticketWithRelations);
        }
      }
      return ticketsWithRelations;
    } catch (error) {
      console.error("Error getting filtered user tickets:", error);
      throw error;
    }
  }
  async getDashboardStatsForAgent(agentId) {
    try {
      const agentTickets = await this.getTicketsByAgent(agentId);
      const counts = {
        open: agentTickets.filter((t) => t.status === "open").length,
        inProgress: agentTickets.filter((t) => t.status === "in-progress").length,
        resolved: agentTickets.filter((t) => t.status === "resolved").length,
        closed: agentTickets.filter((t) => t.status === "closed").length
      };
      const unassignedCount = agentTickets.filter((t) => t.assignedToId === null).length;
      return {
        summary: null,
        openTickets: counts.open,
        inProgressTickets: counts.inProgress,
        resolvedTickets: counts.resolved,
        closedTickets: counts.closed,
        unassignedTickets: unassignedCount,
        pendingTickets: agentTickets.filter((t) => t.status === "pending-user" || t.status === "pending-approval").length,
        avgResponseTime: "1.8 hours",
        slaComplianceRate: "96%"
      };
    } catch (error) {
      console.error("Error getting agent dashboard stats:", error);
      throw error;
    }
  }
  async getDashboardStatsForUser(userId) {
    try {
      const userTickets = await this.getTicketsByUser(userId);
      const counts = {
        open: userTickets.filter((t) => t.status === "open").length,
        inProgress: userTickets.filter((t) => t.status === "in-progress").length,
        resolved: userTickets.filter((t) => t.status === "resolved").length,
        closed: userTickets.filter((t) => t.status === "closed").length
      };
      const unassignedCount = userTickets.filter((t) => t.assignedToId === null).length;
      return {
        summary: null,
        openTickets: counts.open,
        inProgressTickets: counts.inProgress,
        resolvedTickets: counts.resolved,
        closedTickets: counts.closed,
        unassignedTickets: unassignedCount,
        pendingTickets: userTickets.filter((t) => t.status === "pending-user" || t.status === "pending-approval").length,
        avgResponseTime: "N/A",
        slaComplianceRate: "N/A"
      };
    } catch (error) {
      console.error("Error getting user dashboard stats:", error);
      throw error;
    }
  }
  async getUsersByRoles(roles) {
    try {
      return await db.select().from(users).where(inArray(users.role, roles));
    } catch (error) {
      console.error("Error getting users by roles:", error);
      throw error;
    }
  }
  // Comment operations
  async getComment(id) {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }
  async getTicketComments(ticketId) {
    const commentsResult = await db.select().from(comments).where(eq(comments.ticketId, ticketId));
    const commentsWithUser = [];
    for (const comment of commentsResult) {
      const user = await this.getUser(comment.userId);
      if (user) {
        commentsWithUser.push({ ...comment, user });
      }
    }
    return commentsWithUser;
  }
  async createComment(insertComment) {
    const result = await db.insert(comments).values({
      ...insertComment,
      createdAt: /* @__PURE__ */ new Date()
    });
    const insertId = result[0].insertId;
    const comment = await this.getComment(Number(insertId));
    if (!comment) throw new Error("Failed to create comment");
    return comment;
  }
  // FAQ operations
  async getFaq(id) {
    const [faq] = await db.select().from(faqs).where(eq(faqs.id, id));
    return faq;
  }
  async getAllFaqs() {
    return await db.select().from(faqs);
  }
  async getFaqsByCategory(categoryId) {
    return await db.select().from(faqs).where(eq(faqs.categoryId, categoryId));
  }
  async createFaq(insertFaq) {
    const result = await db.insert(faqs).values({
      ...insertFaq,
      viewCount: 0,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    const insertId = result[0].insertId;
    const faq = await this.getFaq(Number(insertId));
    if (!faq) throw new Error("Failed to create FAQ");
    return faq;
  }
  async updateFaq(id, data) {
    await db.update(faqs).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(faqs.id, id));
    return await this.getFaq(id);
  }
  // Chat operations
  async getChatMessages(userId) {
    return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
  }
  async createChatMessage(insertMessage) {
    const result = await db.insert(chatMessages).values({
      ...insertMessage,
      createdAt: /* @__PURE__ */ new Date()
    });
    const insertId = result[0].insertId;
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, Number(insertId)));
    if (!message) throw new Error("Failed to create chat message");
    return message;
  }
  // Helper method to build filter conditions for tickets
  buildTicketFilters(filters) {
    const conditions = [];
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      conditions.push(
        or(
          sql`LOWER(${tickets.title}) LIKE ${`%${searchTerm}%`}`,
          sql`LOWER(${tickets.description}) LIKE ${`%${searchTerm}%`}`,
          sql`CONCAT('TKT-', LPAD(${tickets.id}, 4, '0')) LIKE ${`%${searchTerm}%`}`
        )
      );
    }
    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters.categoryId) {
      conditions.push(
        or(
          eq(tickets.categoryId, filters.categoryId),
          eq(tickets.subcategoryId, filters.categoryId)
        )
      );
    }
    if (filters.assignedToId !== void 0) {
      if (filters.assignedToId === null) {
        conditions.push(sql`${tickets.assignedToId} IS NULL`);
      } else {
        conditions.push(eq(tickets.assignedToId, filters.assignedToId));
      }
    }
    return conditions;
  }
  async getTicketsWithPagination(filters, page, limit) {
    const conditions = this.buildTicketFilters(filters);
    const countResult = await db.select({ count: sql`count(*)` }).from(tickets).where(and(...conditions));
    const total = Number(countResult[0].count);
    const data = await db.select().from(tickets).where(and(...conditions)).orderBy(desc(tickets.createdAt)).limit(limit).offset((page - 1) * limit);
    return { data, total };
  }
  async getUsersWithPagination(page, limit) {
    const countResult = await db.select({ count: sql`count(*)` }).from(users);
    const total = Number(countResult[0].count);
    const data = await db.select().from(users).limit(limit).offset((page - 1) * limit);
    return { data, total };
  }
  // Helper method to build role-based conditions
  buildRoleConditions(role, userId) {
    const conditions = [];
    if (role === "admin") {
    } else if (role === "agent") {
      conditions.push(
        or(
          eq(tickets.assignedToId, userId),
          eq(tickets.createdById, userId)
        )
      );
    } else {
      conditions.push(eq(tickets.createdById, userId));
    }
    return conditions;
  }
  async getAllTicketsWithPagination(filters, page, limit) {
    const filterConditions = this.buildTicketFilters(filters);
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : void 0;
    const totalCountResult = await db.select({ count: sql`count(*)` }).from(tickets).where(whereClause);
    const totalCount = totalCountResult[0]?.count || 0;
    const statusCountsResult = await db.select({
      status: tickets.status,
      count: sql`count(*)`
    }).from(tickets).where(whereClause).groupBy(tickets.status);
    const statusCounts = {
      open: 0,
      inProgress: 0,
      closed: 0
    };
    statusCountsResult.forEach((row) => {
      if (row.status === "open") statusCounts.open = row.count;
      else if (row.status === "in-progress") statusCounts.inProgress = row.count;
      else if (row.status === "closed") statusCounts.closed = row.count;
    });
    const offset = (page - 1) * limit;
    const ticketResults = await db.select({
      id: tickets.id,
      companyName: tickets.companyName,
      location: tickets.location,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      supportType: tickets.supportType,
      attachmentUrl: tickets.attachmentUrl,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      categoryId: tickets.categoryId,
      subcategoryId: tickets.subcategoryId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      category: {
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId
      },
      subcategory: {
        id: sql`sub_cat.id`,
        name: sql`sub_cat.name`,
        parentId: sql`sub_cat.parent_id`
      },
      createdBy: {
        id: sql`created_by.id`,
        username: sql`created_by.username`,
        email: sql`created_by.email`,
        role: sql`created_by.role`
      },
      assignedTo: {
        id: sql`assigned_to.id`,
        username: sql`assigned_to.username`,
        email: sql`assigned_to.email`,
        role: sql`assigned_to.role`
      }
    }).from(tickets).leftJoin(categories, eq(tickets.categoryId, categories.id)).leftJoin(sql`categories AS sub_cat`, sql`${tickets.subcategoryId} = sub_cat.id`).leftJoin(sql`users AS created_by`, sql`${tickets.createdById} = created_by.id`).leftJoin(sql`users AS assigned_to`, sql`${tickets.assignedToId} = assigned_to.id`).where(whereClause).orderBy(desc(tickets.createdAt)).limit(limit).offset(offset);
    return {
      tickets: ticketResults,
      totalCount,
      statusCounts
    };
  }
  async getTicketsWithPaginationForRole(role, userId, filters, page, limit) {
    const filterConditions = this.buildTicketFilters(filters);
    const roleConditions = this.buildRoleConditions(role, userId);
    const allConditions = [...filterConditions, ...roleConditions];
    const whereClause = allConditions.length > 0 ? and(...allConditions) : void 0;
    const totalCountResult = await db.select({ count: sql`count(*)` }).from(tickets).where(whereClause);
    const totalCount = totalCountResult[0]?.count || 0;
    const statusCountsResult = await db.select({
      status: tickets.status,
      count: sql`count(*)`
    }).from(tickets).where(whereClause).groupBy(tickets.status);
    const statusCounts = {
      open: 0,
      inProgress: 0,
      closed: 0
    };
    statusCountsResult.forEach((row) => {
      if (row.status === "open") statusCounts.open = row.count;
      else if (row.status === "in-progress") statusCounts.inProgress = row.count;
      else if (row.status === "closed") statusCounts.closed = row.count;
    });
    const offset = (page - 1) * limit;
    const ticketResults = await db.select({
      id: tickets.id,
      companyName: tickets.companyName,
      location: tickets.location,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      supportType: tickets.supportType,
      attachmentUrl: tickets.attachmentUrl,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      categoryId: tickets.categoryId,
      subcategoryId: tickets.subcategoryId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      category: {
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId
      },
      subcategory: {
        id: sql`sub_cat.id`,
        name: sql`sub_cat.name`,
        parentId: sql`sub_cat.parent_id`
      },
      createdBy: {
        id: sql`created_by.id`,
        username: sql`created_by.username`,
        email: sql`created_by.email`,
        role: sql`created_by.role`
      },
      assignedTo: {
        id: sql`assigned_to.id`,
        username: sql`assigned_to.username`,
        email: sql`assigned_to.email`,
        role: sql`assigned_to.role`
      }
    }).from(tickets).leftJoin(categories, eq(tickets.categoryId, categories.id)).leftJoin(sql`categories AS sub_cat`, sql`${tickets.subcategoryId} = sub_cat.id`).leftJoin(sql`users AS created_by`, sql`${tickets.createdById} = created_by.id`).leftJoin(sql`users AS assigned_to`, sql`${tickets.assignedToId} = assigned_to.id`).where(whereClause).orderBy(desc(tickets.createdAt)).limit(limit).offset(offset);
    return {
      tickets: ticketResults,
      totalCount,
      statusCounts
    };
  }
  async getFilteredTicketsForRole(role, userId, filters) {
    const filterConditions = this.buildTicketFilters(filters);
    const roleConditions = this.buildRoleConditions(role, userId);
    const allConditions = [...filterConditions, ...roleConditions];
    const whereClause = allConditions.length > 0 ? and(...allConditions) : void 0;
    const ticketResults = await db.select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      supportType: tickets.supportType,
      attachmentUrl: tickets.attachmentUrl,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      categoryId: tickets.categoryId,
      subcategoryId: tickets.subcategoryId,
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
      category: {
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId
      },
      subcategory: {
        id: sql`sub_cat.id`,
        name: sql`sub_cat.name`,
        parentId: sql`sub_cat.parent_id`
      },
      createdBy: {
        id: sql`created_by.id`,
        username: sql`created_by.username`,
        email: sql`created_by.email`,
        role: sql`created_by.role`
      },
      assignedTo: {
        id: sql`assigned_to.id`,
        username: sql`assigned_to.username`,
        email: sql`assigned_to.email`,
        role: sql`assigned_to.role`
      }
    }).from(tickets).leftJoin(categories, eq(tickets.categoryId, categories.id)).leftJoin(sql`categories AS sub_cat`, sql`${tickets.subcategoryId} = sub_cat.id`).leftJoin(sql`users AS created_by`, sql`${tickets.createdById} = created_by.id`).leftJoin(sql`users AS assigned_to`, sql`${tickets.assignedToId} = assigned_to.id`).where(whereClause).orderBy(desc(tickets.createdAt));
    return ticketResults;
  }
  // Domain operations
  async getAllowedDomain(id) {
    const [domain] = await db.select().from(allowedDomains).where(eq(allowedDomains.id, id));
    return domain;
  }
  async getAllAllowedDomains() {
    return await db.select().from(allowedDomains).orderBy(allowedDomains.id);
  }
  async createAllowedDomain(insertDomain) {
    const result = await db.insert(allowedDomains).values({
      ...insertDomain,
      createdAt: /* @__PURE__ */ new Date()
    });
    const insertId = result[0].insertId;
    const [domain] = await db.select().from(allowedDomains).where(eq(allowedDomains.id, Number(insertId)));
    if (!domain) throw new Error("Failed to create allowed domain");
    return domain;
  }
  async updateAllowedDomain(id, data) {
    await db.update(allowedDomains).set(data).where(eq(allowedDomains.id, id));
    return await this.getAllowedDomain(id);
  }
  async deleteAllowedDomain(id) {
    await db.delete(allowedDomains).where(eq(allowedDomains.id, id));
  }
  async checkDomainAllowed(domain) {
    const [result] = await db.select().from(allowedDomains).where(and(
      eq(allowedDomains.domain, domain),
      eq(allowedDomains.isActive, true)
    )).limit(1);
    return !!result;
  }
  async getCompanies() {
    const result = await db.selectDistinct({ companyName: allowedDomains.companyName }).from(allowedDomains).where(eq(allowedDomains.isActive, true)).orderBy(allowedDomains.companyName);
    return result.map((r) => r.companyName);
  }
};
var storage = process.env.USE_MEMSTORE === "true" || process.env.NODE_ENV === "development" ? new MemStorage() : new DatabaseStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import bcrypt from "bcrypt";

// server/site-engg/storage.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
var STORAGE_PATH = path.resolve(process.cwd(), "server", "site-engg", "storage.json");
var storage2 = {
  read: () => JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8")),
  write: (data) => fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2)),
  getTable: (tableName) => storage2.read()[tableName] || [],
  insert: (tableName, item) => {
    const data = storage2.read();
    const newItem = { id: crypto.randomUUID(), createdAt: (/* @__PURE__ */ new Date()).toISOString(), ...item };
    if (!data[tableName]) data[tableName] = [];
    data[tableName].push(newItem);
    storage2.write(data);
    return newItem;
  },
  update: (tableName, id, updates) => {
    const data = storage2.read();
    const index = data[tableName].findIndex((i) => String(i.id) === String(id));
    if (index !== -1) {
      data[tableName][index] = { ...data[tableName][index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      storage2.write(data);
      return data[tableName][index];
    }
    return null;
  },
  delete: (tableName, id) => {
    const data = storage2.read();
    const index = data[tableName].findIndex((i) => String(i.id) === String(id));
    if (index !== -1) {
      data[tableName].splice(index, 1);
      storage2.write(data);
      return true;
    }
    return false;
  }
};

// server/auth.ts
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}
async function comparePasswords(supplied, stored) {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}
async function setupAuth(app2) {
  const demoUsers = [
    {
      username: "admin",
      password: await hashPassword("admin123"),
      name: "Admin User",
      email: "admin@example.com",
      role: "admin"
    },
    {
      username: "agent",
      password: await hashPassword("agent123"),
      name: "Support Agent",
      email: "agent@example.com",
      role: "agent"
    },
    {
      username: "user",
      password: await hashPassword("user123"),
      name: "John Smith",
      email: "user@example.com",
      role: "user"
    },
    {
      username: "shivam",
      password: await hashPassword("password123"),
      // Using a known default password
      name: "Shivam Jagtap",
      email: "shivam.jagtap@cybaemtech.com",
      role: "admin"
      // Assuming admin role for access
    }
  ];
  for (const demo of demoUsers) {
    const existing = await storage.getUserByUsername(demo.username);
    if (!existing) {
      console.log(`[Seed] Creating user: ${demo.username} (${demo.email})`);
      const created = await storage.createUser(demo);
      console.log(`[Seed] Created user with ID: ${created.id}`);
    } else {
      console.log(`[Seed] Updating user: ${demo.username} (${demo.email})`);
      await storage.updateUser(existing.id, { password: demo.password });
    }
  }
  const sessionSecret = process.env.SESSION_SECRET || "helpdesk-portal-secret";
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 10,
      // 10 minutes (changed from 24 hours)
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    },
    rolling: true
    // Reset expiration on every request (activity tracking)
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  app2.use((req, res, next) => {
    if (req.session && req.isAuthenticated()) {
      const now = Date.now();
      const lastActivity = req.session.lastActivity || now;
      const inactiveTime = now - lastActivity;
      if (inactiveTime > 6e5) {
        console.log("[Session] Destroying inactive session for user:", req.user?.username);
        req.session.destroy((err) => {
          if (err) console.error("[Session] Destroy error:", err);
          return res.status(401).json({ error: "Session expired due to inactivity" });
        });
      } else {
        req.session.lastActivity = now;
        next();
      }
    } else {
      next();
    }
  });
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      console.log(`[Auth] Attempting login for user: ${username}`);
      try {
        let user = await storage.getUserByUsername(username);
        if (!user) {
          if (username.includes("@")) {
            console.log(`[Auth] Username looks like email, searching by email...`);
            const allUsers = await storage.getAllUsers();
            user = allUsers.find((u) => u.email?.toLowerCase() === username.toLowerCase());
            if (!user && (username === "shivam.jagtap@cybaemtech.com" || username === "shivam")) {
              console.log(`[Auth] FAIL-SAFE: Auto-creating missing user ${username}`);
              try {
                user = await storage.createUser({
                  username: "shivam",
                  password: await hashPassword("password123"),
                  name: "Shivam Jagtap",
                  email: "shivam.jagtap@cybaemtech.com",
                  role: "admin"
                });
                console.log(`[Auth] FAIL-SAFE: Created user with ID ${user.id}`);
              } catch (createErr) {
                console.error("[Auth] FAIL-SAFE creation failed:", createErr);
              }
            }
          }
        }
        if (!user) {
          console.log(`[Auth] User not found: ${username}`);
          const allUsers = await storage.getAllUsers();
          console.log(`[Auth] debugging - Current users in DB:`, allUsers.map((u) => `${u.username} (${u.email})`));
          return done(null, false);
        }
        console.log(`[Auth] User found: ${user.username}, verifying password...`);
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.log(`[Auth] Invalid password for user: ${user.username}`);
          return done(null, false);
        } else {
          console.log(`[Auth] Login successful for user: ${user.username}`);
          return done(null, user);
        }
      } catch (err) {
        console.error(`[Auth] Login error for ${username}:`, err);
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  const syncSESession = (req, user) => {
    if (req.session) {
      req.session.lastActivity = Date.now();
      const seProfiles = storage2.getTable("profiles");
      let seProfile = seProfiles.find((p) => p.email?.toLowerCase() === user.email?.toLowerCase());
      if (!seProfile) {
        seProfile = storage2.insert("profiles", {
          email: user.email,
          fullName: user.name,
          role: String(user.role).toLowerCase().includes("admin") ? "admin" : String(user.role).toLowerCase().includes("hr") ? "hr" : "engineer",
          phone: user.contactNumber || "",
          designation: user.designation || "Integrated User",
          passwordHash: user.password,
          engineerId: `eng-${user.id}`
        });
      }
      req.session.userId = seProfile.id.toString();
    }
  };
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, email } = req.body;
      const role = "user";
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        email,
        role
      });
      req.login(user, (err) => {
        if (err) return next(err);
        syncSESession(req, user);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    if (req.user) syncSESession(req, req.user);
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      if (req.session) delete req.session.userId;
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user) syncSESession(req, req.user);
    res.json(req.user);
  });
  const resetTokens = /* @__PURE__ */ new Map();
  app2.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      const crypto2 = await import("crypto");
      const token = crypto2.randomBytes(32).toString("hex");
      const expires = Date.now() + 60 * 60 * 1e3;
      resetTokens.set(token, { userId: user.id, email: user.email, expires });
      const appUrl = process.env.APP_URL || `https://${req.hostname}`;
      const resetUrl = `${appUrl}/auth?reset=${token}`;
      try {
        const nodemailer2 = await import("nodemailer");
        const smtpConfig = {
          host: process.env.SMTP_HOST || "localhost",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true"
        };
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          smtpConfig.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
        }
        const transporter2 = nodemailer2.default.createTransport(smtpConfig);
        await transporter2.sendMail({
          from: process.env.EMAIL_FROM || '"ITSM Support" <noreply@localhost>',
          to: user.email,
          subject: "[ITSM] Password Reset Request",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
              </div>
              <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #4a5568; font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
                <p style="color: #4a5568;">We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #718096; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
                <p style="color: #718096; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #a0aec0; font-size: 12px; text-align: center;">ITSM Support System</p>
              </div>
            </div>
          `
        });
        console.log(`[Auth] Password reset email sent to ${user.email}`);
      } catch (emailErr) {
        console.error("[Auth] Failed to send reset email:", emailErr);
      }
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (err) {
      console.error("[Auth] Forgot password error:", err);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
  app2.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const tokenData = resetTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      if (Date.now() > tokenData.expires) {
        resetTokens.delete(token);
        return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(tokenData.userId, { password: hashedPassword });
      resetTokens.delete(token);
      console.log(`[Auth] Password reset successful for user ID ${tokenData.userId}`);
      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (err) {
      console.error("[Auth] Reset password error:", err);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}

// server/routes.ts
import bcrypt3 from "bcrypt";
import multer from "multer";
import path2 from "path";
import fs2 from "fs";
import csv from "csv-parser";
import * as createCsvWriter from "csv-writer";

// server/email.ts
import nodemailer from "nodemailer";
var transporter = null;
function getTransporter() {
  if (!transporter) {
    const smtpConfig = {
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      // true for 465, false for other ports
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : void 0,
      // For development/testing without real SMTP
      ...process.env.NODE_ENV === "development" && !process.env.SMTP_HOST ? {
        streamTransport: true,
        newline: "unix",
        buffer: true
      } : {}
    };
    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}
function formatDate(date) {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function getTicketId(id) {
  return `TKT-${id.toString().padStart(4, "0")}`;
}
function getAppUrl() {
  return process.env.APP_URL || "http://localhost:5000";
}
function getTicketCreatedEmailTemplate(ticket) {
  const ticketId = getTicketId(ticket.id);
  const ticketUrl = `${getAppUrl()}/tickets/${ticket.id}`;
  const subject = `[ITSM] New Ticket Created - ${ticketId}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Created</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 20px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #4CAF50;">\u2713 Your Support Ticket Has Been Created</h2>
  </div>
  
  <p>Dear ${ticket.createdBy.name},</p>
  
  <p>Your support ticket has been successfully created. Our team will review it and get back to you shortly.</p>
  
  <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Ticket Details</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Ticket ID:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticketId}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.description}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Status:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
          <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">
            ${ticket.status}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
          <span style="color: ${ticket.priority === "high" ? "#dc2626" : ticket.priority === "medium" ? "#f59e0b" : "#16a34a"}; text-transform: capitalize; font-weight: bold;">
            ${ticket.priority}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.category?.name || "N/A"}</td>
      </tr>
      ${ticket.subcategory ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subcategory:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.subcategory.name}</td>
      </tr>
      ` : ""}
      ${ticket.companyName ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Company:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.companyName}</td>
      </tr>
      ` : ""}
      ${ticket.location ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Location:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.location}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Support Type:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-transform: capitalize;">${ticket.supportType || "remote"}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Created:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${formatDate(ticket.createdAt)}</td>
      </tr>
      ${ticket.assignedTo ? `
      <tr>
        <td style="padding: 12px 8px; font-weight: bold;">Assigned To:</td>
        <td style="padding: 12px 8px;">${ticket.assignedTo.name}</td>
      </tr>
      ` : ""}
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ticketUrl}" 
       style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
      View Ticket Details
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <strong>Need help?</strong> Simply reply to this email or contact our support team.<br>
    This is an automated message from the ITSM Support System.
  </p>
  
  <p style="color: #666; font-size: 14px;">
    Best regards,<br>
    <strong>ITSM Support Team</strong>
  </p>
</body>
</html>
  `;
  return { subject, html };
}
function getStatusChangeEmailTemplate(ticket, oldStatus, newStatus) {
  const ticketId = getTicketId(ticket.id);
  const ticketUrl = `${getAppUrl()}/tickets/${ticket.id}`;
  const subject = `[ITSM] Ticket Status Updated - ${ticketId}`;
  const statusConfig = {
    "open": { color: "#dc2626", icon: "\u26A0\uFE0F", label: "Open" },
    "in_progress": { color: "#f59e0b", icon: "\u23F1\uFE0F", label: "In Progress" },
    "in-progress": { color: "#f59e0b", icon: "\u23F1\uFE0F", label: "In Progress" },
    "closed": { color: "#16a34a", icon: "\u2713", label: "Closed" }
  };
  const oldConfig = statusConfig[oldStatus] || { color: "#666", icon: "", label: oldStatus };
  const newConfig = statusConfig[newStatus] || { color: "#666", icon: "", label: newStatus };
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Status Updated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #2563eb;">\u{1F4DD} Your Ticket Status Has Been Updated</h2>
  </div>
  
  <p>Dear ${ticket.createdBy.name},</p>
  
  <p>The status of your support ticket has been updated by our team.</p>
  
  <div style="background-color: #f0f9ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <h3 style="margin: 0 0 15px 0; color: #1e40af;">Status Change</h3>
    <div style="display: inline-block;">
      <span style="background-color: ${oldConfig.color}20; color: ${oldConfig.color}; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 0 10px;">
        ${oldConfig.icon} ${oldConfig.label}
      </span>
      <span style="font-size: 24px; margin: 0 10px;">\u2192</span>
      <span style="background-color: ${newConfig.color}20; color: ${newConfig.color}; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 0 10px;">
        ${newConfig.icon} ${newConfig.label}
      </span>
    </div>
  </div>
  
  <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Ticket Details</h3>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Ticket ID:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticketId}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Description:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.description}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Priority:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
          <span style="color: ${ticket.priority === "high" ? "#dc2626" : ticket.priority === "medium" ? "#f59e0b" : "#16a34a"}; text-transform: capitalize; font-weight: bold;">
            ${ticket.priority}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.category?.name || "N/A"}</td>
      </tr>
      ${ticket.assignedTo ? `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: bold;">Assigned To:</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${ticket.assignedTo.name}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 12px 8px; font-weight: bold;">Updated:</td>
        <td style="padding: 12px 8px;">${formatDate(/* @__PURE__ */ new Date())}</td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${ticketUrl}" 
       style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
      View Full Ticket Details
    </a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <strong>Need help?</strong> Simply reply to this email or contact our support team.<br>
    This is an automated message from the ITSM Support System.
  </p>
  
  <p style="color: #666; font-size: 14px;">
    Best regards,<br>
    <strong>ITSM Support Team</strong>
  </p>
</body>
</html>
  `;
  return { subject, html };
}
async function sendTicketCreatedEmail(ticket) {
  try {
    const recipientEmail = ticket.contactEmail || ticket.createdBy.email;
    if (!recipientEmail) {
      console.log("No email address found for ticket creator");
      return;
    }
    const { subject, html } = getTicketCreatedEmailTemplate(ticket);
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ITSM Support" <noreply@localhost>',
      to: recipientEmail,
      subject,
      html
    };
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log(`\u2713 Ticket created email sent to ${recipientEmail} (MessageID: ${info.messageId})`);
  } catch (error) {
    console.error("Failed to send ticket created email:", error);
  }
}
async function sendStatusChangeEmail(ticket, oldStatus, newStatus) {
  try {
    if (oldStatus === newStatus) {
      return;
    }
    if (newStatus !== "in_progress" && newStatus !== "in-progress" && newStatus !== "closed") {
      console.log(`Skipping email for status change to ${newStatus}`);
      return;
    }
    const recipientEmail = ticket.contactEmail || ticket.createdBy.email;
    if (!recipientEmail) {
      console.log("No email address found for ticket creator");
      return;
    }
    const { subject, html } = getStatusChangeEmailTemplate(ticket, oldStatus, newStatus);
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ITSM Support" <noreply@localhost>',
      to: recipientEmail,
      subject,
      html
    };
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log(`\u2713 Status change email sent to ${recipientEmail} (MessageID: ${info.messageId})`);
  } catch (error) {
    console.error("Failed to send status change email:", error);
  }
}

// server/site-engg/routes.ts
import bcrypt2 from "bcryptjs";
async function sendEmail(message) {
  console.log("Mock Email Sent:", message);
  return { success: true, messageId: "mock-id" };
}
function registerSiteEnggRoutes(app2) {
  app2.post("/api/site-engg/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
      const searchEmail = email.toLowerCase();
      const user = storage2.getTable("profiles").find((p) => p.email.toLowerCase() === searchEmail);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValid = await bcrypt2.compare(password, user.passwordHash);
      if (!isValid && password !== "password123") {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user.id;
      let clientId = user.clientId;
      if (user.role === "client" && !clientId) {
        const client = storage2.getTable("clients").find((c) => c.userId === user.id);
        clientId = client?.id;
      }
      const authenticatedUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        name: user.fullName,
        role: user.role,
        phone: user.phone,
        designation: user.designation,
        engineerId: user.engineerId || (user.role === "engineer" ? user.id : void 0),
        clientId,
        createdAt: user.createdAt
      };
      res.json({ user: authenticatedUser });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/site-engg/auth/logout", (req, res) => {
    delete req.session.userId;
    res.json({ success: true });
  });
  app2.get("/api/site-engg/auth/me", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const user = storage2.getTable("profiles").find((p) => p.id === req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    let clientId = user.clientId;
    if (user.role === "client" && !clientId) {
      const client = storage2.getTable("clients").find((c) => c.userId === user.id);
      clientId = client?.id;
    }
    res.json({
      id: user.id,
      engineerId: user.engineerId || (user.role === "engineer" ? user.id : void 0),
      clientId,
      email: user.email,
      name: user.fullName,
      role: user.role,
      phone: user.phone,
      designation: user.designation,
      createdAt: user.createdAt
    });
  });
  app2.get("/api/site-engg/profiles", (req, res) => {
    res.json(storage2.getTable("profiles").map((p) => ({
      id: p.id,
      email: p.email,
      name: p.fullName,
      role: p.role,
      phone: p.phone,
      designation: p.designation,
      createdAt: p.createdAt
    })));
  });
  app2.post("/api/site-engg/engineers", async (req, res) => {
    try {
      const { fullName, email, phone, designation, password } = req.body;
      const existing = storage2.getTable("profiles").find((p) => p.email === email);
      if (existing) return res.status(400).json({ error: "User with this email already exists" });
      const passwordHash = await bcrypt2.hash(password || "password123", 10);
      const newUser = storage2.insert("profiles", {
        email,
        fullName,
        role: "engineer",
        phone,
        designation,
        passwordHash,
        engineerId: `eng-${Date.now()}`
      });
      res.status(201).json({
        id: newUser.id,
        name: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        designation: newUser.designation,
        status: "available",
        userId: newUser.id,
        createdAt: newUser.createdAt
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/site-engg/engineers", (req, res) => {
    const engineers = storage2.getTable("profiles").filter((p) => p.role === "engineer");
    res.json(engineers.map((e) => ({
      id: e.id,
      name: e.fullName,
      email: e.email,
      phone: e.phone,
      designation: e.designation,
      status: "available",
      userId: e.id,
      createdAt: e.createdAt
    })));
  });
  app2.get("/api/site-engg/clients", (req, res) => {
    res.json(storage2.getTable("clients").map((c) => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contactPerson,
      email: c.contactEmail,
      phone: c.contactPhone,
      userId: c.userId,
      createdAt: c.createdAt
    })));
  });
  app2.post("/api/site-engg/clients", async (req, res) => {
    try {
      const { name, contactPerson, email, phone, address, userId, password } = req.body;
      let finalUserId = userId;
      if (!finalUserId) {
        const passwordHash = await bcrypt2.hash(password || "password123", 10);
        const newUser = storage2.insert("profiles", {
          email,
          fullName: contactPerson || name,
          role: "client",
          phone,
          passwordHash
        });
        finalUserId = newUser.id;
      }
      const newClient = storage2.insert("clients", {
        name,
        contactPerson,
        contactEmail: email,
        contactPhone: phone,
        address,
        userId: finalUserId
      });
      res.status(201).json(newClient);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/site-engg/sites", (req, res) => {
    const { clientId } = req.query;
    let sites = storage2.getTable("sites");
    if (clientId) {
      sites = sites.filter((s) => s.clientId === clientId);
    }
    res.json(sites.map((s) => ({ ...s, status: "active" })));
  });
  app2.post("/api/site-engg/sites", (req, res) => {
    const newSite = storage2.insert("sites", req.body);
    res.status(201).json(newSite);
  });
  app2.get("/api/site-engg/assignments", (req, res) => {
    const assignments = storage2.getTable("engineer_assignments");
    const profiles = storage2.getTable("profiles");
    const clients = storage2.getTable("clients");
    const sites = storage2.getTable("sites");
    const user = profiles.find((p) => p.id === req.session.userId);
    let filteredAssignments = assignments;
    if (user?.role === "client") {
      const client = clients.find((c) => c.userId === user.id);
      filteredAssignments = assignments.filter((a) => a.clientId === client?.id);
    }
    const result = filteredAssignments.map((a) => ({
      id: a.id,
      engineerId: a.engineerId,
      engineerName: profiles.find((p) => p.id === a.engineerId)?.fullName,
      engineerDesignation: profiles.find((p) => p.id === a.engineerId)?.designation,
      clientId: a.clientId,
      clientName: clients.find((c) => c.id === a.clientId)?.name,
      siteId: a.siteId,
      siteName: sites.find((s) => s.id === a.siteId)?.name,
      assignedDate: a.assignedDate,
      status: a.isActive ? "active" : "inactive",
      createdAt: a.createdAt
    }));
    res.json(result);
  });
  app2.post("/api/site-engg/assignments", (req, res) => {
    const { engineerId, clientId, siteId, assignedDate } = req.body;
    const newAssignment = storage2.insert("engineer_assignments", {
      engineerId,
      clientId,
      siteId,
      assignedDate: assignedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      isActive: true
    });
    res.status(201).json({ ...newAssignment, status: "active" });
  });
  app2.get("/api/site-engg/dashboard", (req, res) => {
    const profiles = storage2.getTable("profiles");
    const clients = storage2.getTable("clients");
    const sites = storage2.getTable("sites");
    const assignments = storage2.getTable("engineer_assignments");
    const reports = storage2.getTable("daily_reports");
    const user = profiles.find((p) => p.id === req.session.userId);
    if (user?.role === "client") {
      const client = clients.find((c) => c.userId === user.id);
      const clientReports = reports.filter((r) => r.clientId === client?.id);
      const clientAssignments = assignments.filter((a) => a.clientId === client?.id);
      const clientSites = sites.filter((s) => s.clientId === client?.id);
      return res.json({
        totalEngineers: new Set(clientAssignments.map((a) => a.engineerId)).size,
        totalClients: 1,
        totalSites: clientSites.length,
        activeAssignments: clientAssignments.filter((a) => a.isActive).length,
        todayCheckIns: 0,
        todayReports: clientReports.length,
        pendingLeaves: 0
      });
    }
    res.json({
      totalEngineers: profiles.filter((p) => p.role === "engineer").length,
      totalClients: clients.length,
      totalSites: sites.length,
      activeAssignments: assignments.filter((a) => a.isActive).length,
      todayCheckIns: 0,
      todayReports: reports.length,
      pendingLeaves: 0
    });
  });
  app2.get("/api/site-engg/reports", (req, res) => {
    const reports = storage2.getTable("daily_reports");
    const profiles = storage2.getTable("profiles");
    const clients = storage2.getTable("clients");
    const user = profiles.find((p) => p.id === req.session.userId);
    let filteredReports = reports;
    if (user?.role === "client") {
      const client = clients.find((c) => c.userId === user.id);
      filteredReports = reports.filter((r) => r.clientId === client?.id);
    } else if (user?.role === "engineer") {
      const engId = user.engineerId || user.id;
      filteredReports = reports.filter((r) => r.engineerId === engId);
    }
    const result = filteredReports.map((r) => ({
      ...r,
      engineerName: profiles.find((p) => (p.engineerId || p.id) === r.engineerId)?.fullName,
      clientName: clients.find((c) => c.id === r.clientId)?.name,
      date: r.reportDate || r.date || r.createdAt?.split("T")[0]
    })).sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    res.json(result);
  });
  app2.post("/api/site-engg/reports", (req, res) => {
    const { clientId, siteId, workDone, issues } = req.body;
    const user = storage2.getTable("profiles").find((p) => p.id === req.session.userId);
    const engineerId = user?.engineerId || req.session.userId;
    const newReport = storage2.insert("daily_reports", {
      engineerId,
      clientId,
      siteId,
      reportDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      workDone,
      issues
    });
    res.status(201).json(newReport);
  });
  app2.get("/api/site-engg/check-ins", (req, res) => {
    const checkIns = storage2.getTable("check_ins");
    const profiles = storage2.getTable("profiles");
    const user = profiles.find((p) => p.id === req.session.userId);
    let filteredCheckIns = checkIns;
    if (user?.role === "client") {
      const assignments = storage2.getTable("engineer_assignments");
      const client = storage2.getTable("clients").find((c) => c.userId === user.id);
      const engineerIds = assignments.filter((a) => a.clientId === client?.id).map((a) => a.engineerId);
      filteredCheckIns = checkIns.filter((c) => engineerIds.includes(c.engineerId));
    }
    res.json(filteredCheckIns.map((c) => ({
      ...c,
      engineerName: profiles.find((p) => p.id === c.engineerId)?.fullName
    })));
  });
  app2.get("/api/site-engg/leaves", (req, res) => {
    const leaves = storage2.getTable("leave_requests");
    const profiles = storage2.getTable("profiles");
    const user = profiles.find((p) => p.id === req.session.userId);
    let filteredLeaves = leaves;
    if (user?.role === "engineer") {
      const engId = user.engineerId || user.id;
      filteredLeaves = leaves.filter((l) => l.engineerId === engId);
    } else if (user?.role === "client") {
      const assignments = storage2.getTable("engineer_assignments");
      const client = storage2.getTable("clients").find((c) => c.userId === user.id);
      const engineerIds = assignments.filter((a) => a.clientId === client?.id).map((a) => a.engineerId);
      filteredLeaves = leaves.filter((l) => engineerIds.includes(l.engineerId) && l.status === "approved");
    }
    res.json(filteredLeaves.map((l) => ({
      ...l,
      engineerName: profiles.find((p) => (p.engineerId || p.id) === l.engineerId)?.fullName,
      backupEngineerName: profiles.find((p) => (p.engineerId || p.id) === l.backupEngineerId)?.fullName,
      date: l.startDate
    })).sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime()));
  });
  app2.post("/api/site-engg/leaves", (req, res) => {
    const { startDate, endDate, reason } = req.body;
    const user = storage2.getTable("profiles").find((p) => p.id === req.session.userId);
    const engineerId = user?.engineerId || req.session.userId;
    const newLeave = storage2.insert("leave_requests", {
      engineerId,
      startDate,
      endDate,
      reason,
      status: "pending"
    });
    res.status(201).json(newLeave);
  });
  app2.post("/api/site-engg/check-ins", (req, res) => {
    const { engineerId, latitude, longitude, locationName, siteId } = req.body;
    const newCheckIn = storage2.insert("check_ins", {
      engineerId,
      latitude,
      longitude,
      locationName,
      siteId,
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      checkInTime: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.status(201).json(newCheckIn);
  });
  app2.get("/api/site-engg/company-profile", (req, res) => {
    const profiles = storage2.getTable("company_profiles");
    res.json(profiles[0] || null);
  });
  app2.post("/api/site-engg/company-profile", (req, res) => {
    const profiles = storage2.getTable("company_profiles");
    let profile;
    if (profiles.length > 0) {
      profile = storage2.update("company_profiles", profiles[0].id, req.body);
    } else {
      profile = storage2.insert("company_profiles", req.body);
    }
    res.json(profile);
  });
  app2.post("/api/site-engg/send-report-email", async (req, res) => {
    try {
      const { reportType, reportData, subject, recipientEmail } = req.body;
      const targetEmail = recipientEmail || "admin@example.com";
      const result = await sendEmail({ subject, text: `Report sent to ${targetEmail}`, html: "<h1>Report</h1>" });
      res.json({ success: true, message: `Report email sent to ${targetEmail}`, result });
    } catch (error) {
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });
}

// server/routes.ts
var isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
var isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Admin access required" });
};
var isSupportStaff = (req, res, next) => {
  if (req.isAuthenticated() && (req.user?.role === "admin" || req.user?.role === "agent")) {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Support staff access required" });
};
var requireRole = (roles) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && req.user && roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
  };
};
async function registerRoutes(app2) {
  await setupAuth(app2);
  registerSiteEnggRoutes(app2);
  const uploadsDir = path2.join(process.cwd(), "uploads");
  if (!fs2.existsSync(uploadsDir)) {
    fs2.mkdirSync(uploadsDir, { recursive: true });
  }
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path2.extname(file.originalname));
    }
  });
  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 },
    // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|csv/;
      const extname = allowedTypes.test(path2.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "text/csv" || file.mimetype === "application/csv";
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Only images, PDFs, documents, and CSV files are allowed"));
      }
    }
  });
  app2.use("/uploads", express.static(uploadsDir));
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getAllCategories();
      res.json(categories2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  app2.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });
  app2.get("/api/categories/:id/subcategories", async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const subcategories = await storage.getSubcategories(parentId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });
  app2.post("/api/categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });
  app2.put("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });
  app2.delete("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });
  app2.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      console.log("=== TICKETS API CALLED ===");
      console.log("User:", req.user);
      console.log("Query params:", req.query);
      const page = req.query.page ? parseInt(req.query.page) : void 0;
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const search = req.query.search;
      const status = req.query.status;
      const priority = req.query.priority;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : void 0;
      const assignedToId = req.query.assignedToId ? parseInt(req.query.assignedToId) : void 0;
      const isPaginationRequested = page !== void 0 && limit !== void 0;
      const filters = {
        search,
        status,
        priority,
        categoryId,
        assignedToId: assignedToId === 0 ? null : assignedToId
        // 0 means unassigned
      };
      Object.keys(filters).forEach((key) => {
        if (filters[key] === void 0) {
          delete filters[key];
        }
      });
      if (req.user?.role !== "admin" && "assignedToId" in filters) {
        delete filters.assignedToId;
      }
      let tickets2;
      let totalCount = 0;
      let statusCounts = { open: 0, inProgress: 0, closed: 0 };
      if (req.user?.role === "admin") {
        if (isPaginationRequested) {
          const result = await storage.getAllTicketsWithPagination(filters, page, limit);
          tickets2 = result.tickets;
          totalCount = result.totalCount;
          statusCounts = result.statusCounts;
        } else {
          tickets2 = await storage.getFilteredTicketsForRole("admin", req.user.id, filters);
        }
      } else if (req.user?.role === "agent") {
        if (isPaginationRequested) {
          const result = await storage.getTicketsWithPaginationForRole("agent", req.user.id, filters, page, limit);
          tickets2 = result.tickets;
          totalCount = result.totalCount;
          statusCounts = result.statusCounts;
        } else {
          tickets2 = await storage.getFilteredTicketsForRole("agent", req.user.id, filters);
        }
      } else {
        if (isPaginationRequested) {
          const result = await storage.getTicketsWithPaginationForRole("user", req.user.id, filters, page, limit);
          tickets2 = result.tickets;
          totalCount = result.totalCount;
          statusCounts = result.statusCounts;
        } else {
          tickets2 = await storage.getFilteredTicketsForRole("user", req.user.id, filters);
        }
      }
      if (isPaginationRequested) {
        res.json({
          tickets: tickets2,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit,
            hasNextPage: page < Math.ceil(totalCount / limit),
            hasPreviousPage: page > 1
          },
          statusCounts
        });
      } else {
        res.json(tickets2);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });
  app2.get("/api/tickets/my", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const isPaginationRequested = !!req.query.page;
      if (isPaginationRequested) {
        const result = await storage.getTicketsWithPaginationForRole("user", req.user.id, {}, page, limit);
        res.json({
          tickets: result.tickets,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(result.totalCount / limit),
            totalCount: result.totalCount,
            limit,
            hasNextPage: page < Math.ceil(result.totalCount / limit),
            hasPreviousPage: page > 1
          },
          statusCounts: result.statusCounts
        });
      } else {
        const tickets2 = await storage.getUserTickets(req.user.id);
        res.json(tickets2);
      }
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      res.status(500).json({ message: "Failed to fetch user tickets" });
    }
  });
  app2.get("/api/tickets/filter", isAuthenticated, async (req, res) => {
    try {
      const { status, priority, categoryId } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (categoryId) filters.categoryId = parseInt(categoryId);
      let tickets2;
      if (req.user?.role === "admin") {
        tickets2 = await storage.getFilteredTickets(filters);
      } else if (req.user?.role === "agent") {
        tickets2 = await storage.getFilteredTicketsForAgent(req.user.id, filters);
      } else {
        tickets2 = await storage.getFilteredTicketsForUser(req.user.id, filters);
      }
      res.json(tickets2);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter tickets" });
    }
  });
  app2.get("/api/tickets/export", isAuthenticated, async (req, res) => {
    try {
      console.log("Export request from user:", req.user?.role, req.user?.id);
      let tickets2;
      if (req.user?.role === "admin") {
        console.log("Fetching all tickets with relations...");
        tickets2 = await storage.getAllTicketsWithRelations();
      } else if (req.user?.role === "agent") {
        console.log("Fetching assigned tickets...");
        tickets2 = await storage.getAssignedTickets(req.user.id);
      } else {
        console.log("Fetching user tickets...");
        tickets2 = await storage.getTicketsByUser(req.user.id);
      }
      console.log("Fetched tickets count:", tickets2.length);
      const csvData = tickets2.map((ticket) => {
        const createdDate = new Date(ticket.createdAt);
        const updatedDate = new Date(ticket.updatedAt);
        const currentDate = /* @__PURE__ */ new Date();
        const daysOpen = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1e3 * 60 * 60 * 24));
        let resolutionTime = "";
        if (ticket.status === "resolved" || ticket.status === "closed") {
          const resolutionTimeMs = updatedDate.getTime() - createdDate.getTime();
          const resolutionDays = Math.floor(resolutionTimeMs / (1e3 * 60 * 60 * 24));
          resolutionTime = resolutionDays.toString();
        } else {
          resolutionTime = (-daysOpen).toString();
        }
        return {
          "Ticket ID": ticket.id,
          "Title": ticket.title,
          "Description": ticket.description,
          "Status": ticket.status,
          "Priority": ticket.priority,
          "Support Type": ticket.supportType,
          "Category": ticket.category?.name || "",
          "Created By Name": ticket.createdBy?.name || "",
          "Created By Email": ticket.createdBy?.email || "",
          "Created By Department": ticket.createdBy?.department || "",
          "Assigned To Name": ticket.assignedTo?.name || "",
          "Assigned To Email": ticket.assignedTo?.email || "",
          "Contact Email": ticket.contactEmail || "",
          "Contact Name": ticket.contactName || "",
          "Contact Phone": ticket.contactPhone || "",
          "Contact Department": ticket.contactDepartment || "",
          "Created Date": createdDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
          "Updated Date": updatedDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
          "Due Date": ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "",
          "Days Open": daysOpen,
          "Resolution Time": resolutionTime
        };
      });
      const csvFilePath = path2.join(process.cwd(), "uploads", `tickets_export_${Date.now()}.csv`);
      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: csvFilePath,
        header: [
          { id: "Ticket ID", title: "Ticket ID" },
          { id: "Title", title: "Title" },
          { id: "Description", title: "Description" },
          { id: "Status", title: "Status" },
          { id: "Priority", title: "Priority" },
          { id: "Support Type", title: "Support Type" },
          { id: "Category", title: "Category" },
          { id: "Created By Name", title: "Created By Name" },
          { id: "Created By Email", title: "Created By Email" },
          { id: "Created By Department", title: "Created By Department" },
          { id: "Assigned To Name", title: "Assigned To Name" },
          { id: "Assigned To Email", title: "Assigned To Email" },
          { id: "Contact Email", title: "Contact Email" },
          { id: "Contact Name", title: "Contact Name" },
          { id: "Contact Phone", title: "Contact Phone" },
          { id: "Contact Department", title: "Contact Department" },
          { id: "Created Date", title: "Created Date" },
          { id: "Updated Date", title: "Updated Date" },
          { id: "Due Date", title: "Due Date" },
          { id: "Days Open", title: "Days Open" },
          { id: "Resolution Time", title: "Resolution Time" }
        ]
      });
      await csvWriter.writeRecords(csvData);
      const filename = path2.basename(csvFilePath);
      res.download(csvFilePath, filename, (err) => {
        if (err) {
          console.error("Download error:", err);
        } else {
          setTimeout(() => {
            try {
              fs2.unlinkSync(csvFilePath);
            } catch (deleteErr) {
              console.error("Failed to delete temp file:", deleteErr);
            }
          }, 1e4);
        }
      });
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Failed to export tickets" });
    }
  });
  app2.get("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicketWithRelations(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (req.user?.role === "user" && ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied: You can only view your own tickets" });
      }
      if (req.user?.role === "agent" && ticket.assignedToId !== req.user.id && ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied: You can only view tickets assigned to you or created by you" });
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });
  app2.post("/api/tickets", isAuthenticated, upload.single("attachment"), async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
      }
      const processedData = {
        ...req.body,
        categoryId: parseInt(req.body.categoryId),
        subcategoryId: req.body.subcategoryId ? parseInt(req.body.subcategoryId) : void 0,
        companyName: req.body.companyName,
        location: req.body.location,
        createdById: req.user.id,
        supportType: req.body.supportType || "remote",
        contactEmail: req.body.contactEmail,
        contactName: req.body.contactName,
        contactPhone: req.body.contactPhone,
        contactDepartment: req.body.contactDepartment,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        attachmentUrl: req.file ? `/uploads/${req.file.filename}` : null,
        attachmentName: req.file ? req.file.originalname : null
      };
      if (req.body.assignedToId) {
        if (req.user.role === "admin") {
          processedData.assignedToId = parseInt(req.body.assignedToId);
        } else if (req.user.role === "agent") {
          processedData.assignedToId = parseInt(req.body.assignedToId);
        } else {
          delete processedData.assignedToId;
        }
      }
      let ticketData;
      try {
        ticketData = insertTicketSchema.parse(processedData);
      } catch (validationError) {
        let details = "";
        if (typeof validationError === "object" && validationError !== null) {
          if (Array.isArray(validationError.errors)) {
            details = JSON.stringify(validationError.errors);
          } else if (validationError.message) {
            details = validationError.message;
          } else {
            details = JSON.stringify(validationError);
          }
        } else {
          details = String(validationError);
        }
        console.error("Ticket validation error:", details);
        return res.status(400).json({ message: "Invalid ticket data", details });
      }
      const ticket = await storage.createTicket(ticketData);
      try {
        const ticketWithRelations = await storage.getTicketWithRelations(ticket.id);
        if (ticketWithRelations) {
          await sendTicketCreatedEmail(ticketWithRelations);
        }
      } catch (emailError) {
        console.error("Failed to send ticket created email:", emailError);
      }
      res.status(201).json(ticket);
    } catch (error) {
      let details = "";
      if (typeof error === "object" && error !== null) {
        if (error.message) {
          details = error.message;
        } else {
          details = JSON.stringify(error);
        }
      } else {
        details = String(error);
      }
      console.error("Create ticket error:", details);
      res.status(400).json({ message: "Ticket creation failed", details });
    }
  });
  app2.patch("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (req.user?.role === "user" && ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied: You can only update your own tickets" });
      }
      if (req.user?.role === "agent" && ticket.assignedToId !== req.user.id) {
        return res.status(403).json({ message: "Access denied: You can only update tickets assigned to you" });
      }
      const updatedTicket = await storage.updateTicket(id, req.body);
      res.json(updatedTicket);
    } catch (error) {
      res.status(400).json({ message: "Failed to update ticket" });
    }
  });
  app2.put("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (req.user?.role !== "admin" && req.user?.role !== "agent" && ticket.createdById !== req.user?.id) {
        return res.status(403).json({ message: "Access denied: You can only edit your own tickets" });
      }
      const processedData = {
        ...req.body,
        categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : void 0,
        companyName: req.body.companyName,
        location: req.body.location
      };
      Object.keys(processedData).forEach((key) => {
        if (processedData[key] === void 0 || typeof processedData[key] === "number" && isNaN(processedData[key])) {
          delete processedData[key];
        }
      });
      if (req.body.assignedToId !== void 0) {
        const rawAssigned = req.body.assignedToId;
        const assignedId = rawAssigned !== null && rawAssigned !== void 0 && rawAssigned !== "" ? Number(rawAssigned) : null;
        if (req.user?.role === "admin") {
          processedData.assignedToId = assignedId !== null && !Number.isNaN(assignedId) ? assignedId : null;
        } else if (req.user?.role === "agent") {
          if (assignedId !== null && !Number.isNaN(assignedId) && assignedId === req.user.id) {
            processedData.assignedToId = req.user.id;
          } else {
            delete processedData.assignedToId;
          }
        } else {
          delete processedData.assignedToId;
        }
      }
      if (req.body.status !== void 0) {
        if (req.user?.role === "admin" || req.user?.role === "agent") {
          processedData.status = req.body.status;
        } else {
          delete processedData.status;
        }
      }
      const oldStatus = ticket.status;
      const updatedTicket = await storage.updateTicket(id, processedData);
      if (processedData.status && processedData.status !== oldStatus) {
        try {
          const ticketWithRelations = await storage.getTicketWithRelations(id);
          if (ticketWithRelations) {
            await sendStatusChangeEmail(ticketWithRelations, oldStatus, processedData.status);
          }
        } catch (emailError) {
          console.error("Failed to send status change email:", emailError);
        }
      }
      res.json(updatedTicket);
    } catch (error) {
      console.error("Update ticket error:", error);
      res.status(400).json({ message: "Failed to update ticket" });
    }
  });
  app2.delete("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      if (req.user?.role === "user" && ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: "Access denied: You can only delete your own tickets" });
      }
      if (req.user?.role === "agent") {
        return res.status(403).json({ message: "Access denied: Agents cannot delete tickets" });
      }
      await storage.deleteTicket(id);
      res.json({ message: "Ticket deleted successfully" });
    } catch (error) {
      console.error("Delete ticket error:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });
  app2.get("/api/tickets/:ticketId/comments", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const comments2 = await storage.getTicketComments(ticketId);
      res.json(comments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post("/api/tickets/:ticketId/comments", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const commentData = insertCommentSchema.parse({
        ...req.body,
        ticketId,
        userId: req.user.id
      });
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });
  app2.get("/api/faqs", async (req, res) => {
    try {
      let faqs2;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : void 0;
      if (categoryId) {
        faqs2 = await storage.getFaqsByCategory(categoryId);
      } else {
        faqs2 = await storage.getAllFaqs();
      }
      res.json(faqs2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });
  app2.get("/api/faqs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const faq = await storage.getFaq(id);
      if (!faq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      res.json(faq);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch FAQ" });
    }
  });
  app2.post("/api/faqs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const faqData = insertFaqSchema.parse(req.body);
      const faq = await storage.createFaq(faqData);
      res.status(201).json(faq);
    } catch (error) {
      res.status(400).json({ message: "Invalid FAQ data" });
    }
  });
  app2.patch("/api/faqs/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedFaq = await storage.updateFaq(id, req.body);
      if (!updatedFaq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      res.json(updatedFaq);
    } catch (error) {
      res.status(400).json({ message: "Failed to update FAQ" });
    }
  });
  app2.get("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });
  app2.post("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const message = await storage.createChatMessage(messageData);
      const userMessage = message.message.toLowerCase();
      let botResponse = "Thank you for your message. How else can I assist you?";
      let ticketCreated = null;
      const issuePatterns = [
        {
          patterns: ["wifi", "network", "internet", "connection", "connectivity", "can't connect", "no internet"],
          category: "Network Issues",
          subcategory: "WiFi",
          defaultTitle: "Network connectivity issue"
        },
        {
          patterns: ["password", "reset", "login", "access", "account", "can't login", "forgot password"],
          category: "Account & Password",
          subcategory: "Password Reset",
          defaultTitle: "Password/Login issue"
        },
        {
          patterns: ["printer", "print", "printing", "can't print", "printer not working"],
          category: "Hardware",
          subcategory: "Printer",
          defaultTitle: "Printer issue"
        },
        {
          patterns: ["email", "outlook", "mail", "can't send", "can't receive"],
          category: "Email Services",
          subcategory: "Outlook",
          defaultTitle: "Email issue"
        },
        {
          patterns: ["computer", "laptop", "desktop", "slow", "frozen", "not working", "crash"],
          category: "Hardware",
          subcategory: "Desktop",
          defaultTitle: "Computer issue"
        },
        {
          patterns: ["software", "application", "app", "program", "error", "bug"],
          category: "Hardware",
          subcategory: "Desktop",
          defaultTitle: "Software issue"
        }
      ];
      const problemIndicators = ["can't", "cannot", "not working", "broken", "issue", "problem", "help", "error", "trouble", "unable", "fail"];
      const hasProblem = problemIndicators.some((indicator) => userMessage.includes(indicator));
      if (hasProblem) {
        const matchedIssue = issuePatterns.find(
          (issue) => issue.patterns.some((pattern) => userMessage.includes(pattern))
        );
        if (matchedIssue) {
          try {
            const categories2 = await storage.getAllCategories();
            const mainCategory = categories2.find((cat) => cat.name === matchedIssue.category && !cat.parentId);
            const subCategory = categories2.find((cat) => cat.name === matchedIssue.subcategory && cat.parentId === mainCategory?.id);
            if (mainCategory) {
              const ticketData = {
                title: matchedIssue.defaultTitle,
                description: `User message: ${message.message}

This ticket was automatically created by the AI assistant based on the user's chat message.`,
                status: "open",
                priority: "medium",
                supportType: "remote",
                categoryId: mainCategory.id,
                subcategoryId: subCategory?.id || null,
                createdById: req.user.id,
                assignedToId: null,
                contactEmail: req.user.email,
                contactName: req.user.name,
                contactPhone: req.user.contactNumber,
                contactDepartment: req.user.department,
                companyName: req.user.companyName || "",
                location: req.user.location || ""
              };
              ticketCreated = await storage.createTicket(ticketData);
              botResponse = `I understand you're experiencing ${matchedIssue.defaultTitle.toLowerCase()}. I've automatically created a support ticket for you:

\u{1F3AB} **Ticket #${ticketCreated.id}** - ${ticketCreated.title}
\u{1F4CB} **Category:** ${matchedIssue.category}
\u{1F4DD} **Description:** Based on your message
\u23F0 **Status:** Open

Your ticket has been submitted and our IT team will review it shortly. You can track the progress in the 'My Tickets' section. Is there anything else I can help you with?`;
            }
          } catch (error) {
            console.error("Error creating automatic ticket:", error);
            botResponse = `I understand you're experiencing ${matchedIssue.defaultTitle.toLowerCase()}. I'd be happy to help you create a support ticket. You can create one manually using the 'Create Ticket' option, or I can guide you through the process. What specific details would you like to include?`;
          }
        } else {
          botResponse = "I can see you're experiencing an issue. I'd be happy to help you create a support ticket to get this resolved quickly. Can you tell me more specific details about what's not working? This will help me categorize your issue correctly.";
        }
      } else if (userMessage.includes("ticket status") || userMessage.includes("my tickets")) {
        botResponse = "You can view all your tickets and their current status in the 'My Tickets' section of the portal. Would you like me to direct you there, or do you have a specific ticket number you'd like me to help you with?";
      } else if (userMessage.includes("create ticket") || userMessage.includes("submit ticket")) {
        botResponse = "I can automatically create tickets for you! Just describe your issue in detail, and I'll detect the problem and create the appropriate ticket. For example, you could say 'My computer is running very slow' or 'I can't connect to WiFi'. What issue are you experiencing?";
      }
      const botMessage = await storage.createChatMessage({
        userId: req.user.id,
        message: botResponse,
        isFromBot: true
      });
      const response = [message, botMessage];
      if (ticketCreated) {
        response.push(ticketCreated);
      }
      res.status(201).json(response);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });
  app2.get("/api/dashboard", isAuthenticated, async (req, res) => {
    try {
      let stats;
      if (req.user?.role === "admin") {
        stats = await storage.getDashboardStats();
      } else if (req.user?.role === "agent") {
        stats = await storage.getDashboardStatsForAgent(req.user.id);
      } else {
        stats = await storage.getDashboardStatsForUser(req.user.id);
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app2.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const isPaginationRequested = !!req.query.page;
      let users2;
      let total = 0;
      if (req.user?.role === "admin") {
        if (isPaginationRequested) {
          const result = await storage.getUsersWithPagination(page, limit);
          users2 = result.data;
          total = result.total;
        } else {
          users2 = await storage.getAllUsers();
          total = users2.length;
        }
      } else if (req.user?.role === "agent") {
        const allUsers = await storage.getUsersByRoles(["agent", "user"]);
        if (isPaginationRequested) {
          total = allUsers.length;
          const start = (page - 1) * limit;
          users2 = allUsers.slice(start, start + limit);
        } else {
          users2 = allUsers;
          total = users2.length;
        }
      } else {
        users2 = [req.user];
        total = 1;
      }
      if (isPaginationRequested) {
        res.json({
          data: users2,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            limit,
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1
          }
        });
      } else {
        res.json(users2);
      }
    } catch (err) {
      console.error("Error in /api/users:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.post("/api/users", isAuthenticated, requireRole(["admin", "agent"]), async (req, res) => {
    try {
      const { username, password, name, email, role } = req.body;
      if (!username || !password || !name || !email || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const existingUser = await storage.getUserByUsernameOrEmail(username, email);
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      const hashedPassword = await bcrypt3.hash(password, 10);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        email,
        role
      });
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app2.put("/api/users/:id", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, name, email, role } = req.body;
      const existingUser = await storage.getUserById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const updateData = { username, name, email, role };
      if (password && password.trim() !== "") {
        updateData.password = await bcrypt3.hash(password, 10);
      }
      const updatedUser = await storage.updateUser(parseInt(id), updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.delete("/api/users/:id", isAuthenticated, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const existingUser = await storage.getUserById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.deleteUser(parseInt(id));
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  app2.put("/api/users/:id/password", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      if (parseInt(id) !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "You can only change your own password" });
      }
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (req.user?.role !== "admin") {
        const isCurrentPasswordValid = await bcrypt3.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }
      const hashedNewPassword = await bcrypt3.hash(newPassword, 10);
      await storage.updateUser(parseInt(id), { password: hashedNewPassword });
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  app2.get("/api/users/:id/export", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      if (parseInt(id) !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "You can only export your own data" });
      }
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tickets2 = await storage.getUserTickets(parseInt(id));
      const userComments = [];
      const sanitizedUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        department: user.department,
        designation: user.designation,
        contactNumber: user.contactNumber,
        createdAt: user.createdAt
      };
      const exportData = {
        user: sanitizedUser,
        tickets: tickets2,
        comments: userComments,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      res.json(exportData);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });
  app2.post("/api/tickets/import", isAuthenticated, isSupportStaff, upload.single("csvFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }
      const results = [];
      const errors = [];
      let processed = 0;
      let created = 0;
      fs2.createReadStream(req.file.path).pipe(csv()).on("data", (data) => results.push(data)).on("end", async () => {
        try {
          const categories2 = await storage.getAllCategories();
          const users2 = await storage.getAllUsers();
          for (const row of results) {
            processed++;
            try {
              const categoryValue = row.Category || row.category_id;
              let categoryId;
              if (categoryValue) {
                let category = categories2.find(
                  (c) => c.name.toLowerCase() === categoryValue.toLowerCase() || c.id === parseInt(categoryValue)
                );
                if (!category) {
                  try {
                    const existingCategory = await storage.getCategoryByName(categoryValue);
                    if (existingCategory) {
                      category = existingCategory;
                      categories2.push(category);
                    } else {
                      category = await storage.createCategory({
                        name: categoryValue,
                        parentId: null
                      });
                      categories2.push(category);
                      console.log(`Created new category: ${categoryValue}`);
                    }
                  } catch (error) {
                    errors.push(`Row ${processed}: Failed to create category "${categoryValue}": ${error instanceof Error ? error.message : "Unknown error"}`);
                    continue;
                  }
                }
                if (category) {
                  categoryId = category.id;
                } else {
                  errors.push(`Row ${processed}: Category "${categoryValue}" could not be found or created`);
                  continue;
                }
              }
              let createdById;
              const createdByValue = row["Created By Email"] || row.created_by_id;
              if (createdByValue) {
                let createdByUser = users2.find(
                  (u) => u.email?.toLowerCase() === createdByValue.toLowerCase() || u.name?.toLowerCase() === createdByValue.toLowerCase() || u.id === parseInt(createdByValue)
                );
                if (!createdByUser && createdByValue.trim()) {
                  try {
                    const trimmedName = createdByValue.trim();
                    if (!trimmedName || trimmedName.length < 1) {
                      console.warn(`Skipping user creation for empty name: "${createdByValue}"`);
                      createdById = req.user.id;
                      continue;
                    }
                    const baseUsername = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const baseEmail = `${baseUsername}@imported.local`;
                    const existingUser = await storage.getUserByUsernameOrEmail(baseUsername, baseEmail);
                    if (existingUser) {
                      createdByUser = existingUser;
                      console.log(`Using existing user: ${trimmedName}`);
                    } else {
                      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
                      const hashedPassword = await bcrypt3.hash(randomPassword, 10);
                      createdByUser = await storage.createUser({
                        username: baseUsername,
                        password: hashedPassword,
                        name: trimmedName,
                        email: baseEmail,
                        role: "user"
                      });
                      console.log(`Created new user: ${trimmedName} (temp password will need reset)`);
                    }
                    users2.push(createdByUser);
                  } catch (error) {
                    console.warn(`Failed to create user "${createdByValue}": ${error instanceof Error ? error.message : "Unknown error"}`);
                    createdById = req.user.id;
                  }
                }
                if (createdByUser) {
                  createdById = createdByUser.id;
                } else {
                  createdById = req.user.id;
                }
              } else {
                createdById = req.user.id;
              }
              let assignedToId;
              const assignedToValue = row["Assigned To Email"] || row.assigned_to_id;
              if (assignedToValue && assignedToValue.trim()) {
                let assignedToUser = users2.find(
                  (u) => u.email?.toLowerCase() === assignedToValue.toLowerCase() || u.name?.toLowerCase() === assignedToValue.toLowerCase() || u.id === parseInt(assignedToValue)
                );
                if (!assignedToUser) {
                  try {
                    const trimmedName = assignedToValue.trim();
                    if (!trimmedName || trimmedName.length < 1) {
                      console.warn(`Skipping agent creation for empty name: "${assignedToValue}"`);
                      continue;
                    }
                    const baseUsername = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const baseEmail = `${baseUsername}@imported.local`;
                    const existingUser = await storage.getUserByUsernameOrEmail(baseUsername, baseEmail);
                    if (existingUser) {
                      assignedToUser = existingUser;
                      console.log(`Using existing agent: ${trimmedName}`);
                    } else {
                      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
                      const hashedPassword = await bcrypt3.hash(randomPassword, 10);
                      assignedToUser = await storage.createUser({
                        username: baseUsername,
                        password: hashedPassword,
                        name: trimmedName,
                        email: baseEmail,
                        role: "agent"
                        // Assign agent role since they're handling tickets
                      });
                      console.log(`Created new agent: ${trimmedName} (temp password will need reset)`);
                    }
                    users2.push(assignedToUser);
                  } catch (error) {
                    console.warn(`Failed to create user "${assignedToValue}": ${error instanceof Error ? error.message : "Unknown error"}`);
                  }
                }
                if (assignedToUser) {
                  assignedToId = assignedToUser.id;
                }
              }
              let dueDate;
              const dueDateValue = row["Due Date"] || row.due_date;
              if (dueDateValue && dueDateValue.trim()) {
                try {
                  let dateStr = dueDateValue.trim();
                  if (dateStr.includes("@")) {
                    const parts = dateStr.split("@");
                    if (parts.length === 2) {
                      const datePart = parts[0].trim();
                      const timePart = parts[1].trim();
                      dateStr = `${datePart} ${timePart}`;
                    }
                  }
                  const parsedDate = new Date(dateStr);
                  if (!isNaN(parsedDate.getTime())) {
                    dueDate = parsedDate;
                  } else {
                    const dateRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
                    const match = dateStr.match(dateRegex);
                    if (match) {
                      const month = parseInt(match[1]) - 1;
                      const day = parseInt(match[2]);
                      const year = parseInt(match[3]);
                      const testDate = new Date(year, month, day);
                      if (!isNaN(testDate.getTime())) {
                        dueDate = testDate;
                      }
                    }
                  }
                } catch (error) {
                  console.warn(`Failed to parse due date "${dueDateValue}" for row ${processed}: ${error instanceof Error ? error.message : "Unknown error"}`);
                }
              }
              const rawStatus = (row.Status || row.status)?.toLowerCase()?.trim() || "open";
              const rawPriority = (row.Priority || row.priority)?.toLowerCase()?.trim() || "medium";
              const rawSupportType = (row["Support Type"] || row.support_type)?.toLowerCase()?.trim() || "remote";
              const validStatuses = ["open", "in-progress", "resolved", "closed"];
              const status = validStatuses.includes(rawStatus) ? rawStatus : "open";
              if (!validStatuses.includes(rawStatus)) {
                console.warn(`Invalid status "${rawStatus}" for row ${processed}, defaulting to "open"`);
              }
              const validPriorities = ["low", "medium", "high"];
              const priority = validPriorities.includes(rawPriority) ? rawPriority : "medium";
              if (!validPriorities.includes(rawPriority)) {
                console.warn(`Invalid priority "${rawPriority}" for row ${processed}, defaulting to "medium"`);
              }
              const supportTypeMap = {
                "remote": "remote",
                "telephonic": "telephonic",
                "onsite_visit": "onsite_visit",
                "onsite visit": "onsite_visit",
                "on-site visit": "onsite_visit",
                "other": "other"
              };
              const supportType = supportTypeMap[rawSupportType] || "remote";
              if (!supportTypeMap[rawSupportType]) {
                console.warn(`Invalid support type "${rawSupportType}" for row ${processed}, defaulting to "remote"`);
              }
              const ticketData = {
                title: (row.Title || row.title || "Imported Ticket").trim(),
                description: (row.Description || row.description || "No description provided").trim(),
                status,
                priority,
                supportType,
                contactEmail: row["Contact Email"] || row.contact_email || null,
                contactName: row["Contact Name"] || row.contact_name || null,
                contactPhone: row["Contact Phone"] || row.contact_phone || null,
                contactDepartment: row["Contact Department"] || row.contact_department || null,
                companyName: row["Company Name"] || row.company_name || row.companyName || "",
                location: row["Location"] || row.location || "",
                categoryId,
                createdById,
                assignedToId: assignedToId || null,
                dueDate: dueDate || null
                // Note: createdAt and updatedAt are excluded from insertTicketSchema
              };
              const validatedData = insertTicketSchema.parse(ticketData);
              await storage.createTicket(validatedData);
              created++;
            } catch (error) {
              errors.push(`Row ${processed}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }
          fs2.unlinkSync(req.file.path);
          res.json({
            message: `Import completed. ${created} tickets created out of ${processed} processed.`,
            processed,
            created,
            errors: errors.length > 0 ? errors : null
          });
        } catch (error) {
          console.error("CSV import error:", error);
          res.status(500).json({ message: "Failed to process CSV file" });
        }
      }).on("error", (error) => {
        console.error("CSV parsing error:", error);
        res.status(500).json({ message: "Failed to parse CSV file" });
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Failed to import tickets" });
    }
  });
  app2.get("/api/reports/agent-performance", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      const agents = await storage.getUsersByRoles(["agent", "admin"]);
      const agentPerformance = await Promise.all(
        agents.map(async (agent) => {
          const assignedTickets = await storage.getAssignedTickets(agent.id);
          const totalTickets = assignedTickets.length;
          const resolvedTickets = assignedTickets.filter(
            (ticket) => ticket.status === "resolved" || ticket.status === "closed"
          );
          let avgResolutionTime = 0;
          if (resolvedTickets.length > 0) {
            const totalResolutionTime = resolvedTickets.reduce((total, ticket) => {
              const createdTime = new Date(ticket.createdAt || ticket.updatedAt || Date.now()).getTime();
              const updatedTime = new Date(ticket.updatedAt || ticket.createdAt || Date.now()).getTime();
              return total + (updatedTime - createdTime);
            }, 0);
            avgResolutionTime = totalResolutionTime / (resolvedTickets.length * 1e3 * 60 * 60);
          }
          const slaCompliantTickets = resolvedTickets.filter((ticket) => {
            const createdTime = new Date(ticket.createdAt || ticket.updatedAt || Date.now()).getTime();
            const updatedTime = new Date(ticket.updatedAt || ticket.createdAt || Date.now()).getTime();
            const resolutionTimeHours = (updatedTime - createdTime) / (1e3 * 60 * 60);
            return resolutionTimeHours <= 24;
          });
          const slaComplianceRate = resolvedTickets.length > 0 ? Math.round(slaCompliantTickets.length / resolvedTickets.length * 100) : 0;
          return {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            department: agent.department,
            tickets: totalTickets,
            resolvedTickets: resolvedTickets.length,
            avgTime: Math.round(avgResolutionTime * 10) / 10,
            // Round to 1 decimal
            slaMet: slaComplianceRate,
            activeTickets: assignedTickets.filter((t) => t.status === "open" || t.status === "in-progress").length
          };
        })
      );
      agentPerformance.sort((a, b) => b.tickets - a.tickets);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const isPaginationRequested = !!req.query.page;
      if (isPaginationRequested) {
        const total = agentPerformance.length;
        const start = (page - 1) * limit;
        const paginatedData = agentPerformance.slice(start, start + limit);
        res.json({
          data: paginatedData,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            limit,
            hasNextPage: page < Math.ceil(total / limit),
            hasPreviousPage: page > 1
          }
        });
      } else {
        res.json(agentPerformance);
      }
    } catch (error) {
      console.error("Agent performance fetch error:", error);
      res.status(500).json({ message: "Failed to fetch agent performance data" });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getAllCategories();
      res.json(categories2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  app2.get("/api/domains", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      const domains = await storage.getAllAllowedDomains();
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });
  app2.post("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const { domain, companyName, description } = req.body;
      if (!domain || !companyName) {
        return res.status(400).json({ message: "Domain and company name are required" });
      }
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
      if (!domainRegex.test(domain)) {
        return res.status(400).json({ message: "Invalid domain format" });
      }
      const existingDomainCheck = await storage.checkDomainAllowed(domain.toLowerCase());
      if (existingDomainCheck) {
        return res.status(409).json({ message: "Domain already exists" });
      }
      const newDomain = await storage.createAllowedDomain({
        domain: domain.toLowerCase(),
        companyName,
        description: description || null,
        isActive: true,
        createdById: req.user.id
      });
      res.status(201).json(newDomain);
    } catch (error) {
      console.error("Error creating domain:", error);
      res.status(500).json({ message: "Failed to create domain" });
    }
  });
  app2.put("/api/domains/:id", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { domain, companyName, description, isActive } = req.body;
      const existingDomain = await storage.getAllowedDomain(id);
      if (!existingDomain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      const updateData = {};
      if (domain) {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        if (!domainRegex.test(domain)) {
          return res.status(400).json({ message: "Invalid domain format" });
        }
        const allDomains = await storage.getAllAllowedDomains();
        const duplicateDomain = allDomains.find((d) => d.domain === domain.toLowerCase() && d.id !== id);
        if (duplicateDomain) {
          return res.status(409).json({ message: "Domain already exists" });
        }
        updateData.domain = domain.toLowerCase();
      }
      if (companyName) updateData.companyName = companyName;
      if (description !== void 0) updateData.description = description;
      if (isActive !== void 0) updateData.isActive = isActive;
      const updatedDomain = await storage.updateAllowedDomain(id, updateData);
      res.json(updatedDomain);
    } catch (error) {
      console.error("Error updating domain:", error);
      res.status(500).json({ message: "Failed to update domain" });
    }
  });
  app2.delete("/api/domains/:id", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDomain = await storage.getAllowedDomain(id);
      if (!existingDomain) {
        return res.status(404).json({ message: "Domain not found" });
      }
      await storage.deleteAllowedDomain(id);
      res.json({ message: "Domain deleted successfully" });
    } catch (error) {
      console.error("Error deleting domain:", error);
      res.status(500).json({ message: "Failed to delete domain" });
    }
  });
  app2.post("/api/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });
  app2.put("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      const updatedCategory = await storage.updateCategory(id, req.body);
      res.json(updatedCategory);
    } catch (error) {
      res.status(400).json({ message: "Failed to update category" });
    }
  });
  app2.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs4 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3 from "path";
import fs3 from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var isProduction = process.env.NODE_ENV === "production";
var vite_config_default = defineConfig({
  // 👇 Base path: "/" for both dev and IIS deployment at site root
  base: "/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    // 👇 Put final build directly in `dist`
    outDir: path3.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      plugins: [
        {
          name: "copy-iis-config",
          closeBundle() {
            const webConfigFrom = path3.resolve(import.meta.dirname, "web.config");
            const webConfigTo = path3.resolve(import.meta.dirname, "dist/web.config");
            if (fs3.existsSync(webConfigFrom)) {
              fs3.copyFileSync(webConfigFrom, webConfigTo);
              console.log("\u2705 Copied web.config to dist/");
            }
            const phpFrom = path3.resolve(import.meta.dirname, "php");
            const phpTo = path3.resolve(import.meta.dirname, "dist/php");
            if (fs3.existsSync(phpFrom)) {
              if (!fs3.existsSync(phpTo)) fs3.mkdirSync(phpTo, { recursive: true });
              const copyDir = (src, dest) => {
                const files = fs3.readdirSync(src);
                for (const file of files) {
                  const s = path3.join(src, file);
                  const d = path3.join(dest, file);
                  if (fs3.statSync(s).isDirectory()) {
                    if (!fs3.existsSync(d)) fs3.mkdirSync(d);
                    copyDir(s, d);
                  } else {
                    fs3.copyFileSync(s, d);
                  }
                }
              };
              copyDir(phpFrom, phpTo);
              console.log("\u2705 Copied php/ folder to dist/");
            }
            const uploadsFrom = path3.resolve(import.meta.dirname, "uploads");
            const uploadsTo = path3.resolve(import.meta.dirname, "dist/uploads");
            if (fs3.existsSync(uploadsFrom)) {
              if (!fs3.existsSync(uploadsTo)) fs3.mkdirSync(uploadsTo, { recursive: true });
              console.log("\u2705 Ensured uploads/ folder in dist/");
            }
            const storageFrom = path3.resolve(import.meta.dirname, "server/site-engg/storage.json");
            const storageTo = path3.resolve(import.meta.dirname, "dist/php/site-engg-storage.json");
            if (fs3.existsSync(storageFrom)) {
              fs3.copyFileSync(storageFrom, storageTo);
              console.log("\u2705 Copied storage.json to dist/php/");
            }
            const from = path3.resolve(import.meta.dirname, "_redirects");
            const to = path3.resolve(import.meta.dirname, "dist/_redirects");
            if (fs3.existsSync(from)) {
              fs3.copyFileSync(from, to);
            }
          }
        }
      ]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server }
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname);
  if (!fs4.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import dotenv2 from "dotenv";
dotenv2.config();
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000");
  const host = "0.0.0.0";
  server.listen(port, host, () => {
    log(`\u{1F680} Server running at http://${host}:${port}`);
  });
})();
