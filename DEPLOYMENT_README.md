# Deployment Guide - Quick Start

This application is ready for Azure Web App deployment with minimal configuration changes.

## 📋 What's Already Configured

✅ **Server Configuration**
- Dynamic PORT binding (Azure compatible)
- Production static file serving
- Health check endpoint at `/health`

✅ **Authentication**
- Azure AD integration
- Session management with PostgreSQL store

✅ **Build Process**
- Frontend build with Vite
- Backend bundling with esbuild

## 🚀 Quick Deployment Steps

### 1. Update package.json

You need to manually **merge** these changes into `package.json`:

**Add engines section:**
```json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=10.0.0"
}
```

**Update scripts section** (keep all existing scripts):
```json
"scripts": {
  "dev": "NODE_ENV=development tsx server/index.ts",
  "build": "npm run build:client && npm run build:server",
  "build:client": "vite build",
  "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "postinstall": "npm run build"
}
```

**Changes:**
- Split `build` into `build:client` + `build:server`
- Added `postinstall` for automatic Azure deployment builds
- **All existing scripts preserved** (dev, check, db:push)

**Important:** The `postinstall` script ensures Azure builds your app after installing dependencies.

### 2. Fix Azure AD Tenant ID

Before deploying, verify your `AZURE_AD_TENANT_ID`:
- Go to Azure Portal > Azure Active Directory > Overview
- Copy the correct Tenant ID (should be a valid GUID)
- Update the secret if it has any errors

### 3. Create Azure Resources

```bash
# Create PostgreSQL database
az postgres flexible-server create --name my-server --resource-group myRG

# Create Web App
az webapp create --name my-app --resource-group myRG --runtime "NODE:20-lts"
```

### 4. Configure Environment Variables

Set these in Azure Web App > Configuration > Application settings:

```bash
NODE_ENV=production
DATABASE_URL=postgres://user:pass@server.postgres.database.azure.com/db?sslmode=require
SESSION_SECRET=$(openssl rand -base64 32)
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
```

### 5. Update Azure AD Redirect URIs

In Azure AD App Registration, add:
- `https://your-app.azurewebsites.net/api/callback`

### 6. Deploy

Push to GitHub (if using GitHub Actions) or:

```bash
git remote add azure <deployment-git-url>
git push azure main
```

### 7. Initialize Database

```bash
npm run db:push
```

## 📚 Detailed Documentation

- **[AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)** - Complete step-by-step deployment guide
- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - All environment variables explained

## ⚠️ Known Issue: Azure AD Tenant ID

The current `AZURE_AD_TENANT_ID` appears to be malformed. Please update it with the correct value from Azure Portal before deploying.

## 🔧 Pre-Deployment Checklist

- [ ] Update `package.json` with engines and scripts
- [ ] Verify `AZURE_AD_TENANT_ID` is correct
- [ ] Create Azure PostgreSQL database
- [ ] Create Azure Web App
- [ ] Configure all environment variables
- [ ] Update Azure AD redirect URIs
- [ ] Push code to deploy
- [ ] Run database migrations
- [ ] Test authentication flow

## 💡 Quick Tips

1. **Testing Locally:** Set `NODE_ENV=production` and run `npm run build && npm start`
2. **Viewing Logs:** Use `az webapp log tail --resource-group myRG --name my-app`
3. **Health Check:** Visit `https://your-app.azurewebsites.net/health`

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| App won't start | Check logs and verify all env variables are set |
| Auth fails | Verify Azure AD Tenant ID and redirect URIs |
| Database error | Check connection string includes `?sslmode=require` |

## 📞 Need Help?

Refer to the detailed guides:
- Azure deployment issues → See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)
- Environment variables → See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
