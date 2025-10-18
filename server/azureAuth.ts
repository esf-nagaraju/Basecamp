import { OIDCStrategy } from "passport-azure-ad";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Azure AD configuration - these must be set in environment variables for production
const REQUIRED_AZURE_VARS = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'SESSION_SECRET'
];

// Only enforce in production or if any Azure var is partially set
const hasAnyAzureVar = REQUIRED_AZURE_VARS.slice(0, 3).some(v => process.env[v]);
if (process.env.NODE_ENV === 'production' || hasAnyAzureVar) {
  for (const varName of REQUIRED_AZURE_VARS) {
    if (!process.env[varName]) {
      throw new Error(`Environment variable ${varName} is required for Azure AD authentication. Please set all Azure AD variables.`);
    }
  }
}

// Get the application's base URL from environment or construct from domain
const getBaseUrl = (hostname?: string): string => {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // For Azure Web Apps, construct from hostname
  if (hostname) {
    return `https://${hostname}`;
  }
  
  // Fallback for local development
  return `http://localhost:${process.env.PORT || 5000}`;
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
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

async function upsertUser(profile: any) {
  console.log('[Azure AD Auth] Received profile:', { 
    oid: profile.oid,
    email: profile._json?.email || profile.upn,
    displayName: profile.displayName
  });
  
  // Check if user exists and has an existing role
  const existingUser = await storage.getUser(profile.oid);
  
  // Azure AD doesn't typically send role claims by default
  // You may need to configure app roles in Azure AD and add them to token claims
  let normalizedRole = profile._json?.role;
  
  if (normalizedRole) {
    const roleMap: Record<string, string> = {
      'manager': 'manager',
      'Manager': 'manager',
      'system_administrator': 'system_administrator',
      'System Administrator': 'system_administrator',
      'rcm_specialist': 'rcm_specialist',
      'RCM Specialist': 'rcm_specialist',
      'client_user': 'client_user',
      'Client User': 'client_user',
      'auditor': 'auditor',
      'Auditor': 'auditor',
    };
    normalizedRole = roleMap[normalizedRole] || normalizedRole;
    console.log('[Azure AD Auth] Normalized role from claim:', normalizedRole);
  } else if (existingUser && existingUser.role !== 'rcm_specialist') {
    // Preserve existing non-default role when Azure AD doesn't provide role claim
    normalizedRole = existingUser.role;
    console.log('[Azure AD Auth] No role in claims, preserving existing role:', normalizedRole);
  } else {
    // Default to rcm_specialist for new users or existing rcm_specialists
    normalizedRole = undefined; // Will default in storage layer
    console.log('[Azure AD Auth] No role in claims, will default to RCM_SPECIALIST');
  }
  
  // Parse name from displayName if first/last name not provided
  const displayName = profile.displayName || '';
  const nameParts = displayName.split(' ');
  const firstName = profile._json?.given_name || profile.name?.givenName || nameParts[0] || '';
  const lastName = profile._json?.family_name || profile.name?.familyName || nameParts.slice(1).join(' ') || '';
  
  await storage.upsertUser({
    id: profile.oid,
    email: profile._json?.email || profile.upn || '',
    firstName,
    lastName,
    profileImageUrl: profile._json?.picture,
    role: normalizedRole,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Construct redirect URL from APP_URL or use default
  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
  const redirectUrl = `${baseUrl}/api/callback`;

  // Azure AD OIDC configuration
  const azureConfig = {
    identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    responseType: 'code id_token' as const,
    responseMode: 'form_post' as const,
    redirectUrl: redirectUrl,
    allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
    validateIssuer: false, // Set to true in production with proper issuer validation
    passReqToCallback: true as const,
    scope: ['openid', 'profile', 'email', 'offline_access'],
    loggingLevel: process.env.NODE_ENV === 'development' ? 'info' as const : 'error' as const,
    useCookieInsteadOfSession: false,
  };

  passport.use(new OIDCStrategy(
    azureConfig,
    async (req: any, iss: any, sub: any, profile: any, accessToken: any, refreshToken: any, done: any) => {
      try {
        if (!profile.oid) {
          return done(new Error('No OID found in user profile'));
        }

        await upsertUser(profile);
        
        const user: any = {
          claims: {
            sub: profile.oid,
            email: profile._json?.email || profile.upn,
            first_name: profile.name?.givenName || profile._json?.given_name,
            last_name: profile.name?.familyName || profile._json?.family_name,
            profile_image_url: profile._json?.picture,
          },
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: profile._json?.exp,
        };

        return done(null, user);
      } catch (error) {
        console.error('[Azure AD Auth] Error in verify callback:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Login route - dynamically set redirect URL based on request hostname
  app.get("/api/login", (req, res, next) => {
    passport.authenticate('azuread-openidconnect', {
      prompt: 'select_account',
    })(req, res, next);
  });

  // Callback route
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
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.get("/api/logout", (req, res) => {
    const postLogoutRedirectUri = getBaseUrl(req.hostname);
    
    req.logout(() => {
      req.session.destroy(() => {
        // Redirect to Azure AD logout endpoint
        const logoutUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
        res.redirect(logoutUrl);
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token has expired - could implement refresh token logic here if needed
  // For now, require re-authentication
  res.status(401).json({ message: "Unauthorized" });
};
