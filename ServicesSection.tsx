import React from 'react';
import { Map } from 'lucide-react';



const services = [
  {
    icon: Map,
    title: 'RTK As-Builts & Mapping',
    description:
      'Centimetre-accurate RTK GPS mapping of located utilities and as-built infrastructure for project records.',
    points: ['RTK GPS positioning', 'CAD-ready exports', 'Digital site plans'],
  },
];


const ServicesSection: React.FC = () => {
  return (
    <section
      id="services"
      className="relative py-24 md:py-28 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #0a1d3d 0%, #0d2347 100%)',
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      {/* Top orange line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent" />

      <div className="container mx-auto px-4 md:px-8 relative">
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-10 h-px bg-brand-orange" />
            <span className="text-brand-orange text-xs font-bold tracking-[0.3em] uppercase">
              Our Services
            </span>
            <span className="w-10 h-px bg-brand-orange" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase leading-[0.95] mb-4 tracking-tight">
            Precision Detection.
            <br />
            <span className="text-brand-orange">Before You Dig.</span>
          </h2>
          <p className="text-brand-silver/85 text-lg">
            Field-ready, fully certified, fully documented.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="group relative bg-brand-navy-dark/70 backdrop-blur-sm border border-brand-orange/30 hover:border-brand-orange transition-colors p-8 rounded-xl"
              >
                {/* Icon block */}
                <div className="relative w-16 h-16 mb-6 bg-brand-orange flex items-center justify-center rounded-lg shadow-[0_8px_24px_rgba(244,120,32,0.35)]">
                  <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                </div>

                <h3 className="text-2xl font-black text-white uppercase mb-3 tracking-tight">
                  {service.title}
                </h3>
                <p className="text-brand-silver/85 text-sm leading-relaxed mb-6">
                  {service.description}
                </p>

                <ul className="space-y-2 pt-4 border-t border-brand-orange/20">
                  {service.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-brand-silver text-xs font-semibold uppercase tracking-wider"
                    >
                      <span className="w-1.5 h-1.5 bg-brand-orange flex-shrink-0 rotate-45" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
};

export default ServicesSection;
