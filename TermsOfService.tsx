import React from 'react';
import LegalPageLayout, { LegalSection } from '@/components/legal/LegalPageLayout';

const EFFECTIVE_DATE = '10 May 2026';

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: (
      <>
        <p>
          These Terms of Service (<strong>“Terms”</strong>) govern all services provided by{' '}
          <strong>NZ Utility Detection Ltd</strong> (<strong>“NZUD”</strong>, <strong>“we”</strong>,{' '}
          <strong>“us”</strong>) to the customer (<strong>“you”</strong>). By booking a job,
          requesting a quote, or otherwise engaging NZUD, you agree to these Terms.
        </p>
        <p>
          Where a separate written quote, work order, or contract is signed, that document
          prevails to the extent of any inconsistency with these Terms.
        </p>
      </>
    ),
  },
  {
    id: 'scope-of-services',
    title: 'Scope of Locating Services',
    body: (
      <>
        <p>
          NZUD provides non-destructive underground utility locating, pre-excavation planning,
          and mapping services. Typical services include:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Electromagnetic (EMF) cable and pipe locating.</li>
          <li>Site marking with paint, flags, or pegs.</li>
          <li>Pre-excavation planning support and beforeUdig plan reviews.</li>
          <li>RTK GNSS site mapping and digital deliverables.</li>
          <li>Locating reports and marked-up site plans.</li>
        </ul>
        <p>
          The exact scope for any job is defined by the booking details, the quote, and any
          written instructions on site.
        </p>
      </>
    ),
  },
  {
    id: 'emf-limitations',
    title: 'EMF Locating Limitations',
    body: (
      <>
        <p>
          Electromagnetic (EMF) locating relies on energising or detecting signals on metallic
          conductors and tracer wires. EMF locating <strong>cannot reliably detect</strong>:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Non-conductive services such as concrete, clay, asbestos cement, or plain plastic pipes without tracer wire.</li>
          <li>Severed, broken, or poorly bonded conductors.</li>
          <li>Services beyond the depth or signal range of the equipment.</li>
          <li>Services masked by reinforcing steel, buried metal debris, or significant electrical interference.</li>
          <li>Disused, decommissioned, or unrecorded services.</li>
        </ul>
        <p>
          Where appropriate we may recommend complementary techniques (e.g. ground-penetrating
          radar, vacuum excavation, or potholing) supplied by a third party. Those services are
          outside NZUD’s scope unless expressly included in the quote.
        </p>
      </>
    ),
  },
  {
    id: 'no-guarantee',
    title: 'No Guarantee of Complete Detection',
    body: (
      <>
        <p>
          The presence of buried utilities cannot be guaranteed. NZUD’s findings represent the
          best professional interpretation of detectable signals at the time of the survey, using
          industry-standard equipment and techniques.
        </p>
        <p>
          <strong>
            All marks, reports, and maps are indicative only and must not be relied on as a
            substitute for safe digging practice.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: 'customer-responsibility',
    title: 'Customer Responsibility',
    body: (
      <>
        <p>
          You are responsible for the safe planning and execution of any excavation or ground
          disturbance. Before excavating you must:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Obtain current <strong>beforeUdig</strong> plans for the site.</li>
          <li>Combine NZUD’s marks and reports with those plans and any other site information.</li>
          <li>Use safe-digging practices, including hand-tools or non-destructive excavation within tolerance zones around marked services.</li>
          <li>Comply with all applicable legislation and codes of practice, including the Health and Safety at Work Act 2015 and NZS standards relevant to the works.</li>
          <li>Notify the relevant utility owner immediately if a service is damaged or exposed.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'site-access',
    title: 'Site Access &amp; Conditions',
    body: (
      <>
        <p>
          You must provide safe, lawful, and unobstructed access to the site for the duration of
          the booking, including any necessary keys, codes, inductions, or permits. You must
          identify known hazards (live services, confined spaces, contaminated ground, dangerous
          animals, etc.) before work begins.
        </p>
        <p>
          NZUD may suspend or reschedule work if site conditions are unsafe, access is not
          available, or required information has not been provided.
        </p>
      </>
    ),
  },
  {
    id: 'booking-cancellation',
    title: 'Booking, Rescheduling and Cancellation',
    body: (
      <>
        <p>
          Bookings can be made through our online booking system, by email, or by phone. A
          booking is confirmed once NZUD acknowledges it.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Reschedules with at least 24 hours’ notice are normally accommodated at no charge.</li>
          <li>Cancellations within 24 hours of the scheduled start, or no-shows on the day, may incur a call-out fee equivalent to the minimum service charge.</li>
          <li>If NZUD is unable to attend due to circumstances beyond our control, we will reschedule the booking at no cancellation cost to you.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'pricing',
    title: 'Pricing &amp; Site Conditions',
    body: (
      <>
        <p>
          Prices quoted on the website, in the calculator, or by email are based on the
          information provided at the time of booking. Final pricing may vary where actual site
          conditions differ from the information given — for example, larger areas, additional
          services, complex interference, restricted access, after-hours work, or extended time
          on site.
        </p>
        <p>
          Where additional charges are likely, we will discuss them with you on site or by phone
          before continuing where reasonably practicable.
        </p>
      </>
    ),
  },
  {
    id: 'weather',
    title: 'Weather and Delays',
    body: (
      <p>
        Locating accuracy and safety can be significantly affected by heavy rain, electrical
        storms, snow, flooding, or extreme heat. NZUD reserves the right to delay or
        reschedule a booking where weather conditions make safe or accurate work impractical.
        Reschedules caused by weather are not chargeable as cancellations.
      </p>
    ),
  },
  {
    id: 'reports-maps',
    title: 'Use of Reports, Marks and Maps',
    body: (
      <>
        <p>
          Reports, site marks, sketches, and maps produced by NZUD are prepared for your
          specific project and the conditions present on the day of the survey.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Site marks fade or may be removed; they should be relied on only for a short period after marking.</li>
          <li>Reports and maps must not be re-used for other sites, projects, or contractors without written approval from NZUD.</li>
          <li>Reports and maps are indicative and must always be used together with current beforeUdig plans and safe-digging practices.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'rtk-mapping',
    title: 'RTK Mapping Disclaimer',
    body: (
      <>
        <p>
          RTK GNSS mapping is provided to a typical horizontal accuracy consistent with the
          equipment, satellite geometry, and site conditions at the time of measurement. RTK
          accuracy can be degraded by tree canopy, tall buildings, multipath, poor satellite
          availability, or correction-stream issues.
        </p>
        <p>
          RTK deliverables are provided for indicative project use and are{' '}
          <strong>not a substitute for a registered cadastral or boundary survey</strong>.
          Boundary, legal, and as-built surveys must be carried out by a Licensed Cadastral
          Surveyor where required.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Liability',
    body: (
      <>
        <p>
          To the maximum extent permitted by law, NZUD’s total liability arising out of or in
          connection with any job — whether in contract, tort (including negligence), under
          statute, or otherwise — is limited to the amount actually paid by you to NZUD for the
          job giving rise to the claim.
        </p>
        <p>
          NZUD is not liable for any indirect, consequential, or special loss, including loss of
          profit, loss of contract, downtime, or third-party claims, arising from reliance on
          locating results, marks, reports, or maps.
        </p>
        <p>
          Nothing in these Terms limits any rights you have under the Consumer Guarantees Act
          1993 where you acquire services for personal, domestic, or household use.
        </p>
      </>
    ),
  },
  {
    id: 'payment',
    title: 'Payment',
    body: (
      <>
        <p>
          Unless otherwise agreed in writing, invoices are issued through Xero on completion of
          the job and are payable within <strong>seven (7) days</strong> of invoice date.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Late payments may incur interest at 2% per month on the outstanding balance.</li>
          <li>Reasonable debt-recovery and legal costs incurred in collecting overdue amounts may be charged to you.</li>
          <li>NZUD may withhold reports, maps, or further bookings while invoices remain unpaid.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    body: (
      <>
        <p>
          All intellectual property in reports, plans, drawings, sketches, photographs, and
          digital maps produced by NZUD remains the property of NZ Utility Detection Ltd.
        </p>
        <p>
          Once your invoice is paid in full, you are granted a non-exclusive, non-transferable
          licence to use those deliverables for the specific project identified in the booking.
          Re-use, on-sale, or distribution to third parties beyond your own project team
          requires NZUD’s written permission.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: (
      <p>
        Your personal information is handled in accordance with our{' '}
        <a href="/privacy">Privacy Policy</a>, which forms part of these Terms.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms from time to time. The latest version will always be available
        on this page. The Terms in force at the time of your booking apply to that booking.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    body: (
      <p>
        These Terms are governed by the laws of <strong>New Zealand</strong>. The parties submit
        to the exclusive jurisdiction of the New Zealand courts in respect of any dispute arising
        out of or in connection with the services or these Terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <>
        <p>
          For any questions about these Terms or a specific job, please contact:
        </p>
        <p className="!mt-2">
          <strong>NZ Utility Detection Ltd</strong>
          <br />
          Email:{' '}
          <a href="mailto:julian@nzutilitydetection.com">julian@nzutilitydetection.com</a>
        </p>
      </>
    ),
  },
];

const TermsOfService: React.FC = () => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      metaDescription="NZ Utility Detection Ltd Terms of Service — scope of locating services, EMF limitations, customer responsibilities, booking and cancellation terms, RTK mapping disclaimers, liability and governing law (New Zealand)."
      effectiveDate={EFFECTIVE_DATE}
      intro="The terms that apply to all utility locating, pre-excavation planning, RTK mapping and online bookings provided by NZ Utility Detection Ltd in New Zealand."
      preamble={
        <p>
          <strong>Important safety notice:</strong> All locating marks, reports, and maps
          produced by NZUD are indicative only. You must always combine them with current
          beforeUdig plans and safe-digging practices before any excavation.
        </p>
      }
      sections={sections}
    />
  );
};

export default TermsOfService;
