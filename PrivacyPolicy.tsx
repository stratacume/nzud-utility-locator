import React from 'react';
import LegalPageLayout, { LegalSection } from '@/components/legal/LegalPageLayout';

const EFFECTIVE_DATE = '10 May 2026';

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    body: (
      <>
        <p>
          NZ Utility Detection Ltd (<strong>“NZUD”</strong>, <strong>“we”</strong>,{' '}
          <strong>“us”</strong>) provides underground utility locating, pre-excavation planning,
          and mapping services across New Zealand. We respect your privacy and handle personal
          information in accordance with the New Zealand <strong>Privacy Act 2020</strong> and
          the <strong>Information Privacy Principles</strong>.
        </p>
        <p>
          This Privacy Policy explains what information we collect when you contact us, request
          a quote, book a job through our online booking system, upload site documents, or use
          our customer portal — and how we store, use, share, and protect that information.
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    body: (
      <>
        <p>We only collect information that is reasonably necessary to deliver our services. This includes:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Customer contact information</strong> — name, company, phone number, email
            address, and billing/site address.
          </li>
          <li>
            <strong>Booking details</strong> — service type, site address, scope of works,
            preferred date/time, and any access notes you provide.
          </li>
          <li>
            <strong>Uploaded plans, photos, and documents</strong> — site plans, sketches,
            photographs, and other supporting files attached to a booking.
          </li>
          <li>
            <strong>Email enquiries</strong> — the content of any messages you send us, including
            attachments and email metadata.
          </li>
          <li>
            <strong>Phone enquiries</strong> — caller ID, written notes of the conversation, and
            information you choose to provide on the call.
          </li>
          <li>
            <strong>Cookies and analytics</strong> — limited technical data such as device type,
            browser, referring page, and pages visited, used only to keep the website running and
            measure aggregate usage.
          </li>
          <li>
            <strong>Customer portal data</strong> — booking history, uploaded files, completed
            reports, and notification preferences linked to your email address.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect payment card details — payments are handled outside
          of this website (typically by direct invoice through Xero).
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Your Information',
    body: (
      <>
        <p>We use your information for the following purposes only:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>To respond to enquiries and provide quotes.</li>
          <li>To plan, schedule, deliver, and follow up on locating and mapping jobs.</li>
          <li>To produce reports, marked-up plans, and digital maps for your project.</li>
          <li>To issue invoices and process payments through our accounting system.</li>
          <li>To operate the customer portal and let you view and manage your bookings.</li>
          <li>To send service-related communications such as confirmations, reminders, and reports.</li>
          <li>To improve our website, services, and internal processes.</li>
          <li>To meet legal, tax, and health-and-safety obligations.</li>
        </ul>
        <p>
          We do not sell, rent, or trade your personal information, and we do not use your data
          for unrelated marketing without your consent.
        </p>
      </>
    ),
  },
  {
    id: 'cookies-analytics',
    title: 'Cookies and Website Analytics',
    body: (
      <>
        <p>
          Our website uses essential cookies to keep sessions secure and to remember basic
          preferences. We may also use privacy-respecting analytics to measure aggregate website
          usage (for example, page views and traffic sources). Analytics data is used in
          aggregate form and is not used to identify individual visitors.
        </p>
        <p>
          You can disable cookies in your browser settings. Some features of the booking system
          and customer portal may not function correctly if cookies are disabled.
        </p>
      </>
    ),
  },
  {
    id: 'google-workspace',
    title: 'Google Workspace',
    body: (
      <>
        <p>
          NZUD uses <strong>Google Workspace</strong> (Gmail, Google Drive, Google Calendar) to
          run our business email and store internal documents. Information you send to us by
          email — including booking enquiries and attachments — may be stored within Google
          Workspace, which is hosted on Google’s secure cloud infrastructure.
        </p>
        <p>
          Access to Google Workspace is restricted to authorised NZUD personnel and protected by
          strong passwords and multi-factor authentication.
        </p>
      </>
    ),
  },
  {
    id: 'xero-integration',
    title: 'Xero (Invoicing &amp; Accounting)',
    body: (
      <>
        <p>
          We use <strong>Xero</strong> to issue invoices and manage our accounts. To raise an
          invoice, your name, billing address, email, job reference, and service details are
          shared with Xero. Xero stores this data on its own secure infrastructure under its own
          privacy terms.
        </p>
        <p>
          We are required by New Zealand tax law to retain financial records (including invoice
          recipient details) for at least <strong>seven years</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'data-storage-protection',
    title: 'Data Storage and Protection',
    body: (
      <>
        <p>
          Customer data, booking records, and uploaded files are stored in secure cloud
          infrastructure provided by reputable third-party hosting and database providers. These
          providers operate enterprise-grade physical and network security controls.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Data is transmitted over encrypted (HTTPS/TLS) connections.</li>
          <li>Customer portal accounts are protected by per-account email verification.</li>
          <li>Administrative access is limited to authorised NZUD staff.</li>
          <li>We retain data only for as long as needed to deliver services and meet legal obligations.</li>
        </ul>
        <p>
          While we take reasonable steps to safeguard your information, no online service can
          guarantee absolute security. Please notify us immediately if you suspect unauthorised
          access to your account.
        </p>
      </>
    ),
  },
  {
    id: 'customer-portal',
    title: 'Customer Portal Access',
    body: (
      <>
        <p>
          The NZUD customer portal lets you view bookings, upload site documents, download
          completed reports, and manage notification preferences. Access is linked to the email
          address used when the booking was made.
        </p>
        <p>
          You are responsible for keeping access to that email account secure. If you change
          email addresses, contact us so we can update your records.
        </p>
      </>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-Party Services',
    body: (
      <>
        <p>
          We share personal information with third parties only where necessary to deliver our
          services or meet our legal obligations. These currently include:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Cloud hosting and database providers (for website, booking and portal data).</li>
          <li>Email delivery providers (for booking confirmations and notifications to NZUD).</li>
          <li>Google Workspace (for business email and document storage).</li>
          <li>Xero (for invoicing and accounting).</li>
          <li>beforeUdig and similar utility-plan providers when site plans are required.</li>
        </ul>
        <p>
          All such providers are bound by their own privacy and security obligations. We do not
          authorise them to use your data for any purpose other than supporting NZUD’s services.
        </p>
      </>
    ),
  },
  {
    id: 'legal-disclosure',
    title: 'Legal Disclosure',
    body: (
      <>
        <p>
          We may disclose personal information where required or permitted by law — for
          example, in response to a lawful request from a New Zealand regulator, court order, or
          law enforcement agency, or where disclosure is necessary to protect health, safety, or
          property.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    body: (
      <>
        <p>
          Under the Privacy Act 2020 you have the right to:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Request a copy of the personal information we hold about you.</li>
          <li>Ask us to correct information that is inaccurate or out of date.</li>
          <li>Ask us to delete personal information we no longer need to hold.</li>
          <li>Withdraw consent for non-essential communications at any time.</li>
        </ul>
        <p>
          To make a request, email{' '}
          <a href="mailto:julian@nzutilitydetection.com">julian@nzutilitydetection.com</a>. We
          will respond within a reasonable timeframe and may need to verify your identity before
          actioning a request.
        </p>
        <p>
          Some information must be retained to meet legal, accounting, or health-and-safety
          obligations and cannot be deleted on request.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        Our services are intended for businesses, contractors, and homeowners. We do not
        knowingly collect personal information from children under 16.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this Policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time as our services or legal obligations
        change. The latest version will always be available on this page, with the effective
        date shown above.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <>
        <p>
          If you have any questions or concerns about this Privacy Policy or how we handle your
          information, please contact:
        </p>
        <p className="!mt-2">
          <strong>NZ Utility Detection Ltd</strong>
          <br />
          Email:{' '}
          <a href="mailto:julian@nzutilitydetection.com">julian@nzutilitydetection.com</a>
        </p>
        <p>
          You may also contact the New Zealand Office of the Privacy Commissioner at{' '}
          <a href="https://www.privacy.org.nz" target="_blank" rel="noopener noreferrer">
            www.privacy.org.nz
          </a>
          .
        </p>
      </>
    ),
  },
];

const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      metaDescription="NZ Utility Detection Ltd Privacy Policy — how we collect, use, store and protect personal information for utility locating, pre-excavation planning, mapping and online booking services in New Zealand."
      effectiveDate={EFFECTIVE_DATE}
      intro="How NZ Utility Detection Ltd collects, uses, stores and protects personal information across our utility locating, pre-excavation planning, mapping and online booking services."
      sections={sections}
    />
  );
};

export default PrivacyPolicy;
