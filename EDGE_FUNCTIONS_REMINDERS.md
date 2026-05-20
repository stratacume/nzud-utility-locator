# Booking Reminder Edge Function

This edge function sends automated email reminders 24 hours before scheduled appointments.

## Function: send-booking-reminders

### Create the Function

```bash
supabase functions new send-booking-reminders
```

### Function Code

Replace `supabase/functions/send-booking-reminders/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "bookings@yourdomain.com";
const PORTAL_URL = Deno.env.get("PORTAL_URL") || "https://yourdomain.com/portal";
const COMPANY_NAME = "NZ Utility Detection";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  try {
    // Get tomorrow's date range (24 hours from now)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = tomorrow.toISOString().split('T')[0];
    const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch bookings scheduled for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .gte('booking_date', tomorrowStart)
      .lt('booking_date', tomorrowEnd)
      .in('status', ['confirmed', 'rescheduled'])
      .eq('reminder_sent', false);

    if (bookingsError) throw bookingsError;

    const results = [];

    for (const booking of bookings || []) {
      // Check notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('booking_reminders')
        .eq('customer_email', booking.customer_email.toLowerCase())
        .single();

      // Skip if user opted out of reminders
      if (prefs && prefs.booking_reminders === false) {
        results.push({ booking_id: booking.id, status: 'skipped', reason: 'opted_out' });
        continue;
      }

      // Send reminder email
      const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-NZ', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const html = `
        <h2>Appointment Reminder</h2>
        <p>Kia ora ${booking.customer_name},</p>
        <p>Just a friendly reminder that your appointment is <strong>tomorrow</strong>!</p>
        <div style="background:#fef3c7;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #f97316;">
          <p><strong>Reference:</strong> ${booking.booking_reference}</p>
          <p><strong>Service:</strong> ${booking.service}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Address:</strong> ${booking.service_address}</p>
        </div>
        <p style="margin:20px 0;">
          <a href="${PORTAL_URL}" style="background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
            View in Customer Portal
          </a>
        </p>
        <p>Need to reschedule or cancel? Visit your <a href="${PORTAL_URL}" style="color:#f97316;">customer portal</a>.</p>
        <p>Cheers,<br>${COMPANY_NAME}</p>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: booking.customer_email,
          subject: `Reminder: Your Appointment Tomorrow - ${booking.booking_reference}`,
          html,attachments: booking.attachments || []
        }),
      });

      if (emailRes.ok) {
        // Mark reminder as sent
        await supabase
          .from('bookings')
          .update({ reminder_sent: true })
          .eq('id', booking.id);

        results.push({ booking_id: booking.id, status: 'sent' });
      } else {
        results.push({ booking_id: booking.id, status: 'failed', error: await emailRes.text() });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

## Database Migration

Add the `reminder_sent` column to track which bookings have received reminders:

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
CREATE INDEX idx_bookings_reminder ON bookings(booking_date, reminder_sent) WHERE status IN ('confirmed', 'rescheduled');
```

## Scheduling with pg_cron

Set up a daily cron job to run the reminder function:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the reminder function to run daily at 9 AM NZ time
SELECT cron.schedule(
  'send-booking-reminders',
  '0 21 * * *',  -- 9 AM NZST = 21:00 UTC (adjust for daylight saving)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-booking-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Alternative: Supabase Scheduled Functions

You can also use Supabase's built-in scheduling:

```bash
# Deploy with schedule
supabase functions deploy send-booking-reminders --schedule "0 21 * * *"
```

## Testing

Test the function manually:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-booking-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

## Environment Variables

Ensure these are set:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set FROM_EMAIL=bookings@yourdomain.com
supabase secrets set PORTAL_URL=https://yourdomain.com/portal
```
