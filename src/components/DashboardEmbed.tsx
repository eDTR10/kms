// @ts-nocheck
import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';

export default function DashboardEmbed({ title, embedUrl, reportUrl }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
        {reportUrl && (
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#0038A8] dark:text-blue-400 hover:underline font-medium"
          >
            <ExternalLink size={14} />
            Open in Looker Studio
          </a>
        )}
      </div>

      <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md bg-white dark:bg-gray-800"
        style={{ height: '75vh', minHeight: '500px' }}>
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
            <Loader2 className="animate-spin text-[#0038A8] dark:text-blue-400 mb-3" size={40} />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading dashboard...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 z-10 gap-3">
            <p className="text-gray-600 dark:text-gray-300 text-center text-sm max-w-xs">
              The dashboard could not be loaded inline. View it directly in Looker Studio.
            </p>
            {reportUrl && (
              <a
                href={reportUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium hover:bg-[#001a52] transition-colors"
              >
                Open Dashboard
              </a>
            )}
          </div>
        )}
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full border-0"
          allowFullScreen
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      </div>
    </div>
  );
}

