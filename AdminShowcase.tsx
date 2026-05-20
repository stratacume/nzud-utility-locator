import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Star,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  FileEdit,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ShowcaseJobForm, { ShowcaseJob } from '@/components/admin/showcase/ShowcaseJobForm';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { cls: string; label: string; Icon: React.ElementType }> = {
    draft: { cls: 'bg-yellow-100 text-yellow-800', label: 'Draft', Icon: FileEdit },
    published: { cls: 'bg-green-100 text-green-800', label: 'Published', Icon: Eye },
    hidden: { cls: 'bg-gray-200 text-gray-700', label: 'Hidden', Icon: EyeOff },
  };
  const m = map[status] || map.draft;
  const { Icon } = m;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${m.cls}`}
    >
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
};

const AdminShowcase: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ShowcaseJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShowcaseJob | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const { data, error } = await supabase.functions.invoke('manage-showcase-jobs', {
        body: { action: 'list', token },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed');
      setJobs(data.jobs || []);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Could not load showcase jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this showcase job? This also removes its uploaded images.')) return;
    setBusy(id);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const { data, error } = await supabase.functions.invoke('manage-showcase-jobs', {
        body: { action: 'delete', token, id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Delete failed');
      toast({ title: 'Deleted' });
      setJobs((j) => j.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= jobs.length) return;
    const reordered = [...jobs];
    const [item] = reordered.splice(idx, 1);
    reordered.splice(next, 0, item);
    setJobs(reordered);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      await supabase.functions.invoke('manage-showcase-jobs', {
        body: {
          action: 'reorder',
          token,
          ids: reordered.map((j) => j.id),
        },
      });
    } catch (e: any) {
      toast({
        title: 'Reorder failed',
        description: e?.message || 'Could not save order',
        variant: 'destructive',
      });
      fetchJobs();
    }
  };

  const quickStatus = async (job: ShowcaseJob, status: ShowcaseJob['status']) => {
    setBusy(job.id || null);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const { data, error } = await supabase.functions.invoke('manage-showcase-jobs', {
        body: { action: 'update', token, id: job.id, data: { status } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Update failed');
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status } : j)));
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const toggleFeatured = async (job: ShowcaseJob) => {
    setBusy(job.id || null);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const { data, error } = await supabase.functions.invoke('manage-showcase-jobs', {
        body: { action: 'update', token, id: job.id, data: { is_featured: !job.is_featured } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Update failed');
      setJobs((js) =>
        js.map((j) => (j.id === job.id ? { ...j, is_featured: !job.is_featured } : j)),
      );
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const showForm = creating || editing !== null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-brand-navy text-white py-4 px-5 shadow-lg">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-white/10 rounded-lg"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <ImageIcon className="w-6 h-6" />
            <h1 className="text-lg sm:text-xl font-bold">Showcase Jobs</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-light rounded-lg text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-orange" />
            Loading showcase jobs…
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white border border-dashed rounded-xl p-10 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h2 className="font-bold text-brand-navy mb-1">No showcase jobs yet</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add your first job to start populating the public Featured Jobs page.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-orange text-white rounded-md text-sm font-bold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Create showcase job
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, idx) => {
              const cover =
                job.gallery_images?.[0]?.url ||
                job.after_image?.url ||
                job.before_image?.url ||
                null;
              return (
                <div
                  key={job.id}
                  className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col sm:flex-row"
                >
                  <div className="sm:w-40 flex-shrink-0 aspect-video sm:aspect-auto bg-gray-100 relative">
                    {cover ? (
                      <img
                        src={cover}
                        alt={job.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    {job.is_featured && (
                      <span className="absolute top-2 left-2 bg-brand-orange text-white text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" /> Featured
                      </span>
                    )}
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex flex-wrap items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-brand-navy truncate">{job.title}</h3>
                        <p className="text-xs text-gray-500">
                          {job.suburb}
                          {job.service_type ? ` · ${job.service_type}` : ''}
                          {job.completion_date
                            ? ` · ${new Date(job.completion_date).toLocaleDateString('en-NZ')}`
                            : ''}
                        </p>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>

                    {job.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{job.description}</p>
                    )}

                    {job.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {job.tags.map((t) => (
                          <span
                            key={t}
                            className="bg-orange-50 text-brand-orange text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        onClick={() => setEditing(job)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border rounded-md hover:bg-gray-50"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => toggleFeatured(job)}
                        disabled={busy === job.id}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border rounded-md ${
                          job.is_featured
                            ? 'bg-brand-orange text-white border-brand-orange'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${job.is_featured ? 'fill-white' : ''}`} />
                        {job.is_featured ? 'Featured' : 'Feature'}
                      </button>
                      <select
                        value={job.status}
                        onChange={(e) =>
                          quickStatus(job, e.target.value as ShowcaseJob['status'])
                        }
                        disabled={busy === job.id}
                        className="px-2 py-1.5 text-xs border rounded-md bg-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="hidden">Hidden</option>
                      </select>
                      <div className="flex">
                        <button
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 border rounded-l-md hover:bg-gray-50 disabled:opacity-40"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => move(idx, 1)}
                          disabled={idx === jobs.length - 1}
                          className="p-1.5 border-t border-b border-r rounded-r-md hover:bg-gray-50 disabled:opacity-40"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(job.id!)}
                        disabled={busy === job.id}
                        className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <ShowcaseJobForm
            initial={editing}
            onSaved={() => {
              setEditing(null);
              setCreating(false);
              fetchJobs();
            }}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AdminShowcase;
