import { OIDCStrategy, type IOIDCStrategyOptionWithRequest, type IProfile, type VerifyCallback } from "passport-azure-ad";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { setupLocalAdminAuth, setupLocalAdminRoutes, isLocalAdmin } from "./localAdminAuth";

// Validate required environment variables
const requiredEnvVars = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'SESSION_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is required for Azure AD authentication`);
  }
}

// Get the app URL for redirect URIs
const getAppUrl = () => {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  // For local development
  return `http://localhost:${process.env.PORT || 5000}`;
};

const appUrl = getAppUrl();

// Azure AD OIDC Configuration
const azureAdConfig: IOIDCStrategyOptionWithRequest = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: `${appUrl}/api/callback`,
  allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
  validateIssuer: true,
  passReqToCallback: true,
  scope: ['openid', 'profile', 'email'],
  loggingLevel: 'info',
  nonceLifetime: 3600,
  nonceMaxAmount: 5,
  useCookieInsteadOfSession: false,
  cookieSameSite: false,
};

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
    },
  });
}

async function upsertUser(profile: IProfile) {
  console.log('[Azure AD Auth] Step 1: Received profile:', {
    oid: profile.oid,
    email: profile._json?.email || profile.upn,
    displayName: profile.displayName,
  });

  const email = profile._json?.email || profile.upn;
  const azureAdId = profile.oid;

  if (!azureAdId || !email) {
    throw new Error('Azure AD profile missing required fields (oid or email)');
  }

  console.log('[Azure AD Auth] Step 2: Checking if user exists...');
  
  // Check if user exists with timeout
  let existingUser;
  try {
    existingUser = await Promise.race([
      storage.getUserByAzureAdId(azureAdId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout after 10s')), 10000)
      )
    ]);
    console.log('[Azure AD Auth] Step 3: User lookup complete. Exists:', !!existingUser);
  } catch (error) {
    console.error('[Azure AD Auth] Error checking user:', error);
    throw error;
  }

  // Parse name from displayName
  const nameParts = (profile.displayName || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Check if this is the first user in the system
  const allUsers = await storage.getUsers(''); // Empty string to get all users across all tenants
  const isFirstUser = allUsers.length === 0;
  
  if (isFirstUser) {
    console.log('[Azure AD Auth] First user detected - automatically granting system_administrator role');
  }

  // Determine role - Azure AD roles take priority, then first user check, then existing role, then default
  let role = 'rcm_specialist';
  
  // First, check if Azure AD provides roles (this takes priority)
  if (profile._json?.roles && Array.isArray(profile._json.roles)) {
    const azureRoles = profile._json.roles as string[];
    console.log('[Azure AD Auth] Azure AD roles found:', azureRoles);
    
    if (azureRoles.includes('system_administrator')) {
      role = 'system_administrator';
    } else if (azureRoles.includes('manager')) {
      role = 'manager';
    } else if (azureRoles.includes('auditor')) {
      role = 'auditor';
    } else if (azureRoles.includes('client_user')) {
      role = 'client_user';
    } else if (azureRoles.includes('rcm_specialist')) {
      role = 'rcm_specialist';
    }
  } else if (isFirstUser) {
    // First user in the system automatically becomes system administrator
    role = 'system_administrator';
    console.log('[Azure AD Auth] Granting system_administrator role to first user');
  } else if (existingUser && typeof existingUser === 'object' && 'role' in existingUser && existingUser.role) {
    // If no Azure AD roles, preserve existing database role
    console.log('[Azure AD Auth] No Azure AD roles, using existing role:', existingUser.role);
    role = existingUser.role as string;
  } else {
    // Default to rcm_specialist if no roles found anywhere
    console.log('[Azure AD Auth] No roles found, defaulting to rcm_specialist');
  }

  console.log('[Azure AD Auth] Step 4: Upserting user with role:', role);

  try {
    await Promise.race([
      storage.upsertUserByAzureAd({
        azureAdId,
        email,
        firstName,
        lastName,
        profileImageUrl: profile._json?.picture,
        role,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User upsert timeout after 15s')), 15000)
      )
    ]);
    console.log('[Azure AD Auth] Step 5: User upsert complete');
  } catch (error) {
    console.error('[Azure AD Auth] Error upserting user:', error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup local admin routes first
  setupLocalAdminRoutes(app);

  // Azure AD OIDC Strategy
  const verify: VerifyCallback = async (
    req: Express.Request,
    profile: IProfile,
    done: (error: any, user?: any) => void
  ) => {
    try {
      await upsertUser(profile);
      // Store Azure AD profile in session
      done(null, {
        oid: profile.oid,
        displayName: profile.displayName,
        email: profile._json?.email || profile.upn,
      });
    } catch (error) {
      console.error('[Azure AD Auth] Error during verification:', error);
      done(error);
    }
  };

  passport.use('azuread-openidconnect', new OIDCStrategy(azureAdConfig, verify));

  // Setup local admin authentication
  setupLocalAdminAuth();

  // Serialize/deserialize user - handles both Azure AD and local admin users
  passport.serializeUser((user: any, cb) => {
    console.log('[Auth] Serializing user:', user.email || user.username);
    cb(null, user);
  });
  
  passport.deserializeUser((user: any, cb) => {
    console.log('[Auth] Deserializing user:', user.email || user.username);
    cb(null, user);
  });

  // Login route - initiates Azure AD authentication
  app.get("/api/login", passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/',
  }));

  // Callback route - handles Azure AD response
  app.post("/api/callback", (req, res, next) => {
    console.log('[Azure AD Auth] Callback received');
    passport.authenticate('azuread-openidconnect', (err: any, user: any, info: any) => {
      console.log('[Azure AD Auth] Callback result - err:', err, 'user:', user ? 'present' : 'null', 'info:', info);
      
      if (err) {
        console.error('[Azure AD Auth] Authentication error:', err);
        return res.redirect("/api/login");
      }
      
      if (!user) {
        console.error('[Azure AD Auth] No user returned. Info:', info);
        return res.redirect("/api/login");
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error('[Azure AD Auth] Session regeneration failed:', err);
          return next(err);
        }

        req.login(user, (err) => {
          if (err) {
            console.error('[Azure AD Auth] Login failed:', err);
            return next(err);
          }
          console.log('[Azure AD Auth] Login successful for:', user.email);
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    const logoutUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(appUrl)}`;
    
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect(logoutUrl);
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
