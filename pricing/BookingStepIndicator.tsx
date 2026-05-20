import React from 'react';

interface Step {
  number: number;
  label: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  isConfirmed: boolean;
}

const BookingStepIndicator: React.FC<Props> = ({ steps, currentStep, isConfirmed }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                step.number === currentStep
                  ? 'bg-brand-orange'
                  : step.number < currentStep || isConfirmed
                  ? 'bg-green-500'
                  : 'bg-gray-600'
              }`}
            >
              {step.number < currentStep || isConfirmed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            {step.label && (
              <span className="text-xs text-gray-600 mt-1 text-center whitespace-nowrap">
                {step.label}
              </span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 mb-4 ${
                step.number < currentStep || isConfirmed ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default BookingStepIndicator;
