# Azure Deployment Guide

This guide explains how to deploy the Healthcare AR Management System to Azure Web Apps with Azure AD authentication.

## Prerequisites

- Azure account with appropriate permissions
- Azure CLI installed (optional but recommended)
- VS Code with Azure App Service extension (optional)

## Part 1: Azure AD App Registration

### 1. Create App Registration

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `Healthcare AR Management` (or your preferred name)
   - **Supported account types**: Choose based on your needs:
     - Single tenant (recommended for enterprise)
     - Multi-tenant (if supporting multiple organizations)
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `https://<your-app-name>.azurewebsites.net/api/callback`
     - Note: You can add multiple redirect URIs later for dev/staging

5. Click **Register**

### 2. Configure Authentication

1. In your app registration, go to **Authentication**
2. Under **Implicit grant and hybrid flows**, enable:
   - ✅ Access tokens
   - ✅ ID tokens
3. Under **Advanced settings**:
   - Allow public client flows: **No**
   - Supported account types: Verify your selection
4. Click **Save**

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `Healthcare AR Production Secret`
4. Expiration: Choose based on your security policy (recommend 12 months or less)
5. Click **Add**
6. **⚠️ IMPORTANT**: Copy the secret value immediately - you won't be able to see it again!

### 4. Note Your Configuration Values

From your App Registration overview page, copy:
- **Application (client) ID** → This is your `AZURE_CLIENT_ID`
- **Directory (tenant) ID** → This is your `AZURE_TENANT_ID`
- **Client secret value** (from step 3) → This is your `AZURE_CLIENT_SECRET`

### 5. Configure User Roles (Optional but Recommended)

To assign roles to users:

1. Go to **App roles** in your app registration
2. Click **Create app role**
3. Create roles for your application:

   **Manager Role:**
   - Display name: `Manager`
   - Allowed member types: `Users/Groups`
   - Value: `manager`
   - Description: `Managers who oversee teams and productivity`

   **System Administrator Role:**
   - Display name: `System Administrator`
   - Allowed member types: `Users/Groups`
   - Value: `system_administrator`
   - Description: `System administrators with full access`

   **RCM Specialist Role:**
   - Display name: `RCM Specialist`
   - Allowed member types: `Users/Groups`
   - Value: `rcm_specialist`
   - Description: `Revenue Cycle Management specialists`

   **Client User Role:**
   - Display name: `Client User`
   - Allowed member types: `Users/Groups`
   - Value: `client_user`
   - Description: `External client users`

   **Auditor Role:**
   - Display name: `Auditor`
   - Allowed member types: `Users/Groups`
   - Value: `auditor`
   - Description: `Auditors with read-only access`

4. After creating roles, assign them to users:
   - Go to **Enterprise applications** → Find your app
   - Go to **Users and groups**
   - Click **Add user/group**
   - Select users and assign appropriate roles

### 6. Configure Token Claims (Required for Roles)

1. Go to **Token configuration**
2. Click **Add optional claim**
3. Token type: **ID**
4. Select claims:
   - ✅ `email`
   - ✅ `family_name`
   - ✅ `given_name`
5. Click **Add**
6. For role claims:
   - Click **Add groups claim**
   - Select: **Security groups** or **All groups**
   - In ID token, select: **Group ID**

## Part 2: Azure Database Setup

### 1. Create PostgreSQL Database

```bash
# Create resource group (if not exists)
az group create --name healthcare-ar-rg --location eastus

# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group healthcare-ar-rg \
  --name healthcare-ar-db \
  --location eastus \
  --admin-user dbadmin \
  --admin-password <secure-password> \
  --sku-name Standard_B2s \
  --tier Burstable \
  --version 14

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group healthcare-ar-rg \
  --name healthcare-ar-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Get connection string
az postgres flexible-server show-connection-string \
  --server-name healthcare-ar-db \
  --database-name postgres \
  --admin-user dbadmin \
  --admin-password <secure-password>
```

### 2. Create Application Database

```bash
# Connect to PostgreSQL
psql "host=healthcare-ar-db.postgres.database.azure.com port=5432 dbname=postgres user=dbadmin password=<secure-password> sslmode=require"

# Create database
CREATE DATABASE healthcare_ar;
```

### 3. Initialize Database Schema (CRITICAL)

**⚠️ IMPORTANT**: The application requires a properly initialized database schema, including the `sessions` table for authentication to work. You MUST run database migrations before the application can authenticate users.

The sessions table is used by both Replit Auth and Azure AD to store user sessions. Without it, authentication will fail immediately.

```bash
# Option 1: Run migrations using Drizzle (recommended)
npm run db:push

# Option 2: Manually run migration SQL files
# Connect to your database and execute files in the migrations/ folder in order:
psql "<your-database-url>" -f migrations/0000_eager_sway.sql
psql "<your-database-url>" -f migrations/0001_dapper_mystique.sql
```

The schema includes:
- `sessions` table (REQUIRED for authentication)
- `tenants` table (multi-tenancy support)
- `users` table (user accounts)
- `claims` table (medical claims)
- `tasks` table (workflow management)
- `activity_logs` table (audit trail)
- And other supporting tables

**Verification**: After running migrations, verify the sessions table exists:
```sql
\dt sessions
-- Should show: sessions table with columns: sid, sess, expire
```

## Part 3: Build the Application

### 1. Prepare for Production Build

```bash
# Install dependencies
npm install

# Run TypeScript type checking
npm run check

# Build the application (frontend + backend)
npm run build
```

This creates:
- `dist/public/` - Frontend assets
- `dist/index.js` - Backend server bundle

### 2. Test Production Build Locally (Optional)

```bash
# Set required environment variables
export DATABASE_URL="<your-postgres-connection-string>"
export SESSION_SECRET="<generate-random-secret>"
export AZURE_TENANT_ID="<your-tenant-id>"
export AZURE_CLIENT_ID="<your-client-id>"
export AZURE_CLIENT_SECRET="<your-client-secret>"
export APP_URL="http://localhost:5000"
export NODE_ENV="production"

# Run production build
npm start
```

## Part 4: Deploy to Azure Web Apps

### Option 1: Using Azure CLI (Recommended)

```bash
# Login to Azure
az login

# Create App Service Plan
az appservice plan create \
  --name healthcare-ar-plan \
  --resource-group healthcare-ar-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group healthcare-ar-rg \
  --plan healthcare-ar-plan \
  --name <your-unique-app-name> \
  --runtime "NODE:20-lts"

# Configure environment variables
az webapp config appsettings set \
  --resource-group healthcare-ar-rg \
  --name <your-unique-app-name> \
  --settings \
    DATABASE_URL="<your-postgres-connection-string>" \
    SESSION_SECRET="<generate-random-secret>" \
    AZURE_TENANT_ID="<your-tenant-id>" \
    AZURE_CLIENT_ID="<your-client-id>" \
    AZURE_CLIENT_SECRET="<your-client-secret>" \
    APP_URL="https://<your-unique-app-name>.azurewebsites.net" \
    NODE_ENV="production"

# Deploy using local git
cd /path/to/project
git init
git add .
git commit -m "Initial commit"

az webapp deployment source config-local-git \
  --resource-group healthcare-ar-rg \
  --name <your-unique-app-name>

# Get git URL and push
az webapp deployment list-publishing-credentials \
  --resource-group healthcare-ar-rg \
  --name <your-unique-app-name>

git remote add azure <git-url>
git push azure main
```

### Option 2: Using VS Code

1. Install **Azure App Service** extension
2. Sign in to Azure
3. Right-click on **App Services** → **Create New Web App (Advanced)**
4. Follow prompts:
   - Name: `<your-unique-app-name>`
   - Resource group: `healthcare-ar-rg`
   - Runtime stack: `Node 20 LTS`
   - OS: `Linux`
   - App Service Plan: Create new or use existing
5. After creation, right-click your app → **Deploy to Web App**
6. Configure environment variables in **Application Settings** (see values above)

### Option 3: Using GitHub Actions CI/CD

1. In Azure Portal, go to your Web App → **Deployment Center**
2. Source: **GitHub**
3. Authenticate and select your repository
4. Azure generates a workflow file automatically
5. Ensure environment secrets are configured in **Settings** → **Application Settings**

## Part 5: Post-Deployment Configuration

### 1. Run Database Migrations (CRITICAL - MUST DO FIRST)

**⚠️ IMPORTANT**: You MUST run database migrations BEFORE the application can start. The application will fail authentication if the `sessions` table doesn't exist.

```bash
# SSH into your Azure Web App
az webapp ssh --resource-group healthcare-ar-rg --name <your-unique-app-name>

# Run migrations
npm run db:push
```

Or manually run migration SQL files from the `migrations/` folder:

```bash
# Connect to your database
psql "<your-database-url>"

# Run migrations in order
\i migrations/0000_eager_sway.sql
\i migrations/0001_dapper_mystique.sql

# Verify sessions table exists
\dt sessions
```

**Why this is critical**: 
- Azure AD authentication stores session data in PostgreSQL using the `sessions` table
- Without this table, all authentication attempts will fail with database errors
- The application checks for database connectivity at startup but won't create tables automatically

### 2. Update Azure AD Redirect URIs

1. Go back to your Azure AD App Registration
2. **Authentication** → **Platform configurations** → **Web**
3. Add production redirect URI:
   - `https://<your-unique-app-name>.azurewebsites.net/api/callback`
4. Click **Save**

### 3. Verify Application

1. Navigate to `https://<your-unique-app-name>.azurewebsites.net`
2. Click **Login** - should redirect to Azure AD
3. Sign in with your Azure AD credentials
4. Verify role-based access is working
5. Test core functionality

### 4. Enable Always On (Recommended)

```bash
az webapp config set \
  --resource-group healthcare-ar-rg \
  --name <your-unique-app-name> \
  --always-on true
```

This prevents cold starts and keeps your app responsive.

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `SESSION_SECRET` | Secret for session encryption | Random 32+ character string |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_ID` | Your app registration client ID | `87654321-4321-4321-4321-210987654321` |
| `AZURE_CLIENT_SECRET` | Your client secret value | `abc123...` |
| `APP_URL` | Your application's base URL | `https://your-app.azurewebsites.net` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port (Azure sets this automatically) | `5000` |

## Security Checklist

- [ ] Client secret is stored securely in Azure Key Vault or App Settings
- [ ] Database uses SSL/TLS (`sslmode=require`)
- [ ] Session secret is randomly generated and secure
- [ ] `NODE_ENV` is set to `production`
- [ ] Azure AD token validation is enabled (`validateIssuer: true` in production)
- [ ] App Service has managed identity configured (optional but recommended)
- [ ] HTTPS is enforced (Azure Web Apps enforces this by default)
- [ ] Database firewall is configured to allow only Azure services
- [ ] Role-based access control is properly configured in Azure AD

## Troubleshooting

### "Authentication failed" error
- Verify redirect URI matches exactly in Azure AD and your app
- Check that all environment variables are set correctly
- Ensure client secret hasn't expired

### Database connection errors
- Verify DATABASE_URL is correct
- Check that firewall allows Azure services
- Ensure SSL mode is enabled

### Build failures
- Run `npm run check` locally first to catch TypeScript errors
- Verify all dependencies are in package.json
- Check Node.js version matches (20 LTS)

### Cold starts / slow performance
- Enable "Always On" in App Service settings
- Consider upgrading to Standard tier for better performance
- Check application logs for memory/CPU issues

## Monitoring & Logs

### View Application Logs

```bash
# Stream logs in real-time
az webapp log tail \
  --resource-group healthcare-ar-rg \
  --name <your-unique-app-name>

# Or in Azure Portal
# Your Web App → Monitoring → Log stream
```

### Enable Application Insights (Recommended)

```bash
az monitor app-insights component create \
  --app healthcare-ar-insights \
  --location eastus \
  --resource-group healthcare-ar-rg \
  --application-type web

# Link to Web App
az webapp config appsettings set \
  --resource-group healthcare-ar-rg \
  --name <your-unique-app-name> \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="<connection-string>"
```

## Scaling Recommendations

### Development/Testing
- **Tier**: Free F1 or Basic B1
- **Instances**: 1
- **Database**: Burstable B2s

### Production (Small)
- **Tier**: Standard S1
- **Instances**: 2-3 (auto-scale)
- **Database**: General Purpose D2s_v3

### Production (Large/Enterprise)
- **Tier**: Premium P1V2+
- **Instances**: 3-10 (auto-scale based on metrics)
- **Database**: Memory Optimized E2s_v3+
- Enable Azure Front Door for CDN/WAF

## Cost Optimization

1. **Start small**: Begin with Basic B1 tier and scale up as needed
2. **Auto-scaling**: Configure based on CPU/memory metrics to handle traffic spikes
3. **Database**: Use Burstable tier for dev/test, scale to General Purpose for production
4. **Reserved instances**: Consider 1-3 year reservations for 40-70% savings
5. **Monitoring**: Set up budget alerts to track spending

## Support

For Azure-specific issues:
- [Azure Web Apps Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure AD Documentation](https://learn.microsoft.com/en-us/azure/active-directory/)
- [Azure Support Portal](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

For application issues:
- Check application logs
- Review error messages in Application Insights
- Verify all environment variables are configured correctly
