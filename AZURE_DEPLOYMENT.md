# Azure Web App Deployment Guide

This guide will walk you through deploying this application to Azure Web App.

## Prerequisites

- Azure account with an active subscription
- Azure CLI installed (optional, but recommended)
- Git installed
- Node.js 20+ and npm 10+ installed locally

## Application Architecture

This application consists of:
- **Frontend**: React application built with Vite
- **Backend**: Express.js server with REST API
- **Authentication**: Azure AD (already configured)
- **Database**: PostgreSQL (Azure Database for PostgreSQL recommended)
- **Session Store**: PostgreSQL-backed sessions

## Step 1: Prepare the Application

### 1.1 Update package.json

**Add** the following to your `package.json` (merge with existing content, don't replace):

1. Add the `engines` field at the top level:
```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

2. **Update** the `scripts` section by modifying the existing `build` script and adding new ones. Your final scripts should look like this (keeping all existing scripts):

```json
{
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
}
```

**Changes made:**
- Split the existing `build` script into `build:client` and `build:server`
- Updated `build` to call both sub-scripts
- Added `postinstall` to automatically build on Azure deployment
- **Kept all existing scripts** (`dev`, `check`, `db:push`)

**Note**: The `postinstall` script ensures Azure builds the application after installing dependencies.

### 1.2 Fix Azure AD Tenant ID

Before deploying, ensure your Azure AD Tenant ID is correct:
1. Go to Azure Portal > Azure Active Directory > Overview
2. Copy the **Tenant ID** (it should be a valid GUID like `aaaabbbb-0000-cccc-1111-dddd2222eeee`)
3. Update the `AZURE_AD_TENANT_ID` secret with the correct value

## Step 2: Set Up Azure Database for PostgreSQL

### 2.1 Create PostgreSQL Database

```bash
# Create a resource group
az group create --name myResourceGroup --location eastus

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --name my-postgres-server \
  --resource-group myResourceGroup \
  --location eastus \
  --admin-user myadmin \
  --admin-password <YourPassword> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 14

# Create database
az postgres flexible-server db create \
  --resource-group myResourceGroup \
  --server-name my-postgres-server \
  --database-name myapp
```

### 2.2 Configure Firewall Rules

```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group myResourceGroup \
  --name my-postgres-server \
  --rule-name AllowAllAzureIPs \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 2.3 Get Connection String

```bash
az postgres flexible-server show-connection-string \
  --server-name my-postgres-server \
  --database-name myapp \
  --admin-user myadmin \
  --admin-password <YourPassword>
```

The connection string format:
```
postgres://myadmin:<YourPassword>@my-postgres-server.postgres.database.azure.com/myapp?sslmode=require
```

## Step 3: Create Azure Web App

### 3.1 Create App Service

```bash
# Create App Service Plan (Linux, Node.js)
az appservice plan create \
  --name myAppServicePlan \
  --resource-group myResourceGroup \
  --is-linux \
  --sku B1

# Create Web App
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name my-unique-app-name \
  --runtime "NODE:20-lts"
```

### 3.2 Configure Deployment Source

**Option A: GitHub Actions (Recommended)**

1. Go to Azure Portal > Your Web App > Deployment Center
2. Select GitHub as source
3. Authorize Azure to access your GitHub
4. Select your repository and branch
5. Azure will create a GitHub Actions workflow automatically

**Option B: Local Git**

```bash
# Configure local git deployment
az webapp deployment source config-local-git \
  --name my-unique-app-name \
  --resource-group myResourceGroup

# Get deployment credentials
az webapp deployment list-publishing-credentials \
  --name my-unique-app-name \
  --resource-group myResourceGroup
```

**Option C: Azure DevOps**

1. Set up Azure DevOps pipeline
2. Configure build and release pipelines
3. Connect to your Azure Web App

## Step 4: Configure Environment Variables

### 4.1 Required App Settings

Configure these in Azure Portal > Your Web App > Configuration > Application settings:

| Setting Name | Description | Example Value |
|-------------|-------------|---------------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@server.postgres.database.azure.com/db?sslmode=require` |
| `SESSION_SECRET` | Session encryption secret | Generate with `openssl rand -base64 32` |
| `AZURE_AD_TENANT_ID` | Your Azure AD Tenant ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_AD_CLIENT_ID` | Azure AD App Registration Client ID | `87654321-4321-4321-4321-210987654321` |
| `AZURE_AD_CLIENT_SECRET` | Azure AD App Registration Client Secret | `your-client-secret` |

### 4.2 Set App Settings via Azure CLI

```bash
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name my-unique-app-name \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="your-postgres-connection-string" \
    SESSION_SECRET="your-generated-secret" \
    AZURE_AD_TENANT_ID="your-tenant-id" \
    AZURE_AD_CLIENT_ID="your-client-id" \
    AZURE_AD_CLIENT_SECRET="your-client-secret"
```

### 4.3 Generate SESSION_SECRET

```bash
openssl rand -base64 32
```

## Step 5: Configure Azure AD App Registration

### 5.1 Update Redirect URIs

1. Go to Azure Portal > Azure Active Directory > App Registrations
2. Select your application
3. Go to Authentication > Add a platform > Web
4. Add redirect URIs:
   - `https://my-unique-app-name.azurewebsites.net/api/callback`
   - `https://your-custom-domain.com/api/callback` (if using custom domain)

### 5.2 Configure Logout URLs

Add logout URLs:
- `https://my-unique-app-name.azurewebsites.net`
- `https://your-custom-domain.com` (if using custom domain)

## Step 6: Initialize Database Schema

### 6.1 Run Database Migrations

After deployment, you need to initialize the database schema. You have two options:

**Option A: Using Azure Cloud Shell**

```bash
# SSH into your Web App
az webapp ssh --resource-group myResourceGroup --name my-unique-app-name

# Run migrations
npm run db:push
```

**Option B: From Local Machine**

Set the `DATABASE_URL` environment variable locally and run:

```bash
export DATABASE_URL="your-azure-postgres-connection-string"
npm run db:push
```

## Step 7: Deploy the Application

### 7.1 Push to GitHub (if using GitHub Actions)

```bash
git add .
git commit -m "Configure for Azure deployment"
git push origin main
```

GitHub Actions will automatically:
1. Install dependencies
2. Build the application (via postinstall script)
3. Deploy to Azure Web App

### 7.2 Deploy via Local Git

```bash
# Add Azure as remote
git remote add azure <deployment-git-url>

# Push to Azure
git push azure main
```

### 7.3 Monitor Deployment

```bash
# Stream logs
az webapp log tail \
  --resource-group myResourceGroup \
  --name my-unique-app-name
```

## Step 8: Verify Deployment

### 8.1 Check Health Endpoint

```bash
curl https://my-unique-app-name.azurewebsites.net/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 8.2 Test Authentication

1. Navigate to `https://my-unique-app-name.azurewebsites.net`
2. Click login
3. Authenticate with Azure AD
4. Verify successful login and redirect

## Step 9: Configure Custom Domain (Optional)

### 9.1 Add Custom Domain

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name my-unique-app-name \
  --resource-group myResourceGroup \
  --hostname www.yourdomain.com

# Enable HTTPS
az webapp config ssl bind \
  --name my-unique-app-name \
  --resource-group myResourceGroup \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

### 9.2 Update Azure AD Redirect URIs

Add your custom domain to Azure AD App Registration redirect URIs.

## Step 10: Enable Logging and Monitoring

### 10.1 Enable Application Logging

```bash
az webapp log config \
  --name my-unique-app-name \
  --resource-group myResourceGroup \
  --application-logging filesystem \
  --level information
```

### 10.2 View Logs

```bash
# Live log streaming
az webapp log tail \
  --resource-group myResourceGroup \
  --name my-unique-app-name

# Download logs
az webapp log download \
  --resource-group myResourceGroup \
  --name my-unique-app-name
```

### 10.3 Set Up Application Insights (Recommended)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app my-app-insights \
  --location eastus \
  --resource-group myResourceGroup

# Link to Web App
az monitor app-insights component connect-webapp \
  --app my-app-insights \
  --resource-group myResourceGroup \
  --web-app my-unique-app-name
```

## Troubleshooting

### Common Issues

**Issue: Application fails to start**
- Check logs: `az webapp log tail --resource-group myResourceGroup --name my-unique-app-name`
- Verify all environment variables are set correctly
- Ensure database connection string is valid
- Check that build completed successfully

**Issue: Azure AD authentication fails**
- Verify `AZURE_AD_TENANT_ID` is correct (no double dashes)
- Ensure redirect URIs in Azure AD match your Web App URL
- Check that client secret is valid and not expired

**Issue: Database connection fails**
- Verify firewall rules allow Azure services
- Check connection string format includes `?sslmode=require`
- Ensure database user has proper permissions

**Issue: Session not persisting**
- Verify `SESSION_SECRET` is set
- Check that sessions table exists in database
- Ensure `DATABASE_URL` is correctly configured

### Debug Mode

To enable debug logging, add this app setting:

```bash
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name my-unique-app-name \
  --settings DEBUG=express:*
```

## Scaling and Performance

### 10.1 Scale Up (Vertical Scaling)

```bash
az appservice plan update \
  --name myAppServicePlan \
  --resource-group myResourceGroup \
  --sku P1V2
```

### 10.2 Scale Out (Horizontal Scaling)

```bash
az appservice plan update \
  --name myAppServicePlan \
  --resource-group myResourceGroup \
  --number-of-workers 3
```

### 10.3 Enable Auto-scaling

```bash
az monitor autoscale create \
  --resource-group myResourceGroup \
  --resource my-unique-app-name \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-plan \
  --min-count 1 \
  --max-count 5 \
  --count 2
```

## Security Best Practices

1. **Use Managed Identity**: Enable system-assigned managed identity for database access
2. **Enable HTTPS Only**: Configure HTTPS redirect
3. **Restrict CORS**: Configure allowed origins
4. **Rotate Secrets**: Regularly rotate Azure AD client secrets and session secrets
5. **Monitor Access**: Enable Application Insights for monitoring

## Cost Optimization

- Use **B1** tier for development/staging environments
- Use **P1V2** or higher for production
- Consider **Reserved Instances** for 1-3 year commitments (up to 55% savings)
- Enable **auto-scaling** to handle traffic spikes efficiently

## Backup and Recovery

### Enable Backups

```bash
az webapp config backup create \
  --resource-group myResourceGroup \
  --webapp-name my-unique-app-name \
  --backup-name initial-backup \
  --container-url "<storage-sas-url>"
```

## Next Steps

1. **Set up CI/CD**: Configure automated testing and deployment
2. **Add monitoring**: Set up alerts for errors and performance issues
3. **Configure CDN**: Use Azure CDN for static assets
4. **Enable caching**: Implement Redis cache for session storage
5. **Set up staging slots**: Use deployment slots for zero-downtime deployments

## Support

For Azure-specific issues:
- Azure Documentation: https://learn.microsoft.com/azure/app-service/
- Azure Support: https://azure.microsoft.com/support/

For application issues:
- Check application logs
- Review this deployment guide
- Verify all environment variables are configured correctly
