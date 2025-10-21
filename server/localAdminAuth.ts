import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import type { Express } from "express";
import { storage } from "./storage";

// Default admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // CHANGE THIS IN PRODUCTION!

// Local admin user object (not stored in database)
interface LocalAdminUser {
  id: string;
  username: string;
  role: 'system_administrator';
  isLocalAdmin: true;
  email: string;
  firstName: string;
  lastName: string;
}

const localAdminUser: LocalAdminUser = {
  id: 'local-admin',
  username: ADMIN_USERNAME,
  role: 'system_administrator',
  isLocalAdmin: true,
  email: 'admin@basecamp.local',
  firstName: 'System',
  lastName: 'Administrator'
};

// Hash the admin password for comparison
let hashedAdminPassword: string;

async function initializeAdminPassword() {
  hashedAdminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  console.log('[Local Admin Auth] Default admin user initialized');
  console.log('[Local Admin Auth] Username:', ADMIN_USERNAME);
  console.log('[Local Admin Auth] ⚠️  Change ADMIN_PASSWORD in production!');
}

// Initialize password hash
initializeAdminPassword();

// Local admin authentication strategy
export function setupLocalAdminAuth() {
  // Admin-only authentication
  passport.use('local-admin', new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    async (username, password, done) => {
      console.log('[Local Admin Auth] Login attempt for username:', username);
      
      try {
        // Check if username matches
        if (username !== ADMIN_USERNAME) {
          console.log('[Local Admin Auth] Invalid username');
          return done(null, false, { message: 'Invalid username or password' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, hashedAdminPassword);
        
        if (!isValid) {
          console.log('[Local Admin Auth] Invalid password');
          return done(null, false, { message: 'Invalid username or password' });
        }

        console.log('[Local Admin Auth] ✓ Admin login successful');
        return done(null, localAdminUser as any);
      } catch (error) {
        console.error('[Local Admin Auth] Error during authentication:', error);
        return done(error);
      }
    }
  ));

  // Database user authentication
  passport.use('local-user', new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      console.log('[User Auth] Login attempt for email:', email);
      
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          console.log('[User Auth] User not found');
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if user has a password set
        if (!user.password) {
          console.log('[User Auth] User has no password - must use Microsoft login');
          return done(null, false, { message: 'This account uses Microsoft login. Please sign in with Microsoft.' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
          console.log('[User Auth] Invalid password');
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('[User Auth] ✓ User login successful:', user.email);
        
        // Return user for session (similar to Azure AD format)
        return done(null, {
          oid: user.id, // Use user ID as oid for consistency
          displayName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          isLocalUser: true // Flag to distinguish from Azure AD users
        } as any);
      } catch (error) {
        console.error('[User Auth] Error during authentication:', error);
        return done(error);
      }
    }
  ));
}

// Login routes for both admin and database users
export function setupLocalAdminRoutes(app: Express) {
  // Admin login endpoint
  app.post('/api/auth/admin/login', 
    passport.authenticate('local-admin', { 
      failureMessage: true 
    }),
    (req, res) => {
      console.log('[Local Admin Auth] User authenticated, creating session');
      
      // Return user info
      res.json({
        ok: true,
        user: {
          id: localAdminUser.id,
          username: localAdminUser.username,
          email: localAdminUser.email,
          firstName: localAdminUser.firstName,
          lastName: localAdminUser.lastName,
          role: localAdminUser.role,
          isLocalAdmin: true
        }
      });
    }
  );

  // Database user login endpoint
  app.post('/api/auth/login', 
    passport.authenticate('local-user', { 
      failureMessage: true 
    }),
    (req, res) => {
      console.log('[User Auth] User authenticated, creating session');
      
      // Return success - user info will be fetched via /api/auth/user
      res.json({
        ok: true,
        message: 'Login successful'
      });
    }
  );

  // Logout endpoint (works for both admin and regular users)
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ ok: false, message: 'Logout failed' });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Session destroy error:', err);
        }
        res.json({ ok: true });
      });
    });
  });
}

// Check if user is local admin
export function isLocalAdmin(user: any): boolean {
  return user?.isLocalAdmin === true;
}

export { localAdminUser };
