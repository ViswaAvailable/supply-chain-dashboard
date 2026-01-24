# Upstash Redis Setup for Rate Limiting

Rate limiting is implemented but requires Upstash Redis configuration to be active.

## Why Upstash?

- **Serverless**: Pay only for what you use
- **Fast**: Edge locations worldwide
- **Simple**: No server management
- **Free tier**: 10,000 commands/day free

## Setup Steps

### 1. Create Upstash Account

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up with GitHub or email
3. Verify your email

### 2. Create Redis Database

1. Click "Create Database"
2. Choose settings:
   - **Name**: `lemondots-ratelimit` (or any name)
   - **Type**: Regional (cheaper) or Global (faster)
   - **Region**: Choose closest to your users
   - **TLS**: Enabled (recommended)
3. Click "Create"

### 3. Get Credentials

1. Click on your new database
2. Scroll to "REST API" section
3. Copy these values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 4. Add to Environment Variables

Add to `.env.local`:

```bash
# Upstash Redis for rate limiting
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXxxx...
```

**Important**: Never commit these values to git!

### 5. Verify Setup

The rate limiting library will automatically:
- Log warnings if Upstash is not configured
- Allow all requests (no rate limiting) if not configured
- Apply rate limits once configured

To test:
```bash
npm run dev
# Try logging in 6 times quickly - 6th attempt should be blocked
```

## Rate Limits Applied

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| Login | 5 requests | 15 minutes | IP address |
| Password Reset | 3 requests | 1 hour | IP address |
| API Routes | 100 requests | 1 minute | User ID |
| User Invitations | 10 requests | 1 hour | Admin user ID |

## Cost Estimate

**Free Tier**: 10,000 commands/day = ~300,000 commands/month

**Typical Usage**:
- 100 users × 50 requests/day = 5,000 commands/day
- Well within free tier

**Paid Tier** (if needed):
- $0.20 per 100,000 requests
- ~$1-2/month for small to medium app

## Production Deployment

When deploying to Vercel/Railway/etc:

1. Add environment variables in your hosting platform:
   - Vercel: Settings → Environment Variables
   - Railway: Variables tab
   - Render: Environment section

2. Same values as `.env.local`

3. Redeploy the application

## Monitoring

View rate limit analytics in Upstash dashboard:
- Requests per second
- Most rate-limited IPs
- Peak usage times

## Troubleshooting

### Rate limits not working
- Check environment variables are set
- Restart dev server after adding env vars
- Check Upstash dashboard for connection errors

### All requests blocked
- Check if IP address detection is working: `console.log(getClientIp(request))`
- Verify time window is correct (15m vs 1h)
- Clear rate limit: Delete keys in Upstash console

### Different limits needed
Edit `src/lib/rate-limit.ts` and adjust:
```typescript
Ratelimit.slidingWindow(5, '15 m')  // 5 requests per 15 minutes
//                       ↑      ↑
//                    count   window
```

## Alternative: Development Mode

For local development without Upstash, rate limiting is automatically disabled with warnings logged.

To re-enable for testing:
1. Create free Upstash account
2. Add credentials to `.env.local`
3. Restart server

---

**Last Updated**: January 2026
