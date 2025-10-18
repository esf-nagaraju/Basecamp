// Authentication router - chooses between Replit Auth and Azure AD based on environment
import type { Express, RequestHandler } from "express";

// Check if Azure AD is configured
const useAzureAD = !!(
  process.env.AZURE_TENANT_ID &&
  process.env.AZURE_CLIENT_ID &&
  process.env.AZURE_CLIENT_SECRET
);

export async function setupAuth(app: Express) {
  if (useAzureAD) {
    console.log('[Auth] Using Azure AD authentication');
    const { setupAuth: azureSetupAuth } = await import('./azureAuth');
    return azureSetupAuth(app);
  } else {
    console.log('[Auth] Using Replit authentication');
    const { setupAuth: replitSetupAuth } = await import('./replitAuth');
    return replitSetupAuth(app);
  }
}

export async function getIsAuthenticated(): Promise<RequestHandler> {
  if (useAzureAD) {
    const { isAuthenticated } = await import('./azureAuth');
    return isAuthenticated;
  } else {
    const { isAuthenticated } = await import('./replitAuth');
    return isAuthenticated;
  }
}

// Export a middleware that dynamically loads the correct isAuthenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authMiddleware = await getIsAuthenticated();
  return authMiddleware(req, res, next);
};
