import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
import LegalFooter from '@/components/LegalFooter';
import {
  Loader2,
  Camera,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Star,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface ShowcaseImage {
  url: string;
  path: string;
  caption?: string;
}

interface ShowcaseJob {
  id: string;
  title: string;
  suburb: string;
  description: string;
  service_type: string;
  completion_date: string | null;
  tags: string[];
  before_image: ShowcaseImage | null;
  after_image: ShowcaseImage | null;
  gallery_images: ShowcaseImage[];
  is_featured: boolean;
  created_at: string;
}

const PAGE_SIZE = 9;

// Safely coerce any value (array, plain object like {}, null, undefined) into
// an array of ShowcaseImage. The DB occasionally returns `{}` for an empty
// gallery, which would throw "object is not iterable" if used directly in a
// `for...of` loop and crash the page.
function toImageArray(value: unknown): ShowcaseImage[] {
  if (Array.isArray(value)) {
    return value.filter(
      (v): v is ShowcaseImage =>
        !!v && typeof v === 'object' && typeof (v as ShowcaseImage).url === 'string',
    );
  }
  return [];
}

function isImage(v: unknown): v is ShowcaseImage {
  return !!v && typeof v === 'object' && typeof (v as ShowcaseImage).url === 'string';
}

function allImages(job: ShowcaseJob): ShowcaseImage[] {
  const out: ShowcaseImage[] = [];
  if (isImage(job.before_image)) {
    out.push({ ...job.before_image, caption: job.before_image.caption || 'Before' });
  }
  if (isImage(job.after_image)) {
    out.push({ ...job.after_image, caption: job.after_image.caption || 'After' });
  }
  for (const g of toImageArray(job.gallery_images)) {
    if (isImage(g)) out.push(g);
  }
  return out;
}

// Normalise a row coming back from the edge function so the rest of the page
// never has to worry about null/undefined/wrong-type fields.
function normaliseJob(raw: any): ShowcaseJob {
  return {
    id: String(raw?.id ?? ''),
    title: typeof raw?.title === 'string' && raw.title.trim() ? raw.title : 'Utility Locate',
    suburb: typeof raw?.suburb === 'string' ? raw.suburb.trim() : '',
    description: typeof raw?.description === 'string' ? raw.description : '',
    service_type: typeof raw?.service_type === 'string' ? raw.service_type : '',
    completion_date: raw?.completion_date ?? null,
    tags: Array.isArray(raw?.tags) ? raw.tags.filter((t: unknown) => typeof t === 'string') : [],
    before_image: isImage(raw?.before_image) ? raw.before_image : null,
    after_image: isImage(raw?.after_image) ? raw.after_image : null,
    gallery_images: toImageArray(raw?.gallery_images),
    is_featured: !!raw?.is_featured,
    created_at: raw?.created_at ?? '',
  };
}


const RecentJobs: React.FC = () => {
  const [jobs, setJobs] = useState<ShowcaseJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState<string>('all');
  const [lightbox, setLightbox] = useState<{ job: ShowcaseJob; idx: number } | null>(null);

  useEffect(() => {
    document.title = 'Featured Jobs · NZ Utility Detection';
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('get-showcase-jobs', {
          body: {},
        });
        if (fnErr) throw fnErr;
        if (!data?.success) throw new Error(data?.error || 'Failed to load');
        const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
        setJobs(rawJobs.map(normaliseJob));

      } catch (e: any) {
        setError(e.message || 'Failed to load recent jobs.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    if (activeTag === 'all') return jobs;
    return jobs.filter((j) => j.tags?.includes(activeTag));
  }, [jobs, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const featured = jobs.filter((j) => j.is_featured).slice(0, 1);

  useEffect(() => {
    setPage(1);
  }, [activeTag]);

  // Lightbox keyboard
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') {
        const imgs = allImages(lightbox.job);
        setLightbox({ job: lightbox.job, idx: (lightbox.idx + 1) % imgs.length });
      }
      if (e.key === 'ArrowLeft') {
        const imgs = allImages(lightbox.job);
        setLightbox({ job: lightbox.job, idx: (lightbox.idx - 1 + imgs.length) % imgs.length });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  return (
    <div className="min-h-screen bg-brand-black">
      <Navigation />
      <div style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))' }} />

      <header className="container mx-auto px-5 md:px-8 py-12 text-center">
        <p className="text-brand-orange text-xs font-bold uppercase tracking-[0.3em] mb-3">
          Social Proof
        </p>
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
          Featured <span className="text-brand-orange">Locate Jobs</span>
        </h1>
        <p className="text-brand-silver mt-4 max-w-2xl mx-auto text-sm md:text-base">
          A selection of recent utility detection jobs across Auckland. Customer details and exact
          addresses have been redacted for privacy.
        </p>
      </header>

      <main className="container mx-auto px-5 md:px-8 pb-20">
        {loading && (
          <div className="flex items-center justify-center py-24 text-brand-silver">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading jobs…
          </div>
        )}

        {error && !loading && (
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-xl p-10 text-center text-brand-silver">
            <Camera className="w-12 h-12 mx-auto mb-3 text-brand-orange" />
            <p className="font-semibold text-white mb-1">More jobs coming soon</p>
            <p className="text-sm">
              We're putting together a selection of recent locate jobs to share. In the meantime,
              get in touch for a quote.
            </p>
          </div>
        )}

        {!loading && !error && featured.length > 0 && (
          <FeaturedJob job={featured[0]} onOpen={(idx) => setLightbox({ job: featured[0], idx })} />
        )}

        {!loading && !error && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button
              onClick={() => setActiveTag('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${
                activeTag === 'all'
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white/5 text-brand-silver border-white/10 hover:border-brand-orange'
              }`}
            >
              All ({jobs.length})
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors inline-flex items-center gap-1 ${
                  activeTag === t
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-white/5 text-brand-silver border-white/10 hover:border-brand-orange'
                }`}
              >
                <Tag className="w-3 h-3" /> {t}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageJobs.map((job) => {
            const imgs = allImages(job);
            const cover = imgs[0];
            return (
              <article
                key={job.id}
                className="bg-white rounded-xl overflow-hidden shadow-lg border border-white/10 group flex flex-col"
              >
                <button
                  onClick={() => cover && setLightbox({ job, idx: 0 })}
                  className="block w-full aspect-[4/3] bg-gray-100 overflow-hidden relative"
                >
                  {cover ? (
                    <img
                      src={cover.url}
                      alt={job.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Camera className="w-10 h-10" />
                    </div>
                  )}
                  {job.is_featured && (
                    <span className="absolute top-3 left-3 bg-brand-orange text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3 fill-white" /> Featured
                    </span>
                  )}
                </button>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-brand-teal font-bold uppercase tracking-wider mb-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {job.suburb}
                    </span>
                    {job.completion_date && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(job.completion_date).toLocaleDateString('en-NZ', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-bold text-brand-navy text-lg mb-1">{job.title}</h3>
                  {job.service_type && (
                    <p className="text-xs text-gray-500 mb-3">{job.service_type}</p>
                  )}
                  {job.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{job.description}</p>
                  )}
                  {imgs.length > 1 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-auto">
                      {imgs.slice(0, 4).map((img, i) => (
                        <button
                          key={img.path + i}
                          onClick={() => setLightbox({ job, idx: i })}
                          className="aspect-square overflow-hidden rounded bg-gray-100"
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Camera className="w-3 h-3" /> {imgs.length} photo{imgs.length === 1 ? '' : 's'}{' '}
                    · Customer details redacted
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-md border border-white/20 text-white disabled:opacity-30 hover:border-brand-orange"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-brand-silver text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-md border border-white/20 text-white disabled:opacity-30 hover:border-brand-orange"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="mt-16 max-w-3xl mx-auto bg-gradient-to-br from-brand-navy to-[#0a1d3d] rounded-2xl p-8 text-center border border-brand-orange/20">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase mb-3">
            Need a locate done right?
          </h2>
          <p className="text-brand-silver mb-6">
            Accurate, certified utility detection across Auckland.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:0272670217"
              className="bg-brand-orange hover:bg-brand-orange-light text-white font-bold py-3 px-6 text-sm uppercase tracking-wider rounded-md inline-flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" /> 027 267 0217
            </a>
            <a
              href="mailto:julian@nzutilitydetection.com"
              className="border border-white/30 hover:border-brand-orange hover:text-brand-orange text-white font-bold py-3 px-6 text-sm uppercase tracking-wider rounded-md inline-flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>
        </div>
      </main>

      {lightbox && (
        <Lightbox
          job={lightbox.job}
          idx={lightbox.idx}
          onClose={() => setLightbox(null)}
          onChange={(idx) => setLightbox({ job: lightbox.job, idx })}
        />
      )}

      <LegalFooter variant="dark" />
    </div>
  );
};

const FeaturedJob: React.FC<{ job: ShowcaseJob; onOpen: (idx: number) => void }> = ({
  job,
  onOpen,
}) => {
  const imgs = allImages(job);
  const cover = imgs[0];
  return (
    <section className="mb-10 bg-gradient-to-br from-brand-navy to-[#0a1d3d] rounded-2xl border border-brand-orange/30 overflow-hidden grid grid-cols-1 md:grid-cols-2">
      <button
        onClick={() => cover && onOpen(0)}
        className="aspect-[4/3] md:aspect-auto bg-gray-100 overflow-hidden"
      >
        {cover && (
          <img src={cover.url} alt={job.title} className="w-full h-full object-cover" />
        )}
      </button>
      <div className="p-6 md:p-8 flex flex-col justify-center">
        <span className="inline-flex items-center gap-1 self-start bg-brand-orange text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full mb-3">
          <Star className="w-3 h-3 fill-white" /> Featured Job
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-white uppercase mb-2">{job.title}</h2>
        <p className="text-brand-orange text-xs font-bold uppercase tracking-wider mb-3">
          {job.suburb}
          {job.service_type ? ` · ${job.service_type}` : ''}
        </p>
        {job.description && <p className="text-brand-silver mb-4">{job.description}</p>}
        {imgs.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {imgs.slice(0, 4).map((img, i) => (
              <button
                key={img.path + i}
                onClick={() => onOpen(i)}
                className="aspect-square rounded overflow-hidden bg-white/5 border border-white/10 hover:border-brand-orange"
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const Lightbox: React.FC<{
  job: ShowcaseJob;
  idx: number;
  onClose: () => void;
  onChange: (idx: number) => void;
}> = ({ job, idx, onClose, onChange }) => {
  const imgs = allImages(job);
  const current = imgs[idx];
  if (!current) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img
            src={current.url}
            alt={job.title}
            className="w-full max-h-[75vh] object-contain rounded-lg"
          />
          {imgs.length > 1 && (
            <>
              <button
                onClick={() => onChange((idx - 1 + imgs.length) % imgs.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => onChange((idx + 1) % imgs.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
        <div className="text-center mt-4 text-white">
          <p className="font-bold">{job.title}</p>
          <p className="text-sm text-brand-silver">
            {job.suburb}
            {current.caption ? ` · ${current.caption}` : ''}
          </p>
          {imgs.length > 1 && (
            <div className="flex gap-2 justify-center mt-3 flex-wrap">
              {imgs.map((img, i) => (
                <button
                  key={img.path + i}
                  onClick={() => onChange(i)}
                  className={`w-16 h-16 rounded overflow-hidden border-2 ${
                    i === idx
                      ? 'border-brand-orange'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentJobs;
