# Supabase Edge Functions Setup for Email Notifications

This document explains how to set up Supabase edge functions for booking emails and automated reminders.

## Prerequisites

1. A Supabase project with Edge Functions enabled
2. A Resend account with API key (https://resend.com)
3. A verified domain in Resend for sending emails
4. Access to your domain's DNS settings

---

## DNS Configuration for Email Authentication

**CRITICAL**: Before emails will work, you must configure DNS records for your domain. This ensures emails are delivered and not marked as spam.

### Domain: nzutilitydetection.com

Add the following DNS records to your domain registrar or DNS provider:

### 1. DKIM Record (Required)

DKIM (DomainKeys Identified Mail) cryptographically signs your emails.

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name/Host** | `resend._domainkey` |
| **Value** | `v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY_FROM_RESEND` |
| **TTL** | 3600 (or Auto) |

> **Note**: Get your exact DKIM public key from the Resend dashboard under **Domains → nzutilitydetection.com → DNS Records**

### 2. SPF Record (Required)

SPF (Sender Policy Framework) authorizes Resend to send emails on your behalf.

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name/Host** | `@` (or leave blank for root domain) |
| **Value** | `v=spf1 include:_spf.resend.com ~all` |
| **TTL** | 3600 (or Auto) |

> **Important**: If you already have an SPF record, merge them:
> ```
> v=spf1 include:_spf.resend.com include:_spf.google.com ~all
> ```

### 3. DMARC Record (Recommended)

DMARC adds an additional layer of email authentication and reporting.

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Name/Host** | `_dmarc` |
| **Value** | `v=DMARC1; p=none; rua=mailto:dmarc@nzutilitydetection.com` |
| **TTL** | 3600 (or Auto) |

**DMARC Policy Options:**
- `p=none` - Monitor only (start here)
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Block suspicious emails entirely

### 4. Return-Path / Bounce Handling (Optional but Recommended)

For proper bounce handling, add a CNAME record:

| Field | Value |
|-------|-------|
| **Type** | CNAME |
| **Name/Host** | `bounces` |
| **Value** | `feedback.resend.com` |
| **TTL** | 3600 (or Auto) |

### Complete DNS Records Summary

```
# DKIM - Email signing
resend._domainkey    TXT    "v=DKIM1; k=rsa; p=YOUR_DKIM_PUBLIC_KEY"

# SPF - Authorized senders
@                    TXT    "v=spf1 include:_spf.resend.com ~all"

# DMARC - Policy and reporting
_dmarc               TXT    "v=DMARC1; p=none; rua=mailto:dmarc@nzutilitydetection.com"

# Bounce handling (optional)
bounces              CNAME  feedback.resend.com
```

### Verification Steps

1. **Add DNS records** to your domain registrar (e.g., Cloudflare, GoDaddy, Namecheap)
2. **Wait for propagation** - Can take 15 minutes to 48 hours
3. **Verify in Resend** - Go to Resend Dashboard → Domains → Verify
4. **Test sending** - Send a test email to confirm delivery

### Troubleshooting DNS

**Check DNS propagation:**
```bash
# Check DKIM
dig TXT resend._domainkey.nzutilitydetection.com

# Check SPF
dig TXT nzutilitydetection.com

# Check DMARC
dig TXT _dmarc.nzutilitydetection.com
```

**Online tools:**
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) - DNS lookup and email diagnostics
- [DKIM Validator](https://dkimvalidator.com/) - Test DKIM setup
- [Mail-Tester](https://www.mail-tester.com/) - Test email deliverability

---

## Database Setup

### Bookings Table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_reference TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  service TEXT NOT NULL,
  booking_date DATE NOT NULL,
  service_address TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_email ON bookings(customer_email);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_reminder ON bookings(booking_date, reminder_sent) 
  WHERE status IN ('confirmed', 'rescheduled');
```

### Notification Preferences Table

```sql
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT UNIQUE NOT NULL,
  booking_confirmations BOOLEAN DEFAULT true,
  booking_reminders BOOLEAN DEFAULT true,
  booking_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_prefs_email ON notification_preferences(customer_email);
```

---

## Edge Function 1: send-booking-email

### Create the Function

```bash
supabase functions new send-booking-email
```

### Function Code

Replace `supabase/functions/send-booking-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "bookings@nzutilitydetection.com";
const COMPANY_NAME = "NZ Utility Detection";
const PORTAL_URL = Deno.env.get("PORTAL_URL") || "https://nzutilitydetection.com/portal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { to, customerName, bookingReference, service, bookingDate, serviceAddress, type, originalDate, newDate, portalUrl } = body;

    let subject = "";
    let html = "";
    const formattedDate = new Date(bookingDate).toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (type === "confirmation") {
      subject = `Booking Confirmed - ${bookingReference}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">NZ Utility Detection</h1>
          </div>
          <h2 style="color: #1f2937;">Booking Confirmed</h2>
          <p>Kia ora ${customerName},</p>
          <p>Your booking has been confirmed! Here are your details:</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
            <p style="margin: 8px 0;"><strong>Reference:</strong> ${bookingReference}</p>
            <p style="margin: 8px 0;"><strong>Service:</strong> ${service}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0;"><strong>Address:</strong> ${serviceAddress}</p>
          </div>
          <p style="margin: 25px 0;">
            <a href="${PORTAL_URL}" style="background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">View in Customer Portal</a>
          </p>
          <p>Need to make changes? Visit your <a href="${PORTAL_URL}" style="color: #f97316;">customer portal</a> to reschedule or cancel.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">Cheers,<br><strong>${COMPANY_NAME}</strong></p>
        </body>
        </html>
      `;
    } else if (type === "reminder") {
      subject = `Reminder: Your Appointment Tomorrow - ${bookingReference}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">NZ Utility Detection</h1>
          </div>
          <h2 style="color: #1f2937;">Appointment Reminder</h2>
          <p>Kia ora ${customerName},</p>
          <p>Just a friendly reminder that your appointment is <strong>tomorrow</strong>!</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
            <p style="margin: 8px 0;"><strong>Reference:</strong> ${bookingReference}</p>
            <p style="margin: 8px 0;"><strong>Service:</strong> ${service}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 8px 0;"><strong>Address:</strong> ${serviceAddress}</p>
          </div>
          <p style="margin: 25px 0;">
            <a href="${portalUrl || PORTAL_URL}" style="background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">View in Customer Portal</a>
          </p>
          <p>Need to reschedule? <a href="${portalUrl || PORTAL_URL}" style="color: #f97316;">Click here</a> to manage your booking.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">Cheers,<br><strong>${COMPANY_NAME}</strong></p>
        </body>
        </html>
      `;
    } else if (type === "cancellation") {
      subject = `Booking Cancelled - ${bookingReference}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">NZ Utility Detection</h1>
          </div>
          <h2 style="color: #1f2937;">Booking Cancelled</h2>
          <p>Kia ora ${customerName},</p>
          <p>Your booking has been cancelled as requested.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 8px 0;"><strong>Reference:</strong> ${bookingReference}</p>
            <p style="margin: 8px 0;"><strong>Service:</strong> ${service}</p>
          </div>
          <p>We hope to see you again soon! If you need to book another appointment, visit our website.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">Cheers,<br><strong>${COMPANY_NAME}</strong></p>
        </body>
        </html>
      `;
    } else if (type === "reschedule") {
      const newFormattedDate = new Date(newDate).toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      subject = `Booking Rescheduled - ${bookingReference}`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">NZ Utility Detection</h1>
          </div>
          <h2 style="color: #1f2937;">Booking Rescheduled</h2>
          <p>Kia ora ${customerName},</p>
          <p>Your booking has been successfully rescheduled.</p>
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 8px 0;"><strong>Reference:</strong> ${bookingReference}</p>
            <p style="margin: 8px 0;"><strong>New Date:</strong> ${newFormattedDate}</p>
            <p style="margin: 8px 0;"><strong>Address:</strong> ${serviceAddress}</p>
          </div>
          <p style="margin: 25px 0;">
            <a href="${PORTAL_URL}" style="background: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">View in Customer Portal</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">Cheers,<br><strong>${COMPANY_NAME}</strong></p>
        </body>
        </html>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${RESEND_API_KEY}` 
      },
      body: JSON.stringify({ 
        from: `${COMPANY_NAME} <${FROM_EMAIL}>`, 
        to, 
        subject, 
        html 
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: res.ok ? 200 : 400 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 500 
    });
  }
});
```

---

## Edge Function 2: send-booking-reminders (Scheduled)

This function runs daily to send 24-hour reminders.

### Create the Function

```bash
supabase functions new send-booking-reminders
```

See `EDGE_FUNCTIONS_REMINDERS.md` for the full implementation.

---

## Environment Variables

Set these secrets in your Supabase project:

```bash
# Required
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set FROM_EMAIL=bookings@nzutilitydetection.com
supabase secrets set PORTAL_URL=https://nzutilitydetection.com/portal

# Optional - for testing
supabase secrets set TEST_EMAIL=your-test-email@example.com
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_123abc...` |
| `FROM_EMAIL` | Sender email address (must be verified domain) | `bookings@nzutilitydetection.com` |
| `PORTAL_URL` | Customer portal URL | `https://nzutilitydetection.com/portal` |

---

## Deploy

```bash
# Deploy email function
supabase functions deploy send-booking-email

# Deploy reminder function with schedule (9 AM NZ time)
supabase functions deploy send-booking-reminders --schedule "0 21 * * *"
```

---

## Testing

### Test Email Function

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-booking-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "customerName": "Test Customer",
    "bookingReference": "NZU-TEST-001",
    "service": "Underground Utility Detection",
    "bookingDate": "2024-12-15",
    "serviceAddress": "123 Test Street, Auckland",
    "type": "confirmation"
  }'
```

### Test Reminder Function

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-booking-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

---

## Checklist

- [ ] DNS records added to domain registrar
- [ ] Domain verified in Resend dashboard
- [ ] Environment variables set in Supabase
- [ ] Database tables created
- [ ] Edge functions deployed
- [ ] Test email sent successfully
- [ ] Reminder schedule configured
