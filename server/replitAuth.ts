import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Azure AD configuration
if (!process.env.AZURE_AD_TENANT_ID) {
  throw new Error("Environment variable AZURE_AD_TENANT_ID not provided");
}

if (!process.env.AZURE_AD_CLIENT_ID) {
  throw new Error("Environment variable AZURE_AD_CLIENT_ID not provided");
}

if (!process.env.AZURE_AD_CLIENT_SECRET) {
  throw new Error("Environment variable AZURE_AD_CLIENT_SECRET not provided");
}

const getOidcConfig = memoize(
  async () => {
    // Azure AD OIDC discovery endpoint
    const issuerUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`;
    return await client.discovery(
      new URL(issuerUrl),
      process.env.AZURE_AD_CLIENT_ID!,
      process.env.AZURE_AD_CLIENT_SECRET!
    );
  },
  { maxAge: 3600 * 1000 }
);

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
      secure: true,
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  console.log('[Azure AD Auth] Received claims:', { 
    oid: claims["oid"],
    sub: claims["sub"], 
    email: claims["email"] || claims["preferred_username"],
    name: claims["name"],
    givenName: claims["given_name"],
    familyName: claims["family_name"],
    roles: claims["roles"]
  });
  
  // Azure AD uses 'oid' (object ID) as the unique identifier
  const userId = claims["oid"] || claims["sub"];
  
  // Check if user exists and has an existing role
  const existingUser = await storage.getUser(userId);
  
  // Parse name - Azure AD provides given_name and family_name
  const firstName = claims["given_name"] || claims["name"]?.split(' ')[0] || 'User';
  const lastName = claims["family_name"] || claims["name"]?.split(' ').slice(1).join(' ') || '';
  
  // Get email - Azure AD can provide email or preferred_username (UPN)
  const email = claims["email"] || claims["preferred_username"] || claims["upn"];
  
  // Map Azure AD roles to application roles if provided
  let normalizedRole = undefined;
  
  if (claims["roles"] && Array.isArray(claims["roles"])) {
    // If Azure AD app roles are configured, use them
    const roleMap: Record<string, string> = {
      'Manager': 'manager',
      'SystemAdministrator': 'system_administrator',
      'RCMSpecialist': 'rcm_specialist',
      'ClientUser': 'client_user',
      'Auditor': 'auditor',
    };
    
    for (const role of claims["roles"]) {
      if (roleMap[role]) {
        normalizedRole = roleMap[role];
        break;
      }
    }
    console.log('[Azure AD Auth] Normalized role from Azure AD roles:', normalizedRole);
  }
  
  if (!normalizedRole && existingUser && existingUser.role !== 'rcm_specialist') {
    // Preserve existing non-default role when Azure AD doesn't provide role
    normalizedRole = existingUser.role;
    console.log('[Azure AD Auth] No role in claims, preserving existing role:', normalizedRole);
  } else if (!normalizedRole) {
    // Default to rcm_specialist for new users
    normalizedRole = undefined; // Will default in storage layer
    console.log('[Azure AD Auth] No role in claims, will default to RCM_SPECIALIST');
  }
  
  await storage.upsertUser({
    id: userId,
    email: email,
    firstName: firstName,
    lastName: lastName,
    profileImageUrl: null, // Azure AD doesn't provide profile image in standard claims
    role: normalizedRole,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Determine the callback URL based on environment
  const getCallbackUrl = (hostname: string) => {
    // For local development
    if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
      return `http://${hostname}/api/callback`;
    }
    // For Replit deployment
    return `https://${hostname}/api/callback`;
  };

  // Get all possible domains (Replit domains or localhost)
  const domains = process.env.REPLIT_DOMAINS 
    ? process.env.REPLIT_DOMAINS.split(",")
    : ['localhost:5000'];

  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `azuread:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: getCallbackUrl(domain),
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const strategyName = `azuread:${req.hostname}`;
    passport.authenticate(strategyName, {
      prompt: "select_account",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const strategyName = `azuread:${req.hostname}`;
    passport.authenticate(strategyName, (err: any, user: any) => {
      if (err || !user) {
        console.error('[Azure AD Auth] Authentication failed:', err);
        return res.redirect("/api/login");
      }
      
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const postLogoutRedirectUri = `${req.protocol}://${req.hostname}`;
    
    req.logout(() => {
      // Azure AD logout URL
      const logoutUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
      res.redirect(logoutUrl);
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.error('[Azure AD Auth] Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
