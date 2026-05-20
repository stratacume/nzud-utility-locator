# DNS Setup Guide for Email Notifications

## Domain: nzutilitydetection.com

> **Status (action required):** The edge functions `send-booking-email` and
> `send-contact-email` are now configured to send **from
> `bookings@nzutilitydetection.com`**. Until the domain is verified in Resend,
> Resend will reject every send with `The nzutilitydetection.com domain is not
> verified` and no emails will be delivered. Complete Steps 1–3 below to turn
> sending back on. If you need a temporary fallback, set the Supabase secret
> `FROM_EMAIL` to `NZ Utility Detection <onboarding@resend.dev>` — the
> functions will pick that up automatically without a redeploy.

This guide provides step-by-step instructions for configuring DNS records to enable email notifications via Resend.

---

## Quick Reference - All DNS Records

Add these records to your DNS provider:

| Type | Name/Host | Value | TTL |
|------|-----------|-------|-----|
| TXT | `resend._domainkey` | `v=DKIM1; k=rsa; p=YOUR_KEY` | 3600 |
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` | 3600 |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@nzutilitydetection.com` | 3600 |
| CNAME | `bounces` | `feedback.resend.com` | 3600 |

---

## Detailed Setup Instructions

### Step 1: Get Your DKIM Key from Resend

1. Log in to [Resend Dashboard](https://resend.com/domains)
2. Click on **Domains** in the sidebar
3. Click **Add Domain** and enter `nzutilitydetection.com`
4. Copy the DKIM public key provided (starts with `p=MIGf...`)

### Step 2: Add DNS Records

#### For Cloudflare Users:

1. Log in to Cloudflare Dashboard
2. Select `nzutilitydetection.com`
3. Go to **DNS** → **Records**
4. Add each record:

**DKIM Record:**
- Type: `TXT`
- Name: `resend._domainkey`
- Content: `v=DKIM1; k=rsa; p=YOUR_DKIM_KEY_FROM_RESEND`
- Proxy status: DNS only (grey cloud)

**SPF Record:**
- Type: `TXT`
- Name: `@`
- Content: `v=spf1 include:_spf.resend.com ~all`
- Proxy status: DNS only

**DMARC Record:**
- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=none; rua=mailto:dmarc@nzutilitydetection.com`
- Proxy status: DNS only

**Bounce Handling:**
- Type: `CNAME`
- Name: `bounces`
- Target: `feedback.resend.com`
- Proxy status: DNS only

#### For GoDaddy Users:

1. Log in to GoDaddy
2. Go to **My Products** → **DNS**
3. Click **Add** for each record

#### For Namecheap Users:

1. Log in to Namecheap
2. Go to **Domain List** → **Manage** → **Advanced DNS**
3. Add each record under **Host Records**

---

## Step 3: Verify Domain in Resend

1. Return to [Resend Dashboard](https://resend.com/domains)
2. Click on `nzutilitydetection.com`
3. Click **Verify DNS Records**
4. Wait for all records to show ✓ (green checkmark)

> **Note**: DNS propagation can take 15 minutes to 48 hours

---

## Step 4: Test Your Setup

### Check DNS Propagation

Use these commands to verify your records:

```bash
# Check DKIM
nslookup -type=TXT resend._domainkey.nzutilitydetection.com

# Check SPF
nslookup -type=TXT nzutilitydetection.com

# Check DMARC
nslookup -type=TXT _dmarc.nzutilitydetection.com

# Check Bounce CNAME
nslookup -type=CNAME bounces.nzutilitydetection.com
```

### Online Verification Tools

- **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx
  - Enter `nzutilitydetection.com` and select SPF, DKIM, or DMARC lookup
  
- **DKIM Validator**: https://dkimvalidator.com/
  - Send a test email to their address to verify DKIM signing

- **Mail-Tester**: https://www.mail-tester.com/
  - Send a test email to check overall deliverability score

---

## Troubleshooting

### "DKIM record not found"

- Ensure the name is exactly `resend._domainkey` (not `resend._domainkey.nzutilitydetection.com` - some providers add the domain automatically)
- Wait 15-30 minutes for propagation
- Check for typos in the public key

### "SPF record invalid"

- Only one SPF record is allowed per domain
- If you have existing SPF, merge them:
  ```
  v=spf1 include:_spf.resend.com include:_spf.google.com ~all
  ```

### "Emails going to spam"

1. Verify all DNS records are correct
2. Start with `p=none` DMARC policy
3. Ensure FROM email matches your verified domain
4. Check your sending reputation at https://postmaster.google.com/

### "Domain not verified in Resend"

- All 3 records (DKIM, SPF, return path) must be verified
- Try clicking "Refresh" in Resend dashboard
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

---

## Email Sender Configuration

Once DNS is verified, configure your email sender:

**From Address**: `bookings@nzutilitydetection.com`
**From Name**: `NZ Utility Detection`
**Reply-To**: `info@nzutilitydetection.com` (optional)

### Environment Variables for Supabase

```bash
supabase secrets set FROM_EMAIL=bookings@nzutilitydetection.com
supabase secrets set RESEND_API_KEY=re_your_api_key_here
supabase secrets set PORTAL_URL=https://nzutilitydetection.com/portal
```

---

## Security Best Practices

### DMARC Policy Progression

Start with monitoring, then gradually increase enforcement:

1. **Week 1-2**: `p=none` (monitor only)
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@nzutilitydetection.com
   ```

2. **Week 3-4**: `p=quarantine` (send failures to spam)
   ```
   v=DMARC1; p=quarantine; pct=50; rua=mailto:dmarc@nzutilitydetection.com
   ```

3. **Week 5+**: `p=reject` (block failures)
   ```
   v=DMARC1; p=reject; rua=mailto:dmarc@nzutilitydetection.com
   ```

### Monitor DMARC Reports

Set up a DMARC report analyzer:
- [DMARC Analyzer](https://www.dmarcanalyzer.com/)
- [Postmark DMARC](https://dmarc.postmarkapp.com/)

---

## Checklist

- [ ] DKIM record added with correct public key
- [ ] SPF record added (or merged with existing)
- [ ] DMARC record added
- [ ] Bounce CNAME record added
- [ ] Domain verified in Resend dashboard (all green checkmarks)
- [ ] Test email sent successfully
- [ ] Emails not landing in spam

---

## Support

If you encounter issues:

1. **Resend Support**: https://resend.com/docs
2. **DNS Provider Support**: Contact your domain registrar
3. **Email Deliverability**: Check https://www.mail-tester.com/ score
