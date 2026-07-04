import { Shield, Sparkles, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { AppConfig } from '../types';

interface SettingsViewerProps {
  config: AppConfig & { env: Record<string, string> };
  onRefresh: () => void;
  isLoading: boolean;
}

export default function SettingsViewer({ config, onRefresh, isLoading }: SettingsViewerProps) {
  const isYoutubeConfigured = config.hasYoutubeCredentials;
  const isMetaConfigured = config.hasMetaCredentials;

  return (
    <div id="settings-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-slate-800 text-sm">
              API Integration Health
            </h2>
            <p className="text-xs text-slate-500">
              Check real-world environment bindings and SDK state
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          id="refresh-config-btn"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200/50 rounded-xl transition-all disabled:opacity-50"
          title="Refresh Config"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {/* YouTube Status Card */}
        <div className={`p-4 rounded-xl border ${isYoutubeConfigured ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isYoutubeConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              YouTube Data API (upload)
            </span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${isYoutubeConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              {isYoutubeConfigured ? 'Live Integration' : 'Sandbox Simulator'}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-normal mt-2">
            {isYoutubeConfigured ? (
              <span className="text-slate-600">
                Connected using <strong className="font-mono text-[11px] text-slate-700">{config.env?.youtubeClientId}</strong>. Uploads will execute via real resumable streams.
              </span>
            ) : (
              <span>
                Missing <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">YOUTUBE_CLIENT_ID</code> and refresh tokens. Runs on high-fidelity simulation.
              </span>
            )}
          </p>
        </div>

        {/* Meta Status Card */}
        <div className={`p-4 rounded-xl border ${isMetaConfigured ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isMetaConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              Meta Page & IG Reels API
            </span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${isMetaConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              {isMetaConfigured ? 'Live Integration' : 'Sandbox Simulator'}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-normal mt-2">
            {isMetaConfigured ? (
              <span className="text-slate-600">
                Connected. Target FB Page ID: <strong className="font-mono text-[11px] text-slate-700">{config.env?.facebookPageId || 'None'}</strong>, IG Business ID: <strong className="font-mono text-[11px] text-slate-700">{config.env?.instagramBusinessId || 'None'}</strong>.
              </span>
            ) : (
              <span>
                Missing <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">FACEBOOK_ACCESS_TOKEN</code>. Falling back to simulated Graph API containers.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 p-3.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-xl flex items-start gap-2.5 text-[11px] leading-relaxed">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-slate-800">Switching from Simulator to Live API</p>
          <p className="mt-0.5 text-slate-500">
            Define client credentials in your secrets panel. Create a <code className="bg-slate-200/60 px-1 rounded">.env</code> file based on <code className="bg-slate-200/60 px-1 rounded">.env.template</code> with your real tokens to trigger live uploads.
          </p>
        </div>
      </div>
    </div>
  );
}
