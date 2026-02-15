# GitHub Secrets Setup Guide

## Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

Add these **5 secrets**:

### 1. `GCP_PROJECT_ID`
```
Value: velos-ai-backend
```
Your Google Cloud project ID.

### 2. `GCP_SA_KEY`
```
Value: <paste entire JSON key file>
```

**How to get this:**
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a new service account (or use existing)
3. Grant these roles:
   - Artifact Registry Administrator
   - Cloud Run Admin
   - Service Account User
4. Click on the service account → Keys tab → Add Key → Create new key → JSON
5. Download the JSON file
6. Copy the **entire contents** of the JSON file and paste as the secret value

Example format:
```json
{
  "type": "service_account",
  "project_id": "velos-ai-backend",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "github-actions@velos-ai-backend.iam.gserviceaccount.com",
  ...
}
```

### 3. `GCP_REGION`
```
Value: asia-east1
```
The region where you want to deploy Cloud Run. Options:
- `asia-east1` (Taiwan)
- `asia-southeast1` (Singapore)
- `us-central1` (Iowa)

### 4. `DATABASE_URL`
```
Value: postgresql://postgres:Been1chu1@3@35.229.232.204:5432/bot_trading
```
Your PostgreSQL connection string.

**Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

### 5. `SECRET_KEY`
```
Value: <generate a random 32-byte hex string>
```

**Generate with:**
```bash
openssl rand -hex 32
```
Example output: `a1b2c3d4e5f6...` (64 characters)

This is used for JWT token encryption.

---

## Backend Needs to Stay Warm

**Yes, only the backend needs to stay warm** because:
- The trading scheduler (APScheduler) runs inside the backend container
- It needs to execute trades every hour
- If the container shuts down, the scheduler stops

**Solution:** The deployment now includes `--min-instances 1`

```yaml
--min-instances 1
```

This keeps at least 1 instance always running.

**Cost:** ~$5-10/month for 1 always-on instance (512Mi memory)

---

## Frontend (Optional)

The frontend doesn't need GitHub Actions yet because:
- It's just basic React pages (not production-ready)
- You can deploy it later when the UI is complete
- For now, you can run it locally: `cd frontend && npm install && npm run dev`

**When ready to deploy frontend:**
- Deploy to Cloud Run, Firebase Hosting, or Vercel
- No need to keep it warm (it's static files)

---

## Alternative: Use Cloud Scheduler Instead

If you want to **save costs** and not keep the backend warm 24/7:

1. **Remove `--min-instances 1`** from the deployment
2. **Create a Cloud Scheduler job:**

```bash
gcloud scheduler jobs create http trading-bot-hourly \
  --schedule="0 * * * *" \
  --uri="https://bot-trading-backend-<PROJECT_ID>.run.app/api/trading/execute-now" \
  --http-method=POST \
  --location=asia-east1
```

This way:
- Cloud Scheduler wakes up the backend every hour
- Backend scales to 0 when not in use (saves money)
- More reliable than APScheduler

**Cost:** ~$0.10/month for Cloud Scheduler

---

## Verification Steps

After adding secrets and pushing to GitHub:

1. **Check GitHub Actions:**
   - Go to repository → Actions tab
   - Should see "Deploy Backend to Cloud Run" workflow running
   - Wait ~2-3 minutes for deployment

2. **Check Cloud Run:**
   - Go to Google Cloud Console → Cloud Run
   - Should see `bot-trading-backend` service
   - Click on it → copy the URL

3. **Test the API:**
   ```bash
   curl https://bot-trading-backend-<hash>.run.app/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "scheduler": true,
     "next_run": "2024-02-15 18:00:00"
   }
   ```

4. **Check Database:**
   ```sql
   \c bot_trading
   \dt
   ```
   Should see tables: users, binance_accounts, bot_configs, trades, market_data

---

## Summary

**GitHub Secrets needed (5 total):**
1. `GCP_PROJECT_ID` → Your GCP project ID
2. `GCP_SA_KEY` → Service account JSON (entire file)
3. `GCP_REGION` → asia-east1
4. `DATABASE_URL` → PostgreSQL connection string
5. `SECRET_KEY` → Random 32-byte hex (from openssl)

**Backend deployment includes `--min-instances 1`** to keep scheduler running.

**Frontend doesn't need deployment yet** - it's just placeholder pages.
