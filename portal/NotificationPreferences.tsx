import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferencesProps {
  customerEmail: string;
}

interface Preferences {
  booking_confirmations: boolean;
  booking_reminders: boolean;
  booking_updates: boolean;
  marketing_emails: boolean;
  sms_notifications: boolean;
}

const defaultPreferences: Preferences = {
  booking_confirmations: true,
  booking_reminders: true,
  booking_updates: true,
  marketing_emails: false,
  sms_notifications: false,
};

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ customerEmail }) => {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, [customerEmail]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('customer_email', customerEmail.toLowerCase())
        .single();
      if (data) setPreferences(data);
    } catch (err) {
      // Use defaults if no preferences exist
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('notification_preferences').upsert({
        customer_email: customerEmail.toLowerCase(),
        ...preferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'customer_email' });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: 'Preferences Saved', description: 'Your notification preferences have been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = (key: keyof Preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-orange" /></div>;
  }

  const options = [
    { key: 'booking_confirmations' as const, icon: Mail, label: 'Booking Confirmations', desc: 'Receive email when booking is confirmed' },
    { key: 'booking_reminders' as const, icon: Calendar, label: 'Booking Reminders', desc: 'Get reminded 24 hours before your appointment' },
    { key: 'booking_updates' as const, icon: Bell, label: 'Booking Updates', desc: 'Notifications for reschedules and cancellations' },
    { key: 'marketing_emails' as const, icon: Mail, label: 'Promotional Emails', desc: 'Special offers and company news' },
    { key: 'sms_notifications' as const, icon: MessageSquare, label: 'SMS Notifications', desc: 'Text message reminders (charges may apply)' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-orange/10 rounded-lg"><Bell className="w-5 h-5 text-brand-orange" /></div>
        <div><h3 className="font-semibold text-gray-900">Notification Preferences</h3><p className="text-sm text-gray-500">Manage how we contact you</p></div>
      </div>
      <div className="space-y-4">
        {options.map(({ key, icon: Icon, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-gray-400" />
              <div><p className="font-medium text-gray-900">{label}</p><p className="text-sm text-gray-500">{desc}</p></div>
            </div>
            <button onClick={() => togglePreference(key)} className={`relative w-12 h-6 rounded-full transition-colors ${preferences[key] ? 'bg-brand-orange' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences[key] ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={savePreferences} disabled={isSaving} className="mt-6 w-full py-3 bg-brand-navy text-white rounded-lg font-medium hover:bg-brand-navy/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : 'Save Preferences'}
      </button>
    </div>
  );
};

export default NotificationPreferences;
