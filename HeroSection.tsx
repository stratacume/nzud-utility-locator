import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';


interface HeroSectionProps {
  onContactClick: () => void;
  onQuoteClick?: () => void;
  onBookClick?: () => void;
}

/**
 * Hero — branded dark-blue banner styled to match the NZUD logo image.
 * Deep navy gradient background with metallic chrome-style "NZUD" wordmark
 * and orange accent slashes, mirroring the supplied logo artwork.
 */
const HERO_SLIDES = [
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777697159946_c1eada84.png',
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777700946502_8335099a.jpeg',
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777700949271_b700ef1c.jpeg',
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777700951114_39f4f7b7.jpeg',
  'https://d64gsuwffb70l.cloudfront.net/6854e23134e69dd158550ff3_1777700952652_d52699be.jpeg',
];

const HeroSection: React.FC<HeroSectionProps> = ({ onContactClick }) => {
  const [activeSlide, setActiveSlide] = useState(0);


  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#050d22]">
      {/* Background slideshow — cross-fading images every 5 seconds. */}
      {HERO_SLIDES.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            idx === activeSlide ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Uniform dark overlay — darkened further for stronger contrast
          so the headline + subheading stand out clearly. */}
      <div className="absolute inset-0 bg-black/70 z-[1]" aria-hidden="true" />



      {/* Top + bottom orange accent bars */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange z-30" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange z-30" />


      <div className="relative z-10 container mx-auto px-5 md:px-8 py-24 md:py-36 lg:py-44">
        <div className="flex flex-col items-start text-left max-w-2xl">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold italic text-[#9fb4c7] leading-[1.05] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Know what's
            <br />
            <span className="text-[#9fb4c7] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">below</span>{' '}
            before you go.
          </h1>

          {/* Subheading */}
          <p className="mt-5 text-base md:text-lg lg:text-xl text-[#9fb4c7] italic leading-relaxed max-w-xl font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Professional underground utility locating across the
            <span className="text-[#9fb4c7] font-extrabold"> North Shore</span>,
            <span className="text-[#9fb4c7] font-extrabold"> Rodney</span> and
            <span className="text-[#9fb4c7] font-extrabold"> Kaipara</span>.
          </p>




          {/* CTA */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="tel:0272670217"
              onClick={onContactClick}
              className="inline-flex items-center justify-center gap-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-4 px-8 text-sm md:text-base tracking-wider rounded-md transition-all shadow-2xl shadow-brand-orange/40 hover:scale-105"
            >
              <Phone className="w-5 h-5" />
              027 267 0217
            </a>
          </div>

        </div>
      </div>


    </section>
  );
};

export default HeroSection;
