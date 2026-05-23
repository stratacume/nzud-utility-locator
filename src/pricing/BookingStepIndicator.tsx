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

const BookingStepIndicator: React.FC<Props> = () => {
  return null;
};

export default BookingStepIndicator;

