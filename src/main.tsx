import React from 'react';
import AppLayout from '../AppLayout';
import { AppProvider } from '../contexts/AppContext';

const Index: React.FC = () => {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default Index;
