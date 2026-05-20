import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Compact footer used on internal pages (Customer Portal, Admin, 404,
 * Recent Jobs, etc.) so the legal links are reachable from anywhere on
 * the site. Kept intentionally minimal so it never visually competes
 * with existing page UI.
 *
 * Variants:
 *   - "light"  : for white/grey-50 page backgrounds
 *   - "dark"   : for navy/dark backgrounds
 */
type Variant = 'light' | 'dark';

interface LegalFooterProps {
  variant?: Variant;
  className?: string;
}

const LegalFooter: React.FC<LegalFooterProps> = ({ variant = 'light', className = '' }) => {
  const isDark = variant === 'dark';

  const wrapper = isDark
    ? 'bg-brand-navy-dark border-t border-white/10 text-brand-silver/70'
    : 'bg-white border-t border-gray-200 text-gray-500';

  const linkBase = isDark
    ? 'hover:text-brand-orange transition-colors'
    : 'hover:text-brand-orange transition-colors';

  return (
    <footer className={`${wrapper} ${className}`}>
      <div className="container mx-auto px-4 py-4 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <p className="tracking-wide">
          © {new Date().getFullYear()} NZ Utility Detection Ltd. All rights reserved.
        </p>
        <nav className="flex items-center gap-4">
          <Link to="/privacy" className={`font-medium ${linkBase}`}>
            Privacy Policy
          </Link>
          <span aria-hidden className={isDark ? 'text-white/20' : 'text-gray-300'}>|</span>
          <Link to="/terms" className={`font-medium ${linkBase}`}>
            Terms of Service
          </Link>
          <span aria-hidden className={isDark ? 'text-white/20' : 'text-gray-300'}>|</span>
          <a
            href="mailto:julian@nzutilitydetection.com"
            className={`font-medium ${linkBase}`}
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default LegalFooter;
