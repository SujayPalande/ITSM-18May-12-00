import {
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  tickets, type Ticket, type InsertTicket,
  comments, type Comment, type InsertComment,
  faqs, type Faq, type InsertFaq,
  chatMessages, type ChatMessage, type InsertChatMessage,
  allowedDomains, type AllowedDomain, type InsertAllowedDomain,
  type TicketWithRelations, type DashboardStats
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray, lt } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { connection } from "./db";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;
  getAllCategories(): Promise<Category[]>;
  getSubcategories(parentId: number): Promise<Category[]>;

  // Ticket operations
  getTicket(id: number): Promise<Ticket | undefined>;
  getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, data: Partial<InsertTicket>): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<void>;
  getUserTickets(userId: number): Promise<Ticket[]>;
  getAssignedTickets(userId: number): Promise<TicketWithRelations[]>;
  getAllTickets(): Promise<Ticket[]>;
  getAllTicketsWithRelations(): Promise<any[]>;
  getFilteredTickets(filters: { status?: string, priority?: string, categoryId?: number }): Promise<Ticket[]>;
  getTicketsCount(): Promise<{ [key: string]: number }>;
  getDashboardStats(): Promise<DashboardStats>;

  // New role-based methods
  getTicketsByAgent(agentId: number): Promise<TicketWithRelations[]>;
  getTicketsByUser(userId: number): Promise<TicketWithRelations[]>;
  getFilteredTicketsForAgent(agentId: number, filters: { status?: string, priority?: string, categoryId?: number }): Promise<TicketWithRelations[]>;
  getFilteredTicketsForUser(userId: number, filters: { status?: string, priority?: string, categoryId?: number }): Promise<TicketWithRelations[]>;
  getDashboardStatsForAgent(agentId: number): Promise<DashboardStats>;
  getDashboardStatsForUser(userId: number): Promise<DashboardStats>;
  getUsersByRoles(roles: string[]): Promise<User[]>;

  // New pagination and filtering methods
  getAllTicketsWithPagination(filters: any, page: number, limit: number): Promise<{
    tickets: any[];
    totalCount: number;
    statusCounts: { open: number; inProgress: number; closed: number };
  }>;
  getTicketsWithPaginationForRole(role: string, userId: number, filters: any, page: number, limit: number): Promise<{
    tickets: any[];
    totalCount: number;
    statusCounts: { open: number; inProgress: number; closed: number };
  }>;
  getFilteredTicketsForRole(role: string, userId: number, filters: any): Promise<any[]>;

  // Comment operations
  getComment(id: number): Promise<Comment | undefined>;
  getTicketComments(ticketId: number): Promise<(Comment & { user: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // FAQ operations
  getFaq(id: number): Promise<Faq | undefined>;
  getAllFaqs(): Promise<Faq[]>;
  getFaqsByCategory(categoryId: number): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  updateFaq(id: number, data: Partial<InsertFaq>): Promise<Faq | undefined>;

  // Chat operations
  getChatMessages(userId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Domain operations
  getAllowedDomain(id: number): Promise<AllowedDomain | undefined>;
  getAllAllowedDomains(): Promise<AllowedDomain[]>;
  createAllowedDomain(domain: InsertAllowedDomain): Promise<AllowedDomain>;
  updateAllowedDomain(id: number, data: Partial<InsertAllowedDomain>): Promise<AllowedDomain | undefined>;
  deleteAllowedDomain(id: number): Promise<void>;
  checkDomainAllowed(domain: string): Promise<boolean>;
  getCompanies(): Promise<string[]>;

  // Session store
  // Pagination methods
  getTicketsWithPagination(filters: any, page: number, limit: number): Promise<{ data: Ticket[], total: number }>;
  getUsersWithPagination(page: number, limit: number): Promise<{ data: User[], total: number }>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private tickets: Map<number, Ticket>;
  private comments: Map<number, Comment>;
  private faqs: Map<number, Faq>;
  private allowedDomains: Map<number, AllowedDomain>;
  private chatMessages: Map<number, ChatMessage>;

  sessionStore: session.Store;

  private userIdCounter: number;
  private categoryIdCounter: number;
  private ticketIdCounter: number;
  private commentIdCounter: number;
  private faqIdCounter: number;
  private domainIdCounter: number;
  private chatMessageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.tickets = new Map();
    this.comments = new Map();
    this.faqs = new Map();
    this.allowedDomains = new Map();
    this.chatMessages = new Map();

    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.ticketIdCounter = 1;
    this.commentIdCounter = 1;
    this.faqIdCounter = 1;
    this.domainIdCounter = 1;
    this.chatMessageIdCounter = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Initialize with sample data
    this.initializeData();
  }
  getTicketsWithPagination(filters: any, page: number, limit: number): Promise<{ data: Ticket[]; total: number; }> {
    throw new Error("Method not implemented.");
  }
  getUsersWithPagination(page: number, limit: number): Promise<{ data: User[]; total: number; }> {
    throw new Error("Method not implemented.");
  }

  private async initializeData() {
    // Initialize Categories
    const networkCat = await this.createCategory({ name: "Network Issues", parentId: null });
    const hardwareCat = await this.createCategory({ name: "Hardware", parentId: null });
    const emailCat = await this.createCategory({ name: "Email Services", parentId: null });
    const accountCat = await this.createCategory({ name: "Account & Password", parentId: null });

    // Initialize Subcategories
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

    // Initialize FAQs
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

    // Initialize Allowed Domains
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
      { name: "Shramajivi High School", domain: "" } // Blank domain as requested
    ];

    for (const company of companies) {
      await this.createAllowedDomain({
        domain: company.domain,
        companyName: company.name,
        description: "Initial seed data",
        isActive: true,
        createdById: 1 // System/Admin user
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined> {
    const uname = username?.toLowerCase?.() ?? '';
    const mail = email?.toLowerCase?.() ?? '';
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === uname || (user.email && user.email.toLowerCase() === mail)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    // Force role to be a string if it's undefined
    // Ensure all nullable/optional fields are present (no undefined)
    const role = insertUser.role || 'user';
    const user: User = {
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

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    // Remove the user
    this.users.delete(id);

    // Clear assignments and created references in tickets and remove comments by this user
    for (const [tid, ticket] of Array.from(this.tickets.entries())) {
      let changed = false;
      const updated = { ...ticket } as Ticket & { assignedToId: number | null };
      if (updated.assignedToId === id) {
        updated.assignedToId = null;
        changed = true;
      }
      // Note: we keep createdById as-is for now
      if (changed) this.tickets.set(tid, updated as Ticket);
    }

    for (const [cid, comment] of Array.from(this.comments.entries())) {
      if (comment.userId === id) {
        this.comments.delete(cid);
      }
    }
  }
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    );
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const category: Category = { id, name: insertCategory.name, parentId: insertCategory.parentId ?? null };
    this.categories.set(id, category);
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getSubcategories(parentId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.parentId === parentId
    );
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = await this.getCategory(id);
    if (!category) return undefined;

    const updatedCategory: Category = { ...category, ...data };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    // Check if category exists
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has subcategories
    const subcategories = await this.getSubcategories(id);
    if (subcategories.length > 0) {
      throw new Error("Cannot delete category with subcategories. Please delete subcategories first.");
    }

    // Check if category is used by any tickets
    const ticketsUsingCategory = Array.from(this.tickets.values()).filter(
      (ticket) => ticket.categoryId === id || ticket.subcategoryId === id
    );

    if (ticketsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category. It is being used by ${ticketsUsingCategory.length} ticket(s).`);
    }

    // Safe to delete
    this.categories.delete(id);
  }

  // Ticket operations
  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;

    const category = await this.getCategory(ticket.categoryId);
    if (!category) return undefined;

    let subcategory = undefined;
    if (ticket.subcategoryId) {
      subcategory = await this.getCategory(ticket.subcategoryId);
    }

    const createdBy = await this.getUser(ticket.createdById);
    if (!createdBy) return undefined;

    let assignedTo = undefined;
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

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = this.ticketIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    // Set default values for fields that might be undefined
    const status = insertTicket.status || 'open';
    const priority = insertTicket.priority || 'medium';
    const ticket: Ticket = {
      id,
      title: insertTicket.title,
      description: insertTicket.description,
      status,
      priority,
      supportType: insertTicket.supportType ?? 'remote',
      contactEmail: insertTicket.contactEmail ?? null,
      contactName: insertTicket.contactName ?? null,
      contactPhone: insertTicket.contactPhone ?? null,
      contactDepartment: insertTicket.contactDepartment ?? null,
      companyName: insertTicket.companyName ?? '',
      location: insertTicket.location ?? '',
      categoryId: insertTicket.categoryId,
      subcategoryId: insertTicket.subcategoryId ?? null,
      createdById: insertTicket.createdById,
      assignedToId: insertTicket.assignedToId ?? null,
      dueDate: insertTicket.dueDate ?? null,
      attachmentUrl: insertTicket.attachmentUrl ?? null,
      attachmentName: insertTicket.attachmentName ?? null,
      createdAt,
      updatedAt,
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: number, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;

    const updatedTicket: Ticket = {
      ...ticket,
      ...data,
      updatedAt: new Date()
    };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async deleteTicket(id: number): Promise<void> {
    this.tickets.delete(id);
    // Also delete related comments
    Array.from(this.comments.values()).forEach(comment => {
      if (comment.ticketId === id) {
        this.comments.delete(comment.id);
      }
    });
  }

  async getUserTickets(userId: number): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).filter(
      (ticket) => ticket.createdById === userId
    );
  }

  async getAllTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values());
  }

  async getAllTicketsWithRelations(): Promise<any[]> {
    // For in-memory storage, just return basic tickets since this is not used in development
    return Array.from(this.tickets.values());
  }

  async getFilteredTickets(filters: { status?: string, priority?: string, categoryId?: number }): Promise<Ticket[]> {
    let result = Array.from(this.tickets.values());

    if (filters.status) {
      result = result.filter(ticket => ticket.status === filters.status);
    }

    if (filters.priority) {
      result = result.filter(ticket => ticket.priority === filters.priority);
    }

    if (filters.categoryId) {
      result = result.filter(ticket =>
        ticket.categoryId === filters.categoryId ||
        ticket.subcategoryId === filters.categoryId
      );
    }

    return result;
  }

  async getTicketsCount(): Promise<{ [key: string]: number }> {
    const tickets = await this.getAllTickets();

    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      pending: tickets.filter(t => t.status === 'pending-user' || t.status === 'pending-approval').length,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const counts = await this.getTicketsCount();
    const allTickets = await this.getAllTickets();
    const unassignedCount = allTickets.filter(t => t.assignedToId === null).length;

    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: counts.pending,
      avgResponseTime: "4.2 hours", // Sample value
      slaComplianceRate: "94%"      // Sample value
    };
  }

  // Helper method to filter tickets based on various criteria
  private async filterTickets(tickets: Ticket[], filters: any): Promise<Ticket[]> {
    let result = [...tickets];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm) ||
        ticket.description.toLowerCase().includes(searchTerm) ||
        `TKT-${ticket.id.toString().padStart(4, '0')}`.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter(ticket => ticket.status === filters.status);
    }

    // Apply priority filter
    if (filters.priority) {
      result = result.filter(ticket => ticket.priority === filters.priority);
    }

    // Apply category filter
    if (filters.categoryId) {
      result = result.filter(ticket =>
        ticket.categoryId === filters.categoryId ||
        ticket.subcategoryId === filters.categoryId
      );
    }

    // Apply assignedTo filter
    if (filters.assignedToId !== undefined) {
      if (filters.assignedToId === null) {
        // Show unassigned tickets
        result = result.filter(ticket => ticket.assignedToId === null);
      } else {
        // Show tickets assigned to specific user
        result = result.filter(ticket => ticket.assignedToId === filters.assignedToId);
      }
    }

    return result;
  }

  // Helper method to get status counts from filtered tickets
  private getStatusCounts(tickets: Ticket[]): { open: number; inProgress: number; closed: number } {
    return {
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      closed: tickets.filter(t => t.status === 'closed').length
    };
  }

  // Get tickets based on role
  private async getTicketsForRole(role: string, userId: number): Promise<Ticket[]> {
    let tickets: Ticket[];

    if (role === "admin") {
      tickets = await this.getAllTickets();
    } else if (role === "agent") {
      tickets = Array.from(this.tickets.values()).filter(
        ticket => ticket.assignedToId === userId || ticket.createdById === userId
      );
    } else {
      tickets = await this.getUserTickets(userId);
    }

    return tickets;
  }

  async getAllTicketsWithPagination(filters: any, page: number, limit: number): Promise<{
    tickets: any[];
    totalCount: number;
    statusCounts: { open: number; inProgress: number; closed: number };
  }> {
    // Get all tickets and apply filters
    let tickets = await this.getAllTickets();
    const filteredTickets = await this.filterTickets(tickets, filters);

    // Calculate status counts from all filtered tickets
    const statusCounts = this.getStatusCounts(filteredTickets);

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedTickets = filteredTickets.slice(offset, offset + limit);

    return {
      tickets: paginatedTickets,
      totalCount: filteredTickets.length,
      statusCounts
    };
  }

  async getTicketsWithPaginationForRole(role: string, userId: number, filters: any, page: number, limit: number): Promise<{
    tickets: any[];
    totalCount: number;
    statusCounts: { open: number; inProgress: number; closed: number };
  }> {
    // Get tickets based on role and apply filters
    let tickets = await this.getTicketsForRole(role, userId);
    const filteredTickets = await this.filterTickets(tickets, filters);

    // Calculate status counts from all filtered tickets
    const statusCounts = this.getStatusCounts(filteredTickets);

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedTickets = filteredTickets.slice(offset, offset + limit);

    return {
      tickets: paginatedTickets,
      totalCount: filteredTickets.length,
      statusCounts
    };
  }

  async getFilteredTicketsForRole(role: string, userId: number, filters: any): Promise<any[]> {
    // Get tickets based on role and apply filters
    let tickets = await this.getTicketsForRole(role, userId);
    return await this.filterTickets(tickets, filters);
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async getTicketComments(ticketId: number): Promise<(Comment & { user: User })[]> {
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

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const createdAt = new Date();
    const comment: Comment = {
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
  async getFaq(id: number): Promise<Faq | undefined> {
    return this.faqs.get(id);
  }

  async getAllFaqs(): Promise<Faq[]> {
    return Array.from(this.faqs.values());
  }

  async getFaqsByCategory(categoryId: number): Promise<Faq[]> {
    return Array.from(this.faqs.values()).filter(
      (faq) => faq.categoryId === categoryId
    );
  }

  async createFaq(insertFaq: InsertFaq): Promise<Faq> {
    const id = this.faqIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const viewCount = 0;
    const faq: Faq = {
      id,
      question: insertFaq.question,
      answer: insertFaq.answer,
      categoryId: insertFaq.categoryId ?? null,
      viewCount,
      createdAt,
      updatedAt,
    };
    this.faqs.set(id, faq);
    return faq;
  }

  async updateFaq(id: number, data: Partial<InsertFaq>): Promise<Faq | undefined> {
    const faq = await this.getFaq(id);
    if (!faq) return undefined;

    const updatedFaq: Faq = {
      ...faq,
      ...data,
      updatedAt: new Date()
    };
    this.faqs.set(id, updatedFaq);
    return updatedFaq;
  }

  // Chat operations
  async getChatMessages(userId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(
      (message) => message.userId === userId
    );
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessageIdCounter++;
    const createdAt = new Date();
    const message: ChatMessage = {
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
  async getAllowedDomain(id: number): Promise<AllowedDomain | undefined> {
    return this.allowedDomains.get(id);
  }

  async getAllAllowedDomains(): Promise<AllowedDomain[]> {
    return Array.from(this.allowedDomains.values());
  }

  async createAllowedDomain(insertDomain: InsertAllowedDomain): Promise<AllowedDomain> {
    const id = this.domainIdCounter++;
    const createdAt = new Date();
    const domain: AllowedDomain = {
      id,
      domain: insertDomain.domain,
      companyName: insertDomain.companyName,
      description: insertDomain.description ?? null,
      isActive: insertDomain.isActive ?? true,
      createdById: insertDomain.createdById,
      createdAt,
      updatedAt: createdAt,
    };
    this.allowedDomains.set(id, domain);
    return domain;
  }

  async updateAllowedDomain(id: number, data: Partial<InsertAllowedDomain>): Promise<AllowedDomain | undefined> {
    const existing = await this.getAllowedDomain(id);
    if (!existing) return undefined;
    const updated: AllowedDomain = {
      ...existing,
      ...data,
      updatedAt: new Date()
    } as AllowedDomain;
    this.allowedDomains.set(id, updated);
    return updated;
  }

  async deleteAllowedDomain(id: number): Promise<void> {
    this.allowedDomains.delete(id);
  }

  async checkDomainAllowed(domain: string): Promise<boolean> {
    return Array.from(this.allowedDomains.values()).some(d => d.domain === domain && d.isActive === true);
  }

  async getCompanies(): Promise<string[]> {
    const companies = new Set<string>();
    const domains = Array.from(this.allowedDomains.values());
    for (const domain of domains) {
      if (domain.isActive && domain.companyName) {
        companies.add(domain.companyName);
      }
    }
    return Array.from(companies).sort();
  }

  // Implement missing role-based / helper methods expected by IStorage
  async getAssignedTickets(userId: number): Promise<TicketWithRelations[]> {
    const assigned = Array.from(this.tickets.values()).filter(t => t.assignedToId === userId);
    const result: TicketWithRelations[] = [];
    for (const t of assigned) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }

  async getTicketsByAgent(agentId: number): Promise<TicketWithRelations[]> {
    const assigned = Array.from(this.tickets.values()).filter(t => t.assignedToId === agentId || t.createdById === agentId);
    const result: TicketWithRelations[] = [];
    for (const t of assigned) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }

  async getTicketsByUser(userId: number): Promise<TicketWithRelations[]> {
    const userTickets = Array.from(this.tickets.values()).filter(t => t.createdById === userId);
    const result: TicketWithRelations[] = [];
    for (const t of userTickets) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }

  async getFilteredTicketsForAgent(agentId: number, filters: { status?: string, priority?: string, categoryId?: number }): Promise<TicketWithRelations[]> {
    const tickets = Array.from(this.tickets.values()).filter(t => t.assignedToId === agentId || t.createdById === agentId);
    const filtered = await this.filterTickets(tickets, filters as any);
    const result: TicketWithRelations[] = [];
    for (const t of filtered) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }

  async getFilteredTicketsForUser(userId: number, filters: { status?: string, priority?: string, categoryId?: number }): Promise<TicketWithRelations[]> {
    const tickets = Array.from(this.tickets.values()).filter(t => t.createdById === userId);
    const filtered = await this.filterTickets(tickets, filters as any);
    const result: TicketWithRelations[] = [];
    for (const t of filtered) {
      const tw = await this.getTicketWithRelations(t.id);
      if (tw) result.push(tw);
    }
    return result;
  }

  async getDashboardStatsForAgent(agentId: number): Promise<DashboardStats> {
    const tickets = await this.getTicketsByAgent(agentId);
    const counts = {
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
    const unassignedCount = tickets.filter(t => t.assignedToId === null).length;
    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: tickets.filter(t => t.status === 'pending-user' || t.status === 'pending-approval').length,
      avgResponseTime: "N/A",
      slaComplianceRate: "N/A"
    };
  }

  async getDashboardStatsForUser(userId: number): Promise<DashboardStats> {
    const tickets = await this.getTicketsByUser(userId);
    const counts = {
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
    const unassignedCount = tickets.filter(t => t.assignedToId === null).length;
    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: tickets.filter(t => t.status === 'pending-user' || t.status === 'pending-approval').length,
      avgResponseTime: "N/A",
      slaComplianceRate: "N/A"
    };
  }

  async getUsersByRoles(roles: string[]): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => roles.includes(u.role));
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.initializeData();
  }

  private async initializeData() {
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
      { name: "Shramajivi High School", domain: "" } // Blank domain as requested
    ];

    console.log("Starting domain seeding...");

    for (const company of companies) {
      try {
        // Check if this specific domain exists
        const [existing] = await db.select().from(allowedDomains).where(eq(allowedDomains.domain, company.domain));

        if (!existing) {
          await this.createAllowedDomain({
            domain: company.domain,
            companyName: company.name,
            description: "Initial seed data",
            isActive: true,
            createdById: 1 // System/Admin user
          });
          console.log(`Seeded domain: ${company.domain} for ${company.name}`);
        } else {
          // Ensure company name matches (in case it was updated/corrected)
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
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`${users.username} = ${username} OR ${users.email} = ${email}`
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser);
    const insertId = result[0].insertId;
    const user = await this.getUser(Number(insertId));
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    await db.update(users)
      .set(data)
      .where(eq(users.id, id));
    return await this.getUser(id);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }


  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(insertCategory);
    const insertId = result[0].insertId;
    const category = await this.getCategory(Number(insertId));
    if (!category) throw new Error('Failed to create category');
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getSubcategories(parentId: number): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.parentId, parentId));
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    await db.update(categories)
      .set(data)
      .where(eq(categories.id, id));
    return await this.getCategory(id);
  }

  async deleteCategory(id: number): Promise<void> {
    // Check if category exists
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has subcategories
    const subcategories = await this.getSubcategories(id);
    if (subcategories.length > 0) {
      throw new Error("Cannot delete category with subcategories. Please delete subcategories first.");
    }

    // Check if category is used by any tickets
    const ticketsUsingCategory = await db.select()
      .from(tickets)
      .where(sql`${tickets.categoryId} = ${id} OR ${tickets.subcategoryId} = ${id}`);

    if (ticketsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category. It is being used by ${ticketsUsingCategory.length} ticket(s).`);
    }

    // Safe to delete
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Ticket operations
  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async getTicketWithRelations(id: number): Promise<TicketWithRelations | undefined> {
    const ticket = await this.getTicket(id);
    if (!ticket) return undefined;

    const category = await this.getCategory(ticket.categoryId);
    if (!category) return undefined;

    let subcategory = undefined;
    if (ticket.subcategoryId) {
      subcategory = await this.getCategory(ticket.subcategoryId);
    }

    const createdBy = await this.getUser(ticket.createdById);
    if (!createdBy) return undefined;

    let assignedTo = undefined;
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

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    try {
      const result = await db.insert(tickets).values({
        title: insertTicket.title,
        description: insertTicket.description,
        status: insertTicket.status || 'open',
        priority: insertTicket.priority || 'medium',
        supportType: insertTicket.supportType || 'remote',
        companyName: insertTicket.companyName || '',
        location: insertTicket.location || '',
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
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const insertId = result[0].insertId;
      const ticket = await this.getTicket(Number(insertId));
      if (!ticket) throw new Error('Failed to create ticket');
      return ticket;
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }
  }

  async updateTicket(id: number, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    await db.update(tickets)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, id));
    return await this.getTicket(id);
  }

  async deleteTicket(id: number): Promise<void> {
    await db.delete(tickets).where(eq(tickets.id, id));
  }

  async getUserTickets(userId: number): Promise<Ticket[]> {
    return await db.select().from(tickets).where(eq(tickets.createdById, userId));
  }

  async getAssignedTickets(userId: number): Promise<TicketWithRelations[]> {
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
        const assignedTo = await this.getUser(ticket.assignedToId!);

        const ticketComments = await this.getTicketComments(ticket.id);
        // Only include tickets with required relations
        if (!category || !createdBy) continue;
        ticketsWithRelations.push({
          ...ticket,
          category,
          subcategory: subcategory ?? undefined,
          createdBy,
          assignedTo: assignedTo ?? undefined,
          comments: ticketComments
        } as TicketWithRelations);
      }

      return ticketsWithRelations;
    } catch (error) {
      console.error("Error getting assigned tickets:", error);
      throw error;
    }
  }

  async getAllTickets(): Promise<Ticket[]> {
    try {
      return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    } catch (error) {
      console.error("Error fetching tickets:", error);
      throw error;
    }
  }


  async getAllTicketsWithRelations(): Promise<any[]> {
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

        // Get comment count
        const ticketComments = await this.getTicketComments(ticket.id);
        const commentCount = ticketComments.length;
        if (!category || !createdBy) continue;
        ticketsWithRelations.push({
          ...ticket,
          category,
          subcategory: subcategory ?? undefined,
          createdBy,
          assignedTo: assignedTo ?? undefined,
          commentCount
        } as any);
      }

      return ticketsWithRelations;
    } catch (error) {
      console.error("Error in getAllTicketsWithRelations:", error);
      throw error;
    }
  }

  async getFilteredTickets(filters: { status?: string, priority?: string, categoryId?: number }): Promise<Ticket[]> {
    let query: any = db.select().from(tickets);

    if (filters.status) {
      query = query.where(eq(tickets.status, filters.status));
    }

    if (filters.priority) {
      query = query.where(eq(tickets.priority, filters.priority));
    }

    if (filters.categoryId) {
      // This handles both category and subcategory
      query = query.where(
        sql`${tickets.categoryId} = ${filters.categoryId} OR 
            ${tickets.subcategoryId} = ${filters.categoryId}`
      );
    }

    return await query;
  }

  async getTicketsCount(): Promise<{ [key: string]: number }> {
    const allTickets = await this.getAllTickets();

    return {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'open').length,
      inProgress: allTickets.filter(t => t.status === 'in-progress').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.filter(t => t.status === 'closed').length,
      pending: allTickets.filter(t => t.status === 'pending-user' || t.status === 'pending-approval').length,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const counts = await this.getTicketsCount();
    const allTickets = await this.getAllTickets();
    const unassignedCount = allTickets.filter(t => t.assignedToId === null).length;

    return {
      summary: null,
      openTickets: counts.open,
      inProgressTickets: counts.inProgress,
      resolvedTickets: counts.resolved,
      closedTickets: counts.closed,
      unassignedTickets: unassignedCount,
      pendingTickets: counts.pending,
      avgResponseTime: "4.2 hours", // This could be calculated from actual data
      slaComplianceRate: "94%" // This could be calculated from actual data
    };
  }

  // New role-based methods
  async getTicketsByAgent(agentId: number): Promise<TicketWithRelations[]> {
    try {
      // Get tickets assigned to agent OR created by agent
      const agentTickets = await db.select().from(tickets)
        .where(sql`${tickets.assignedToId} = ${agentId} OR ${tickets.createdById} = ${agentId}`);

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

  async getTicketsByUser(userId: number): Promise<TicketWithRelations[]> {
    try {
      const userTickets = await db.select().from(tickets)
        .where(eq(tickets.createdById, userId));

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

  async getFilteredTicketsForAgent(agentId: number, filters: { status?: string, priority?: string, categoryId?: number }): Promise<TicketWithRelations[]> {
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

  async getFilteredTicketsForUser(userId: number, filters: { status?: string, priority?: string, categoryId?: number }): Promise<TicketWithRelations[]> {
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

  async getDashboardStatsForAgent(agentId: number): Promise<DashboardStats> {
    try {
      const agentTickets = await this.getTicketsByAgent(agentId);

      const counts = {
        open: agentTickets.filter(t => t.status === 'open').length,
        inProgress: agentTickets.filter(t => t.status === 'in-progress').length,
        resolved: agentTickets.filter(t => t.status === 'resolved').length,
        closed: agentTickets.filter(t => t.status === 'closed').length
      };

      const unassignedCount = agentTickets.filter(t => t.assignedToId === null).length;

      return {
        summary: null,
        openTickets: counts.open,
        inProgressTickets: counts.inProgress,
        resolvedTickets: counts.resolved,
        closedTickets: counts.closed,
        unassignedTickets: unassignedCount,
        pendingTickets: agentTickets.filter(t => t.status === 'pending-user' || t.status === 'pending-approval').length,
        avgResponseTime: "1.8 hours",
        slaComplianceRate: "96%"
      };
    } catch (error) {
      console.error("Error getting agent dashboard stats:", error);
      throw error;
    }
  }

  async getDashboardStatsForUser(userId: number): Promise<DashboardStats> {
    try {
      const userTickets = await this.getTicketsByUser(userId);

      const counts = {
        open: userTickets.filter(t => t.status === 'open').length,
        inProgress: userTickets.filter(t => t.status === 'in-progress').length,
        resolved: userTickets.filter(t => t.status === 'resolved').length,
        closed: userTickets.filter(t => t.status === 'closed').length
      };

      const unassignedCount = userTickets.filter(t => t.assignedToId === null).length;

      return {
        summary: null,
        openTickets: counts.open,
        inProgressTickets: counts.inProgress,
        resolvedTickets: counts.resolved,
        closedTickets: counts.closed,
        unassignedTickets: unassignedCount,
        pendingTickets: userTickets.filter(t => t.status === 'pending-user' || t.status === 'pending-approval').length,
        avgResponseTime: "N/A",
        slaComplianceRate: "N/A"
      };
    } catch (error) {
      console.error("Error getting user dashboard stats:", error);
      throw error;
    }
  }

  async getUsersByRoles(roles: string[]): Promise<User[]> {
    try {
      return await db.select().from(users)
        .where(inArray(users.role, roles));
    } catch (error) {
      console.error("Error getting users by roles:", error);
      throw error;
    }
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async getTicketComments(ticketId: number): Promise<(Comment & { user: User })[]> {
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

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const result = await db.insert(comments).values({
      ...insertComment,
      createdAt: new Date()
    });
    const insertId = result[0].insertId;
    const comment = await this.getComment(Number(insertId));
    if (!comment) throw new Error('Failed to create comment');
    return comment;
  }

  // FAQ operations
  async getFaq(id: number): Promise<Faq | undefined> {
    const [faq] = await db.select().from(faqs).where(eq(faqs.id, id));
    return faq;
  }

  async getAllFaqs(): Promise<Faq[]> {
    return await db.select().from(faqs);
  }

  async getFaqsByCategory(categoryId: number): Promise<Faq[]> {
    return await db.select().from(faqs).where(eq(faqs.categoryId, categoryId));
  }

  async createFaq(insertFaq: InsertFaq): Promise<Faq> {
    const result = await db.insert(faqs).values({
      ...insertFaq,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const insertId = result[0].insertId;
    const faq = await this.getFaq(Number(insertId));
    if (!faq) throw new Error('Failed to create FAQ');
    return faq;
  }

  async updateFaq(id: number, data: Partial<InsertFaq>): Promise<Faq | undefined> {
    await db.update(faqs)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(faqs.id, id));
    return await this.getFaq(id);
  }

  // Chat operations
  async getChatMessages(userId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values({
      ...insertMessage,
      createdAt: new Date()
    });
    const insertId = result[0].insertId;
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, Number(insertId)));
    if (!message) throw new Error('Failed to create chat message');
    return message;
  }

  // Helper method to build filter conditions for tickets
  private buildTicketFilters(filters: any): any[] {
    const conditions: any[] = [];

    // Apply search filter
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

    // Apply status filter
    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status));
    }



    // Apply priority filter
    if (filters.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }

    // Apply category filter
    if (filters.categoryId) {
      conditions.push(
        or(
          eq(tickets.categoryId, filters.categoryId),
          eq(tickets.subcategoryId, filters.categoryId)
        )
      );
    }

    // Apply assignedTo filter
    if (filters.assignedToId !== undefined) {
      if (filters.assignedToId === null) {
        conditions.push(sql`${tickets.assignedToId} IS NULL`);
      } else {
        conditions.push(eq(tickets.assignedToId, filters.assignedToId));
      }
    }

    return conditions;
  }

  async getTicketsWithPagination(filters: any, page: number, limit: number): Promise<{ data: Ticket[], total: number }> {
    const conditions = this.buildTicketFilters(filters);

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(...conditions));
    const total = Number(countResult[0].count);

    // Get paginated data
    const data = await db.select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { data, total };
  }

  async getUsersWithPagination(page: number, limit: number): Promise<{ data: User[], total: number }> {
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const total = Number(countResult[0].count);

    // Get paginated data
    const data = await db.select()
      .from(users)
      .limit(limit)
      .offset((page - 1) * limit);

    return { data, total };
  }

  // Helper method to build role-based conditions
  private buildRoleConditions(role: string, userId: number): any[] {
    const conditions: any[] = [];

    if (role === "admin") {
      // Admin sees all tickets - no additional conditions
    } else if (role === "agent") {
      // Agent sees tickets assigned to them or created by them
      conditions.push(
        or(
          eq(tickets.assignedToId, userId),
          eq(tickets.createdById, userId)
        )
      );
    } else {
      // Regular user sees only tickets they created
      conditions.push(eq(tickets.createdById, userId));
    }

    return conditions;
  }

  async getAllTicketsWithPagination(filters: any, page: number, limit: number): Promise<{
    tickets: any[];
    totalCount: number;
    statusCounts: { open: number; inProgress: number; closed: number };
  }> {
    const filterConditions = this.buildTicketFilters(filters);
    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Get total count with filters
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(whereClause);
    const totalCount = totalCountResult[0]?.count || 0;

    // Get status counts with filters
    const statusCountsResult = await db
      .select({
        status: tickets.status,
        count: sql<number>`count(*)`
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(tickets.status);

    const statusCounts = {
      open: 0,
      inProgress: 0,
      closed: 0
    };

    statusCountsResult.forEach(row => {
      if (row.status === 'open') statusCounts.open = row.count;
      else if (row.status === 'in-progress') statusCounts.inProgress = row.count;
      else if (row.status === 'closed') statusCounts.closed = row.count;
    });

    // Get paginated tickets with relations
    const offset = (page - 1) * limit;
    const ticketResults = await db
      .select({
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
      })
      .from(tickets)
      .leftJoin(categories, eq(tickets.categoryId, categories.id))
      .leftJoin(sql`categories AS sub_cat`, sql`${tickets.subcategoryId} = sub_cat.id`)
      .leftJoin(sql`users AS created_by`, sql`${tickets.createdById} = created_by.id`)
      .leftJoin(sql`users AS assigned_to`, sql`${tickets.assignedToId} = assigned_to.id`)
      .where(whereClause)
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      tickets: ticketResults,
      totalCount,
      statusCounts
    };
  }

  async getTicketsWithPaginationForRole(role: string, userId: number, filters: any, page: number, limit: number): Promise<{
    tickets: any[];
    totalCount: number;
    statusCounts: { open: number; inProgress: number; closed: number };
  }> {
    const filterConditions = this.buildTicketFilters(filters);
    const roleConditions = this.buildRoleConditions(role, userId);
    const allConditions = [...filterConditions, ...roleConditions];
    const whereClause = allConditions.length > 0 ? and(...allConditions) : undefined;

    // Get total count with filters and role
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(whereClause);
    const totalCount = totalCountResult[0]?.count || 0;

    // Get status counts with filters and role
    const statusCountsResult = await db
      .select({
        status: tickets.status,
        count: sql<number>`count(*)`
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(tickets.status);

    const statusCounts = {
      open: 0,
      inProgress: 0,
      closed: 0
    };

    statusCountsResult.forEach(row => {
      if (row.status === 'open') statusCounts.open = row.count;
      else if (row.status === 'in-progress') statusCounts.inProgress = row.count;
      else if (row.status === 'closed') statusCounts.closed = row.count;
    });

    // Get paginated tickets with relations
    const offset = (page - 1) * limit;
    const ticketResults = await db
      .select({
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
      })
      .from(tickets)
      .leftJoin(categories, eq(tickets.categoryId, categories.id))
      .leftJoin(sql`categories AS sub_cat`, sql`${tickets.subcategoryId} = sub_cat.id`)
      .leftJoin(sql`users AS created_by`, sql`${tickets.createdById} = created_by.id`)
      .leftJoin(sql`users AS assigned_to`, sql`${tickets.assignedToId} = assigned_to.id`)
      .where(whereClause)
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      tickets: ticketResults,
      totalCount,
      statusCounts
    };
  }

  async getFilteredTicketsForRole(role: string, userId: number, filters: any): Promise<any[]> {
    const filterConditions = this.buildTicketFilters(filters);
    const roleConditions = this.buildRoleConditions(role, userId);
    const allConditions = [...filterConditions, ...roleConditions];
    const whereClause = allConditions.length > 0 ? and(...allConditions) : undefined;

    const ticketResults = await db
      .select({
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
      })
      .from(tickets)
      .leftJoin(categories, eq(tickets.categoryId, categories.id))
      .leftJoin(sql`categories AS sub_cat`, sql`${tickets.subcategoryId} = sub_cat.id`)
      .leftJoin(sql`users AS created_by`, sql`${tickets.createdById} = created_by.id`)
      .leftJoin(sql`users AS assigned_to`, sql`${tickets.assignedToId} = assigned_to.id`)
      .where(whereClause)
      .orderBy(desc(tickets.createdAt));

    return ticketResults;
  }

  // Domain operations
  async getAllowedDomain(id: number): Promise<AllowedDomain | undefined> {
    const [domain] = await db.select().from(allowedDomains).where(eq(allowedDomains.id, id));
    return domain;
  }

  async getAllAllowedDomains(): Promise<AllowedDomain[]> {
    return await db.select().from(allowedDomains).orderBy(allowedDomains.id);
  }

  async createAllowedDomain(insertDomain: InsertAllowedDomain): Promise<AllowedDomain> {
    const result = await db.insert(allowedDomains).values({
      ...insertDomain,
      createdAt: new Date()
    });
    const insertId = result[0].insertId;
    const [domain] = await db.select().from(allowedDomains).where(eq(allowedDomains.id, Number(insertId)));
    if (!domain) throw new Error('Failed to create allowed domain');
    return domain;
  }

  async updateAllowedDomain(id: number, data: Partial<InsertAllowedDomain>): Promise<AllowedDomain | undefined> {
    await db.update(allowedDomains).set(data).where(eq(allowedDomains.id, id));
    return await this.getAllowedDomain(id);
  }

  async deleteAllowedDomain(id: number): Promise<void> {
    await db.delete(allowedDomains).where(eq(allowedDomains.id, id));
  }

  async checkDomainAllowed(domain: string): Promise<boolean> {
    const [result] = await db.select()
      .from(allowedDomains)
      .where(and(
        eq(allowedDomains.domain, domain),
        eq(allowedDomains.isActive, true)
      ))
      .limit(1);
    return !!result;
  }

  async getCompanies(): Promise<string[]> {
    const result = await db.selectDistinct({ companyName: allowedDomains.companyName })
      .from(allowedDomains)
      .where(eq(allowedDomains.isActive, true))
      .orderBy(allowedDomains.companyName);

    return result.map(r => r.companyName);
  }
}

// Choose storage implementation based on environment. In development or when
// USE_MEMSTORE=true is set, prefer the in-memory store to avoid requiring a
// live DB (useful for local dev and CI). Production will use DatabaseStorage.
export const storage = (process.env.USE_MEMSTORE === 'true' || process.env.NODE_ENV === 'development')
  ? new MemStorage()
  : new DatabaseStorage();