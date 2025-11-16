# Deployment Guide

This guide covers deploying the Stock Portfolio Tracker application to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Backend Deployment](#backend-deployment)
  - [Render Deployment](#render-deployment)
  - [Fly.io Deployment](#flyio-deployment)
- [Frontend Deployment](#frontend-deployment)
  - [Vercel Deployment](#vercel-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

Before deploying, ensure you have:

- GitHub account with your code repository
- MongoDB Atlas account (free tier available)
- Vercel account (for frontend)
- Render or Fly.io account (for backend)
- All required API keys:
  - ExchangeRate-API key
  - Yahoo Finance API key (optional)

## MongoDB Atlas Setup

MongoDB Atlas provides a free cloud-hosted MongoDB database.

### Step 1: Create Account and Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Click "Build a Database"
4. Select "Shared" (Free tier - M0)
5. Choose your cloud provider and region (select closest to your backend deployment)
6. Name your cluster (e.g., "stock-portfolio-cluster")
7. Click "Create Cluster" (takes 3-5 minutes)

### Step 2: Create Database User

1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username and generate a strong password
5. **Important**: Save these credentials securely
6. Set "Database User Privileges" to "Read and write to any database"
7. Click "Add User"

### Step 3: Configure Network Access

1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add specific IP addresses of your backend servers
5. Click "Confirm"

### Step 4: Get Connection String

1. Click "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Choose "Driver: Go" and "Version: 1.13 or later"
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority
   ```
6. Replace `<username>`, `<password>`, and `<database>` with your values
7. Database name example: `stock_portfolio`

**Final connection string example**:
```
mongodb+srv://myuser:mypassword@cluster.mongodb.net/stock_portfolio?retryWrites=true&w=majority
```

### Step 5: Create Indexes (Optional)

The application automatically creates indexes on startup, but you can create them manually:

1. Click "Browse Collections" on your cluster
2. Create database: `stock_portfolio`
3. Create collections: `users`, `portfolios`, `transactions`
4. Add indexes as defined in `server/database/indexes.go`

## Backend Deployment

### Render Deployment

Render provides free tier hosting for backend services.

#### Step 1: Create Render Account

1. Go to [Render](https://render.com/)
2. Sign up with GitHub account
3. Authorize Render to access your repositories

#### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `stock-portfolio-api`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Go`
   - **Build Command**: `go build -o main .`
   - **Start Command**: `./main`
   - **Instance Type**: Free (or paid for better performance)

#### Step 3: Configure Environment Variables

In the "Environment" section, add all variables:

| Key | Value | Notes |
|-----|-------|-------|
| PORT | 8080 | Render provides PORT automatically, but set default |
| MONGODB_URI | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| JWT_SECRET | `<generate-strong-secret>` | Use 32+ character random string |
| EXCHANGE_RATE_API_KEY | `<your-key>` | From ExchangeRate-API |
| YAHOO_FINANCE_API_KEY | `<your-key>` | Optional, for all markets |
| CORS_ORIGIN | `https://your-frontend.vercel.app` | Your Vercel frontend URL |

**Generate JWT Secret**:
```bash
openssl rand -base64 32
```

#### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Monitor the logs for any errors
4. Once deployed, note your service URL: `https://stock-portfolio-api.onrender.com`

#### Step 5: Configure Health Checks

1. Go to your service settings
2. Under "Health & Alerts"
3. Set Health Check Path: `/health`
4. This ensures Render monitors your service

### Fly.io Deployment

Fly.io is an alternative to Render with global edge deployment.

#### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

#### Step 2: Login and Initialize

```bash
# Login to Fly.io
flyctl auth login

# Navigate to server directory
cd server

# Initialize Fly app
flyctl launch
```

Follow the prompts:
- App name: `stock-portfolio-api`
- Region: Choose closest to your users
- PostgreSQL: No (we're using MongoDB)
- Redis: No
- Deploy now: No (we need to set env vars first)

#### Step 3: Configure fly.toml

Edit the generated `fly.toml`:

```toml
app = "stock-portfolio-api"
primary_region = "sjc"

[build]
  [build.args]
    GO_VERSION = "1.21"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"
```

#### Step 4: Set Environment Secrets

```bash
# Set all secrets
flyctl secrets set MONGODB_URI="mongodb+srv://..."
flyctl secrets set JWT_SECRET="your-secret-here"
flyctl secrets set EXCHANGE_RATE_API_KEY="your-key"
flyctl secrets set YAHOO_FINANCE_API_KEY="your-key"
flyctl secrets set CORS_ORIGIN="https://your-frontend.vercel.app"
```

#### Step 5: Deploy

```bash
flyctl deploy
```

Your API will be available at: `https://stock-portfolio-api.fly.dev`

## Frontend Deployment

### Vercel Deployment

Vercel is optimized for React applications with automatic deployments.

#### Step 1: Create Vercel Account

1. Go to [Vercel](https://vercel.com/)
2. Sign up with GitHub account
3. Authorize Vercel to access your repositories

#### Step 2: Import Project

1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Vercel will auto-detect it's a React app

#### Step 3: Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset**: Create React App
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

#### Step 4: Configure Environment Variables

In the "Environment Variables" section, add:

| Name | Value | Environment |
|------|-------|-------------|
| REACT_APP_API_URL | `https://stock-portfolio-api.onrender.com` | Production |

**Important**: Use your actual backend URL from Render or Fly.io

#### Step 5: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your app
3. Monitor the build logs
4. Once complete, you'll get a URL: `https://your-app.vercel.app`

#### Step 6: Configure Custom Domain (Optional)

1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Vercel provides free SSL certificates

### Alternative: Netlify Deployment

If you prefer Netlify over Vercel:

1. Go to [Netlify](https://www.netlify.com/)
2. Sign up and connect GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Configure:
   - **Base directory**: `web`
   - **Build command**: `npm run build`
   - **Publish directory**: `web/build`
6. Add environment variable: `REACT_APP_API_URL`
7. Click "Deploy site"

## Post-Deployment

### Run Data Migration (Dashboard Grouping Feature)

If you're deploying the dashboard grouping feature for the first time, you need to run a data migration:

**Important**: This migration adds asset classification metadata to existing portfolios.

1. **Backup your database** before running migration:
   ```bash
   # For MongoDB Atlas, use the Atlas UI to create a snapshot
   # For local MongoDB:
   mongodump --uri="your-mongodb-uri" --out=/backup/pre-grouping-migration
   ```

2. **The migration runs automatically** on application startup
   - Creates a "Default" asset style for each user
   - Updates all portfolios with `assetStyleId` and `assetClass` fields
   - Sets default values: assetClass = "Stock"

3. **Verify migration success**:
   ```bash
   # Check application logs for:
   # "Running migration: add_asset_metadata"
   # "Migration completed successfully"
   ```

4. **Manual verification** (optional):
   ```javascript
   // In MongoDB shell
   db.asset_styles.countDocuments({ name: "Default" })
   // Should equal number of users
   
   db.portfolios.countDocuments({ asset_style_id: { $exists: true } })
   // Should equal total portfolios
   ```

For detailed migration instructions, see [MIGRATION_PLAN.md](MIGRATION_PLAN.md)

### Update CORS Origin

After deploying frontend, update backend CORS_ORIGIN:

**Render**:
1. Go to your service
2. Environment → Edit
3. Update CORS_ORIGIN to your Vercel URL
4. Save (triggers automatic redeploy)

**Fly.io**:
```bash
flyctl secrets set CORS_ORIGIN="https://your-app.vercel.app"
```

### Test Deployment

1. **Health Check**:
   ```bash
   curl https://your-backend-url.com/health
   ```

2. **Frontend Access**:
   - Open your Vercel URL in browser
   - Try registering a new account
   - Test login functionality
   - Add a test transaction
   - Verify charts load correctly

3. **API Integration**:
   - Check browser console for errors
   - Verify API calls succeed
   - Test stock search functionality
   - Confirm currency conversion works

### Common Deployment Issues

#### CORS Errors in Production

**Problem**: Frontend can't connect to backend

**Solution**:
- Verify CORS_ORIGIN exactly matches frontend URL (including https://)
- No trailing slash in CORS_ORIGIN
- Redeploy backend after changing CORS_ORIGIN

#### Environment Variables Not Working

**Problem**: App behaves differently than local

**Solution**:
- Verify all environment variables are set
- Check for typos in variable names
- Redeploy after adding/changing variables
- Check deployment logs for missing variables

#### Build Failures

**Problem**: Deployment fails during build

**Solution**:
- Check build logs for specific errors
- Verify Go version matches (1.21+)
- Verify Node version matches (18+)
- Check all dependencies are in go.mod/package.json

#### Database Connection Fails

**Problem**: Backend can't connect to MongoDB

**Solution**:
- Verify MongoDB Atlas connection string is correct
- Check Network Access whitelist includes 0.0.0.0/0 or specific IPs
- Verify database user credentials
- Check MongoDB Atlas cluster is running

## Monitoring and Maintenance

### Health Monitoring

**Backend Health Check**:
```bash
# Should return {"status":"ok"}
curl https://your-backend-url.com/health
```

**Set up monitoring**:
- Render: Built-in health checks and alerts
- Fly.io: Built-in health checks in fly.toml
- External: Use UptimeRobot or Pingdom

### Logging

**Render**:
- View logs in dashboard under "Logs" tab
- Logs are retained for 7 days on free tier

**Fly.io**:
```bash
# View live logs
flyctl logs

# View specific app logs
flyctl logs -a stock-portfolio-api
```

**Vercel**:
- View deployment logs in dashboard
- Runtime logs available in "Functions" tab

### Database Backups

**MongoDB Atlas**:
1. Go to your cluster
2. Click "Backup" tab
3. Free tier: Manual snapshots only
4. Paid tier: Automatic continuous backups
5. Download backups regularly

### Scaling

**Backend Scaling**:
- **Render**: Upgrade to paid plan for auto-scaling
- **Fly.io**: Adjust machine count in fly.toml
  ```bash
  flyctl scale count 2
  ```

**Frontend Scaling**:
- Vercel automatically scales
- No configuration needed

### Updates and Redeployment

**Automatic Deployments**:
- Both Render and Vercel auto-deploy on git push to main
- Fly.io requires manual deployment or CI/CD setup

**Manual Redeployment**:
```bash
# Render: Push to GitHub triggers deploy

# Fly.io
cd server
flyctl deploy

# Vercel: Push to GitHub triggers deploy
# Or manual: vercel --prod
```

### Security Best Practices

1. **Rotate Secrets Regularly**:
   - Change JWT_SECRET every 90 days
   - Rotate API keys periodically

2. **Monitor API Usage**:
   - Check ExchangeRate-API usage
   - Monitor Yahoo Finance API rate limits
   - Set up alerts for rate limit approaching

3. **Database Security**:
   - Use strong passwords
   - Restrict network access
   - Enable MongoDB Atlas encryption

4. **SSL/TLS**:
   - Render, Fly.io, and Vercel provide free SSL
   - Ensure force_https is enabled

5. **Rate Limiting**:
   - Backend has built-in rate limiting
   - Monitor for abuse in logs

### Cost Optimization

**Free Tier Limits**:
- **Render**: 750 hours/month, sleeps after 15 min inactivity
- **Fly.io**: 3 shared-cpu VMs, 160GB bandwidth
- **Vercel**: 100GB bandwidth, unlimited deployments
- **MongoDB Atlas**: 512MB storage, shared cluster

**Tips**:
- Use caching to reduce API calls
- Optimize database queries
- Monitor bandwidth usage
- Consider paid tiers for production traffic

## Troubleshooting Deployment

### Backend Won't Start

1. Check deployment logs for errors
2. Verify all environment variables are set
3. Test MongoDB connection string locally
4. Check Go version compatibility

### Frontend Shows Blank Page

1. Check browser console for errors
2. Verify REACT_APP_API_URL is set correctly
3. Check build logs for compilation errors
4. Test API endpoint directly

### Slow Performance

1. Check MongoDB Atlas performance metrics
2. Review API response times in logs
3. Consider upgrading hosting tiers
4. Optimize database queries and indexes

### API Rate Limits Exceeded

1. Implement request caching
2. Upgrade API plan if needed
3. Add rate limiting on frontend
4. Monitor usage patterns

## Support

For deployment issues:
- Check service status pages (Render, Vercel, MongoDB Atlas)
- Review deployment logs carefully
- Test locally with production environment variables
- Contact support for platform-specific issues

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domain (optional)
3. Set up CI/CD pipeline (optional)
4. Plan for scaling and optimization
5. Document any custom configurations
