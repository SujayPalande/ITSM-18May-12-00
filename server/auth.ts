import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { storage as seStorage } from "./site-engg/storage";
import { User as SelectUser, InsertUser } from "@shared/schema";

// Extend session data type for activity tracking
declare module 'express-session' {
  interface SessionData {
    lastActivity?: number;
    userId?: string;
  }
}


declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}


export async function setupAuth(app: Express) {
  // Always set correct password for demo users
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
      password: await hashPassword("password123"), // Using a known default password
      name: "Shivam Jagtap",
      email: "shivam.jagtap@cybaemtech.com",
      role: "admin" // Assuming admin role for access
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
      // Always update password to correct hash
      await storage.updateUser(existing.id, { password: demo.password });
    }
  }

  const sessionSecret = process.env.SESSION_SECRET || "helpdesk-portal-secret";
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 10, // 10 minutes (changed from 24 hours)
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    rolling: true, // Reset expiration on every request (activity tracking)
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Session activity tracking middleware
  // This ensures sessions expire after 10 minutes of inactivity
  app.use((req, res, next) => {
    if (req.session && req.isAuthenticated()) {
      const now = Date.now();
      const lastActivity = req.session.lastActivity || now;
      const inactiveTime = now - lastActivity;
      
      // If inactive for more than 10 minutes (600,000 ms), destroy session
      if (inactiveTime > 600000) {
        console.log('[Session] Destroying inactive session for user:', req.user?.username);
        req.session.destroy((err) => {
          if (err) console.error('[Session] Destroy error:', err);
          return res.status(401).json({ error: 'Session expired due to inactivity' });
        });
      } else {
        // Update last activity time
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
        // Check finding by username first, then by email
        let user = await storage.getUserByUsername(username);
        
        if (!user) {
            // Try matching by email if username is an email address
            if (username.includes('@')) {
                console.log(`[Auth] Username looks like email, searching by email...`);
                const allUsers = await storage.getAllUsers();
                user = allUsers.find(u => u.email?.toLowerCase() === username.toLowerCase());
                
                // FAIL-SAFE: If this specific user is missing, AUTO-CREATE IT
                if (!user && (username === 'shivam.jagtap@cybaemtech.com' || username === 'shivam')) {
                   console.log(`[Auth] FAIL-SAFE: Auto-creating missing user ${username}`);
                   try {
                     user = await storage.createUser({
                        username: 'shivam',
                        password: await hashPassword('password123'),
                        name: 'Shivam Jagtap',
                        email: 'shivam.jagtap@cybaemtech.com',
                        role: 'admin'
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
            console.log(`[Auth] debugging - Current users in DB:`, allUsers.map(u => `${u.username} (${u.email})`));
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
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Helper for Site Engineering session sync
  const syncSESession = (req: any, user: SelectUser) => {
    if (req.session) {
      req.session.lastActivity = Date.now();
      const seProfiles = seStorage.getTable("profiles");
      let seProfile = seProfiles.find((p: any) => p.email?.toLowerCase() === user.email?.toLowerCase());
      
      if (!seProfile) {
        seProfile = seStorage.insert("profiles", {
          email: user.email,
          fullName: user.name,
          role: String(user.role).toLowerCase().includes('admin') ? 'admin' : (String(user.role).toLowerCase().includes('hr') ? 'hr' : 'engineer'),
          phone: user.contactNumber || '',
          designation: user.designation || 'Integrated User',
          passwordHash: user.password,
          engineerId: `eng-${user.id}`
        });
      }
      req.session.userId = seProfile.id.toString();
    }
  };

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, email } = req.body;
      const role = "user"; // Always default to user role for registration

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

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    if (req.user) syncSESession(req, req.user);
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      if (req.session) delete req.session.userId;
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user) syncSESession(req, req.user);
    res.json(req.user);
  });

  // In-memory store for password reset tokens (in production, use DB)
  const resetTokens = new Map<string, { userId: number; email: string; expires: number }>();

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        // Don't reveal whether email exists - always show success
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour

      resetTokens.set(token, { userId: user.id, email: user.email, expires });

      // Send email
      const appUrl = process.env.APP_URL || `https://${req.hostname}`;
      const resetUrl = `${appUrl}/auth?reset=${token}`;

      try {
        const nodemailer = await import("nodemailer");
        const smtpConfig: any = {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
        };
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          smtpConfig.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
        }
        const transporter = nodemailer.default.createTransport(smtpConfig);

        await transporter.sendMail({
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
        // Still return success so user knows the flow worked (token is saved)
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (err: any) {
      console.error("[Auth] Forgot password error:", err);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
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

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(tokenData.userId, { password: hashedPassword });

      // Remove used token
      resetTokens.delete(token);

      console.log(`[Auth] Password reset successful for user ID ${tokenData.userId}`);
      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (err: any) {
      console.error("[Auth] Reset password error:", err);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
