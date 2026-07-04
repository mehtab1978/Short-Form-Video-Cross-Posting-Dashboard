import { useState, useEffect, FormEvent } from 'react';
import { QueueItem, DailyStats, AppConfig } from './types';
import UploadZone from './components/UploadZone';
import DailyLimits from './components/DailyLimits';
import QueueViewer from './components/QueueViewer';
import SettingsViewer from './components/SettingsViewer';
import { 
  Sparkles, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Video,
  ExternalLink,
  Github
} from 'lucide-react';

export default function App() {
  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [postYoutube, setPostYoutube] = useState<boolean>(true);
  const [postInstagram, setPostInstagram] = useState<boolean>(true);
  const [postFacebook, setPostFacebook] = useState<boolean>(false);
  const [scheduleDelayed, setScheduleDelayed] = useState<boolean>(false);
  
  // Schedule parameters (defaulting to current date + time)
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');

  // Queue and Stats state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<DailyStats>({
    youtubeCount: 0,
    metaCount: 0,
    youtubeLimit: 100,
    metaLimit: 30
  });
  const [config, setConfig] = useState<AppConfig & { env: Record<string, string> }>({
    hasYoutubeCredentials: false,
    hasMetaCredentials: false,
    env: {}
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize schedule date/time to now + 5 mins
  useEffect(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    setScheduleDate(`${yyyy}-${mm}-${dd}`);
    setScheduleTime(`${hh}:${min}`);
  }, []);

  // Fetch initial queue, stats, config
  const fetchData = async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        fetch('/api/queue'),
        fetch('/api/stats')
      ]);
      const queueData = await queueRes.json();
      const statsData = await statsRes.json();
      
      setQueue(queueData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to poll queue or statistics:', err);
    }
  };

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      setConfig(configData);
    } catch (err) {
      console.error('Failed to retrieve environment bindings:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchConfig();

    // Setup background interval polling for queue & stats (since back-end loop runs every 3s)
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle deletion of queue item
  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Queue item deleted successfully.');
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to delete queue item.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting queue item.');
    }
  };

  // Handle clearing queue
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear the entire distribution queue? This deletes all files from the server.')) {
      return;
    }
    try {
      const res = await fetch('/api/queue/clear', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('All queue items successfully cleared.');
        fetchData();
      } else {
        setErrorMsg(data.error || 'Failed to clear queue.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error clearing queue.');
    }
  };

  // Handle submission / distribution scheduling
  const handleScheduleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validations
    if (!selectedFile) {
      setErrorMsg('Please upload a video file (.MP4 or .MOV) first.');
      return;
    }

    if (!caption || caption.trim() === '') {
      setErrorMsg('Please enter a description or caption for your video clip.');
      return;
    }

    if (caption.length > 2200) {
      setErrorMsg(`Caption is too long (${caption.length} / 2200). Please shorten it.`);
      return;
    }

    if (!postYoutube && !postInstagram && !postFacebook) {
      setErrorMsg('Please select at least one social media platform to cross-post to.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate schedule timestamp
      let scheduledISO = new Date().toISOString();
      if (scheduleDelayed && scheduleDate && scheduleTime) {
        const targetDate = new Date(`${scheduleDate}T${scheduleTime}`);
        if (targetDate < new Date()) {
          throw new Error('Scheduled date and time cannot be in the past.');
        }
        scheduledISO = targetDate.toISOString();
      }

      // Construct FormData
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('caption', caption);
      formData.append('youtube', postYoutube.toString());
      formData.append('instagram', postInstagram.toString());
      formData.append('facebook', postFacebook.toString());
      formData.append('scheduledFor', scheduledISO);

      const res = await fetch('/api/queue', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to queue distribution job.');
      }

      setSuccessMsg('Video clip successfully scheduled and paced into the active queue grid!');
      
      // Reset form controls
      setSelectedFile(null);
      setCaption('');
      setScheduleDelayed(false);
      
      // Refresh statistics and grid
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while submitting video.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Upper Brand Header */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-base tracking-tight">
                Short-Form Video Cross-Posting Dashboard
              </h1>
              <p className="text-[11px] text-slate-500 font-mono">
                V1.0 • Node.js + Express + React Queue Controller
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200/50 rounded-full text-xs font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Pacing Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Error and Success Toast Alerts */}
        {errorMsg && (
          <div id="app-error-banner" className="mb-6 p-4 bg-red-50 text-red-900 border border-red-200 rounded-2xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-950">Execution Error</p>
              <p className="text-red-800 text-xs leading-relaxed mt-0.5">{errorMsg}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-600 text-xs font-semibold px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div id="app-success-banner" className="mb-6 p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-950">Operational Success</p>
              <p className="text-emerald-800 text-xs leading-relaxed mt-0.5">{successMsg}</p>
            </div>
            <button 
              type="button" 
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-emerald-600 text-xs font-semibold px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bento Grid Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Block: Distribution Form (7 Columns) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="font-display font-semibold text-slate-800 text-sm">
                Schedule & Distribute Short Clip
              </h2>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-6">
              
              {/* File Upload Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Upload Short-Form Media *
                </label>
                <UploadZone
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                />
              </div>

              {/* Caption text area input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="caption-input" className="block text-xs font-semibold text-slate-700">
                    Clip Caption / Description *
                  </label>
                  <span className={`text-[10px] font-mono ${caption.length > 2200 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                    {caption.length} / 2200 characters
                  </span>
                </div>
                <textarea
                  id="caption-input"
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter multi-line captions. Include hashtags #shorts, #reels, #viral to maximize reach..."
                  maxLength={2200}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 placeholder-slate-400 bg-slate-50/20"
                />
              </div>

              {/* Toggle platforms switches */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2.5">
                  Cross-Posting Channels *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* YouTube Toggle */}
                  <label 
                    htmlFor="yt-toggle" 
                    className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      postYoutube 
                        ? 'border-indigo-200 bg-indigo-50/25 text-indigo-950' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                      <span className="text-xs font-semibold">YouTube Shorts</span>
                    </div>
                    <input
                      id="yt-toggle"
                      type="checkbox"
                      checked={postYoutube}
                      onChange={(e) => setPostYoutube(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                    />
                  </label>

                  {/* Instagram Toggle */}
                  <label 
                    htmlFor="ig-toggle" 
                    className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      postInstagram 
                        ? 'border-indigo-200 bg-indigo-50/25 text-indigo-950' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                      <span className="text-xs font-semibold">Instagram Reels</span>
                    </div>
                    <input
                      id="ig-toggle"
                      type="checkbox"
                      checked={postInstagram}
                      onChange={(e) => setPostInstagram(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                    />
                  </label>

                  {/* Facebook Toggle */}
                  <label 
                    htmlFor="fb-toggle" 
                    className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      postFacebook 
                        ? 'border-indigo-200 bg-indigo-50/25 text-indigo-950' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="text-xs font-semibold">Facebook Reels</span>
                    </div>
                    <input
                      id="fb-toggle"
                      type="checkbox"
                      checked={postFacebook}
                      onChange={(e) => setPostFacebook(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Datepicker Scheduling Logic */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">Delayed Distribution Scheduling</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setScheduleDelayed(!scheduleDelayed)}
                    id="delay-toggle-btn"
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      scheduleDelayed 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {scheduleDelayed ? 'Delayed Queue' : 'Post Immediately'}
                  </button>
                </div>

                {scheduleDelayed ? (
                  <div className="grid grid-cols-2 gap-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div>
                      <label htmlFor="schedule-date" className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Publish Date *
                      </label>
                      <input
                        id="schedule-date"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="schedule-time" className="block text-[10px] font-semibold text-slate-500 mb-1">
                        Publish Time *
                      </label>
                      <input
                        id="schedule-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Clip will process immediately. Automatic pacing will assign scheduled timestamp if other uploads are currently active.
                  </p>
                )}
              </div>

              {/* Actions submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                id="submit-content-btn"
                className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/10 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Uploading & Pacing Video Clip...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Schedule & Distribute Content
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Block: Monitoring & Stats (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Limit gauges */}
            <DailyLimits stats={stats} />

            {/* Config panel health */}
            <SettingsViewer 
              config={config} 
              onRefresh={fetchConfig} 
              isLoading={isLoadingConfig} 
            />
          </div>

        </div>

        {/* Operational Grid Queue Viewer Section (Full Width below) */}
        <div className="mt-10">
          <QueueViewer
            items={queue}
            onDelete={handleDeleteItem}
            onClearAll={handleClearAll}
          />
        </div>

      </main>
    </div>
  );
}
