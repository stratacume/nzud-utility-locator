import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import LegalFooter from '@/components/LegalFooter';

export interface LegalSection {
  id: string;
  title: string;
  /** Optional pre-formatted body when children isn't enough. */
  body?: React.ReactNode;
}

interface LegalPageLayoutProps {
  /** Document title (used in <h1> and document.title). */
  title: string;
  /** SEO meta description applied to <meta name="description"> on mount. */
  metaDescription: string;
  /** Short tagline rendered under the title. */
  intro: React.ReactNode;
  /** Effective date shown in the header. */
  effectiveDate: string;
  /** Sections rendered in the body and used to build the TOC. */
  sections: LegalSection[];
  /** Optional content rendered above the TOC (e.g. summary callout). */
  preamble?: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  metaDescription,
  intro,
  effectiveDate,
  sections,
  preamble,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${title} – NZ Utility Detection`;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = metaDescription;
  }, [title, metaDescription]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Branded header bar — keeps NZUD navy/orange identity */}
      <header
        className="relative"
        style={{ background: 'linear-gradient(180deg, #0d2347 0%, #15326b 100%)' }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />
        <div className="container mx-auto max-w-4xl px-5 md:px-8 py-10 md:py-14">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-brand-silver/80 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <p className="text-brand-orange text-xs font-bold uppercase tracking-[0.3em] mb-3">
            Legal
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-brand-silver/80 text-sm md:text-base max-w-3xl leading-relaxed">
            {intro}
          </p>
          <p className="mt-4 text-xs uppercase tracking-wider text-brand-silver/60">
            Effective date: {effectiveDate}
          </p>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <div className="container mx-auto max-w-4xl px-5 md:px-8 py-10 md:py-14">
          {preamble && (
            <div className="mb-8 rounded-lg border border-brand-orange/30 bg-orange-50/60 p-5 text-sm text-brand-navy">
              {preamble}
            </div>
          )}

          {/* Table of Contents */}
          <nav
            aria-label="Table of contents"
            className="mb-10 rounded-lg border border-gray-200 bg-white p-5 md:p-6 shadow-sm"
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-brand-navy mb-4">
              Contents
            </h2>
            <ol className="space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="group inline-flex items-center gap-2 text-brand-navy hover:text-brand-orange transition-colors"
                  >
                    <span className="text-brand-silver-dark font-mono text-xs w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium">{s.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-brand-orange" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <article className="prose prose-slate max-w-none prose-headings:text-brand-navy prose-headings:font-bold prose-a:text-brand-orange prose-a:no-underline hover:prose-a:underline prose-strong:text-brand-navy">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 mb-10">
                <h2 className="!mt-0 !mb-3 text-xl md:text-2xl flex items-baseline gap-3">
                  <span className="text-brand-orange font-mono text-sm">
                    {String(i + 1).padStart(2, '0')}.
                  </span>
                  <span>{s.title}</span>
                </h2>
                <div className="text-[15px] leading-relaxed text-gray-700 space-y-3">
                  {s.body}
                </div>
              </section>
            ))}
          </article>

          {/* Cross-link between legal docs */}
          <div className="mt-14 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-between items-center text-sm">
            <p className="text-gray-500">
              Questions? Email{' '}
              <a
                href="mailto:julian@nzutilitydetection.com"
                className="text-brand-orange font-medium hover:underline"
              >
                julian@nzutilitydetection.com
              </a>
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-brand-navy font-medium hover:text-brand-orange">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-brand-navy font-medium hover:text-brand-orange">
                Terms of Service
              </Link>
              <Link to="/" className="text-brand-navy font-medium hover:text-brand-orange">
                Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      <LegalFooter variant="dark" />
    </div>
  );
};

export default LegalPageLayout;
