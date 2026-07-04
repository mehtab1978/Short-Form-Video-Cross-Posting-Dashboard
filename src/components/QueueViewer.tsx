import { useState, useEffect } from 'react';
import { QueueItem } from '../types';
import { 
  Play, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Terminal, 
  X, 
  Globe, 
  Sparkles,
  Calendar
} from 'lucide-react';

interface QueueViewerProps {
  items: QueueItem[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function QueueViewer({ items, onDelete, onClearAll }: QueueViewerProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [activeLogItemId, setActiveLogItemId] = useState<string | null>(null);
  const [logPercent, setLogPercent] = useState<number>(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState<boolean>(false);

  // Poll logs for the active modal item
  useEffect(() => {
    if (!activeLogItemId) return;

    let intervalId: NodeJS.Timeout;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/logs/${activeLogItemId}`);
        const data = await res.json();
        setLogPercent(data.percent);
        setLogMessages(data.logs || []);
        
        // Stop polling if fully completed
        if (data.percent >= 100) {
          setIsPollingLogs(false);
        }
      } catch (err) {
        console.error('Error fetching logs:', err);
      }
    };

    fetchLogs();
    setIsPollingLogs(true);
    intervalId = setInterval(fetchLogs, 1500);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeLogItemId]);

  const getStatusBadge = (status: QueueItem['status'][keyof QueueItem['status']], error?: string) => {
    switch (status) {
      case 'idle':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-100 rounded-full">
            Not Targeted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200/50 rounded-full animate-pulse">
            <Clock className="w-3 h-3" /> Scheduled
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200/50 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" /> Cross-Posting
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/50 rounded-full">
            <CheckCircle className="w-3 h-3" /> Published
          </span>
        );
      case 'failed':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200/50 rounded-full cursor-help group relative"
            title={error || 'Publishing error'}
          >
            <AlertCircle className="w-3 h-3" /> Failed
            {error && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-md z-10 font-sans leading-relaxed">
                {error}
              </span>
            )}
          </span>
        );
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* List Header */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
        <div>
          <h2 className="font-display font-semibold text-slate-800 text-sm">
            Operational Queue & Distribution Grid
          </h2>
          <p className="text-xs text-slate-500">
            {items.length} clips scheduled or published
          </p>
        </div>
        
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            id="clear-all-queue-btn"
            className="px-3.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-xl shadow-xs transition-colors"
          >
            Clear Grid
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div id="queue-empty-state" className="border border-slate-100 bg-white/50 rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-slate-700 font-medium text-sm">Queue is empty</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Drag-and-drop a clip above and select your target platforms to queue your first distribution job.
          </p>
        </div>
      ) : (
        <div id="queue-grid-list" className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-xs hover:border-slate-300"
            >
              {/* Card Title & Basic Info */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 bg-slate-50 text-indigo-600 rounded-xl border border-slate-100">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate max-w-xs md:max-w-lg">
                      {item.originalName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>{formatSize(item.size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Scheduled for: {formatDate(item.scheduledFor)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedVideo(item.filename)}
                    id={`preview-btn-${item.id}`}
                    className="p-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Preview Clip
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLogItemId(item.id)}
                    id={`logs-btn-${item.id}`}
                    className="p-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" /> Log Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    id={`delete-btn-${item.id}`}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Caption Section */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {item.caption}
                </p>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* YouTube */}
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    <span className="text-xs font-medium text-slate-600">YouTube Shorts</span>
                  </div>
                  <div>{getStatusBadge(item.status.youtube, item.errors.youtube)}</div>
                </div>

                {/* Instagram */}
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                    <span className="text-xs font-medium text-slate-600">Instagram Reels</span>
                  </div>
                  <div>{getStatusBadge(item.status.instagram, item.errors.instagram)}</div>
                </div>

                {/* Facebook */}
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span className="text-xs font-medium text-slate-600">Facebook Reels</span>
                  </div>
                  <div>{getStatusBadge(item.status.facebook, item.errors.facebook)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div id="video-preview-modal" className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-semibold text-slate-800 text-sm">Video Clip Preview</h3>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                id="close-video-modal-btn"
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={`/uploads/${selectedVideo}`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Execution Logs Modal */}
      {activeLogItemId && (
        <div id="logs-modal" className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-950 text-slate-100 rounded-2xl overflow-hidden max-w-2xl w-full border border-slate-800 shadow-2xl relative flex flex-col h-[500px] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="font-display font-semibold text-sm">
                  Active Distribution stdout Terminal Logs
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogItemId(null)}
                id="close-logs-modal-btn"
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress indicator */}
            <div className="bg-slate-900 p-3 shrink-0 flex items-center justify-between border-b border-slate-800/60 text-xs font-mono">
              <span className="flex items-center gap-2">
                {logPercent < 100 ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 text-indigo-400 animate-spin" />
                    <span>Processing & cross-posting active pipeline...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    <span>Cross-posting pipeline finished.</span>
                  </>
                )}
              </span>
              <span className="text-indigo-400 font-semibold">{logPercent}% complete</span>
            </div>

            <div className="w-full bg-slate-800 h-1.5 shrink-0">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${logPercent}%` }}
              />
            </div>

            {/* Scrollable logs terminal */}
            <div className="p-4 overflow-y-auto font-mono text-xs space-y-1.5 flex-1 bg-slate-950/90 text-slate-300 scrollbar-thin">
              {logMessages.map((msg, idx) => {
                let colorClass = 'text-slate-300';
                if (msg.includes('[ERROR]')) colorClass = 'text-red-400 font-medium';
                if (msg.includes('SUCCESS') || msg.includes('published') || msg.includes('created')) colorClass = 'text-emerald-400 font-semibold';
                if (msg.includes('[SIMULATION')) colorClass = 'text-amber-400 font-medium italic';
                if (msg.includes('Step')) colorClass = 'text-indigo-300 font-semibold';

                return (
                  <div key={idx} className={`${colorClass} leading-relaxed`}>
                    <span className="text-slate-600 mr-2">[{idx + 1}]</span>
                    {msg}
                  </div>
                );
              })}
              {isPollingLogs && (
                <div className="text-indigo-400 text-[11px] italic mt-2 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  Listening for streaming terminal logs...
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-center shrink-0">
              <p className="text-[10px] text-slate-500 leading-normal">
                Credentials not present? Real pipelines revert to simulated sandboxes automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
