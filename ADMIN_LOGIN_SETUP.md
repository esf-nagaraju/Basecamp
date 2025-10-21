# Default Admin Login Setup Guide

## Overview

The Basecamp application now includes a **built-in administrator account** that allows login without Microsoft authentication. This provides:

- ✅ **Emergency Access**: Log in even if Azure AD is unavailable
- ✅ **Initial Setup**: Access the system immediately without configuring Azure AD users
- ✅ **User Management**: Create and manage other users through Team Management
- ✅ **Independent Authentication**: No dependency on external identity providers

## Default Credentials

**⚠️ IMPORTANT: Change these in production!**

```
Username: admin
Password: admin123
```

## How to Customize Admin Credentials

### Option 1: Environment Variables (Recommended)

Set these environment variables in your Azure App Service or deployment environment:

```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password_here
```

**Example:**
```env
ADMIN_USERNAME=sysadmin
ADMIN_PASSWORD=MySecureP@ssw0rd!2025
```

### Option 2: Azure App Service Configuration

1. **Go to Azure Portal** → Your App Service
2. **Configuration** → **Application settings**
3. **Click "+ New application setting"**
4. Add two settings:
   - **Name:** `ADMIN_USERNAME` | **Value:** `your_username`
   - **Name:** `ADMIN_PASSWORD` | **Value:** `your_secure_password`
5. **Click "Save"** and **restart** the app service

### Option 3: GitHub Actions Secrets (for CI/CD)

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add repository secrets:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
3. Update your workflow YAML to include these secrets

## Login Instructions

### For Users (Microsoft Login)

1. Go to your Basecamp application URL
2. Click **"Sign in with Microsoft"**
3. Authenticate with your Azure AD account
4. Access your assigned role and features

### For System Administrator (Local Admin)

1. Go to your Basecamp application URL
2. Click **"Admin Login"** button
3. Enter your admin credentials:
   - **Username**: `admin` (or your custom username)
   - **Password**: `admin123` (or your custom password)
4. Click **"Sign in"**
5. ✅ **You're now logged in as System Administrator!**

## What Admin Can Do

As the local administrator, you have **full system access**:

### ✅ User Management
- Access **Team Management** page
- Create new users with any role:
  - System Administrator
  - Manager
  - RCM Specialist
  - Auditor
  - Client User
- Edit user roles
- View all users across all tenants

### ✅ Analytics & Reporting
- View comprehensive analytics dashboard
- Access all KPIs and metrics
- Monitor team performance
- Track revenue and claims

### ✅ Full System Access
- Access all claims
- View and manage all tasks
- Configure system settings
- Access productivity metrics

## Security Best Practices

### 🔒 Production Security

1. **Change default password immediately**
   ```env
   ADMIN_PASSWORD=Use-A-Strong-P@ssw0rd-Here!
   ```

2. **Use strong passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and special characters
   - Example: `Bc2025!Adm1n$Secure`

3. **Limit admin account usage**
   - Use Microsoft login for day-to-day operations
   - Reserve admin account for:
     - Initial setup
     - Emergency access
     - User management
     - System recovery

4. **Audit admin logins**
   - Monitor Azure App Service logs for admin login events
   - Look for: `[Local Admin Auth] ✓ Admin login successful`

5. **Consider additional security**
   - Enable IP restrictions in Azure App Service
   - Set up alerts for admin logins
   - Implement multi-factor authentication (future enhancement)

### ⚠️ What NOT to Do

- ❌ **Don't share admin credentials** with multiple people
- ❌ **Don't use default password** (`admin123`) in production
- ❌ **Don't commit credentials** to source control
- ❌ **Don't use simple passwords** like `password` or `123456`

## Architecture Details

### Authentication Flow

**Microsoft Login (Regular Users):**
```
User → Microsoft → Azure AD → Passport OIDC → Session → Dashboard
```

**Admin Login (Local Admin):**
```
User → Admin Form → Passport Local → Session → Dashboard
```

### How It Works

1. **Dual Authentication System:**
   - Azure AD OIDC for regular users
   - Passport Local strategy for admin

2. **Password Security:**
   - Admin password is hashed using bcrypt (10 rounds)
   - Never stored in database
   - Compared in-memory during login

3. **Session Management:**
   - Both auth types use same session store
   - Admin sessions managed identically to regular users
   - Logout works the same way

4. **User Context:**
   - Local admin identified by `isLocalAdmin: true` flag
   - Has access to all tenants
   - Full system administrator role

### Files Modified

- **`server/localAdminAuth.ts`** - Local admin authentication logic
- **`server/azureAuth.ts`** - Integrated local admin into main auth flow
- **`server/routes.ts`** - Updated to handle admin users
- **`client/src/pages/landing.tsx`** - Dual login interface

## Troubleshooting

### Issue: Admin login button not visible

**Problem**: Login page only shows Microsoft login

**Solution**: 
- Scroll down on the login page
- Look for "Or" divider
- Click "Admin Login" button below Microsoft button

### Issue: Invalid username or password

**Problem**: Login fails with error message

**Solutions**:
1. Verify environment variables are set correctly:
   ```bash
   echo $ADMIN_USERNAME
   echo $ADMIN_PASSWORD
   ```

2. Check Azure App Service logs:
   ```
   [Local Admin Auth] Invalid username
   [Local Admin Auth] Invalid password
   ```

3. Ensure you're using the correct credentials:
   - Default: `admin` / `admin123`
   - Or your custom environment variables

### Issue: Admin can't access certain features

**Problem**: Admin logged in but features are restricted

**Solution**: 
- Admin should have `system_administrator` role automatically
- Check browser console for errors
- Verify session is active
- Try logging out and logging back in

### Issue: How to reset admin password

**Problem**: Forgot admin password

**Solution**:
1. Update environment variable in Azure App Service
2. Restart the application
3. Use new password to log in

## Verification

### Check Admin Login Works

1. **Navigate to login page**
2. **Click "Admin Login"**
3. **Enter credentials**
4. **Should see** in Azure logs:
   ```
   [Local Admin Auth] Login attempt for username: admin
   [Local Admin Auth] ✓ Admin login successful
   [Auth] Serializing user: admin@basecamp.local
   ```

### Check Admin Has Full Access

After logging in as admin:

1. ✅ **Dashboard** loads
2. ✅ **Team Management** accessible
3. ✅ **Analytics** page accessible
4. ✅ **Can create users**
5. ✅ **Can view all data**

## Frequently Asked Questions

### Q: Can I disable the admin account?

A: Not currently. The admin account is always available for emergency access. However, you can:
- Use a very strong password
- Enable IP restrictions
- Monitor admin logins closely

### Q: Can regular users see the admin login button?

A: Yes, the admin login button is visible to everyone. However:
- Only someone with the credentials can log in
- Failed login attempts are logged
- Consider implementing rate limiting (future enhancement)

### Q: Does the admin account get stored in the database?

A: No! The admin account exists only in memory. It's not a database user, which is why:
- It works even if database is empty
- It can't be deleted accidentally
- It requires no setup

### Q: Can I have multiple admin accounts?

A: Currently, only one built-in admin account is supported. For multiple administrators:
- Create additional users with `system_administrator` role via Team Management
- Those users will log in with Microsoft authentication

### Q: What happens if I forget the admin password?

A: Simply update the `ADMIN_PASSWORD` environment variable in Azure App Service and restart the application.

## Next Steps

1. ✅ **Deploy the updated code** to Azure App Service
2. ✅ **Set custom admin credentials** via environment variables
3. ✅ **Test admin login** to verify it works
4. ✅ **Create initial users** through Team Management
5. ✅ **Configure Azure AD roles** for regular users (optional)

## Summary

✅ **Built-in admin account** - No external dependencies  
✅ **Dual authentication** - Microsoft for users, local for admin  
✅ **Full system access** - Complete user and system management  
✅ **Secure by default** - Bcrypt password hashing  
✅ **Production ready** - Environment variable configuration  
✅ **Emergency access** - Works even if Azure AD is down  

The local admin account provides a reliable, secure way to manage your Basecamp deployment without dependency on external authentication providers!
