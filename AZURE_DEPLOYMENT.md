# Azure Deployment Guide for Basecamp Healthcare AR Management System

This guide walks you through deploying the Basecamp application to Microsoft Azure using Azure App Service with Azure AD authentication.

## Prerequisites

- Azure subscription with active account
- Azure CLI installed (optional, for command-line deployment)
- Git repository with your code
- Node.js 20.x or later installed locally

## Part 1: Azure AD App Registration

### Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the registration:
   - **Name**: `Basecamp Healthcare AR`
   - **Supported account types**: Select based on your needs
     - **Accounts in this organizational directory only** (single tenant) - recommended for most cases
     - **Accounts in any organizational directory** (multi-tenant) - if you need to support multiple organizations
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `https://your-app-name.azurewebsites.net/api/callback` (replace `your-app-name` with your Azure App Service name)
     - For local testing, also add: `http://localhost:5000/api/callback`
5. Click **Register**

### Step 2: Get Tenant ID and Client ID

After registration, you'll see the app overview page:
- Copy the **Application (client) ID** - this is your `AZURE_CLIENT_ID`
- Copy the **Directory (tenant) ID** - this is your `AZURE_TENANT_ID`

### Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description (e.g., "Production secret")
4. Choose expiration (recommendation: 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the **Value** immediately - this is your `AZURE_CLIENT_SECRET`. You won't be able to see it again!

### Step 4: Configure Authentication Settings

1. Go to **Authentication** in the left menu
2. Under **Implicit grant and hybrid flows**, enable:
   - ✅ **ID tokens** (used for user sign-in)
3. Under **Advanced settings**:
   - Allow public client flows: **No**
4. Click **Save**

### Step 5: Configure API Permissions (Optional)

If you want to access Microsoft Graph API or other Azure services:
1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add permissions as needed (e.g., `User.Read`, `profile`, `email`, `openid`)
6. Click **Add permissions**
7. If required, click **Grant admin consent** for your organization

### Step 6: Configure App Roles (Optional)

To map Azure AD roles to application roles:
1. Go to **App roles**
2. Click **Create app role**
3. Create roles matching your application roles:
   - **Display name**: `System Administrator`
   - **Allowed member types**: Users/Groups
   - **Value**: `system_administrator`
   - **Description**: System administrator role
   - Enable the role
4. Repeat for other roles:
   - `manager`
   - `rcm_specialist`
   - `client_user`
   - `auditor`
5. Click **Save**

### Step 7: Assign Users and Roles

1. Go to **Azure Active Directory** > **Enterprise applications**
2. Find your app `Basecamp Healthcare AR`
3. Go to **Users and groups**
4. Click **Add user/group**
5. Select users and assign appropriate roles
6. Click **Assign**

## Part 2: Azure App Service Setup

### Step 1: Create Azure App Service

**Via Azure Portal:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** > **Web App**
3. Configure the web app:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Name**: Choose a unique name (e.g., `basecamp-healthcare-ar`)
   - **Publish**: **Code**
   - **Runtime stack**: **Node 20 LTS**
   - **Operating System**: **Linux** (recommended)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Choose based on your needs
     - Free (F1): Development/testing only
     - Basic (B1): Small production workloads
     - Standard (S1): Production workloads
     - Premium: High-performance production
4. Click **Review + create**, then **Create**

**Via Azure CLI:**
```bash
# Login to Azure
az login

# Create resource group
az group create --name basecamp-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name basecamp-plan \
  --resource-group basecamp-rg \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --name basecamp-healthcare-ar \
  --resource-group basecamp-rg \
  --plan basecamp-plan \
  --runtime "NODE:20-lts"
```

### Step 2: Create PostgreSQL Database

**Option A: Azure Database for PostgreSQL - Flexible Server (Recommended)**

1. In Azure Portal, create **Azure Database for PostgreSQL flexible server**
2. Configure:
   - **Server name**: `basecamp-postgres`
   - **Region**: Same as your App Service
   - **PostgreSQL version**: 14 or later
   - **Compute + storage**: Choose based on needs (Burstable for dev/test)
   - **Admin username**: Choose a username
   - **Password**: Create a secure password
3. Under **Networking**:
   - Enable **Allow Azure services and resources to access this server**
4. Click **Review + create**, then **Create**
5. After creation, get connection string from **Connection strings** tab

**Option B: Use Neon PostgreSQL (Existing)**

If you're already using Neon PostgreSQL:
- Keep using your existing `DATABASE_URL`
- Ensure your database is accessible from Azure (check firewall rules)

### Step 3: Configure Environment Variables

1. Go to your App Service in Azure Portal
2. Navigate to **Configuration** > **Application settings**
3. Click **New application setting** for each:

```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
APP_URL=https://your-app-name.azurewebsites.net
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require
SESSION_SECRET=<generate-random-secret-here>
NODE_ENV=production
PORT=8080
```

**Generate a random SESSION_SECRET:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

4. Click **Save** at the top
5. Wait for the app to restart

### Step 4: Configure Startup Command

1. Go to **Configuration** > **General settings**
2. Set **Startup Command**:
   ```bash
   node dist/index.js
   ```
3. Click **Save**

## Part 3: Database Migration

### Step 1: Push Database Schema

Before deploying, push your updated schema to the database:

**From your local development environment:**

1. Ensure your `.env` file has the correct `DATABASE_URL` for your production database
2. Run the database migration:
   ```bash
   npm run db:push
   ```

This will add the `azure_ad_id` column to the `users` table and create necessary indexes.

### Step 2: Verify Migration

Connect to your database and verify:
```sql
-- Check if azure_ad_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'azure_ad_id';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'users';
```

## Part 4: Deployment

### Option A: Deploy via GitHub Actions (Recommended)

1. **Get Publish Profile:**
   - In Azure Portal, go to your App Service
   - Click **Get publish profile**
   - Save the downloaded XML file

2. **Add Secret to GitHub:**
   - Go to your GitHub repository > **Settings** > **Secrets and variables** > **Actions**
   - Click **New repository secret**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: Paste the entire content of the publish profile XML
   - Click **Add secret**

3. **Create Workflow File:**

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: basecamp-healthcare-ar  # Replace with your app name
  NODE_VERSION: '20.x'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Create deployment package
      run: |
        # Create deployment directory
        mkdir deploy
        
        # Copy server build
        cp -r dist deploy/
        
        # Copy node_modules (production only)
        npm ci --production
        cp -r node_modules deploy/
        
        # Copy necessary files
        cp package*.json deploy/
        cp -r migrations deploy/
        
        # Create archive
        cd deploy
        zip -r ../release.zip .
    
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: node-app
        path: release.zip

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: 'Production'
      
    steps:
    - name: Download artifact
      uses: actions/download-artifact@v4
      with:
        name: node-app
    
    - name: Unzip artifact
      run: unzip release.zip
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v3
      with:
        app-name: ${{ env.AZURE_WEBAPP_NAME }}
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

4. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Azure deployment workflow"
   git push origin main
   ```

5. The workflow will automatically build and deploy your app!

### Option B: Deploy via Azure CLI

```bash
# Build the application
npm run build

# Create deployment package
mkdir deploy
cp -r dist deploy/
npm ci --production
cp -r node_modules deploy/
cp package*.json deploy/
cd deploy
zip -r ../deploy.zip .
cd ..

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group basecamp-rg \
  --name basecamp-healthcare-ar \
  --src deploy.zip
```

### Option C: Deploy via VS Code

1. Install the **Azure App Service** extension
2. Build the app: `npm run build`
3. Right-click on the `dist` folder
4. Select **Deploy to Web App**
5. Select your subscription and App Service
6. Confirm deployment

## Part 5: Post-Deployment

### Step 1: Verify Deployment

1. Visit your app: `https://your-app-name.azurewebsites.net`
2. You should see the login page
3. Click **Sign in with Microsoft** (or your login button)
4. Sign in with an Azure AD account that has been assigned to the app
5. Verify you're redirected back to the dashboard

### Step 2: Monitor Application

1. In Azure Portal, go to your App Service
2. Navigate to **Monitoring** > **Log stream** to see real-time logs
3. Check **Metrics** for performance monitoring
4. Set up **Application Insights** (recommended) for detailed monitoring:
   - Go to your App Service > **Application Insights**
   - Click **Turn on Application Insights**
   - Create new resource or use existing
   - Click **Apply**

### Step 3: Configure Custom Domain (Optional)

1. Go to **Custom domains** in your App Service
2. Click **Add custom domain**
3. Follow the instructions to:
   - Add DNS records (CNAME or A record)
   - Validate domain ownership
   - Add SSL certificate (use **App Service Managed Certificate** for free SSL)

### Step 4: Set Up Scaling (Production)

For production workloads:
1. Go to **Scale up (App Service plan)**
2. Select a higher tier (S1 or higher for production)
3. Go to **Scale out (App Service plan)**
4. Enable auto-scaling based on:
   - CPU percentage
   - Memory percentage
   - Request count

## Troubleshooting

### Issue: "Application Error" or "503 Service Unavailable"

**Solutions:**
1. Check **Log stream** in Azure Portal
2. Verify startup command: `node dist/index.js`
3. Check environment variables are set correctly
4. Verify `NODE_ENV=production` is set

### Issue: Database Connection Fails

**Solutions:**
1. Verify `DATABASE_URL` includes `?sslmode=require`
2. Check Azure PostgreSQL firewall rules allow Azure services
3. Test connection locally with the same connection string
4. For Neon, ensure you're using the correct connection string format

### Issue: Azure AD Login Fails

**Solutions:**
1. Verify redirect URI in Azure AD matches exactly: `https://your-app.azurewebsites.net/api/callback`
2. Check `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` are correct
3. Verify `APP_URL` matches your actual app URL
4. Ensure ID tokens are enabled in Azure AD App Registration > Authentication

### Issue: "MODULE_NOT_FOUND" Errors

**Solutions:**
1. Ensure all dependencies are in `dependencies` (not `devDependencies`) in package.json
2. Rebuild: `npm run build`
3. Redeploy the application

### Issue: Build Failures

**Solutions:**
1. Check that `npx vite build` works locally
2. Verify all TypeScript files compile without errors: `npm run check`
3. Review build logs in GitHub Actions or Azure deployment logs

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AZURE_TENANT_ID` | Yes | Azure AD tenant ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_ID` | Yes | Azure AD application (client) ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_SECRET` | Yes | Azure AD client secret | `abc123...` |
| `APP_URL` | Yes | Your application's public URL | `https://your-app.azurewebsites.net` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `SESSION_SECRET` | Yes | Random secret for session encryption | `<random-32-char-string>` |
| `NODE_ENV` | Yes | Environment (always `production` in Azure) | `production` |
| `PORT` | No | Port (Azure sets this automatically) | `8080` |

## Security Best Practices

1. **Rotate Secrets Regularly:**
   - Azure AD client secrets expire - set reminders
   - Rotate `SESSION_SECRET` periodically

2. **Enable HTTPS Only:**
   - Azure App Service enforces HTTPS by default
   - Ensure cookies are secure in production

3. **Database Security:**
   - Always use `sslmode=require` for PostgreSQL connections
   - Use strong passwords
   - Limit database access to Azure IP ranges only

4. **Monitor Access:**
   - Review Azure AD sign-in logs regularly
   - Set up alerts for suspicious activity
   - Use Azure AD Conditional Access policies

5. **Backup:**
   - Enable automatic backups in Azure App Service
   - Back up PostgreSQL database regularly
   - Test disaster recovery procedures

## Known Issues & Future Improvements

### ⚠️ Deprecated Dependencies

**passport-azure-ad (Currently in Use)**
- Status: Deprecated by Microsoft but still functional
- Impact: No security updates or bug fixes from Microsoft
- Current Action: Continuing to use for initial deployment
- Future Plan: Migrate to `@azure/msal-node` (Microsoft's recommended solution)
- Timeline: Plan migration after successful initial deployment

**Why We're Not Migrating Yet:**
- Current implementation is stable and working
- Migration requires significant refactoring (1-2 hours)
- Better to deploy successfully first, then improve
- passport-azure-ad still works perfectly fine for Azure AD authentication

**Future Migration Path:**
When ready to migrate, the replacement stack will be:
- `@azure/msal-node` - Microsoft Authentication Library
- `express-session` - Session management (already in use)
- Custom middleware for token validation

### 📦 Other Dependency Notes

**xlsx Package:**
- Has a known Prototype Pollution vulnerability
- No fix currently available
- Used for Excel file import/export functionality
- Risk is low for internal enterprise applications
- Consider alternative if handling untrusted file uploads

**Build Tools (esbuild, vite):**
- Minor vulnerabilities in development dependencies
- Low severity, does not affect production runtime
- Can be addressed with future updates

## Cost Optimization

1. **App Service:**
   - Start with B1 ($13/month) for small production workloads
   - Use F1 (Free) for development/staging
   - Auto-scale only when needed

2. **Database:**
   - Use Burstable tier for development
   - Scale up only for production
   - Consider Neon's free tier for development

3. **Monitoring:**
   - Application Insights charges per GB of data
   - Set sampling rate to reduce costs
   - Use Log Analytics query alerts

## Next Steps

1. Set up **staging slot** for testing before production deployment
2. Configure **CI/CD pipeline** for automated testing and deployment
3. Implement **database backup strategy**
4. Set up **Application Insights** for comprehensive monitoring
5. Configure **Azure AD Conditional Access** for additional security
6. Document your **disaster recovery plan**

## Support

For issues specific to:
- **Azure Services**: [Azure Support](https://azure.microsoft.com/support/)
- **Azure AD**: [Azure AD Documentation](https://docs.microsoft.com/azure/active-directory/)
- **Node.js on Azure**: [Azure Node.js Documentation](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)
