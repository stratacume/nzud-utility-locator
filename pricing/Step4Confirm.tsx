import React, { useState } from 'react';
import { FileText } from 'lucide-react';

interface FormData { name: string; email: string; phone: string; address: string; notes: string; }
interface UploadedFile { name: string; path: string; size: number; }

interface Props {
  selectedService: string | null;
  selectedAddons: string[];
  selectedDate: Date | undefined;
  formData: FormData;
  submitError: string;
  agreeToTerms: boolean;
  setAgreeToTerms: (v: boolean) => void;
  uploadedFiles?: UploadedFile[];
}

const Step4Confirm: React.FC<Props> = ({ selectedService, selectedAddons, selectedDate, formData, submitError, agreeToTerms, setAgreeToTerms, uploadedFiles = [] }) => {
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <h3 className="text-xl font-bold text-brand-navy text-center mb-6">Confirm Booking</h3>
      <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
        <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Service:</span><span className="font-semibold text-brand-navy">{selectedService}</span></div>
        {selectedAddons.length > 0 && <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Add-ons:</span><span className="font-semibold text-brand-navy">{selectedAddons.join(', ')}</span></div>}
        <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Date:</span><span className="font-semibold text-brand-navy">{selectedDate?.toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
        <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Name:</span><span className="font-semibold text-brand-navy">{formData.name}</span></div>
        <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Email:</span><span className="font-semibold text-brand-navy">{formData.email}</span></div>
        <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Phone:</span><span className="font-semibold text-brand-navy">{formData.phone}</span></div>
        <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Address:</span><span className="font-semibold text-brand-navy text-right max-w-[200px]">{formData.address}</span></div>
        {formData.notes && <div className="flex justify-between border-b pb-2"><span className="text-gray-600">Notes:</span><span className="font-semibold text-brand-navy text-right max-w-[200px]">{formData.notes}</span></div>}
        {uploadedFiles.length > 0 && (
          <div className="border-t pt-2">
            <span className="text-gray-600 block mb-2">Documents:</span>
            <div className="space-y-1">
              {uploadedFiles.map((file) => (
                <div key={file.path} className="flex items-center gap-2 text-sm text-brand-navy">
                  <FileText className="w-4 h-4 text-brand-teal" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-start gap-2 mb-4">
        <input
          type="checkbox"
          id="terms"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          aria-describedby="terms-description"
          aria-invalid={!agreeToTerms && !!submitError}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange flex-shrink-0"
        />
        <label htmlFor="terms" id="terms-description" className="text-sm text-gray-600 leading-snug">
          I confirm that I have read and understood the{' '}
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="text-brand-orange underline hover:text-orange-600 font-medium"
          >
            Important Customer Notes
          </button>
          , and I agree to the{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-orange underline hover:text-orange-600 font-medium"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-orange underline hover:text-orange-600 font-medium"
          >
            Privacy Policy
          </a>
          .
        </label>
      </div>

      {submitError && (
        <p role="alert" className="text-red-600 text-sm text-center mb-4">
          {submitError}
        </p>
      )}


      {showTerms && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
          onClick={() => setShowTerms(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-notes-title"
        >
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8" onClick={e => e.stopPropagation()}>
            <h2 id="customer-notes-title" className="text-2xl font-bold text-brand-navy mb-6">NZ Utility Detection – Important Customer Notes</h2>

            
            <div className="text-gray-700 space-y-6">
              {/* Section 1 */}
              <div>
                <h3 className="font-bold text-brand-navy mb-2">1. LEGAL DUTY OF CARE (NZ LAW)</h3>
                <p className="mb-2">Under the Health and Safety at Work Act 2015 (HSWA), every PCBU has a duty to ensure work is carried out safely.</p>
                <p>Utility locating reduces risk but does not remove it. All parties must take reasonable steps to prevent strikes.</p>
              </div>

              {/* Section 2 */}
              <div>
                <h3 className="font-bold text-brand-navy mb-2">2. CLIENT RESPONSIBILITY</h3>
                <p className="mb-2">All underground risks exist before NZUD arrives on site. The client remains responsible for safe planning, verification, and excavation. This includes obtaining current plans, potholing for confirmation, and meeting WorkSafe and utility–owner requirements.</p>
              </div>

              {/* Section 3 */}
              <div>
                <h3 className="font-bold text-brand-navy mb-2">3. ELECTROMAGNETIC LOCATING (EML) — QL-B</h3>
                <p className="mb-2">EML identifies conductive utilities where a signal can be detected. Limitations include:</p>
                <ul className="list-disc list-inside mb-2 ml-2 space-y-1">
                  <li>Not all services carry detectable signals</li>
                  <li>Depth is indicative only</li>
                  <li>Markings represent detected points, not exact alignment</li>
                  <li>Lines between points are interpolated, not confirmed</li>
                </ul>
                <p>Hand excavation is required before relying on any location for construction.</p>
              </div>

              {/* Section 4 */}


              {/* Section 5 */}
              <div>
                <h3 className="font-bold text-brand-navy mb-2">5. SURVEY & SKETCH RECORDS</h3>
                <p className="mb-2">All recorded data relies on information visible at time of survey and what is provided by asset owners.</p>
                <p>Unknown, abandoned, or inaccurately mapped services may exist.</p>
              </div>

              {/* Section 6 */}
              <div>
                <h3 className="font-bold text-brand-navy mb-2">6. IMPORTANT USE NOTICE</h3>
                <p className="mb-2">This information is for design and safety guidance only.</p>
                <p className="mb-2">It does not replace "Before You Dig" plans.</p>
                <p className="mb-2">Contractors must verify all utilities before excavation.</p>
                <p className="mb-2">A single marked line may represent multiple ducts or services.</p>
                <p className="mt-3 pt-3 border-t border-gray-200 text-sm italic text-gray-600">All survey data, markings, sketches, reports and related records collected or produced by NZ Utility Detection Ltd remain the sole property of NZ Utility Detection Ltd. The client is granted a non-exclusive licence to use the supplied data for the specific project for which it was commissioned. Reproduction, redistribution, or commercial reuse without written consent is not permitted.</p>
              </div>


              {/* Utility Colour Key - NZ Standards */}
              <div className="border-t pt-4 mt-6">
                <h3 className="font-bold text-brand-navy mb-3">UTILITY COLOUR KEY (NZ STANDARD)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-orange-500 border border-gray-300"></span>
                    <span>Electricity – Orange</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-yellow-400 border border-gray-300"></span>
                    <span>Gas – Yellow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-purple-600 border border-gray-300"></span>
                    <span>Telecommunications – Purple</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-blue-500 border border-gray-300"></span>
                    <span>Water – Blue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-red-600 border border-gray-300"></span>
                    <span>Wastewater/Sewer – Red</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-pink-400 border border-gray-300"></span>
                    <span>Stormwater – Pink</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-white border border-gray-400"></span>
                    <span>Marking out – White</span>
                  </div>
                </div>
              </div>

            </div>

            <button onClick={() => setShowTerms(false)} className="mt-6 bg-brand-orange text-white font-semibold py-2 px-6 rounded-lg hover:bg-orange-600 transition-colors">Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Step4Confirm;
