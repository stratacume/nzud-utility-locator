# Resend Click-Tracking Domain Setup — `links.nzutilitydetection.com`

> **Status:** Code-side already production-safe. This guide is the
> one-time DNS + Resend dashboard configuration the operator needs to
> complete to turn click-tracking on. No code changes are required when
> following these steps — the existing `send-booking-email` and
> `send-contact-email` edge functions automatically use the tracking
> domain once Resend is configured to rewrite links through it.

---

## Why a tracking subdomain?

By default Resend rewrites tracked links through `track.resend.com`.
Two production-safety problems with that:

1. **Mobile mail apps + corporate email gateways flag the link as
   third-party redirect** → reduces engagement, increases spam
   classification, and breaks the perceived sender identity for mobile
   users.
2. **Cookie / privacy banners** sometimes block `track.resend.com`
   click-throughs entirely on iOS Mail with Mail Privacy Protection
   enabled.

A first-party tracking domain (`links.nzutilitydetection.com`) hosted
on the same parent domain as the sender (`nzutilitydetection.com`)
fixes both: links resolve under the brand's own domain, are not
classified as third-party redirects, and pass through MPP cleanly.

---

## Required DNS records

Add ONE record to your DNS provider (Cloudflare / GoDaddy / Namecheap
/ etc.) for the parent zone `nzutilitydetection.com`:

| Type  | Name / Host | Value                  | TTL  | Proxy |
|-------|-------------|------------------------|------|-------|
| CNAME | `links`     | `track.resend.com.`    | 3600 | DNS only (grey cloud on Cloudflare) |

> **CRITICAL:** the CNAME target MUST be `track.resend.com` (with
> trailing dot if your DNS provider requires FQDN form). Do NOT proxy
> through Cloudflare's orange-cloud — Resend needs to terminate the TLS
> handshake on its own infrastructure to issue the click-tracking
> certificate.

### Verification commands

```bash
# Should resolve to track.resend.com (or a Resend-controlled CNAME chain)
dig CNAME links.nzutilitydetection.com +short
nslookup -type=CNAME links.nzutilitydetection.com
```

Expected response:

```
links.nzutilitydetection.com.  3600  IN  CNAME  track.resend.com.
```

DNS propagation: typically 5–30 minutes. Allow up to 24 hours on the
outside.

---

## Resend dashboard configuration

1. Open <https://resend.com/domains>.
2. Click **`nzutilitydetection.com`** (must already be verified — see
   `DNS_SETUP_GUIDE.md` if it isn't).
3. Scroll to **Click & Open Tracking** → **Configure custom tracking
   domain**.
4. Enter `links.nzutilitydetection.com`.
5. Click **Verify**. Resend will:
   - confirm the CNAME resolves correctly,
   - provision a Let's Encrypt TLS certificate for the subdomain,
   - flip the green **Verified** indicator on.
6. Toggle **Click tracking: ON** at the project / API-key level
   (Settings → API Keys → click into the production key → enable
   "Click tracking" if disabled).

> Tracking activates within ~60 seconds of the green tick. No edge
> function redeploy is needed — Resend rewrites the links in transit.

---

## Verifying click-tracking is live

Send a real booking confirmation to your own inbox:

```bash
# From the admin Email Test page (/admin/email-test) or via curl:
curl -X POST https://<your-supabase-project>.functions.supabase.co/email-test-diagnostic \
  -H 'Content-Type: application/json' \
  -d '{"to":"<your-real-inbox>","includeAttachments":false}'
```

Open the email (in Gmail web, iOS Mail, and an Android client). Inspect
any link in the body — it should now look like:

```
https://links.nzutilitydetection.com/CL0/<encoded-payload>
```

(NOT `https://track.resend.com/...`).

Click it. The Resend dashboard's **Emails** tab should show the
`Clicked` event within ~30 seconds.

---

## Production-safety guarantees

This setup is intentionally conservative:

- **No sandbox / test domains in production.** The codebase pins
  customer mail to `noreply@nzutilitydetection.com` (verified-domain
  sender). The sandbox `onboarding@resend.dev` is only used as a
  fallback for the **operator** copy when the production sender is
  rejected — never for customer-facing email. See `send-booking-email`
  v43 for the enforcement.
- **Mobile-safe links.** First-party `links.nzutilitydetection.com`
  clears iOS Mail Privacy Protection, Outlook Safe Links, and
  Gmail's "external redirect" warnings.
- **DNS-only CNAME, no proxy.** Resend terminates TLS itself;
  Cloudflare proxying would break the certificate handshake.
- **No template redesign.** Existing booking-confirmation, customer-
  portal, and admin-notification templates work unchanged — Resend
  performs the link rewrite at delivery time.
- **No provider change.** Still Resend. Still Mailgun fallback for
  customer copy where applicable. Same retry policy (with the
  permanent-failure dead-lettering shipped in `send-booking-email`
  v43 + `retry-failed-emails` v2).

---

## Rollback

If anything misbehaves after enabling the tracking domain:

1. In Resend dashboard → Domains → `nzutilitydetection.com` → Click
   tracking section → click **Remove custom tracking domain**.
   Tracking immediately falls back to `track.resend.com` (Resend's
   default). No code change, no email outage.
2. Optionally remove the `links` CNAME from DNS afterwards (not
   required — an orphaned CNAME is harmless).

---

## Checklist

- [ ] CNAME `links.nzutilitydetection.com → track.resend.com.` added
- [ ] Cloudflare proxy disabled (DNS only) for the `links` record
- [ ] DNS resolves correctly via `dig CNAME` / `nslookup`
- [ ] Resend dashboard shows **Verified** for the tracking domain
- [ ] Click tracking toggled ON for the production API key
- [ ] Test email's link host = `links.nzutilitydetection.com`
- [ ] Click event appears in the Resend dashboard within ~30 s
- [ ] Spot-checked on iOS Mail, Gmail web, and one Android client
