import React from 'react';
import { ClipboardList, Radar, Map, FileCheck } from 'lucide-react';

interface ProcessSectionProps {
  onQuoteClick?: () => void;
}

const STEPS = [
  {
    icon: ClipboardList,
    label: 'Step 01',
    title: 'Request a Locate',
    text: 'Send through your job details and site location. We confirm scope and timing.',
  },
  {
    icon: Radar,
    label: 'Step 02',
    title: 'On-Site EMF Scan',
    text: 'Our certified locator surveys the site with EMF detection equipment.',

  },
  {
    icon: Map,
    label: 'Step 03',
    title: 'Mark & Map',
    text: 'Underground services are colour-coded on-ground and recorded digitally.',
  },
  {
    icon: FileCheck,
    label: 'Step 04',
    title: 'Report Delivered',
    text: 'You receive a full site report — ready for safe excavation.',
  },
];

const ProcessSection: React.FC<ProcessSectionProps> = ({ onQuoteClick }) => {
  return (
    <section
      id="process"
      className="relative py-24 md:py-28 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #0d2347 0%, #15326b 50%, #0d2347 100%)',
      }}
    >
      {/* Faint grid */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f47820 1px, transparent 1px), linear-gradient(to bottom, #f47820 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="container mx-auto px-4 md:px-8 relative">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-10 h-px bg-brand-orange" />
            <span className="text-brand-orange text-xs font-bold tracking-[0.3em] uppercase">
              How It Works
            </span>
            <span className="w-10 h-px bg-brand-orange" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase leading-[0.95] mb-4 tracking-tight">
            Simple. Safe. <span className="text-brand-orange">Certified.</span>
          </h2>
          <p className="text-brand-silver text-lg">
            Four steps from first call to safe excavation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative bg-brand-navy-dark/70 backdrop-blur-sm border border-brand-orange/30 hover:border-brand-orange transition-colors p-6 rounded-xl group"
              >
                <span className="absolute -top-4 left-6 bg-brand-orange text-white text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1 rounded">
                  {step.label}
                </span>
                <div className="w-14 h-14 mt-3 mb-5 bg-brand-orange/15 border border-brand-orange/50 rounded-lg flex items-center justify-center group-hover:bg-brand-orange transition-colors">
                  <Icon className="w-7 h-7 text-brand-orange group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-brand-silver text-sm leading-relaxed">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>



      </div>
    </section>
  );
};

export default ProcessSection;
