# Setting Up Azure AD App Roles for Basecamp

This guide explains how to properly configure Azure AD App Roles so that user roles are automatically assigned based on their Azure AD group membership.

## Why Use Azure AD App Roles?

- ✅ Centralized role management in Azure AD
- ✅ Automatic role assignment when users log in
- ✅ No need to manually update database
- ✅ Enterprise-grade access control

## Step-by-Step Setup

### Step 1: Create App Roles in Azure AD

1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Find your app: **Basecamp Healthcare AR**
3. Click **App roles** in the left menu
4. Click **Create app role** and create each role:

#### Role 1: System Administrator
- **Display name**: `System Administrator`
- **Allowed member types**: `Users/Groups`
- **Value**: `system_administrator`
- **Description**: `Full access to all features and settings`
- ✅ Enable the role
- Click **Apply**

#### Role 2: Manager
- **Display name**: `Manager`
- **Allowed member types**: `Users/Groups`
- **Value**: `manager`
- **Description**: `Access to analytics, team management, and productivity features`
- ✅ Enable the role
- Click **Apply**

#### Role 3: RCM Specialist
- **Display name**: `RCM Specialist`
- **Allowed member types**: `Users/Groups`
- **Value**: `rcm_specialist`
- **Description**: `Access to claims and task management`
- ✅ Enable the role
- Click **Apply**

#### Role 4: Auditor
- **Display name**: `Auditor`
- **Allowed member types**: `Users/Groups`
- **Value**: `auditor`
- **Description**: `Read-only access to all data`
- ✅ Enable the role
- Click **Apply**

#### Role 5: Client User
- **Display name**: `Client User`
- **Allowed member types**: `Users/Groups`
- **Value**: `client_user`
- **Description**: `Limited access to specific client data`
- ✅ Enable the role
- Click **Apply**

### Step 2: Assign Roles to Users

1. Go to **Azure Active Directory** → **Enterprise applications**
2. Find **Basecamp Healthcare AR**
3. Click **Users and groups** in the left menu
4. Click **Add user/group**
5. **Select users**: Choose the users to add
6. **Select a role**: Choose one of the roles you created above
7. Click **Assign**

### Step 3: Grant Admin Consent (If Needed)

1. In your App Registration, go to **API permissions**
2. If you see "Admin consent required", click **Grant admin consent for [Your Organization]**
3. Click **Yes** to confirm

### Step 4: Test Role Assignment

1. **Log out** of the Basecamp application
2. **Clear browser cache** (important!)
3. **Log in again** with Azure AD
4. Your role should now be automatically assigned based on your Azure AD role assignment

## How It Works

When a user logs in:
1. Azure AD authenticates the user
2. Azure AD includes the user's assigned app roles in the authentication token
3. The application reads the roles from the token
4. The user's role in the database is automatically set based on Azure AD roles

## Verifying Role Assignment

Check the application logs in Azure App Service to see role mapping:

```
[Azure AD Auth] Upserting user with role: system_administrator
```

Or query the database:

```sql
SELECT email, role, azure_ad_id FROM users;
```

## Troubleshooting

### User Still Has Wrong Role

**Problem**: User logs in but still has `rcm_specialist` role

**Solution**:
1. Verify the role is assigned in Azure AD (Enterprise applications → Users and groups)
2. Check that the **Value** field in App roles matches exactly: `system_administrator`, `manager`, etc.
3. Delete the user from the database and log in again:
   ```sql
   DELETE FROM users WHERE email = 'user@domain.com';
   ```
4. Clear browser cache and log in fresh

### Roles Not Showing in Token

**Problem**: Roles aren't being sent in the authentication token

**Solution**:
1. Go to **App Registration** → **Token configuration**
2. Click **Add optional claim**
3. Select **ID tokens**
4. Add the **roles** claim
5. Click **Add**

### Multiple Roles Assigned

**Problem**: User has multiple roles in Azure AD

**Solution**: The application uses this priority:
1. `system_administrator` (highest)
2. `manager`
3. `auditor`
4. `client_user`
5. `rcm_specialist` (lowest)

The highest priority role is automatically selected.

## Best Practices

1. **Least Privilege**: Assign the minimum role needed for each user
2. **Review Regularly**: Audit role assignments quarterly
3. **Use Groups**: Assign roles to Azure AD groups, not individual users
4. **Document**: Keep a record of who has what role and why
5. **Test Changes**: Test role changes in a staging environment first

## Security Considerations

- ✅ Only System Administrators should be able to create other System Administrators
- ✅ Limit System Administrator role to 2-3 trusted users
- ✅ Use Azure AD Conditional Access to require MFA for admin roles
- ✅ Enable Azure AD sign-in logs and review regularly
- ✅ Set up alerts for new System Administrator assignments

## Quick Reference

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| **System Administrator** | Everything | N/A |
| **Manager** | Analytics, Team Management, Productivity, Claims, Tasks | System settings, User creation |
| **RCM Specialist** | Claims, Tasks, Worklist | Analytics, Team Management |
| **Auditor** | All data (read-only) | Cannot modify anything |
| **Client User** | Own client data only | Other clients' data |

## Need Help?

If you're still having issues after following this guide:
1. Check Azure App Service logs for authentication errors
2. Verify all environment variables are set correctly
3. Ensure the app has been redeployed after Azure AD changes
4. Contact your Azure AD administrator for role assignment issues
