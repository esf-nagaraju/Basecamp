# Environment Variables Configuration

This document lists all environment variables required for the application to run properly in Azure Web App.

## Required Environment Variables

### Application Configuration

| Variable | Required | Description | Example Value | How to Generate |
|----------|----------|-------------|---------------|-----------------|
| `NODE_ENV` | Yes | Application environment | `production` | Set to `production` for Azure deployment |
| `PORT` | No | Server port (Azure sets this automatically) | `8080` | Azure auto-configures; defaults to 5000 locally |

### Database Configuration

| Variable | Required | Description | Example Value | How to Generate |
|----------|----------|-------------|---------------|-----------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgres://user:pass@server.postgres.database.azure.com/dbname?sslmode=require` | From Azure Database for PostgreSQL |

**Database URL Format:**
```
postgres://<username>:<password>@<server>.postgres.database.azure.com/<database>?sslmode=require
```

**Important Notes:**
- Must include `?sslmode=require` for Azure PostgreSQL
- Use the admin username from your Azure PostgreSQL server
- Ensure password is URL-encoded if it contains special characters

### Session Configuration

| Variable | Required | Description | Example Value | How to Generate |
|----------|----------|-------------|---------------|-----------------|
| `SESSION_SECRET` | Yes | Secret key for session encryption | `Xr8K9mN2pQ5wT7vY1zA3bC6dE9fH0jL4` | Run: `openssl rand -base64 32` |

**Security Notes:**
- Must be at least 32 characters long
- Should be a randomly generated string
- Never commit this to version control
- Rotate periodically for security

### Azure AD Authentication

| Variable | Required | Description | Example Value | How to Generate |
|----------|----------|-------------|---------------|-----------------|
| `AZURE_AD_TENANT_ID` | Yes | Azure AD Tenant ID | `12345678-1234-1234-1234-123456789012` | Azure Portal > Azure Active Directory > Overview > Tenant ID |
| `AZURE_AD_CLIENT_ID` | Yes | Azure AD Application (Client) ID | `87654321-4321-4321-4321-210987654321` | Azure Portal > App Registrations > Your App > Overview > Application (client) ID |
| `AZURE_AD_CLIENT_SECRET` | Yes | Azure AD Application Client Secret | `abc123def456ghi789~jkl012mno345` | Azure Portal > App Registrations > Your App > Certificates & secrets |

**Azure AD Setup:**
1. Go to Azure Portal > Azure Active Directory > App Registrations
2. Create a new registration or select existing app
3. Note the Application (client) ID
4. Go to Certificates & secrets > New client secret
5. Copy the secret value immediately (it won't be shown again)
6. Configure Redirect URIs in Authentication section:
   - `https://<your-app>.azurewebsites.net/api/callback`

### Development-Only Variables (Not needed in Azure)

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `REPLIT_DOMAINS` | No | Comma-separated domains for Replit | `localhost:5000` |
| `ISSUER_URL` | No | Custom OIDC issuer (legacy) | Not used with Azure AD |
| `REPL_ID` | No | Replit-specific identifier | Not used with Azure AD |

## Azure Web App Configuration

### Setting Environment Variables via Azure Portal

1. Go to Azure Portal
2. Navigate to your Web App
3. Click **Configuration** in the left sidebar
4. Click **Application settings** tab
5. Click **+ New application setting**
6. Enter name and value
7. Click **OK** then **Save**

### Setting Environment Variables via Azure CLI

```bash
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name <your-app-name> \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="postgres://user:pass@server.postgres.database.azure.com/db?sslmode=require" \
    SESSION_SECRET="<your-generated-secret>" \
    AZURE_AD_TENANT_ID="<your-tenant-id>" \
    AZURE_AD_CLIENT_ID="<your-client-id>" \
    AZURE_AD_CLIENT_SECRET="<your-client-secret>"
```

## Verification Checklist

Before deploying, verify:

- [ ] All required environment variables are set in Azure App Settings
- [ ] `DATABASE_URL` includes `?sslmode=require`
- [ ] `SESSION_SECRET` is at least 32 characters
- [ ] `AZURE_AD_TENANT_ID` is a valid GUID (no double dashes)
- [ ] Azure AD redirect URIs include your Azure Web App URL
- [ ] Azure AD client secret is not expired

## Security Best Practices

### 1. Secret Management
- **Never commit secrets to version control**
- Use Azure Key Vault for sensitive values (advanced)
- Rotate secrets regularly:
  - Session secrets: Every 90 days
  - Azure AD client secrets: Before expiration (max 2 years)

### 2. Database Security
- Use strong passwords for database users
- Restrict database firewall to Azure services only
- Enable SSL/TLS connections (required)
- Use least-privilege database users

### 3. Session Security
- Use strong `SESSION_SECRET`
- Enable `secure` cookies (automatically enabled in production)
- Set appropriate session timeout (currently 7 days)

## Troubleshooting

### Error: "Environment variable AZURE_AD_TENANT_ID not provided"
**Solution:** Set `AZURE_AD_TENANT_ID` in Azure App Settings

### Error: "Tenant not found" or "invalid_tenant"
**Solution:** Verify your Tenant ID is correct and doesn't have typos or double dashes

### Error: "Database connection failed"
**Solution:** 
- Check `DATABASE_URL` format
- Verify database firewall allows Azure services
- Ensure `?sslmode=require` is included

### Error: "Unauthorized" when accessing protected routes
**Solution:**
- Check `SESSION_SECRET` is set
- Verify session store is working (database connection)
- Ensure Azure AD configuration is correct

## Environment-Specific Configurations

### Development (Local)
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgres://localhost/myapp_dev
SESSION_SECRET=dev-secret-change-in-production
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>
REPLIT_DOMAINS=localhost:5000
```

### Production (Azure)
```bash
NODE_ENV=production
# PORT is set automatically by Azure
DATABASE_URL=postgres://user:pass@server.postgres.database.azure.com/db?sslmode=require
SESSION_SECRET=<strong-random-secret>
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>
```

## Quick Reference: Generate All Secrets

```bash
# Generate session secret
echo "SESSION_SECRET=$(openssl rand -base64 32)"

# Get Azure AD values from Azure Portal
echo "AZURE_AD_TENANT_ID: Azure Portal > Azure AD > Overview > Tenant ID"
echo "AZURE_AD_CLIENT_ID: Azure Portal > App Registrations > Your App > Application ID"
echo "AZURE_AD_CLIENT_SECRET: Azure Portal > App Registrations > Your App > Certificates & secrets"

# Get database connection string
az postgres flexible-server show-connection-string \
  --server-name <your-server> \
  --database-name <your-database> \
  --admin-user <your-username>
```

## Additional Resources

- [Azure App Service Configuration](https://learn.microsoft.com/azure/app-service/configure-common)
- [Azure Database for PostgreSQL](https://learn.microsoft.com/azure/postgresql/)
- [Azure AD App Registration](https://learn.microsoft.com/azure/active-directory/develop/quickstart-register-app)
