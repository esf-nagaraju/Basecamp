import { OIDCStrategy, type IOIDCStrategyOptionWithRequest, type IProfile, type VerifyCallback } from "passport-azure-ad";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if Azure AD is configured
const isAzureAdConfigured = () => {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
};

// Validate required environment variables
const requiredEnvVars = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'SESSION_SECRET'
];

// In production, Azure AD is required
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Environment variable ${envVar} is required for Azure AD authentication in production`);
    }
  }
}

// In development, warn if Azure AD is not configured
if (process.env.NODE_ENV === 'development' && !isAzureAdConfigured()) {
  console.warn('⚠️  Azure AD is not configured. Running in development mode without Azure AD authentication.');
  console.warn('⚠️  To enable Azure AD locally, set: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET');
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
  validateIssuer: process.env.NODE_ENV === 'production',
  passReqToCallback: true,
  scope: ['openid', 'profile', 'email'],
  loggingLevel: process.env.NODE_ENV === 'development' ? 'info' : 'error',
  nonceLifetime: 3600,
  nonceMaxAmount: 5,
  useCookieInsteadOfSession: false,
  cookieSameSite: true,
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
  
  // Use SESSION_SECRET if available, otherwise use a development fallback
  const sessionSecret = process.env.SESSION_SECRET || 'dev-session-secret-change-in-production';
  
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Using default SESSION_SECRET for development. Set SESSION_SECRET env var for production.');
  }
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

async function upsertUser(profile: IProfile) {
  console.log('[Azure AD Auth] Received profile:', {
    oid: profile.oid,
    email: profile._json?.email || profile.upn,
    displayName: profile.displayName,
  });

  const email = profile._json?.email || profile.upn;
  const azureAdId = profile.oid;

  if (!azureAdId || !email) {
    throw new Error('Azure AD profile missing required fields (oid or email)');
  }

  // Check if user exists
  const existingUser = await storage.getUserByAzureAdId(azureAdId);

  // Parse name from displayName
  const nameParts = (profile.displayName || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Determine role - preserve existing role or default to rcm_specialist
  let role = 'rcm_specialist';
  if (existingUser && existingUser.role) {
    role = existingUser.role;
  } else if (profile._json?.roles && Array.isArray(profile._json.roles)) {
    // Map Azure AD app roles to system roles
    const azureRoles = profile._json.roles as string[];
    if (azureRoles.includes('system_administrator')) {
      role = 'system_administrator';
    } else if (azureRoles.includes('manager')) {
      role = 'manager';
    } else if (azureRoles.includes('auditor')) {
      role = 'auditor';
    } else if (azureRoles.includes('client_user')) {
      role = 'client_user';
    }
  }

  console.log('[Azure AD Auth] Upserting user with role:', role);

  await storage.upsertUserByAzureAd({
    azureAdId,
    email,
    firstName,
    lastName,
    profileImageUrl: profile._json?.picture,
    role,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Only set up Azure AD if configured
  if (isAzureAdConfigured()) {
    console.log('✅ Azure AD authentication is enabled');
    
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

    // Login route - initiates Azure AD authentication
    app.get("/api/login", passport.authenticate('azuread-openidconnect', {
      failureRedirect: '/',
    }));

    // Callback route - handles Azure AD response
    app.post("/api/callback", (req, res, next) => {
      passport.authenticate('azuread-openidconnect', (err: any, user: any) => {
        if (err || !user) {
          console.error('[Azure AD Auth] Authentication failed:', err);
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
  } else {
    // Development mode without Azure AD - provide stub endpoints
    console.log('⚠️  Running in development mode without Azure AD');
    
    app.get("/api/login", (req, res) => {
      res.status(501).json({ 
        error: 'Azure AD not configured', 
        message: 'Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET to enable authentication' 
      });
    });
    
    app.post("/api/callback", (req, res) => {
      res.status(501).json({ error: 'Azure AD not configured' });
    });
    
    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        req.session.destroy(() => {
          res.redirect("/");
        });
      });
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
