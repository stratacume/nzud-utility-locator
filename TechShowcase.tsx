import React from 'react';
import BrandImage from './BrandImage';
import { CheckIcon } from './ServiceIcons';

const TechShowcase: React.FC = () => {
  return (
    <section className="py-20 bg-brand-navy-dark">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-px bg-brand-orange" />
                <span className="text-brand-orange text-xs font-bold tracking-[0.3em] uppercase">Technology</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tight">
                Advanced Detection Technology
              </h3>
              <p className="text-brand-silver mb-6 leading-relaxed">
                We use industry-leading{' '}
                <span className="text-brand-orange font-semibold">
                  electromagnetic field (EMF)
                </span>{' '}
                locating equipment to provide comprehensive underground utility
                detection across New&nbsp;Zealand.
              </p>
              <ul className="space-y-3 text-brand-silver">
                <li className="flex items-start">
                  <CheckIcon />
                  <span className="ml-3">EMF detection for metallic pipes and cables</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon />
                  <span className="ml-3">RTK locates down to 15&nbsp;mm accuracy</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon />
                  <span className="ml-3">Comprehensive site mapping and documentation</span>
                </li>
              </ul>
            </div>

            <div className="relative">
              <BrandImage
                variant="locator"
                title="RD8200SG Locator"
                className="aspect-[4/3] border border-brand-orange/40 shadow-2xl"
              />
              <div className="absolute -bottom-4 -right-4 bg-brand-orange text-white px-4 py-2 font-black uppercase text-xs tracking-[0.2em]">
                EMF Technology
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechShowcase;
