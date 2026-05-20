import React from 'react';
import { Star, Quote, ShieldCheck, Award, MapPin } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Mark T.',
    role: 'Site Foreman, Auckland',
    quote:
      'Julian was on-site within hours. Marked everything clearly, gave us a full report — saved us a serious headache.',
  },
  {
    name: 'Sarah K.',
    role: 'Project Manager, Rodney',
    quote:
      'Genuinely the most professional locating service we’ve worked with. Accurate, on-time and well documented.',
  },
  {
    name: 'Dave M.',
    role: 'Civil Contractor, Kaipara',
    quote:
      'NZUD is now our default locator. Reliable, certified and the as-built mapping is gold.',
  },
];

const STATS = [
  { value: '500+', label: 'Sites Located' },
  { value: '100%', label: 'BYD Certified' },
  { value: 'NZ-Wide', label: 'Coverage' },
  { value: '5★', label: 'Local Reviews' },
];

const SocialProofSection: React.FC = () => {
  return (
    <section
      id="social-proof"
      className="relative py-24 md:py-28 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #0d2347 0%, #081735 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f47820 1px, transparent 1px), linear-gradient(to bottom, #f47820 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="container mx-auto px-4 md:px-8 relative">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-10 h-px bg-brand-orange" />
            <span className="text-brand-orange text-xs font-bold tracking-[0.3em] uppercase">
              Trusted on the Tools
            </span>
            <span className="w-10 h-px bg-brand-orange" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-[0.95] mb-4">
            Built on <span className="text-brand-orange">Reputation</span>
          </h2>
          <p className="text-brand-silver text-lg">
            Trusted by contractors, builders and project managers across NZ.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-brand-orange/30 max-w-5xl mx-auto mb-16 rounded-xl overflow-hidden">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="bg-brand-navy-dark p-6 md:p-8 text-center"
            >
              <div className="text-3xl md:text-4xl font-black text-brand-orange mb-1">
                {s.value}
              </div>
              <div className="text-brand-silver text-[10px] md:text-xs font-bold uppercase tracking-[0.25em]">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-14">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="relative bg-brand-navy-dark/70 backdrop-blur-sm border border-brand-orange/30 hover:border-brand-orange transition-colors p-7 rounded-xl"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-brand-orange/30" />
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-brand-orange fill-brand-orange" />
                ))}
              </div>
              <p className="text-brand-silver text-sm leading-relaxed mb-5">
                “{t.quote}”
              </p>
              <div className="pt-4 border-t border-brand-orange/20">
                <div className="text-white font-bold text-sm">{t.name}</div>
                <div className="text-brand-silver/70 text-xs uppercase tracking-wider">
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Credentials row */}
        <div className="grid md:grid-cols-3 gap-px bg-brand-orange/30 max-w-5xl mx-auto rounded-xl overflow-hidden">
          {[
            { icon: ShieldCheck, title: 'BeforeUdig Certified', text: 'Industry-recognised locator credentials.' },
            { icon: Award, title: 'Fully Insured', text: 'Public liability cover on every project.' },
            { icon: MapPin, title: 'Rodney · Auckland · NZ-Wide', text: 'Local knowledge, nationwide reach.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-brand-navy-dark p-6 flex items-start gap-4">
              <div className="w-11 h-11 bg-brand-orange/15 border border-brand-orange/50 flex items-center justify-center flex-shrink-0 rounded-md">
                <Icon className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <div className="text-white font-black text-sm uppercase tracking-wider mb-1">
                  {title}
                </div>
                <p className="text-brand-silver/80 text-xs leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
