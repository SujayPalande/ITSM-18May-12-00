import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import csv from "csv-parser";
import * as createCsvWriter from "csv-writer";
import { sendTicketCreatedEmail, sendStatusChangeEmail } from "./email";
import { registerSiteEnggRoutes } from "./site-engg/routes";
import {
  insertTicketSchema, insertCommentSchema,
  insertFaqSchema, insertChatMessageSchema, insertCategorySchema,
  allowedDomains, insertAllowedDomainSchema
} from "@shared/schema";


// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Admin access required" });
};

// Middleware to check if user is an admin or agent
const isSupportStaff = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && (req.user?.role === "admin" || req.user?.role === "agent")) {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Support staff access required" });
};

// Role-based middleware factory
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (installs session middleware)
  await setupAuth(app);

  // Setup Site-Engg routes
  registerSiteEnggRoutes(app);



  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|csv/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'text/csv' || file.mimetype === 'application/csv';

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images, PDFs, documents, and CSV files are allowed'));
      }
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/categories/:id/subcategories", async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const subcategories = await storage.getSubcategories(parentId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });


  app.post("/api/categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  app.delete("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Tickets - Role-based access with optional pagination and filtering
  app.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      console.log("=== TICKETS API CALLED ===");
      console.log("User:", req.user);
      console.log("Query params:", req.query);

      // Extract query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const priority = req.query.priority as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const assignedToId = req.query.assignedToId ? parseInt(req.query.assignedToId as string) : undefined;

      // Determine if pagination is requested
      const isPaginationRequested = page !== undefined && limit !== undefined;

      // Build filters object
      const filters = {
        search,
        status,
        priority,
        categoryId,
        assignedToId: assignedToId === 0 ? null : assignedToId // 0 means unassigned
      };

      // Remove undefined values from filters
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      // For non-admin roles, ignore assignedToId filter to prevent conflicts with role-based access
      if (req.user?.role !== "admin" && 'assignedToId' in filters) {
        delete filters.assignedToId;
      }

      let tickets;
      let totalCount = 0;
      let statusCounts = { open: 0, inProgress: 0, closed: 0 };

      if (req.user?.role === "admin") {
        // Admin sees all tickets with filtering
        if (isPaginationRequested) {
          const result = await storage.getAllTicketsWithPagination(filters, page!, limit!);
          tickets = result.tickets;
          totalCount = result.totalCount;
          statusCounts = result.statusCounts;
        } else {
          tickets = await storage.getFilteredTicketsForRole("admin", req.user.id, filters);
        }
      } else if (req.user?.role === "agent") {
        // Agent sees assigned tickets with filtering
        if (isPaginationRequested) {
          const result = await storage.getTicketsWithPaginationForRole("agent", req.user.id, filters, page!, limit!);
          tickets = result.tickets;
          totalCount = result.totalCount;
          statusCounts = result.statusCounts;
        } else {
          tickets = await storage.getFilteredTicketsForRole("agent", req.user.id, filters);
        }
      } else {
        // User sees own tickets with filtering
        if (isPaginationRequested) {
          const result = await storage.getTicketsWithPaginationForRole("user", req.user!.id, filters, page!, limit!);
          tickets = result.tickets;
          totalCount = result.totalCount;
          statusCounts = result.statusCounts;
        } else {
          tickets = await storage.getFilteredTicketsForRole("user", req.user!.id, filters);
        }
      }

      // Return appropriate format based on whether pagination was requested
      if (isPaginationRequested) {
        res.json({
          tickets,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit!),
            totalCount,
            limit,
            hasNextPage: page! < Math.ceil(totalCount / limit!),
            hasPreviousPage: page! > 1
          },
          statusCounts
        });
      } else {
        // Backward compatibility: return just the array
        res.json(tickets);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/my", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const isPaginationRequested = !!req.query.page;

      if (isPaginationRequested) {
        const result = await storage.getTicketsWithPaginationForRole("user", req.user!.id, {}, page, limit);
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
        const tickets = await storage.getUserTickets(req.user!.id);
        res.json(tickets);
      }
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      res.status(500).json({ message: "Failed to fetch user tickets" });
    }
  });


  app.get("/api/tickets/filter", isAuthenticated, async (req, res) => {
    try {
      const { status, priority, categoryId } = req.query;
      const filters: { status?: string; priority?: string; categoryId?: number } = {};

      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      if (categoryId) filters.categoryId = parseInt(categoryId as string);

      let tickets;

      if (req.user?.role === "admin") {
        tickets = await storage.getFilteredTickets(filters);
      } else if (req.user?.role === "agent") {
        tickets = await storage.getFilteredTicketsForAgent(req.user!.id, filters);
      } else {
        tickets = await storage.getFilteredTicketsForUser(req.user!.id, filters);
      }

      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to filter tickets" });
    }
  });

  app.get("/api/tickets/export", isAuthenticated, async (req, res) => {
    try {
      console.log("Export request from user:", req.user?.role, req.user?.id);
      let tickets;

      // Get tickets based on user role
      if (req.user?.role === "admin") {
        console.log("Fetching all tickets with relations...");
        tickets = await storage.getAllTicketsWithRelations();
      } else if (req.user?.role === "agent") {
        console.log("Fetching assigned tickets...");
        tickets = await storage.getAssignedTickets(req.user.id);
      } else {
        console.log("Fetching user tickets...");
        tickets = await storage.getTicketsByUser(req.user!.id);
      }

      console.log("Fetched tickets count:", tickets.length);

      // Convert tickets to CSV format matching the exact format from screenshots
      const csvData = tickets.map((ticket: any) => {
        const createdDate = new Date(ticket.createdAt);
        const updatedDate = new Date(ticket.updatedAt);
        const currentDate = new Date();
        const daysOpen = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate resolution time if ticket is resolved/closed
        let resolutionTime = "";
        if (ticket.status === "resolved" || ticket.status === "closed") {
          const resolutionTimeMs = updatedDate.getTime() - createdDate.getTime();
          const resolutionDays = Math.floor(resolutionTimeMs / (1000 * 60 * 60 * 24));
          resolutionTime = resolutionDays.toString();
        } else {
          // For open tickets, show negative days (as in screenshot)
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
          "Created Date": createdDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          "Updated Date": updatedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          "Due Date": ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : "",
          "Days Open": daysOpen,
          "Resolution Time": resolutionTime
        };
      });

      // Create CSV writer
      const csvFilePath = path.join(process.cwd(), 'uploads', `tickets_export_${Date.now()}.csv`);
      const csvWriter = createCsvWriter.createObjectCsvWriter({
        path: csvFilePath,
        header: [
          { id: 'Ticket ID', title: 'Ticket ID' },
          { id: 'Title', title: 'Title' },
          { id: 'Description', title: 'Description' },
          { id: 'Status', title: 'Status' },
          { id: 'Priority', title: 'Priority' },
          { id: 'Support Type', title: 'Support Type' },
          { id: 'Category', title: 'Category' },
          { id: 'Created By Name', title: 'Created By Name' },
          { id: 'Created By Email', title: 'Created By Email' },
          { id: 'Created By Department', title: 'Created By Department' },
          { id: 'Assigned To Name', title: 'Assigned To Name' },
          { id: 'Assigned To Email', title: 'Assigned To Email' },
          { id: 'Contact Email', title: 'Contact Email' },
          { id: 'Contact Name', title: 'Contact Name' },
          { id: 'Contact Phone', title: 'Contact Phone' },
          { id: 'Contact Department', title: 'Contact Department' },
          { id: 'Created Date', title: 'Created Date' },
          { id: 'Updated Date', title: 'Updated Date' },
          { id: 'Due Date', title: 'Due Date' },
          { id: 'Days Open', title: 'Days Open' },
          { id: 'Resolution Time', title: 'Resolution Time' }
        ]
      });

      await csvWriter.writeRecords(csvData);

      const filename = path.basename(csvFilePath);
      res.download(csvFilePath, filename, (err) => {
        if (err) {
          console.error("Download error:", err);
        } else {
          // Clean up file after download
          setTimeout(() => {
            try {
              fs.unlinkSync(csvFilePath);
            } catch (deleteErr) {
              console.error("Failed to delete temp file:", deleteErr);
            }
          }, 10000); // Delete after 10 seconds
        }
      });

    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Failed to export tickets" });
    }
  });

  app.get("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicketWithRelations(id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Role-based access check
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

  app.post("/api/tickets", isAuthenticated, upload.single('attachment'), async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
      }
      // Convert string IDs to numbers for validation and process new fields
      const processedData = {
        ...req.body,
        categoryId: parseInt(req.body.categoryId),
        subcategoryId: req.body.subcategoryId ? parseInt(req.body.subcategoryId) : undefined,
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

      // Handle assignment permissions for ticket creation
      if (req.body.assignedToId) {
        if (req.user.role === "admin") {
          // Admin can assign to any agent/admin
          processedData.assignedToId = parseInt(req.body.assignedToId);
        } else if (req.user.role === "agent") {
          // Agent can only assign to themselves
          processedData.assignedToId = parseInt(req.body.assignedToId);
        } else {
          // Users cannot assign tickets
          delete processedData.assignedToId;
        }
      }

      let ticketData;
      try {
        ticketData = insertTicketSchema.parse(processedData);
      } catch (validationError) {
        let details = "";
        if (typeof validationError === "object" && validationError !== null) {
          if (Array.isArray((validationError as any).errors)) {
            details = JSON.stringify((validationError as any).errors);
          } else if ((validationError as any).message) {
            details = (validationError as any).message;
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

      // Send email notification to ticket creator
      try {
        const ticketWithRelations = await storage.getTicketWithRelations(ticket.id);
        if (ticketWithRelations) {
          await sendTicketCreatedEmail(ticketWithRelations);
        }
      } catch (emailError) {
        console.error('Failed to send ticket created email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json(ticket);
    } catch (error) {
      let details = "";
      if (typeof error === "object" && error !== null) {
        if ((error as any).message) {
          details = (error as any).message;
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

  app.patch("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Role-based update permissions
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

  app.put("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check edit permissions
      if (req.user?.role !== "admin" && req.user?.role !== "agent" && ticket.createdById !== req.user?.id) {
        return res.status(403).json({ message: "Access denied: You can only edit your own tickets" });
      }

      // Convert string IDs to numbers for validation
      const processedData = {
        ...req.body,
        categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : undefined,
        companyName: req.body.companyName,
        location: req.body.location,
      };

      // Remove undefined values to avoid NaN in database
      Object.keys(processedData).forEach(key => {
        if (processedData[key] === undefined || (typeof processedData[key] === 'number' && isNaN(processedData[key]))) {
          delete processedData[key];
        }
      });

      // Handle assignment permissions
      if (req.body.assignedToId !== undefined) {
        // Normalize incoming assignedToId into number|null
        const rawAssigned = req.body.assignedToId;
        const assignedId = rawAssigned !== null && rawAssigned !== undefined && rawAssigned !== ''
          ? Number(rawAssigned)
          : null;

        if (req.user?.role === "admin") {
          // Admin can assign to anyone
          processedData.assignedToId = (assignedId !== null && !Number.isNaN(assignedId)) ? assignedId : null;
        } else if (req.user?.role === "agent") {
          // Agents may only assign tickets to themselves (Assign to Me)
          if (assignedId !== null && !Number.isNaN(assignedId) && assignedId === req.user.id) {
            processedData.assignedToId = req.user.id;
          } else {
            // Prevent agents assigning to others
            delete processedData.assignedToId;
          }
        } else {
          // Users and others cannot modify assignment - ignore the field
          delete processedData.assignedToId;
        }
      }

      // Handle status permissions
      if (req.body.status !== undefined) {
        if (req.user?.role === "admin" || req.user?.role === "agent") {
          // Only admin and agents can update status
          processedData.status = req.body.status;
        } else {
          // Users cannot modify status - ignore the field
          delete processedData.status;
        }
      }

      const oldStatus = ticket.status;
      const updatedTicket = await storage.updateTicket(id, processedData);

      // Send email notification if status changed to in_progress or closed
      if (processedData.status && processedData.status !== oldStatus) {
        try {
          const ticketWithRelations = await storage.getTicketWithRelations(id);
          if (ticketWithRelations) {
            await sendStatusChangeEmail(ticketWithRelations, oldStatus, processedData.status);
          }
        } catch (emailError) {
          console.error('Failed to send status change email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.json(updatedTicket);
    } catch (error) {
      console.error("Update ticket error:", error);
      res.status(400).json({ message: "Failed to update ticket" });
    }
  });

  // Delete ticket route
  app.delete("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Role-based delete permissions
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

  // Comments
  app.get("/api/tickets/:ticketId/comments", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const comments = await storage.getTicketComments(ticketId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/tickets/:ticketId/comments", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const commentData = insertCommentSchema.parse({
        ...req.body,
        ticketId,
        userId: req.user!.id
      });

      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  // FAQs
  app.get("/api/faqs", async (req, res) => {
    try {
      let faqs;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

      if (categoryId) {
        faqs = await storage.getFaqsByCategory(categoryId);
      } else {
        faqs = await storage.getAllFaqs();
      }

      res.json(faqs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  app.get("/api/faqs/:id", async (req, res) => {
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

  app.post("/api/faqs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const faqData = insertFaqSchema.parse(req.body);
      const faq = await storage.createFaq(faqData);
      res.status(201).json(faq);
    } catch (error) {
      res.status(400).json({ message: "Invalid FAQ data" });
    }
  });

  app.patch("/api/faqs/:id", isAuthenticated, isAdmin, async (req, res) => {
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

  // Chat messages
  app.get("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.user!.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        userId: req.user!.id
      });

      const message = await storage.createChatMessage(messageData);

      // Enhanced intelligent ticket detection and creation
      const userMessage = message.message.toLowerCase();
      let botResponse = "Thank you for your message. How else can I assist you?";
      let ticketCreated = null;

      // Define issue patterns and their corresponding categories
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

      // Detect if message indicates a problem that needs a ticket
      const problemIndicators = ["can't", "cannot", "not working", "broken", "issue", "problem", "help", "error", "trouble", "unable", "fail"];
      const hasProblem = problemIndicators.some(indicator => userMessage.includes(indicator));

      if (hasProblem) {
        // Find matching issue pattern
        const matchedIssue = issuePatterns.find(issue =>
          issue.patterns.some(pattern => userMessage.includes(pattern))
        );

        if (matchedIssue) {
          try {
            // Get category IDs
            const categories = await storage.getAllCategories();
            const mainCategory = categories.find(cat => cat.name === matchedIssue.category && !cat.parentId);
            const subCategory = categories.find(cat => cat.name === matchedIssue.subcategory && cat.parentId === mainCategory?.id);

            if (mainCategory) {
              // Create ticket automatically
              const ticketData = {
                title: matchedIssue.defaultTitle,
                description: `User message: ${message.message}\n\nThis ticket was automatically created by the AI assistant based on the user's chat message.`,
                status: "open",
                priority: "medium",
                supportType: "remote",
                categoryId: mainCategory.id,
                subcategoryId: subCategory?.id || null,
                createdById: req.user!.id,
                assignedToId: null,
                contactEmail: req.user!.email,
                contactName: req.user!.name,
                contactPhone: req.user!.contactNumber,
                contactDepartment: req.user!.department
                , companyName: req.user!.companyName || "",
                location: (req.user as any).location || ""
              };

              ticketCreated = await storage.createTicket(ticketData);
              botResponse = `I understand you're experiencing ${matchedIssue.defaultTitle.toLowerCase()}. I've automatically created a support ticket for you:\n\n🎫 **Ticket #${ticketCreated.id}** - ${ticketCreated.title}\n📋 **Category:** ${matchedIssue.category}\n📝 **Description:** Based on your message\n⏰ **Status:** Open\n\nYour ticket has been submitted and our IT team will review it shortly. You can track the progress in the 'My Tickets' section. Is there anything else I can help you with?`;
            }
          } catch (error) {
            console.error("Error creating automatic ticket:", error);
            botResponse = `I understand you're experiencing ${matchedIssue.defaultTitle.toLowerCase()}. I'd be happy to help you create a support ticket. You can create one manually using the 'Create Ticket' option, or I can guide you through the process. What specific details would you like to include?`;
          }
        } else {
          // Generic problem detected but no specific category
          botResponse = "I can see you're experiencing an issue. I'd be happy to help you create a support ticket to get this resolved quickly. Can you tell me more specific details about what's not working? This will help me categorize your issue correctly.";
        }
      } else if (userMessage.includes("ticket status") || userMessage.includes("my tickets")) {
        botResponse = "You can view all your tickets and their current status in the 'My Tickets' section of the portal. Would you like me to direct you there, or do you have a specific ticket number you'd like me to help you with?";
      } else if (userMessage.includes("create ticket") || userMessage.includes("submit ticket")) {
        botResponse = "I can automatically create tickets for you! Just describe your issue in detail, and I'll detect the problem and create the appropriate ticket. For example, you could say 'My computer is running very slow' or 'I can't connect to WiFi'. What issue are you experiencing?";
      }

      const botMessage = await storage.createChatMessage({
        userId: req.user!.id,
        message: botResponse,
        isFromBot: true
      });

      const response = [message, botMessage];
      if (ticketCreated) {
        // push as any to avoid strict typing mismatch in combined response
        response.push(ticketCreated as any);
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Dashboard stats with role-based access
  app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    try {
      let stats;

      if (req.user?.role === "admin") {
        // Admin gets global stats
        stats = await storage.getDashboardStats();
      } else if (req.user?.role === "agent") {
        // Agent gets stats for their assigned tickets
        stats = await storage.getDashboardStatsForAgent(req.user!.id);
      } else {
        // User gets stats for their own tickets
        stats = await storage.getDashboardStatsForUser(req.user!.id);
      }

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // USER MANAGEMENT ROUTES - Fixed authentication
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const isPaginationRequested = !!req.query.page;

      let users;
      let total = 0;

      if (req.user?.role === "admin") {
        // Admin can see all users
        if (isPaginationRequested) {
          const result = await storage.getUsersWithPagination(page, limit);
          users = result.data;
          total = result.total;
        } else {
          users = await storage.getAllUsers();
          total = users.length;
        }
      } else if (req.user?.role === "agent") {
        // Agent can see only agents and users (for ticket assignment)
        const allUsers = await storage.getUsersByRoles(["agent", "user"]);
        if (isPaginationRequested) {
          total = allUsers.length;
          const start = (page - 1) * limit;
          users = allUsers.slice(start, start + limit);
        } else {
          users = allUsers;
          total = users.length;
        }
      } else {
        // Regular users can only see their own profile
        users = [req.user];
        total = 1;
      }

      if (isPaginationRequested) {
        res.json({
          data: users,
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
        res.json(users);
      }
    } catch (err) {
      console.error("Error in /api/users:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });


  app.post('/api/users', isAuthenticated, requireRole(['admin', 'agent']), async (req, res) => {
    try {
      const { username, password, name, email, role } = req.body;

      if (!username || !password || !name || !email || !role) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsernameOrEmail(username, email);
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        email,
        role
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  app.put('/api/users/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, name, email, role } = req.body;

      // Check if user exists
      const existingUser = await storage.getUserById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prepare update data
      const updateData: any = { username, name, email, role };

      // Only update password if provided
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await storage.updateUser(parseInt(id), updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await storage.getUserById(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deleteUser(parseInt(id));
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Password change route
  app.put('/api/users/:id/password', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Verify user is changing their own password or is admin
      if (parseInt(id) !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You can only change your own password' });
      }

      // Get user and verify current password
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password for non-admin users
      if (req.user?.role !== 'admin') {
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(parseInt(id), { password: hashedNewPassword });
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: 'Failed to update password' });
    }
  });

  // Export user data route
  app.get('/api/users/:id/export', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      // Verify user is exporting their own data or is admin
      if (parseInt(id) !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'You can only export your own data' });
      }

      // Get user data
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user's tickets
      const tickets = await storage.getUserTickets(parseInt(id));

      // Get user's comments (simplified for now)
      const userComments: any[] = []; // TODO: Add getAllComments method

      // Remove sensitive information
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
        createdAt: user.createdAt,
      };

      const exportData = {
        user: sanitizedUser,
        tickets,
        comments: userComments,
        exportedAt: new Date().toISOString(),
      };

      res.json(exportData);
    } catch (error) {
      console.error('Export data error:', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  });

  // CSV Import/Export endpoints for tickets
  app.post("/api/tickets/import", isAuthenticated, isSupportStaff, upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let processed = 0;
      let created = 0;

      // Read and parse CSV file
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            // Get categories and users for mapping
            const categories = await storage.getAllCategories();
            const users = await storage.getAllUsers();

            for (const row of results) {
              processed++;
              try {
                // Handle flexible column mapping for different CSV formats
                const categoryValue = row.Category || row.category_id;
                let categoryId: number | undefined;
                if (categoryValue) {
                  let category = categories.find(c =>
                    c.name.toLowerCase() === categoryValue.toLowerCase() ||
                    c.id === parseInt(categoryValue)
                  );

                  // If category doesn't exist, check by name first to avoid duplicates
                  if (!category) {
                    try {
                      // Check for existing category by name first
                      const existingCategory = await storage.getCategoryByName(categoryValue);
                      if (existingCategory) {
                        category = existingCategory;
                        categories.push(category); // Add to categories array for future lookups
                      } else {
                        // Create new category only if it doesn't exist
                        category = await storage.createCategory({
                          name: categoryValue,
                          parentId: null
                        });
                        categories.push(category); // Add to categories array for future lookups
                        console.log(`Created new category: ${categoryValue}`);
                      }
                    } catch (error) {
                      errors.push(`Row ${processed}: Failed to create category "${categoryValue}": ${error instanceof Error ? error.message : 'Unknown error'}`);
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

                // Map created by - handle email, name, or ID
                let createdById: number | undefined;
                const createdByValue = row["Created By Email"] || row.created_by_id;
                if (createdByValue) {
                  // Try to find user by email first, then by name, then by ID
                  let createdByUser = users.find(u =>
                    u.email?.toLowerCase() === createdByValue.toLowerCase() ||
                    u.name?.toLowerCase() === createdByValue.toLowerCase() ||
                    u.id === parseInt(createdByValue)
                  );

                  // If user doesn't exist, create it with proper validation and security
                  if (!createdByUser && createdByValue.trim()) {
                    try {
                      // Validate name is not empty after trimming
                      const trimmedName = createdByValue.trim();
                      if (!trimmedName || trimmedName.length < 1) {
                        console.warn(`Skipping user creation for empty name: "${createdByValue}"`);
                        createdById = req.user!.id;
                        continue;
                      }

                      // Generate a secure username and email
                      const baseUsername = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const baseEmail = `${baseUsername}@imported.local`;

                      // Check for existing user by username or email to avoid duplicates
                      const existingUser = await storage.getUserByUsernameOrEmail(baseUsername, baseEmail);
                      if (existingUser) {
                        createdByUser = existingUser;
                        console.log(`Using existing user: ${trimmedName}`);
                      } else {
                        // Generate a secure random password and hash it
                        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
                        const hashedPassword = await bcrypt.hash(randomPassword, 10);

                        createdByUser = await storage.createUser({
                          username: baseUsername,
                          password: hashedPassword,
                          name: trimmedName,
                          email: baseEmail,
                          role: 'user'
                        });
                        console.log(`Created new user: ${trimmedName} (temp password will need reset)`);
                      }
                      users.push(createdByUser); // Add to users array for future lookups
                    } catch (error) {
                      console.warn(`Failed to create user "${createdByValue}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                      // Default to current user if creation fails
                      createdById = req.user!.id;
                    }
                  }

                  if (createdByUser) {
                    createdById = createdByUser.id;
                  } else {
                    // Default to current user if creator not found
                    createdById = req.user!.id;
                  }
                } else {
                  createdById = req.user!.id;
                }

                // Map assigned to - handle email, name, or ID (optional)
                let assignedToId: number | undefined;
                const assignedToValue = row["Assigned To Email"] || row.assigned_to_id;
                if (assignedToValue && assignedToValue.trim()) {
                  // Try to find user by email first, then by name, then by ID
                  let assignedToUser = users.find(u =>
                    u.email?.toLowerCase() === assignedToValue.toLowerCase() ||
                    u.name?.toLowerCase() === assignedToValue.toLowerCase() ||
                    u.id === parseInt(assignedToValue)
                  );

                  // If user doesn't exist, create it with proper validation and security
                  if (!assignedToUser) {
                    try {
                      // Validate name is not empty after trimming
                      const trimmedName = assignedToValue.trim();
                      if (!trimmedName || trimmedName.length < 1) {
                        console.warn(`Skipping agent creation for empty name: "${assignedToValue}"`);
                        continue;
                      }

                      // Generate a secure username and email
                      const baseUsername = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const baseEmail = `${baseUsername}@imported.local`;

                      // Check for existing user by username or email to avoid duplicates
                      const existingUser = await storage.getUserByUsernameOrEmail(baseUsername, baseEmail);
                      if (existingUser) {
                        assignedToUser = existingUser;
                        console.log(`Using existing agent: ${trimmedName}`);
                      } else {
                        // Generate a secure random password and hash it
                        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
                        const hashedPassword = await bcrypt.hash(randomPassword, 10);

                        assignedToUser = await storage.createUser({
                          username: baseUsername,
                          password: hashedPassword,
                          name: trimmedName,
                          email: baseEmail,
                          role: 'agent' // Assign agent role since they're handling tickets
                        });
                        console.log(`Created new agent: ${trimmedName} (temp password will need reset)`);
                      }
                      users.push(assignedToUser); // Add to users array for future lookups
                    } catch (error) {
                      console.warn(`Failed to create user "${assignedToValue}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }

                  if (assignedToUser) {
                    assignedToId = assignedToUser.id;
                  }
                }

                // Parse due date with robust handling of multiple formats
                let dueDate: Date | undefined;
                const dueDateValue = row["Due Date"] || row.due_date;
                if (dueDateValue && dueDateValue.trim()) {
                  try {
                    // Handle common date formats
                    let dateStr = dueDateValue.trim();

                    // Convert formats like "May 28, 2025 @ 11:23 am" to standard format
                    if (dateStr.includes('@')) {
                      // Extract date and time parts
                      const parts = dateStr.split('@');
                      if (parts.length === 2) {
                        const datePart = parts[0].trim();
                        const timePart = parts[1].trim();
                        // Reconstruct in a more parseable format
                        dateStr = `${datePart} ${timePart}`;
                      }
                    }

                    // Try multiple parsing approaches
                    const parsedDate = new Date(dateStr);
                    if (!isNaN(parsedDate.getTime())) {
                      dueDate = parsedDate;
                    } else {
                      // Try manual parsing for formats like "05/28/2025" or "28/05/2025"
                      const dateRegex = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
                      const match = dateStr.match(dateRegex);
                      if (match) {
                        // Assume MM/DD/YYYY format (US standard)
                        const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
                        const day = parseInt(match[2]);
                        const year = parseInt(match[3]);
                        const testDate = new Date(year, month, day);
                        if (!isNaN(testDate.getTime())) {
                          dueDate = testDate;
                        }
                      }
                    }
                  } catch (error) {
                    console.warn(`Failed to parse due date "${dueDateValue}" for row ${processed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }

                // Normalize and validate status and priority values
                const rawStatus = (row.Status || row.status)?.toLowerCase()?.trim() || "open";
                const rawPriority = (row.Priority || row.priority)?.toLowerCase()?.trim() || "medium";
                const rawSupportType = (row["Support Type"] || row.support_type)?.toLowerCase()?.trim() || "remote";

                // Validate status against allowed values
                const validStatuses = ["open", "in-progress", "resolved", "closed"];
                const status = validStatuses.includes(rawStatus) ? rawStatus : "open";
                if (!validStatuses.includes(rawStatus)) {
                  console.warn(`Invalid status "${rawStatus}" for row ${processed}, defaulting to "open"`);
                }

                // Validate priority against allowed values
                const validPriorities = ["low", "medium", "high"];
                const priority = validPriorities.includes(rawPriority) ? rawPriority : "medium";
                if (!validPriorities.includes(rawPriority)) {
                  console.warn(`Invalid priority "${rawPriority}" for row ${processed}, defaulting to "medium"`);
                }

                // Normalize support type
                const supportTypeMap: Record<string, string> = {
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

                // Create ticket data with flexible column mapping (excluding auto-generated fields)
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
                  categoryId: categoryId!,
                  createdById: createdById!,
                  assignedToId: assignedToId || null,
                  dueDate: dueDate || null,
                  // Note: createdAt and updatedAt are excluded from insertTicketSchema
                };

                // Validate the ticket data
                const validatedData = insertTicketSchema.parse(ticketData);
                await storage.createTicket(validatedData);
                created++;

              } catch (error) {
                errors.push(`Row ${processed}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }

            // Clean up uploaded file
            fs.unlinkSync(req.file!.path);

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
        })
        .on('error', (error) => {
          console.error("CSV parsing error:", error);
          res.status(500).json({ message: "Failed to parse CSV file" });
        });

    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Failed to import tickets" });
    }
  });


  // Agent Performance API
  app.get("/api/reports/agent-performance", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      // Get all agents (users with role = 'agent' or 'admin')
      const agents = await storage.getUsersByRoles(['agent', 'admin']);

      // Calculate performance metrics for each agent
      const agentPerformance = await Promise.all(
        agents.map(async (agent) => {
          // Get all tickets assigned to this agent
          const assignedTickets = await storage.getAssignedTickets(agent.id);

          // Calculate total tickets
          const totalTickets = assignedTickets.length;

          // Calculate resolved tickets
          const resolvedTickets = assignedTickets.filter(
            ticket => ticket.status === 'resolved' || ticket.status === 'closed'
          );

          // Calculate average resolution time (in hours)
          let avgResolutionTime = 0;
          if (resolvedTickets.length > 0) {
            const totalResolutionTime = resolvedTickets.reduce((total, ticket) => {
              const createdTime = new Date(ticket.createdAt || ticket.updatedAt || Date.now()).getTime();
              const updatedTime = new Date(ticket.updatedAt || ticket.createdAt || Date.now()).getTime();
              return total + (updatedTime - createdTime);
            }, 0);

            avgResolutionTime = totalResolutionTime / (resolvedTickets.length * 1000 * 60 * 60); // Convert to hours
          }

          // Calculate SLA compliance (tickets resolved within 24 hours)
          // SLA should be calculated based on resolved tickets only, not total tickets
          const slaCompliantTickets = resolvedTickets.filter(ticket => {
            const createdTime = new Date(ticket.createdAt || ticket.updatedAt || Date.now()).getTime();
            const updatedTime = new Date(ticket.updatedAt || ticket.createdAt || Date.now()).getTime();
            const resolutionTimeHours = (updatedTime - createdTime) / (1000 * 60 * 60);
            return resolutionTimeHours <= 24; // Assuming 24-hour SLA
          });

          const slaComplianceRate = resolvedTickets.length > 0
            ? Math.round((slaCompliantTickets.length / resolvedTickets.length) * 100)
            : 0;

          return {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            department: agent.department,
            tickets: totalTickets,
            resolvedTickets: resolvedTickets.length,
            avgTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
            slaMet: slaComplianceRate,
            activeTickets: assignedTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length
          };
        })
      );

      // Sort by total tickets handled (descending)
      agentPerformance.sort((a, b) => b.tickets - a.tickets);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5; // Default 5 for reports
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

  // Category management routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Domain Management Routes (for admin/agent users only)
  app.get("/api/domains", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      // Get allowed domains from database
      const domains = await storage.getAllAllowedDomains();
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ message: "Failed to fetch domains" });
    }
  });

  app.post("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const { domain, companyName, description } = req.body;

      // Validate input
      if (!domain || !companyName) {
        return res.status(400).json({ message: "Domain and company name are required" });
      }

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
      if (!domainRegex.test(domain)) {
        return res.status(400).json({ message: "Invalid domain format" });
      }

      // Check if domain already exists
      const existingDomainCheck = await storage.checkDomainAllowed(domain.toLowerCase());
      if (existingDomainCheck) {
        return res.status(409).json({ message: "Domain already exists" });
      }

      // Insert new domain
      const newDomain = await storage.createAllowedDomain({
        domain: domain.toLowerCase(),
        companyName,
        description: description || null,
        isActive: true,
        createdById: req.user!.id
      });

      res.status(201).json(newDomain);
    } catch (error) {
      console.error("Error creating domain:", error);
      res.status(500).json({ message: "Failed to create domain" });
    }
  });

  app.put("/api/domains/:id", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { domain, companyName, description, isActive } = req.body;

      // Check if domain exists
      const existingDomain = await storage.getAllowedDomain(id);
      if (!existingDomain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const updateData: any = {};

      if (domain) {
        // Validate domain format
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        if (!domainRegex.test(domain)) {
          return res.status(400).json({ message: "Invalid domain format" });
        }

        // Check if new domain already exists (excluding current domain)
        const allDomains = await storage.getAllAllowedDomains();
        const duplicateDomain = allDomains.find(d => d.domain === domain.toLowerCase() && d.id !== id);
        if (duplicateDomain) {
          return res.status(409).json({ message: "Domain already exists" });
        }

        updateData.domain = domain.toLowerCase();
      }

      if (companyName) updateData.companyName = companyName;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedDomain = await storage.updateAllowedDomain(id, updateData);

      res.json(updatedDomain);
    } catch (error) {
      console.error("Error updating domain:", error);
      res.status(500).json({ message: "Failed to update domain" });
    }
  });

  app.delete("/api/domains/:id", isAuthenticated, isSupportStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if domain exists
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

  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
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

  app.delete("/api/categories/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
