# First User Setup Guide

## Overview

The Basecamp application includes an automatic **First User becomes System Administrator** feature. This ensures that the first person to log in can immediately manage the system and create additional users.

## How It Works

### Automatic System Administrator Assignment

When the application is first deployed and has **zero users** in the database:

1. **First login** → User automatically gets `system_administrator` role
2. **Subsequent logins** → Users get default `rcm_specialist` role (unless assigned via Azure AD App Roles)

### What This Means

- ✅ **No manual database updates needed** for the first admin
- ✅ **Immediate access** to all features on first login
- ✅ **Built-in user management** - First admin can create all other users
- ✅ **Secure** - Only works when database is empty (new deployments)

## Initial Setup Steps

### Step 1: Deploy the Application

1. Deploy Basecamp to Azure App Service
2. Configure all environment variables
3. Ensure database is set up (tables created)

### Step 2: First Login (System Administrator)

1. **Visit your application URL**
2. **Click "Sign in with Microsoft"**
3. **Log in with your Azure AD account**
4. ✅ **You are now System Administrator!**

You will see in the Azure App Service logs:
```
[Azure AD Auth] First user detected - automatically granting system_administrator role
[Azure AD Auth] Granting system_administrator role to first user
[Azure AD Auth] Step 4: Upserting user with role: system_administrator
```

### Step 3: Manage Users

As System Administrator, you now have access to:

1. **Team Management Page** (`/team-management`)
   - View all users
   - Edit user roles
   - Add new users
   - Assign team members

2. **Analytics Dashboard** (`/analytics`)
   - View performance metrics
   - Track team productivity
   - Monitor revenue and claims

3. **All System Features**
   - Full access to claims, tasks, and workflows
   - System configuration
   - User management

## Adding Additional Users

### Option 1: Via Team Management UI (Recommended)

1. Log in as System Administrator
2. Navigate to **Team Management** page
3. Click **Add User**
4. Fill in user details:
   - First Name
   - Last Name
   - Email
   - Role (choose from: System Administrator, Manager, RCM Specialist, Auditor, Client User)
   - Employee ID (optional)
5. Click **Save**

The user will be created and can log in with their Azure AD account.

### Option 2: Via Azure AD App Roles (Enterprise)

For larger organizations, you can set up Azure AD App Roles:
1. Follow the instructions in `SETUP_AZURE_ROLES.md`
2. Create app roles in Azure AD
3. Assign users to roles in Azure AD
4. Roles automatically sync when users log in

## Role Priority System

The application determines user roles using this priority (highest to lowest):

1. **Azure AD App Roles** (if configured) - Takes precedence
2. **First User Check** - Only for the very first user in the system
3. **Existing Database Role** - Preserves role from previous login
4. **Default Role** - Falls back to `rcm_specialist` if none found

### Example Scenarios

**Scenario 1: Fresh Deployment**
```
Database: Empty (0 users)
User logs in → Becomes system_administrator automatically ✅
```

**Scenario 2: Second User Login**
```
Database: 1 user exists (the admin)
New user logs in → Gets rcm_specialist role (default)
Admin can change role via Team Management UI
```

**Scenario 3: Azure AD Roles Configured**
```
Azure AD: User has "Manager" role assigned
User logs in → Gets manager role (Azure AD takes priority) ✅
```

**Scenario 4: Existing User Returns**
```
Database: User exists with manager role
User logs in → Keeps manager role (preserved) ✅
```

## User Roles & Permissions

| Role | Access Level | Permissions |
|------|-------------|-------------|
| **System Administrator** | Full Access | All features, user management, system settings |
| **Manager** | High Access | Analytics, team management, productivity, claims, tasks |
| **RCM Specialist** | Standard Access | Claims, tasks, worklist management |
| **Auditor** | Read-Only Access | View all data, cannot modify |
| **Client User** | Limited Access | Own client data only |

## Security Considerations

### First User Security

✅ **Safe for production** - First-user-admin only triggers when database is completely empty
✅ **One-time only** - After first user logs in, feature becomes inactive
✅ **Cannot be exploited** - Requires database to have zero users

### Best Practices

1. **First deployment**: Have the intended administrator log in first
2. **Test deployments**: If testing with a temporary user, delete all users before production
3. **Production setup**: Log in immediately after deployment to claim admin role
4. **Multiple admins**: Create additional System Administrators via Team Management

## Troubleshooting

### Issue: Wrong User Became Administrator

**Problem**: A test user logged in first and became admin

**Solution**:
```sql
-- Connect to your PostgreSQL database
-- Delete all users (WARNING: This deletes all data!)
DELETE FROM users;

-- Now the next person to log in will become admin
```

### Issue: First User Didn't Get Admin Role

**Problem**: First user got `rcm_specialist` instead of `system_administrator`

**Solutions**:
1. Check Azure App Service logs for: `[Azure AD Auth] First user detected`
2. If not shown, user table might not be empty
3. Verify deployment has latest code version
4. Manually update role in database:
   ```sql
   UPDATE users SET role = 'system_administrator' WHERE email = 'admin@domain.com';
   ```

### Issue: Want to Change Who Is Admin

**Problem**: Need to promote/demote administrators

**Solution**:
1. Log in as existing System Administrator
2. Go to Team Management
3. Edit user's role
4. Change to `System Administrator` or other role
5. Save changes

## Verification

### How to Check If It Worked

1. **Log in to the application**
2. **Check your role** - Should show "System Administrator" in user menu
3. **Try accessing Team Management** - Should load without "Access Denied" error
4. **View logs** in Azure Portal:
   ```
   [Azure AD Auth] First user detected - automatically granting system_administrator role
   ```

### Database Verification

Query your database to confirm:
```sql
SELECT email, role, first_name, last_name, created_at 
FROM users 
ORDER BY created_at ASC;
```

The first user (oldest `created_at`) should have `role = 'system_administrator'`.

## Summary

✅ **No setup required** - First user automatically becomes admin  
✅ **Built-in user management** - Admin can create all other users  
✅ **Secure by design** - Only works on empty database  
✅ **Flexible role system** - Supports both manual and Azure AD role assignment  
✅ **Enterprise ready** - Scales from single admin to complex organizations  

The first-user-admin feature ensures you can immediately start using and managing your Basecamp deployment without manual database configuration!
