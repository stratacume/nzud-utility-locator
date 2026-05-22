import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import HeroSection from './HeroSection';
import NZUDTextLogo from './NZUDTextLogo';
import CertifiedLocatorLogo from './CertifiedLocatorLogo';

import { Phone, Mail } from 'lucide-react';


const AppLayout: React.FC = () => {
  useEffect(() => {
    document.title = 'NZ Utility Detection – EMF Utility Locating Auckland';

  }, []);


  return (
    <div className="min-h-screen bg-brand-black">
      <Navigation />
      {/* Spacer for fixed nav — includes iOS safe-area-top so content
          is never hidden behind the system status bar / notch. */}
      <div style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }} />


      <NZUDTextLogo />

      <HeroSection  />
      




      <footer
        id="contact"
        className="relative pt-14 pb-8"
        style={{ background: 'linear-gradient(180deg, #050d22 0%, #0a1d3d 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange" />
        <div className="container mx-auto px-5 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-10">


            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-md px-4 py-3 inline-block shadow-md">
                <CertifiedLocatorLogo size={84} />
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-5">
              Ready to <span className="text-brand-orange">locate before you dig?</span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">

              <a
                href="tel:0272670217"
                className="bg-brand-orange hover:bg-brand-orange-light text-white font-bold py-3 px-6 text-sm uppercase tracking-wider rounded-md inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" /> 027 267 0217
              </a>
              <a
                href="mailto:julian@nzutilitydetection.com"
                className="border border-white/30 hover:border-brand-orange hover:text-brand-orange text-white font-bold py-3 px-6 text-sm uppercase tracking-wider rounded-md inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            </div>
          </div>
          <div className="border-t border-brand-silver/15 pt-5 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
            <p className="text-brand-silver/60 text-xs uppercase tracking-wider text-center md:text-left">
              © {new Date().getFullYear()} NZ Utility Detection Ltd. All rights reserved.
            </p>
            <nav
              aria-label="Legal"
              className="flex items-center justify-center gap-4 text-xs uppercase tracking-wider"
            >
              <Link
                to="/privacy"
                className="text-brand-silver/70 hover:text-brand-orange transition-colors"
              >
                Privacy Policy
              </Link>
              <span aria-hidden className="text-brand-silver/25">|</span>
              <Link
                to="/terms"
                className="text-brand-silver/70 hover:text-brand-orange transition-colors"
              >
                Terms of Service
              </Link>
            </nav>
            <p className="text-brand-silver/60 text-xs uppercase tracking-[0.25em] text-center md:text-right">
              Accurate · Reliable · Safe
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
