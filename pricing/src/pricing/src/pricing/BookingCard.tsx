import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import BookingStepIndicator from './BookingStepIndicator';
import BookingConfirmed from './BookingConfirmed';
import Step4Confirm from './Step4Confirm';
import FileUpload from './FileUpload';

interface FormData { name: string; email: string; phone: string; address: string; notes: string; }
interface FormErrors { name?: string; email?: string; phone?: string; address?: string; }
interface Service { name: string; price: string; subtitle?: string; }
interface Step { number: number; label: string; }
interface UploadedFile { name: string; path: string; size: number; }

interface Props {
  currentStep: number; steps: Step[]; isConfirmed: boolean; services: Service[];
  selectedService: string | null; setSelectedService: (s: string) => void;
  selectedDate: Date | undefined; setSelectedDate: (d: Date | undefined) => void;
  formData: FormData; formErrors: FormErrors; handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  bookingRef: string; emailStatus: 'pending' | 'sent' | 'failed';
  emailStage?: string; emailError?: string; customerWarning?: boolean;
  submitError: string; canContinue: boolean;
  handleBack: () => void; handleContinue: () => void; handleConfirmBooking: () => void; isSubmitting: boolean;
  agreeToTerms: boolean; setAgreeToTerms: (v: boolean) => void;
  uploadedFiles: UploadedFile[]; onFilesChange: (files: UploadedFile[]) => void;
  onReset: () => void;
}

const BookingCard: React.FC<Props> = (props) => {
  const { currentStep, steps, isConfirmed, services, selectedService, setSelectedService,
    selectedDate, setSelectedDate, formData, formErrors, handleInputChange, bookingRef, emailStatus,
    emailStage, emailError, customerWarning,
    submitError, canContinue, handleBack, handleContinue, handleConfirmBooking, isSubmitting, agreeToTerms, setAgreeToTerms,
    uploadedFiles, onFilesChange, onReset } = props;

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <BookingStepIndicator steps={steps} currentStep={currentStep} isConfirmed={isConfirmed} />
        {currentStep === 1 && <Step1Services services={services} selectedService={selectedService} setSelectedService={setSelectedService} />}
        {currentStep === 2 && <Step2Date selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
        {currentStep === 3 && <Step3Form formData={formData} formErrors={formErrors} handleInputChange={handleInputChange} uploadedFiles={uploadedFiles} onFilesChange={onFilesChange} />}
        {currentStep === 4 && !isConfirmed && <Step4Confirm selectedService={selectedService} selectedAddons={[]} selectedDate={selectedDate} formData={formData} submitError={submitError} agreeToTerms={agreeToTerms} setAgreeToTerms={setAgreeToTerms} uploadedFiles={uploadedFiles} />}
        {isConfirmed && <BookingConfirmed bookingRef={bookingRef} emailStatus={emailStatus} emailStage={emailStage} emailError={emailError} customerWarning={customerWarning} filesUploaded={uploadedFiles.length} email={formData.email} onReset={onReset} />}


        {!isConfirmed && (
          <div className="flex gap-3">
            {currentStep > 1 && <button onClick={handleBack} className="flex-1 py-3 rounded-lg font-semibold border-2 border-brand-navy text-brand-navy hover:bg-gray-50 transition-colors">Back</button>}
            {currentStep < 4 ? (
              <button onClick={handleContinue} disabled={!canContinue} className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${canContinue ? 'bg-brand-navy hover:bg-brand-teal text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Continue</button>
            ) : (
              <button
                onClick={handleConfirmBooking}
                disabled={isSubmitting || !agreeToTerms}
                aria-disabled={isSubmitting || !agreeToTerms}
                title={!agreeToTerms ? 'Please accept the Important Customer Notes, Terms of Service, and Privacy Policy to continue.' : undefined}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  isSubmitting || !agreeToTerms
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-orange hover:bg-orange-600 text-white'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Confirm Booking'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

const Step1Services: React.FC<{ services: Service[]; selectedService: string | null; setSelectedService: (s: string) => void }> = ({ services, selectedService, setSelectedService }) => (
  <div className="mb-6">
    {services.map((service) => {
      const isSelected = selectedService === service.name;
      return (
        <button
          key={service.name}
          onClick={() => setSelectedService(service.name)}
          className={`w-full p-6 border-2 rounded-lg text-center transition-all shadow-md hover:shadow-lg ${
            isSelected
              ? 'border-blue-700 bg-gradient-to-br from-slate-200 via-slate-100 to-blue-200 ring-2 ring-blue-500/40'
              : 'border-slate-300 bg-gradient-to-br from-slate-100 via-white to-blue-100 hover:from-slate-200 hover:to-blue-200'
          }`}
        >
          <div className="font-semibold text-blue-900 text-lg drop-shadow-sm">{service.name}</div>
          {service.price && <div className="text-blue-800 font-semibold mt-1">{service.price}{service.subtitle ? ` · ${service.subtitle}` : ''}</div>}
        </button>
      );
    })}
  </div>
);




const Step2Date: React.FC<{ selectedDate: Date | undefined; setSelectedDate: (d: Date | undefined) => void }> = ({ selectedDate, setSelectedDate }) => (
  <>
    <h3 className="text-xl font-bold text-brand-navy text-center mb-6">Select Date</h3>
    <div className="flex justify-center mb-6">
      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date()} className="rounded-md border" />
    </div>
    {selectedDate && <p className="text-center text-brand-navy mb-4">Selected: <span className="font-semibold">{selectedDate.toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>}
  </>
);

interface Step3Props {
  formData: FormData; formErrors: FormErrors; handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  uploadedFiles: UploadedFile[]; onFilesChange: (files: UploadedFile[]) => void;
}

const Step3Form: React.FC<Step3Props> = ({ formData, formErrors, handleInputChange, uploadedFiles, onFilesChange }) => (
  <>
    <h3 className="text-xl font-bold text-brand-navy text-center mb-6">Your Details</h3>
    <div className="space-y-4 mb-6">
      {[{ label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Smith' },
        { label: 'Email Address', name: 'email', type: 'email', placeholder: 'john@example.com' },
        { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '027 123 4567' }].map(f => (
        <div key={f.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label} *</label>
          <input type={f.type} name={f.name} value={formData[f.name as keyof FormData]} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent ${formErrors[f.name as keyof FormErrors] ? 'border-red-500' : 'border-gray-300'}`} placeholder={f.placeholder} />
          {formErrors[f.name as keyof FormErrors] && <p className="text-red-500 text-xs mt-1">{formErrors[f.name as keyof FormErrors]}</p>}
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Address *</label>
        <input type="text" name="address" value={formData.address} onChange={handleInputChange} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent ${formErrors.address ? 'border-red-500' : 'border-gray-300'}`} placeholder="123 Main Street, Auckland" />
        {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Job Details (optional)</label>
        <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent resize-none" placeholder="Any additional details about the job..." />
        <FileUpload files={uploadedFiles} onFilesChange={onFilesChange} />
      </div>
    </div>
  </>
);

export default BookingCard;
