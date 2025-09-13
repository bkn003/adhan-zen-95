# Prayer Times App - Scalable Deployment Guide

## Overview
This app is optimized to serve 1M+ users daily using static JSON files instead of live database queries. This approach keeps you within free tier limits for both Supabase and Vercel.

## Architecture

### Static JSON Caching System
- **Storage**: `/public/prayer_times/{location_slug}/{YYYY-MM}.json`
- **Retention**: Only current and next month (6000 files total for 3000 locations)
- **Size**: ~300MB total storage (well within free tier limits)
- **Format**: Each file contains all days for that location/month

### Data Flow
1. **Supabase Trigger** → Detects prayer_times table changes
2. **Webhook Call** → Triggers `/functions/v1/regenerate-json` endpoint
3. **JSON Generation** → Updates static files for affected location/month
4. **CDN Serving** → Vercel serves static files globally

## Setup Instructions

### 1. Supabase Trigger Setup
1. Open Supabase SQL Editor
2. Copy contents from `SUPABASE_TRIGGER_SETUP.sql`
3. Replace `YOUR_APP_DOMAIN` with your actual domain
4. Execute the SQL

### 2. Vercel Deployment
1. Connect your GitHub repo to Vercel
2. Deploy normally - no special configuration needed
3. Note your deployment URL (e.g., `myapp.vercel.app`)
4. Update the trigger URL in Supabase with your domain

### 3. Initial JSON Generation
After deployment, trigger initial JSON generation:
```sql
-- In Supabase SQL Editor, run this to generate all current files:
UPDATE prayer_times SET updated_at = NOW() WHERE month IN ('September', 'October');
```

### 4. Verification
1. Check edge function logs in Supabase Dashboard
2. Verify JSON files are accessible: `https://yourapp.vercel.app/prayer_times/location-slug/2025-09.json`
3. Test app functionality with static data

## Scaling Benefits

### Cost Efficiency
- **Supabase**: Minimal database hits (only during updates)
- **Vercel**: Static file serving (no serverless function calls)
- **CDN**: Global edge caching reduces origin requests

### Performance
- **Loading Speed**: Static JSON files load instantly
- **Caching**: Browser + CDN caching reduces server load
- **Reliability**: Works even if Supabase is temporarily unavailable

### Capacity
- **Users**: Supports 1M+ daily users
- **Locations**: Scales to 10,000+ locations easily
- **Updates**: Real-time updates when prayer times change

## Monitoring

### Key Metrics to Watch
1. **Supabase Dashboard**: Edge function execution logs
2. **Vercel Analytics**: Static file request counts
3. **Browser DevTools**: JSON file loading times

### Troubleshooting
- **Missing JSON files**: Check edge function logs for errors
- **Outdated data**: Verify trigger is firing on prayer_times changes
- **Slow loading**: Confirm CDN caching is working

## Maintenance

### Monthly Cleanup
The system automatically:
- Keeps only current and next month files
- Deletes older month files during regeneration
- Maintains optimal storage usage

### Data Updates
When prayer times change:
1. Update `prayer_times` table in Supabase
2. Trigger automatically fires
3. JSON files regenerate within seconds
4. Users see updated times immediately

## File Structure
```
public/
  prayer_times/
    mumbai-central/
      2025-09.json
      2025-10.json
    delhi-jama-masjid/
      2025-09.json
      2025-10.json
    # ... 3000 locations × 2 months = 6000 files
```

## Sample JSON Structure
```json
[
  {
    "date": "2025-09-01",
    "fajr": "05:30",
    "dhuhr": "12:45",
    "asr": "16:30",
    "maghrib": "18:45",
    "isha": "20:00",
    "location": "Mumbai Central Mosque",
    "fajr_iqamah": "05:45",
    "dhuhr_iqamah": "13:00",
    // ... additional fields
  }
  // ... all days for the month
]
```

This setup ensures your app scales efficiently while staying within free tier limits!