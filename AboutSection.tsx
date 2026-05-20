import React from 'react';
import TrustBadges from './TrustBadges';
import BrandImage from './BrandImage';
import { Shield, Zap, CheckCircle } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-brand-navy">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="w-10 h-px bg-brand-orange" />
            <span className="text-brand-orange text-xs font-bold tracking-[0.3em] uppercase">About NZUD</span>
            <span className="w-10 h-px bg-brand-orange" />
          </div>
          <h2 className="text-4xl font-black text-white mb-3 text-center uppercase tracking-tight">
            NZ Utility Detection
          </h2>
          <p className="text-lg text-brand-silver font-semibold text-center mb-12">
            Survey-grade EMF Technology for Trusted Utility Location
          </p>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <p className="text-base text-brand-silver leading-relaxed mb-6">
                Pre-job utility detection, planning, and post-installation as-built
                mapping — delivered with precision by New&nbsp;Zealand's leading EMF
                detection specialists.
              </p>
              <p className="text-base text-brand-silver leading-relaxed mb-8">
                Using advanced{' '}
                <span className="text-brand-orange font-semibold">
                  electromagnetic field (EMF)
                </span>{' '}
                techniques, we accurately locate and verify underground assets
                including gas, power, communications, and stormwater lines — before
                you dig.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {['Fully Insured', 'BYD NZ Registered', 'H&S Compliant', 'NZ-Wide Service'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-5 h-5 text-brand-orange" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <BrandImage
                variant="locator"
                title="EMF Detection Equipment"
                className="aspect-[4/3] border border-brand-orange/40 shadow-2xl"
              />
              <div className="absolute -bottom-3 -right-3 bg-brand-orange text-white px-4 py-2 font-black uppercase text-xs tracking-[0.2em]">
                EMF Locating
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-brand-navy-dark border border-brand-orange/30 p-6 flex items-start gap-4">
              <div className="bg-brand-orange p-3">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
                  Safety First
                </h3>
                <p className="text-brand-silver">
                  Prevent accidents and costly utility strikes with professional detection services.
                </p>
              </div>
            </div>
            <div className="bg-brand-navy-dark border border-brand-orange/30 p-6 flex items-start gap-4">
              <div className="bg-brand-orange p-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
                  Advanced Technology
                </h3>
                <p className="text-brand-silver">
                  Electromagnetic tracking, utility avoidance and post-completion mapping.
                </p>
              </div>
            </div>
          </div>

          <TrustBadges />
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
