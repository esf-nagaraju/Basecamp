import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import type { Express } from "express";

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
}

// Login route for local admin
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

  // Admin logout endpoint
  app.post('/api/auth/admin/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('[Local Admin Auth] Logout error:', err);
        return res.status(500).json({ ok: false, message: 'Logout failed' });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('[Local Admin Auth] Session destroy error:', err);
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
