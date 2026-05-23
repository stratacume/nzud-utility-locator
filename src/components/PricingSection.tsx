import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdditionalInfo from '../pricing/AdditionalInfo';
import BookingCard from '../pricing/BookingCard';

interface FormData { name: string; email: string; phone: string; address: string; notes: string; }
interface FormErrors { name?: string; email?: string; phone?: string; address?: string; }
interface UploadedFile { name: string; path: string; size: number; mimeType?: string; }


const PricingSection: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '', address: '', notes: '' });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [emailStatus, setEmailStatus] = useState<'pending' | 'sent' | 'failed'>('pending');
  const [emailStage, setEmailStage] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [customerWarning, setCustomerWarning] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);



  const services = [
    { name: "Request Locate Service", price: "", subtitle: "" }
  ];




  const steps = [{ number: 1, label: "" }, { number: 2, label: "Date & Time" }, { number: 3, label: "Details" }, { number: 4, label: "Confirm" }];

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinue = () => {
    if (currentStep === 1 && selectedService) setCurrentStep(2);
    else if (currentStep === 2 && selectedDate) setCurrentStep(3);
    else if (currentStep === 3 && validateForm()) setCurrentStep(4);
  };

  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleReset = () => {
    setSelectedService(null);
    setCurrentStep(1);
    setSelectedDate(undefined);
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    setFormErrors({});
    setIsConfirmed(false);
    setBookingRef('');
    setSubmitError('');
    setEmailStatus('pending');
    setEmailStage(undefined);
    setEmailError(undefined);
    setCustomerWarning(false);
    setAgreeToTerms(false);
    setUploadedFiles([]);
  };



  const handleConfirmBooking = async () => {
    if (!agreeToTerms) {
      setSubmitError(
        'You must accept the Important Customer Notes, Terms of Service, and Privacy Policy before continuing.'
      );
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setEmailStatus('pending');
    setEmailStage(undefined);
    setEmailError(undefined);
    console.log('[booking] confirm-start uploadedFiles=', uploadedFiles.length);
    // Generate a short, easy-to-read booking reference like "UL-7K42".
    // Uses an unambiguous alphabet (no 0/O, 1/I, etc.) and just 4 characters
    // so customers can read it over the phone or type it without errors.
    const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    const ref = 'UL-' + code;
    const bookingDateStr = selectedDate?.toISOString().split('T')[0] || '';
    const documentPaths = uploadedFiles.map(f => f.path);

    // -------------------------------------------------------------------
    // ACKNOWLEDGEMENT RECORD
    // -------------------------------------------------------------------
    // Persist the customer's combined acceptance of:
    //   • Important Customer Notes
    //   • Terms of Service  (/terms)
    //   • Privacy Policy    (/privacy)
    // We append a structured acknowledgement line to job_details so the
    // acceptance is preserved with the booking record regardless of
    // whether dedicated DB columns exist. Operators viewing the booking
    // (admin dashboard, portal, confirmation email) will see the
    // timestamped acknowledgement alongside any customer notes.
    // -------------------------------------------------------------------
    const acceptedAt = new Date().toISOString();
    const acknowledgement =
      `[Acknowledgement ${acceptedAt}] Customer accepted the Important Customer Notes, ` +
      `Terms of Service (/terms) and Privacy Policy (/privacy).`;
    const jobDetailsWithAck = formData.notes
      ? `${formData.notes}\n\n${acknowledgement}`
      : acknowledgement;

    try {
      // Insert the booking and grab back its UUID so we can link any
      // uploaded files to it in the booking_documents table (single source
      // of truth for the customer portal Job Centre).
      const { data: insertedBooking, error } = await supabase
        .from('bookings')
        .insert({
          booking_reference: ref,
          service: selectedService,
          booking_date: bookingDateStr,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          service_address: formData.address,
          status: 'confirmed',
          documents: documentPaths,
          job_details: jobDetailsWithAck,
        })
        .select('id, booking_reference')
        .single();
      if (error) throw error;
      const bookingId = insertedBooking?.id as string | undefined;
      console.log('[booking] created', { id: bookingId, ref, acceptedAt });
      setBookingRef(ref);
      setIsConfirmed(true);


      // -------------------------------------------------------------------
      // FILE METADATA — TWO TABLES, ONE SOURCE OF TRUTH PER CONSUMER
      // -------------------------------------------------------------------
      // 1. `booking_files`     — read by the email edge function to build
      //                          signed download links for the confirmation
      //                          email. Keyed by booking_reference.
      //
      // 2. `booking_documents` — read by the customer portal Job Centre to
      //                          render the Documents tab. Keyed by
      //                          booking_id (UUID). This is the table the
      //                          portal queries on every page load, so if
      //                          we DON'T insert here, files uploaded during
      //                          the public booking flow won't appear in
      //                          the portal later (the original bug).
      //
      // Both inserts are non-blocking: the booking itself has already been
      // saved with the legacy `documents` text[] column above, so a failure
      // here doesn't lose any data.
      // -------------------------------------------------------------------
      if (uploadedFiles.length > 0) {
        // (1) booking_files — for the email edge function
        try {
          const fileRows = uploadedFiles.map((f) => ({
            booking_reference: ref,
            original_filename: f.name,
            storage_path: f.path,
            file_size: f.size,
            mime_type: f.mimeType || 'application/octet-stream',
          }));
          const { error: filesErr } = await supabase
            .from('booking_files')
            .insert(fileRows);
          if (filesErr) {
            console.warn('[booking] booking_files insert failed:', filesErr.message);
          } else {
            console.log('[booking] booking_files insert ok', { count: fileRows.length });
          }
        } catch (filesEx) {
          console.warn('[booking] booking_files insert exception:', filesEx);
        }

        // (2) booking_documents — for the customer portal Job Centre
        if (bookingId) {
          try {
            const docRows = uploadedFiles.map((f) => ({
              booking_id: bookingId,
              booking_reference: ref,
              customer_email: formData.email.toLowerCase(),
              original_filename: f.name,
              storage_path: f.path,
              file_size: f.size,
              mime_type: f.mimeType || 'application/octet-stream',
              document_type: 'customer',
              uploaded_by: formData.email.toLowerCase(),
            }));
            console.log('[booking] booking_documents insert start', {
              bookingId,
              ref,
              count: docRows.length,
              paths: docRows.map((r) => r.storage_path),
            });
            const { data: insertedDocs, error: docsErr } = await supabase
              .from('booking_documents')
              .insert(docRows)
              .select('id, storage_path');
            if (docsErr) {
              // VISIBLE error: the portal won't see these files until this
              // is fixed. We don't fail the booking (email still works) but
              // we do surface a warning so it's not silent.
              console.error('[booking] booking_documents insert FAILED', {
                bookingId,
                ref,
                error: docsErr.message,
                details: (docsErr as any).details,
                hint: (docsErr as any).hint,
              });
              setSubmitError(
                'Booking saved, but uploaded files could not be linked to your portal. ' +
                  'Please contact us so we can attach them manually.'
              );
            } else {
              console.log('[booking] booking_documents insert ok', {
                bookingId,
                inserted: insertedDocs?.length || 0,
              });
            }
          } catch (docsEx: any) {
            console.error('[booking] booking_documents insert exception', {
              bookingId,
              ref,
              error: docsEx?.message,
            });
          }
        } else {
          console.warn(
            '[booking] no booking_id returned — skipping booking_documents insert',
            { ref }
          );
        }
      }


      // Subscribe customer to Famous CRM so leads are captured even if Resend
      // email delivery fails for any reason.
      fetch('https://famous.ai/api/crm/68f324911a392548e80f4801/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          source: 'booking',
          tags: ['booking', selectedService || 'utility-locating'],
        }),
      }).catch(() => {/* non-blocking */});

      // -------------------------------------------------------------------
      // EMAIL DELIVERY — LINKS-FIRST
      // -------------------------------------------------------------------
      // Edge function `send-booking-email` (v35) reads file metadata from
      // the `booking_files` table we just populated, signs every file with
      // a 14-day URL, and embeds those URLs in the email body.
      //
      // Files are NEVER attached as the primary delivery channel:
      //   • Default mode = LINKS    (every booking, every size)
      //   • Optimisation = LINKS + ATTACHMENTS only when total ≤ 2.5 MB
      //                    AND file count ≤ 5 (the links are still in the
      //                    body, so attachments are a bonus, never a SPOF)
      //
      // We ALSO pass `documents: documentPaths` as a fallback in case the
      // booking_files row insert above failed for any reason — the edge
      // function will use it to HEAD each path and still build links.
      // -------------------------------------------------------------------
      // CLIENT-SIDE SIGNED URL GENERATION (single source of truth)
      // -------------------------------------------------------------------
      // We sign every uploaded file in the browser, using the EXACT same
      // storage path we just uploaded to. This eliminates any risk of the
      // edge function signing a slightly-different path (different casing,
      // different encoding) and producing `invalid_token` JSON pages
      // instead of real downloadable files.
      //
      // The resolved URLs are passed to the edge function via
      // `documentLinks` so it just embeds them verbatim in the email
      // body — no re-signing, no path mutation. This works identically
      // for PDFs, JPGs, PNGs, HEIC, WEBP, etc.
      // -------------------------------------------------------------------
      let documentLinks: { name: string; url: string; size?: number }[] = [];
      if (uploadedFiles.length > 0) {
        try {
          documentLinks = await generateSignedDocumentLinks(uploadedFiles, 14 * 24 * 60 * 60);
          console.log('[booking] signed-links', {
            requested: uploadedFiles.length,
            generated: documentLinks.length,
            byType: uploadedFiles.map((f) => ({ name: f.name, mime: f.mimeType })),
          });
          if (documentLinks.length !== uploadedFiles.length) {
            console.warn('[booking] not all files produced signed URLs', {
              missing: uploadedFiles
                .filter((f) => !documentLinks.find((l) => l.name === f.name))
                .map((f) => f.path),
            });
          }
        } catch (linkErr: any) {
          console.error('[booking] signed-link generation threw', linkErr);
        }
      }

      try {
        console.log('[booking] email-invoke-start ref=', ref, 'paths=', documentPaths.length, 'links=', documentLinks.length);
        const result = await sendBookingConfirmationEmail({
          customerEmail: formData.email,
          customerName: formData.name,
          bookingReference: ref,
          service: selectedService || '',
          bookingDate: bookingDateStr,
          serviceAddress: formData.address,
          customerPhone: formData.phone,
          documents: documentPaths,
          documentLinks,
          notes: formData.notes,
        });
        console.log('[booking] email-invoke-result', { success: result.success, stage: result.stage, error: result.error, op: result.operatorSent, cust: result.customerSent, warn: result.customerWarning });
        if (result.success) {
          setEmailStatus('sent');
          setCustomerWarning(!!result.customerWarning);
        } else {
          setEmailStatus('failed');
          setEmailStage(result.stage);
          setEmailError(result.error);
        }
      } catch (emailErr: any) {
        console.error('[booking] email send threw', emailErr);
        setEmailStatus('failed');
        setEmailStage('invoke');
        setEmailError(emailErr?.message || 'Unexpected error contacting email service');
      }



    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save booking.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const canContinue = (currentStep === 1 && selectedService) || (currentStep === 2 && selectedDate) || (currentStep === 3);

  return (
    <section id="pricing" className="py-16 bg-brand-teal">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex flex-col items-start sm:items-center gap-3 mb-8 max-w-md mx-auto">
            {['Service Location', 'Pre Excavation Planning', 'RTK As Builts and Mapping'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white text-xl md:text-2xl font-medium">
                <svg className="w-7 h-7 text-brand-orange flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Book Your Service</h2>
          <p className="text-white/90">Schedule online in minutes</p>
        </div>


        <BookingCard currentStep={currentStep} steps={steps} isConfirmed={isConfirmed} services={services}
          selectedService={selectedService} setSelectedService={setSelectedService} selectedDate={selectedDate} setSelectedDate={setSelectedDate} formData={formData}
          formErrors={formErrors} handleInputChange={handleInputChange} bookingRef={bookingRef} emailStatus={emailStatus}
          emailStage={emailStage} emailError={emailError} customerWarning={customerWarning}
          submitError={submitError} canContinue={canContinue} handleBack={handleBack} handleContinue={handleContinue}
          handleConfirmBooking={handleConfirmBooking} isSubmitting={isSubmitting} agreeToTerms={agreeToTerms} setAgreeToTerms={setAgreeToTerms}
          uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} onReset={handleReset} />


        <AdditionalInfo />
        <p className="mt-8 text-center text-white/80 text-sm">Need help? <a href="tel:0272670217" className="text-brand-orange font-semibold">027 267 0217</a></p>
      </div>
    </section>
  );
};

export default PricingSection;
