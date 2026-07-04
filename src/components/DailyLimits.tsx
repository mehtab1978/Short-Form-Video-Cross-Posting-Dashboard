import { DailyStats } from '../types';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface DailyLimitsProps {
  stats: DailyStats;
}

export default function DailyLimits({ stats }: DailyLimitsProps) {
  const youtubePercent = Math.min((stats.youtubeCount / stats.youtubeLimit) * 100, 100);
  const metaPercent = Math.min((stats.metaCount / stats.metaLimit) * 100, 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (percent: number) => {
    if (percent >= 100) return 'text-red-700 font-bold';
    if (percent >= 80) return 'text-amber-700 font-semibold';
    return 'text-emerald-700 font-semibold';
  };

  return (
    <div id="daily-limits-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center gap-2.5 mb-5 border-b border-slate-100 pb-3.5">
        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-slate-800 text-sm">
            24H Safety Safeguards
          </h2>
          <p className="text-xs text-slate-500">
            Real-time rate-limit monitors preventing developer credential bans
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* YouTube Limits */}
        <div id="limit-yt">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              YouTube Data API Limits
            </span>
            <span className="text-xs font-mono">
              <span className={getTextColor(youtubePercent)}>{stats.youtubeCount}</span>
              <span className="text-slate-400"> / {stats.youtubeLimit} daily</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getProgressColor(youtubePercent)}`}
              style={{ width: `${youtubePercent}%` }}
            ></div>
          </div>
        </div>

        {/* Meta Limits */}
        <div id="limit-meta">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Meta Page & IG Reels API
            </span>
            <span className="text-xs font-mono">
              <span className={getTextColor(metaPercent)}>{stats.metaCount}</span>
              <span className="text-slate-400"> / {stats.metaLimit} daily</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getProgressColor(metaPercent)}`}
              style={{ width: `${metaPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Warnings & Threshold Policies */}
      {(stats.youtubeCount >= 80 || stats.metaCount >= 24) ? (
        <div className="mt-5 p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs animate-pulse">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Nearing Operational Throttle</p>
            <p className="text-amber-800 leading-relaxed mt-0.5">
              You are approaching the strict API safety limits. The dashboard will block additional uploads until the 24-hour moving window clears to avoid permanent developer account bans.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 p-3.5 bg-indigo-50/50 text-indigo-950 border border-indigo-100/50 rounded-xl flex items-start gap-2.5 text-xs">
          <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-indigo-600 mt-0.5" />
          <p className="leading-relaxed text-slate-600">
            Active 24-hour sliding safety windows prevent spamming. Submitted clips are automatically paced <strong className="text-indigo-900">5 minutes apart</strong> to avoid account throttling on YouTube and Meta platforms.
          </p>
        </div>
      )}
    </div>
  );
}
