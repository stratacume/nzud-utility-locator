import React, { useState } from 'react';
import { Loader2, Save, X, Star, Eye, EyeOff, FileEdit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ShowcaseImageUpload, { ShowcaseImage } from './ShowcaseImageUpload';

export interface ShowcaseJob {
  id?: string;
  title: string;
  suburb: string;
  description: string;
  service_type: string;
  completion_date: string | null;
  tags: string[];
  before_image: ShowcaseImage | null;
  after_image: ShowcaseImage | null;
  gallery_images: ShowcaseImage[];
  status: 'draft' | 'published' | 'hidden';
  is_featured: boolean;
  redact_address: boolean;
  anonymise: boolean;
}

const SERVICES = [
  'EMF Utility Detection',
  'Ground Penetrating Radar',
  'CCTV Drain Inspection',
  'Cable Locating',
  'Pipe Locating',
  'Pre-Dig Survey',
];

const emptyJob = (): ShowcaseJob => ({
  title: '',
  suburb: '',
  description: '',
  service_type: '',
  completion_date: null,
  tags: [],
  before_image: null,
  after_image: null,
  gallery_images: [],
  status: 'draft',
  is_featured: false,
  redact_address: true,
  anonymise: true,
});

interface Props {
  initial?: ShowcaseJob | null;
  onSaved: () => void;
  onCancel: () => void;
}

const ShowcaseJobForm: React.FC<Props> = ({ initial, onSaved, onCancel }) => {
  const [job, setJob] = useState<ShowcaseJob>(initial || emptyJob());
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const update = <K extends keyof ShowcaseJob>(key: K, value: ShowcaseJob[K]) =>
    setJob((j) => ({ ...j, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (job.tags.includes(t)) return;
    update('tags', [...job.tags, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => update('tags', job.tags.filter((x) => x !== t));

  const save = async () => {
    if (!job.title.trim() || !job.suburb.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Title and suburb are required.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const action = job.id ? 'update' : 'create';
      const { data, error } = await supabase.functions.invoke('manage-showcase-jobs', {
        body: { action, token, id: job.id, data: job },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Save failed');
      toast({ title: 'Saved', description: `Showcase ${job.id ? 'updated' : 'created'}.` });
      onSaved();
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Could not save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const StatusButton = ({
    value,
    label,
    icon: Icon,
    activeClass,
  }: {
    value: ShowcaseJob['status'];
    label: string;
    icon: React.ElementType;
    activeClass: string;
  }) => {
    const active = job.status === value;
    return (
      <button
        type="button"
        onClick={() => update('status', value)}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider border transition-colors ${
          active ? activeClass : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
        }`}
      >
        <Icon className="w-3.5 h-3.5" /> {label}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
        <h2 className="font-bold text-brand-navy text-lg">
          {job.id ? 'Edit showcase job' : 'New showcase job'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
            <input
              value={job.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Pre-trench utility scan, Mt Eden"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Suburb *</label>
            <input
              value={job.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              placeholder="e.g. Mt Eden"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Service type</label>
            <select
              value={job.service_type}
              onChange={(e) => update('service_type', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-white"
            >
              <option value="">Select…</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Completion date</label>
            <input
              type="date"
              value={job.completion_date || ''}
              onChange={(e) => update('completion_date', e.target.value || null)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Short description</label>
          <textarea
            value={job.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            placeholder="Describe the job in 1–3 sentences…"
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tags / categories</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-brand-navy text-white rounded-md text-sm font-semibold"
            >
              Add
            </button>
          </div>
          {job.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {job.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-orange-100 text-brand-orange px-2 py-1 rounded-full text-xs font-semibold"
                >
                  {t}
                  <button onClick={() => removeTag(t)} aria-label="Remove tag">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ShowcaseImageUpload
            label="Before image"
            value={job.before_image}
            onChange={(v) => update('before_image', v as ShowcaseImage | null)}
          />
          <ShowcaseImageUpload
            label="After image"
            value={job.after_image}
            onChange={(v) => update('after_image', v as ShowcaseImage | null)}
          />
        </div>

        <ShowcaseImageUpload
          label="Gallery images"
          hint="Add multiple photos of the job. The first image is used as the cover."
          multiple
          maxFiles={12}
          value={job.gallery_images}
          onChange={(v) => update('gallery_images', (v as ShowcaseImage[]) || [])}
        />

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Privacy</p>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={job.redact_address}
                onChange={(e) => update('redact_address', e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Hide exact address</span> – only show the suburb
                publicly.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={job.anonymise}
                onChange={(e) => update('anonymise', e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Anonymise customer details</span> – ensure the
                description does not name the client.
              </span>
            </label>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Visibility</p>
          <div className="flex gap-2">
            <StatusButton
              value="draft"
              label="Draft"
              icon={FileEdit}
              activeClass="bg-yellow-500 text-white border-yellow-500"
            />
            <StatusButton
              value="published"
              label="Published"
              icon={Eye}
              activeClass="bg-green-600 text-white border-green-600"
            />
            <StatusButton
              value="hidden"
              label="Hidden"
              icon={EyeOff}
              activeClass="bg-gray-700 text-white border-gray-700"
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={job.is_featured}
              onChange={(e) => update('is_featured', e.target.checked)}
            />
            <Star className={`w-4 h-4 ${job.is_featured ? 'text-brand-orange fill-brand-orange' : 'text-gray-400'}`} />
            <span className="font-semibold">Feature this job</span>
            <span className="text-xs text-gray-500">— shows first on the public page</span>
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-light text-white rounded-md text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save showcase
        </button>
      </div>
    </div>
  );
};

export default ShowcaseJobForm;
export { emptyJob };
