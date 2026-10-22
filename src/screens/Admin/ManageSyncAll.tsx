// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import api from '../../services/api';
import { syncProjectDatasetSheet } from '../../services/projects';
import { KMS_PROJECTS } from '../../constants/kmsProjects';

// Business Permit (eLGU) tables are synced from their own API with a date range — they are
// not sheet syncs, so they are left out of this page and of its progress bar entirely.
const isBpDataset = (d) => !!(d.bp_sync_start_date || d.bp_synced_at);
const isSheetDataset = (d) => !!d.sheet_url && !isBpDataset(d);

// Google Sheets allows ~60 reads per minute and each table sync uses a few, so tables are spaced
// out, and a "quota exceeded" (429) answer waits for the minute to reset, then retries.
const GAP_MS = 3500;
const RATE_WAIT_S = 65;
const MAX_ATTEMPTS = 4;
const isRateLimit = (msg) => /429|quota|rate.?limit/i.test(String(msg || ''));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatWhen = (iso) => {
  if (!iso) return 'Never synced';
  const d = new Date(iso);
  return isNaN(d) ? 'Never synced' : `Synced ${d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
};

function ProgressBar({ done, total, failed = 0 }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${failed ? 'bg-amber-500' : 'bg-[#0038A8]'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{done} of {total} synced · {pct}%{failed ? ` · ${failed} failed` : ''}</p>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'syncing') return <Loader2 size={15} className="animate-spin text-[#0038A8]" />;
  if (status === 'done') return <CheckCircle2 size={15} className="text-emerald-500" />;
  if (status === 'failed') return <XCircle size={15} className="text-red-500" />;
  if (status === 'waiting') return <Clock size={15} className="text-amber-500" />;
  if (status === 'queued') return <Clock size={15} className="text-gray-400" />;
  return <span className="w-[15px]" />;
}

export default function ManageSyncAll() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // { [datasetId]: 'queued' | 'syncing' | 'done' | 'failed' } and any error text per dataset.
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const load = async () => {
    try {
      const { data } = await api.get('kms/project-datasets/');
      setDatasets(data.results ?? data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load datasets.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => KMS_PROJECTS
    .map((p) => ({ project: p, items: datasets.filter((d) => d.office === p.officeId && isSheetDataset(d)) }))
    .filter((g) => g.items.length), [datasets]);

  const allItems = groups.flatMap((g) => g.items);
  const countDone = (items) => items.filter((d) => status[d.id] === 'done').length;
  const countFailed = (items) => items.filter((d) => status[d.id] === 'failed').length;

  const runSync = async (items) => {
    if (running || !items.length) return;
    if (!confirm(`Sync ${items.length} table(s) now? Each table's rows are replaced with what is currently in its sheet.`)) return;
    cancelRef.current = false;
    setRunning(true);
    setStatus((s) => ({ ...s, ...Object.fromEntries(items.map((d) => [d.id, 'queued'])) }));
    setErrors((e) => { const n = { ...e }; items.forEach((d) => delete n[d.id]); return n; });
    let first = true;
    for (const d of items) {
      if (cancelRef.current) break;
      if (!first) await sleep(GAP_MS);
      first = false;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS && !cancelRef.current; attempt++) {
        setStatus((s) => ({ ...s, [d.id]: 'syncing' }));
        setErrors((e) => { const n = { ...e }; delete n[d.id]; return n; });
        try {
          await syncProjectDatasetSheet(d.id);
          setStatus((s) => ({ ...s, [d.id]: 'done' }));
          // Show the new sync time right away (the server stamps the same moment).
          setDatasets((list) => list.map((x) => (x.id === d.id ? { ...x, sheet_synced_at: new Date().toISOString() } : x)));
          break;
        } catch (err) {
          const msg = err?.response?.data?.error || err.message || 'Sync failed';
          if (isRateLimit(msg) && attempt < MAX_ATTEMPTS) {
            // Google's per-minute read quota is used up — wait it out, then retry this table.
            setStatus((s) => ({ ...s, [d.id]: 'waiting' }));
            for (let left = RATE_WAIT_S; left > 0 && !cancelRef.current; left--) {
              setErrors((e) => ({ ...e, [d.id]: `Google's rate limit reached — retrying in ${left}s…` }));
              await sleep(1000);
            }
            continue;
          }
          setStatus((s) => ({ ...s, [d.id]: 'failed' }));
          setErrors((e) => ({ ...e, [d.id]: isRateLimit(msg) ? 'Google rate limit — try again in a minute.' : msg }));
          break;
        }
      }
    }
    // Anything still queued (stopped early) goes back to idle.
    setStatus((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== 'queued')));
    setRunning(false);
    load();
  };

  const runItems = allItems.filter((d) => status[d.id]);
  const totalForBar = running || runItems.length ? runItems.length || allItems.length : allItems.length;
  const barItems = runItems.length ? runItems : allItems;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Sync Data</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Refresh every sheet-linked table, project by project. Business Permit data is synced from its own page and isn't counted here.</p>
        </div>
        <div className="flex gap-2">
          {running && (
            <button onClick={() => { cancelRef.current = true; }} className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Stop</button>
          )}
          <button onClick={() => runSync(allItems)} disabled={running || !allItems.length}
            className="flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-medium disabled:opacity-50">
            <RefreshCw size={14} className={running ? 'animate-spin' : ''} /> {running ? 'Syncing…' : 'Sync all projects'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : !groups.length ? (
        <p className="text-sm text-gray-400">No sheet-linked tables yet. Link a table to a Google Sheet on a project's Datasets tab.</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Overall progress</p>
            <ProgressBar done={countDone(barItems)} total={barItems.length} failed={countFailed(barItems)} />
          </div>

          <div className="space-y-4">
            {groups.map(({ project, items }) => (
              <div key={project.slug} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{project.label}</h3>
                    <div className="mt-2 max-w-sm"><ProgressBar done={countDone(items)} total={items.length} failed={countFailed(items)} /></div>
                  </div>
                  <button onClick={() => runSync(items)} disabled={running}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0038A8]/10 text-[#0038A8] dark:text-blue-300 hover:bg-[#0038A8]/20 disabled:opacity-50">
                    <RefreshCw size={12} /> Sync project
                  </button>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                      <StatusIcon status={status[d.id]} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{d.name}</p>
                        <p className={`text-xs truncate ${errors[d.id] ? (status[d.id] === 'waiting' ? 'text-amber-600' : 'text-red-500') : 'text-gray-400'}`}>{errors[d.id] || formatWhen(d.sheet_synced_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
