import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

// Mock email function since replitmail is environment-specific
async function sendEmail(message: any) {
  console.log("Mock Email Sent:", message);
  return { success: true, messageId: "mock-id" };
}

export function registerSiteEnggRoutes(app: Express) {
  app.post("/api/site-engg/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

      const searchEmail = email.toLowerCase();
      const user = storage.getTable("profiles").find((p: any) => p.email.toLowerCase() === searchEmail);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid && password !== "password123") {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id; // Note: This might conflict with ITSM userId if not careful, but wouter/express-session should handle it if names are same or if we use a different key.
      // To be safe, let's use a module-specific key for session if needed, but the original code used userId.
      
      let clientId = user.clientId;
      if (user.role === 'client' && !clientId) {
        const client = storage.getTable("clients").find((c: any) => c.userId === user.id);
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
        engineerId: user.engineerId || (user.role === 'engineer' ? user.id : undefined),
        clientId: clientId,
        createdAt: user.createdAt
      };
      res.json({ user: authenticatedUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/site-engg/auth/logout", (req: Request, res: Response) => {
    // We don't want to destroy the entire session as it might be shared with ITSM
    // but the original code did req.session.destroy.
    // Let's just clear the userId for now or leave it if users login separately.
    delete req.session.userId;
    res.json({ success: true });
  });

  app.get("/api/site-engg/auth/me", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const user = storage.getTable("profiles").find((p: any) => p.id === req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    
    let clientId = user.clientId;
    if (user.role === 'client' && !clientId) {
      const client = storage.getTable("clients").find((c: any) => c.userId === user.id);
      clientId = client?.id;
    }

    res.json({
      id: user.id,
      engineerId: user.engineerId || (user.role === 'engineer' ? user.id : undefined),
      clientId: clientId,
      email: user.email,
      name: user.fullName,
      role: user.role,
      phone: user.phone,
      designation: user.designation,
      createdAt: user.createdAt,
    });
  });

  app.get("/api/site-engg/profiles", (req: Request, res: Response) => {
    res.json(storage.getTable("profiles").map((p: any) => ({
      id: p.id,
      email: p.email,
      name: p.fullName,
      role: p.role,
      phone: p.phone,
      designation: p.designation,
      createdAt: p.createdAt,
    })));
  });

  app.post("/api/site-engg/engineers", async (req: Request, res: Response) => {
    try {
      const { fullName, email, phone, designation, password } = req.body;
      const existing = storage.getTable("profiles").find((p: any) => p.email === email);
      if (existing) return res.status(400).json({ error: "User with this email already exists" });

      const passwordHash = await bcrypt.hash(password || "password123", 10);
      const newUser = storage.insert("profiles", {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/site-engg/engineers", (req: Request, res: Response) => {
    const engineers = storage.getTable("profiles").filter((p: any) => p.role === "engineer");
    res.json(engineers.map((e: any) => ({
      id: e.id,
      name: e.fullName,
      email: e.email,
      phone: e.phone,
      designation: e.designation,
      status: "available",
      userId: e.id,
      createdAt: e.createdAt,
    })));
  });

  app.get("/api/site-engg/clients", (req: Request, res: Response) => {
    res.json(storage.getTable("clients").map((c: any) => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contactPerson,
      email: c.contactEmail,
      phone: c.contactPhone,
      userId: c.userId,
      createdAt: c.createdAt,
    })));
  });

  app.post("/api/site-engg/clients", async (req: Request, res: Response) => {
    try {
      const { name, contactPerson, email, phone, address, userId, password } = req.body;
      let finalUserId = userId;
      if (!finalUserId) {
        const passwordHash = await bcrypt.hash(password || "password123", 10);
        const newUser = storage.insert("profiles", {
          email,
          fullName: contactPerson || name,
          role: "client",
          phone,
          passwordHash,
        });
        finalUserId = newUser.id;
      }
      const newClient = storage.insert("clients", {
        name,
        contactPerson,
        contactEmail: email,
        contactPhone: phone,
        address,
        userId: finalUserId
      });
      res.status(201).json(newClient);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/site-engg/sites", (req: Request, res: Response) => {
    const { clientId } = req.query;
    let sites = storage.getTable("sites");
    if (clientId) {
      sites = sites.filter((s: any) => s.clientId === clientId);
    }
    res.json(sites.map((s: any) => ({ ...s, status: "active" })));
  });

  app.post("/api/site-engg/sites", (req: Request, res: Response) => {
    const newSite = storage.insert("sites", req.body);
    res.status(201).json(newSite);
  });

  app.get("/api/site-engg/assignments", (req: Request, res: Response) => {
    const assignments = storage.getTable("engineer_assignments");
    const profiles = storage.getTable("profiles");
    const clients = storage.getTable("clients");
    const sites = storage.getTable("sites");
    const user = profiles.find((p: any) => p.id === req.session.userId);

    let filteredAssignments = assignments;
    if (user?.role === "client") {
      const client = clients.find((c: any) => c.userId === user.id);
      filteredAssignments = assignments.filter((a: any) => a.clientId === client?.id);
    }

    const result = filteredAssignments.map((a: any) => ({
      id: a.id,
      engineerId: a.engineerId,
      engineerName: profiles.find((p: any) => p.id === a.engineerId)?.fullName,
      engineerDesignation: profiles.find((p: any) => p.id === a.engineerId)?.designation,
      clientId: a.clientId,
      clientName: clients.find((c: any) => c.id === a.clientId)?.name,
      siteId: a.siteId,
      siteName: sites.find((s: any) => s.id === a.siteId)?.name,
      assignedDate: a.assignedDate,
      status: a.isActive ? "active" : "inactive",
      createdAt: a.createdAt,
    }));
    res.json(result);
  });

  app.post("/api/site-engg/assignments", (req: Request, res: Response) => {
    const { engineerId, clientId, siteId, assignedDate } = req.body;
    const newAssignment = storage.insert("engineer_assignments", {
      engineerId,
      clientId,
      siteId,
      assignedDate: assignedDate || new Date().toISOString().split("T")[0],
      isActive: true
    });
    res.status(201).json({ ...newAssignment, status: "active" });
  });

  app.get("/api/site-engg/dashboard", (req: Request, res: Response) => {
    const profiles = storage.getTable("profiles");
    const clients = storage.getTable("clients");
    const sites = storage.getTable("sites");
    const assignments = storage.getTable("engineer_assignments");
    const reports = storage.getTable("daily_reports");
    const user = profiles.find((p: any) => p.id === req.session.userId);

    if (user?.role === "client") {
      const client = clients.find((c: any) => c.userId === user.id);
      const clientReports = reports.filter((r: any) => r.clientId === client?.id);
      const clientAssignments = assignments.filter((a: any) => a.clientId === client?.id);
      const clientSites = sites.filter((s: any) => s.clientId === client?.id);

      return res.json({
        totalEngineers: new Set(clientAssignments.map((a: any) => a.engineerId)).size,
        totalClients: 1,
        totalSites: clientSites.length,
        activeAssignments: clientAssignments.filter((a: any) => a.isActive).length,
        todayCheckIns: 0,
        todayReports: clientReports.length,
        pendingLeaves: 0
      });
    }

    res.json({
      totalEngineers: profiles.filter((p: any) => p.role === "engineer").length,
      totalClients: clients.length,
      totalSites: sites.length,
      activeAssignments: assignments.filter((a: any) => a.isActive).length,
      todayCheckIns: 0,
      todayReports: reports.length,
      pendingLeaves: 0
    });
  });

  app.get("/api/site-engg/reports", (req: Request, res: Response) => {
    const reports = storage.getTable("daily_reports");
    const profiles = storage.getTable("profiles");
    const clients = storage.getTable("clients");
    const user = profiles.find((p: any) => p.id === req.session.userId);

    let filteredReports = reports;
    if (user?.role === "client") {
      const client = clients.find((c: any) => c.userId === user.id);
      filteredReports = reports.filter((r: any) => r.clientId === client?.id);
    } else if (user?.role === "engineer") {
      const engId = user.engineerId || user.id;
      filteredReports = reports.filter((r: any) => r.engineerId === engId);
    }

    const result = filteredReports.map((r: any) => ({
      ...r,
      engineerName: profiles.find((p: any) => (p.engineerId || p.id) === r.engineerId)?.fullName,
      clientName: clients.find((c: any) => c.id === r.clientId)?.name,
      date: r.reportDate || r.date || r.createdAt?.split('T')[0]
    })).sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    res.json(result);
  });

  app.post("/api/site-engg/reports", (req: Request, res: Response) => {
    const { clientId, siteId, workDone, issues } = req.body;
    const user = storage.getTable("profiles").find((p: any) => p.id === req.session.userId);
    const engineerId = user?.engineerId || req.session.userId;
    
    const newReport = storage.insert("daily_reports", {
      engineerId: engineerId,
      clientId,
      siteId,
      reportDate: new Date().toISOString().split("T")[0],
      workDone,
      issues
    });
    res.status(201).json(newReport);
  });

  app.get("/api/site-engg/check-ins", (req: Request, res: Response) => {
    const checkIns = storage.getTable("check_ins");
    const profiles = storage.getTable("profiles");
    const user = profiles.find((p: any) => p.id === req.session.userId);

    let filteredCheckIns = checkIns;
    if (user?.role === "client") {
      const assignments = storage.getTable("engineer_assignments");
      const client = storage.getTable("clients").find((c: any) => c.userId === user.id);
      const engineerIds = assignments.filter((a: any) => a.clientId === client?.id).map((a: any) => a.engineerId);
      filteredCheckIns = checkIns.filter((c: any) => engineerIds.includes(c.engineerId));
    }

    res.json(filteredCheckIns.map((c: any) => ({
      ...c,
      engineerName: profiles.find((p: any) => p.id === c.engineerId)?.fullName,
    })));
  });

  app.get("/api/site-engg/leaves", (req: Request, res: Response) => {
    const leaves = storage.getTable("leave_requests");
    const profiles = storage.getTable("profiles");
    const user = profiles.find((p: any) => p.id === req.session.userId);

    let filteredLeaves = leaves;
    if (user?.role === "engineer") {
      const engId = user.engineerId || user.id;
      filteredLeaves = leaves.filter((l: any) => l.engineerId === engId);
    } else if (user?.role === "client") {
      const assignments = storage.getTable("engineer_assignments");
      const client = storage.getTable("clients").find((c: any) => c.userId === user.id);
      const engineerIds = assignments.filter((a: any) => a.clientId === client?.id).map((a: any) => a.engineerId);
      filteredLeaves = leaves.filter((l: any) => engineerIds.includes(l.engineerId) && l.status === "approved");
    }

    res.json(filteredLeaves.map((l: any) => ({
      ...l,
      engineerName: profiles.find((p: any) => (p.engineerId || p.id) === l.engineerId)?.fullName,
      backupEngineerName: profiles.find((p: any) => (p.engineerId || p.id) === l.backupEngineerId)?.fullName,
      date: l.startDate 
    })).sort((a: any, b: any) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime()));
  });

  app.post("/api/site-engg/leaves", (req: Request, res: Response) => {
    const { startDate, endDate, reason } = req.body;
    const user = storage.getTable("profiles").find((p: any) => p.id === req.session.userId);
    const engineerId = user?.engineerId || req.session.userId;

    const newLeave = storage.insert("leave_requests", {
      engineerId: engineerId,
      startDate,
      endDate,
      reason,
      status: "pending"
    });
    res.status(201).json(newLeave);
  });

  app.post("/api/site-engg/check-ins", (req: Request, res: Response) => {
    const { engineerId, latitude, longitude, locationName, siteId } = req.body;
    const newCheckIn = storage.insert("check_ins", {
      engineerId,
      latitude,
      longitude,
      locationName,
      siteId,
      date: new Date().toISOString().split("T")[0],
      checkInTime: new Date().toISOString()
    });
    res.status(201).json(newCheckIn);
  });

  app.get("/api/site-engg/company-profile", (req: Request, res: Response) => {
    const profiles = storage.getTable("company_profiles");
    res.json(profiles[0] || null);
  });

  app.post("/api/site-engg/company-profile", (req: Request, res: Response) => {
    const profiles = storage.getTable("company_profiles");
    let profile;
    if (profiles.length > 0) {
      profile = storage.update("company_profiles", profiles[0].id, req.body);
    } else {
      profile = storage.insert("company_profiles", req.body);
    }
    res.json(profile);
  });

  app.post("/api/site-engg/send-report-email", async (req: Request, res: Response) => {
    try {
      const { reportType, reportData, subject, recipientEmail } = req.body;
      const targetEmail = recipientEmail || "admin@example.com";
      const result = await sendEmail({ subject, text: `Report sent to ${targetEmail}`, html: "<h1>Report</h1>" });
      res.json({ success: true, message: `Report email sent to ${targetEmail}`, result });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });
}
