import React from 'react';
import Logo from './Logo';
import CertifiedLocatorLogo from './CertifiedLocatorLogo';
import { ShieldCheck, Award, MapPin, Phone } from 'lucide-react';

/**
 * Brand showcase — pure NZUD identity, no vehicle photography.
 * Mirrors the supplied business card: navy panel + logo + orange accents.
 */
const CARD_IMG =
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777610697119_e144c31f.png';

const VisualGallery: React.FC = () => {
  return (
    <section className="py-20 bg-brand-navy relative overflow-hidden">
      {/* Faint blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f47820 1px, transparent 1px), linear-gradient(to bottom, #f47820 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 border border-brand-orange/60 bg-brand-orange/10">
            <span className="text-brand-orange text-xs font-bold tracking-[0.25em] uppercase">
              The NZUD Brand
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-3">
            Built to be <span className="text-brand-orange">Recognised</span>
          </h2>
          <p className="text-brand-silver">
            One trusted brand — certified, professional, on every job site
            across Rodney &amp; Auckland.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left: Logo "card" — designed to mirror the business card */}
          <div className="relative bg-brand-navy-dark border-2 border-brand-orange/40 p-10 md:p-14 flex flex-col items-center justify-center text-center min-h-[360px] group hover:border-brand-orange transition-colors">
            {/* Corner brackets */}
            <span className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-brand-orange" />
            <span className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-brand-orange" />
            <span className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-brand-orange" />
            <span className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-brand-orange" />

            <div className="absolute inset-0 bg-brand-orange/10 blur-3xl scale-75 opacity-50" />

            <Logo className="relative h-28 md:h-36 w-auto mb-6 drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]" />

            <div className="relative flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-brand-orange" />
              <div className="w-1.5 h-1.5 bg-brand-orange rotate-45" />
              <div className="h-px w-10 bg-brand-orange" />
            </div>

            <p className="relative text-brand-orange text-xs font-bold tracking-[0.3em] uppercase mb-2">
              NZ Utility Detection Ltd
            </p>
            <p className="relative text-brand-silver text-sm">
              Accurate. Reliable. Safe.
            </p>
          </div>

          {/* Right: Trust / credentials panel */}
          <div className="relative bg-brand-navy-dark border-2 border-brand-orange/40 p-8 md:p-10 flex flex-col justify-center min-h-[360px]">
            <span className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-brand-orange" />
            <span className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-brand-orange" />
            <span className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-brand-orange" />
            <span className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-brand-orange" />

            <div className="w-12 h-1 bg-brand-orange mb-5" />
            <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
              Certified &amp; <span className="text-brand-orange">Professional</span>
            </h3>
            <p className="text-brand-silver text-sm mb-5">
              BeforeUdig Certified Locator — Julian Price, Director.
            </p>

            <div className="mb-6 bg-white rounded-md px-4 py-3 inline-block self-start shadow-md">
              <CertifiedLocatorLogo size={84} />
            </div>



            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-wider">
                    BeforeUdig Certified
                  </p>
                  <p className="text-brand-silver/80 text-xs">
                    Industry-recognised utility-locator credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-wider">
                    Fully Insured
                  </p>
                  <p className="text-brand-silver/80 text-xs">
                    Public liability cover on every project.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm uppercase tracking-wider">
                    Rodney · Auckland · NZ-Wide
                  </p>
                  <p className="text-brand-silver/80 text-xs">
                    Local knowledge, nationwide reach.
                  </p>
                </div>
              </div>
            </div>

            <a
              href="tel:0272670217"
              className="mt-6 inline-flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-light text-white font-bold py-3 px-5 text-sm uppercase tracking-wider transition-colors"
            >
              <Phone className="w-4 h-4" /> 027 267 0217
            </a>
          </div>
        </div>

        {/* Hidden preload of brand card for any consumers still referencing it */}
        <img src={CARD_IMG} alt="" className="hidden" aria-hidden="true" />
      </div>
    </section>
  );
};

export default VisualGallery;
