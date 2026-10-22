import { useEffect, useMemo, useState } from 'react';
import {
  Banknote, CalendarDays, Coins, ExternalLink, Info, Landmark, PiggyBank, RefreshCw, Scale, Search, Wallet, X, FileText,
} from 'lucide-react';
import axios from '../plugin/axios';

const EFAS_URL = 'https://edtr10.github.io/e-fas/';
import AnimatedNumber from '../components/kpi/AnimatedNumber';

/* ───────────── Types (mirror kms/budget.py) ───────────── */
interface MonthRow {
  month: string; // YYYY-MM
  saro: number;
  ntca: number;
  obligated: number;
  gross: number;
}
interface PapRow {
  code: string;
  name: string;
  released: number;
  obligated: number;
  utilization_rate: number;
}
interface BudgetData {
  as_of: string;
  total_saro: number;
  saro_count: number;
  total_ntca: number;
  ntca_count: number;
  ntca_disbursed: number;
  ntca_disbursed_count: number;
  advance_disbursed: number;
  gross_disbursed: number;
  raod_count: number;
  net_disbursed: number;
  tracker_count: number;
  available_balance: number;
  total_obligation: number;
  remaining_obligation: number;
  bur: number;
  target_bur: number;
  target_date: string;
  monthly: MonthRow[];
  pap_performance: PapRow[];
  options: {
    years: number[];
    paps: { code: string; name: string }[];
    saros: string[];
    clusters: { value: string; label: string }[];
  };
}

/* ───────────── Formatting ───────────── */
const compactPeso = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};
const peso = (n: number) =>
  `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

const NAVY = '#2b2d75';
const NAVY_DEEP = '#1f2060';
const BLUE = '#2f6fdd';
const ORANGE = '#e8590c';
const GREEN = '#16a34a';

/* ───────────── Date-range helpers (same behavior as the eFAS filter bar) ───────────── */
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const yearRange = (y: number): [string, string] => [iso(new Date(y, 0, 1)), iso(new Date(y, 11, 31))];
const quarterRange = (y: number, q: number): [string, string] => [
  iso(new Date(y, (q - 1) * 3, 1)),
  iso(new Date(y, (q - 1) * 3 + 3, 0)),
];

/* ───────────── Small presentational pieces ───────────── */
function BurExplainer({ over }: { over: boolean }) {
  return (
    <div className="relative group inline-flex">
      <button
        type="button"
        aria-label="How BUR is computed"
        className={`rounded-full p-1 transition-colors ${over ? 'bg-amber-100 text-amber-700' : 'text-[#2b2d75]/70 hover:text-[#2b2d75]'}`}
      >
        <Info size={18} />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-lg bg-[#1f2060] p-3 text-left text-xs font-normal normal-case leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <p className="font-bold mb-1">BUR = Total Obligation ÷ Total Allotment</p>
        <p>Allotment is the SARO received in the selected period. Obligation is everything obligated in that period.</p>
        {over && (
          <p className="mt-2 text-amber-300">
            Above 100%? Obligations can’t exceed allotments in practice. It means some obligations were charged to allotments not counted here — SAROs received in earlier years, or not yet encoded in Received SARO.
          </p>
        )}
      </div>
    </div>
  );
}

function RingGauge({ pct }: { pct: number }) {
  const size = 220;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(false);
    const f = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(f);
  }, [pct]);
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`BUR ${pct}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f7ff" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={NAVY}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (drawn ? clamped : 0) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="whitespace-nowrap px-2 text-2xl font-black" style={{ color: NAVY }}>
          <AnimatedNumber value={pct} formatter={(v) => `${v.toFixed(2)}%`} />
        </span>
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl px-5 py-3 shadow-sm">
      <div className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#e6ebf8', color: NAVY }}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide" style={{ color: NAVY_DEEP }}>{label}</p>
        <p className="text-xl sm:text-3xl font-black tabular-nums truncate" style={{ color: NAVY_DEEP }}>{peso(value)}</p>
      </div>
    </div>
  );
}

function StatCard({
  title, subtitle, value, count, icon: Icon, caption,
}: {
  title: string;
  subtitle: string;
  value: number;
  count: number | null;
  icon: typeof Wallet;
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">{title}</p>
          <p className="mt-0.5 text-[10px] italic leading-tight text-gray-400">{subtitle}</p>
        </div>
        <span className="p-2 rounded-lg bg-[#0038A8]/10 text-[#0038A8] dark:text-blue-300 shrink-0"><Icon size={18} /></span>
      </div>
      <p className={`text-2xl font-bold ${value < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{compactPeso(value)}</p>
      <div className="mt-auto pt-3 text-xs font-medium">
        {caption ? (
          <p className="text-red-600">{caption}</p>
        ) : count !== null ? (
          <p className="text-gray-700 dark:text-gray-300">{count.toLocaleString()} record{count === 1 ? '' : 's'}</p>
        ) : null}
      </div>
    </div>
  );
}

function ShareBar({
  title, subtitle, totalLabel, total, parts,
}: {
  title: string;
  subtitle: string;
  totalLabel: string;
  total: number;
  parts: { label: string; value: number; color: string }[];
}) {
  const sum = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase text-gray-500">{totalLabel}</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">{compactPeso(total)}</p>
        </div>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mt-4 bg-gray-100 dark:bg-gray-700">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / sum) * 100}%`, background: p.color }} title={`${p.label}: ${compactPeso(p.value)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-gray-600 dark:text-gray-300">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            {p.label} <b className="text-gray-900 dark:text-white">{compactPeso(p.value)}</b>
            <span className="text-gray-400">({((p.value / sum) * 100).toFixed(1)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MonthlyBars({
  title, subtitle, months, series,
}: {
  title: string;
  subtitle: string;
  months: string[];
  series: { label: string; color: string; values: number[] }[];
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-300">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />{s.label}
            </span>
          ))}
        </div>
      </div>
      {months.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">No activity for the selected filters.</p>
      ) : (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          <div className="flex flex-col justify-between h-48 text-[10px] text-gray-400 tabular-nums text-right pr-1">
            {ticks.map((t) => <span key={t}>{compactPeso(max * t)}</span>)}
          </div>
          <div className="flex-1 min-w-[460px]">
            <div className="relative h-48 flex items-end gap-1 border-b border-gray-200 dark:border-gray-700">
              {ticks.slice(0, -1).map((t) => (
                <div key={t} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-700/60" style={{ bottom: `${t * 100}%` }} />
              ))}
              {months.map((m, i) => (
                <div key={m} className="relative flex-1 h-full flex items-end justify-center gap-0.5">
                  {series.map((s) => (
                    <div
                      key={s.label}
                      className="w-full max-w-[14px] rounded-t"
                      style={{ height: `${(s.values[i] / max) * 100}%`, minHeight: s.values[i] > 0 ? 2 : 0, background: s.color }}
                      title={`${monthLabel(m)} · ${s.label}: ${peso(s.values[i])}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {months.map((m) => (
                <span key={m} className="flex-1 text-center text-[10px] text-gray-500">{monthLabel(m)}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Page ───────────── */
const PAP_PAGE = 10;

export default function AFD() {
  const thisYear = new Date().getFullYear();
  const [initialFrom, initialTo] = yearRange(thisYear);

  const [year, setYear] = useState<string>(String(thisYear));
  const [quarter, setQuarter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [cluster, setCluster] = useState('');
  const [saroNo, setSaroNo] = useState('');
  const [papCode, setPapCode] = useState('');
  const [search, setSearch] = useState('');
  const [papLimit, setPapLimit] = useState(PAP_PAGE);

  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  // Dropdown options come from the first (unfiltered-by-dropdown) response and stay put.
  const options = data?.options;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    axios
      .get<BudgetData>('kms/budget-utilization/', {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          cluster: cluster || undefined,
          saro_no: saroNo || undefined,
          pap_code: papCode || undefined,
        },
      })
      .then((res) => {
        if (cancelled) return;
        // An older deployed backend answers with a different shape — say so instead of crashing.
        const d = res.data;
        if (!d || !Array.isArray(d.monthly) || !Array.isArray(d.pap_performance) || !Array.isArray(d.options?.clusters)) {
          setData(null);
          setError('The eFAS server is running an older version of the budget endpoint. Restart or redeploy it, then refresh.');
          return;
        }
        setData(d);
      })
      .catch(() => !cancelled && setError('Could not load budget data from eFAS.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, cluster, saroNo, papCode, reloadKey]);

  const pickYear = (y: string) => {
    setYear(y);
    setQuarter('all');
    if (y === 'all') {
      setDateFrom('');
      setDateTo('');
    } else {
      const [f, t] = yearRange(Number(y));
      setDateFrom(f);
      setDateTo(t);
    }
  };
  const pickQuarter = (q: string) => {
    setQuarter(q);
    if (q === 'all') {
      pickYear(year);
      return;
    }
    const y = year !== 'all' ? Number(year) : options?.years[0] ?? thisYear;
    setYear(String(y));
    const [f, t] = quarterRange(y, Number(q));
    setDateFrom(f);
    setDateTo(t);
  };
  const manualDate = (which: 'from' | 'to', v: string) => {
    setYear('all');
    setQuarter('all');
    (which === 'from' ? setDateFrom : setDateTo)(v);
  };
  const filtersActive = year !== 'all' || quarter !== 'all' || !!(dateFrom || dateTo || cluster || saroNo || papCode || search);
  const clearFilters = () => {
    setYear('all');
    setQuarter('all');
    setDateFrom('');
    setDateTo('');
    setCluster('');
    setSaroNo('');
    setPapCode('');
    setSearch('');
  };

  const filteredPaps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data?.pap_performance ?? [];
    return q ? rows.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : rows;
  }, [data, search]);
  useEffect(() => setPapLimit(PAP_PAGE), [search, data]);

  const control =
    'w-full min-w-0 lg:w-auto lg:flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/40';
  const hasData = !!data && (data.total_saro > 0 || data.total_ntca > 0 || data.total_obligation > 0 || data.gross_disbursed > 0);
  const months = data?.monthly.map((m) => m.month) ?? [];

  return (
    <div className="dark:bg-gray-950 transition-colors duration-300">
      <section className="bg-[#0038A8] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FCD116] dark:text-blue-300 text-sm font-semibold uppercase tracking-wider mb-2">Division</p>
          <h1 className="text-3xl sm:text-4xl font-black">Administrative & Finance Division</h1>
          <p className="text-white/70 mt-2">Budget utilization, SARO, NTCA and disbursements from eFAS.</p>
        </div>
      </section>

      <div className="h-1 overflow-hidden" aria-hidden="true">
        {loading && <div className="h-full w-1/3 bg-[#FCD116] animate-[afd-slide_1.1s_ease-in-out_infinite]" />}
      </div>
      <style>{`@keyframes afd-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8" aria-busy={loading}>
        {/* Filters — same set as the eFAS dashboard, plus search */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:flex lg:flex-nowrap lg:items-center">
            <select value={year} onChange={(e) => pickYear(e.target.value)} className={control} aria-label="Year">
              <option value="all">All Years</option>
              {Array.from(new Set([thisYear, ...(options?.years ?? [])])).sort((a, b) => b - a).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={quarter} onChange={(e) => pickQuarter(e.target.value)} className={control} aria-label="Quarter">
              <option value="all">All Quarters</option>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => manualDate('from', e.target.value)} className={control} aria-label="From date" />
            <span className="hidden lg:inline shrink-0 text-xs text-gray-500">to</span>
            <input type="date" value={dateTo} onChange={(e) => manualDate('to', e.target.value)} className={control} aria-label="To date" />
            <select value={cluster} onChange={(e) => setCluster(e.target.value)} className={control} aria-label="Fund cluster">
              <option value="">All Clusters</option>
              {options?.clusters?.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={saroNo} onChange={(e) => setSaroNo(e.target.value)} className={control} aria-label="SARO">
              <option value="">All SAROs</option>
              {options?.saros?.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={papCode} onChange={(e) => setPapCode(e.target.value)} className={`${control} col-span-2 sm:col-span-1`} aria-label="PAP / Project">
              <option value="">All PAP / Projects</option>
              {options?.paps?.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-4 lg:col-auto lg:shrink-0 lg:gap-3">
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  title="Clear filters"
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600"
                >
                  <X size={14} /> <span className="lg:sr-only">Clear</span>
                </button>
              )}
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={loading}
                title="Refresh"
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 disabled:opacity-60"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="lg:sr-only">{loading ? 'Loading…' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {loading && !data && (
          <div className="space-y-5 animate-pulse" role="status" aria-label="Loading budget data">
            <div className="h-24 rounded-sm bg-gray-200 dark:bg-gray-800" />
            <div className="grid lg:grid-cols-[1fr_2fr] gap-5">
              <div className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-800" />)}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!error && !loading && data && !hasData && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-12 text-center text-gray-500 dark:text-gray-400">
            No records match the selected filters.
          </div>
        )}

        {data && hasData && (
          <div className={`space-y-8 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* BUR infographic */}
            <div className="rounded-sm overflow-hidden shadow-md" style={{ background: '#e8eefc' }}>
              <div className="flex flex-wrap items-end justify-between gap-2 px-5 sm:px-8 py-4" style={{ background: '#2b2d5e' }}>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">BUDGET UTILIZATION</h2>
                <p className="text-sm sm:text-base italic font-bold text-white">as of {longDate(data.as_of)}</p>
              </div>
              <div className="p-4 sm:p-8 space-y-5" style={{ background: '#b8cfe8' }}>
                <div className="grid lg:grid-cols-[minmax(240px,1fr)_2fr] gap-5 items-stretch">
                  <div className="flex flex-col items-center justify-center gap-4 py-2">
                    <p className="flex items-center gap-1 text-2xl font-black tracking-tight" style={{ color: NAVY_DEEP }}>
                      CURRENT BUR <BurExplainer over={data.bur > 100} />
                    </p>
                    <RingGauge pct={data.bur} />
                    {data.bur > 100 && (
                      <p className="max-w-[260px] rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                        Over 100%: obligations include allotments not counted in this period’s SARO total (e.g. carried over from earlier years).
                      </p>
                    )}
                  </div>
                  <div className="rounded-[2rem] p-4 sm:p-6 space-y-3" style={{ background: '#1f2060' }}>
                    <MetricRow icon={Landmark} label="Total Allotment:" value={data.total_saro} />
                    <MetricRow icon={Wallet} label="Total Obligation:" value={data.total_obligation} />
                    <MetricRow icon={Coins} label="Remaining Obligation:" value={data.remaining_obligation} />
                  </div>
                </div>
                <div className="rounded-[2rem] px-5 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-6 text-white" style={{ background: NAVY }}>
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: '#b8cfe8' }}>
                      <CalendarDays size={44} />
                    </div>
                    <p className="text-2xl sm:text-4xl font-black leading-tight uppercase">
                      Target BUR by<br />{longDate(data.target_date)}
                    </p>
                  </div>
                  <p className="text-5xl sm:text-7xl font-black">{data.target_bur}%</p>
                </div>
              </div>
            </div>

            {/* eFAS stat cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
              <StatCard title="Total SARO" subtitle='Received SARO sheet: "AMOUNT"' value={data.total_saro} count={data.saro_count} icon={FileText} />
              <StatCard title="Total Received NTCA (Accounting)" subtitle='Received NTCA sheet: "NTCA AMOUNT"' value={data.total_ntca} count={data.ntca_count} icon={Landmark} />
              <StatCard
                title="NTCA Disbursed (Cashiering)"
                subtitle='Custom Disbursement sheet: "ADA" + "AMOUNT"'
                value={data.ntca_disbursed}
                count={data.ntca_disbursed_count}
                icon={Wallet}
                caption={data.advance_disbursed > 0 ? `incl. ${compactPeso(data.advance_disbursed)} advance (no NTCA yet)` : undefined}
              />
              <StatCard title="Total Disbursed (Gross)" subtitle='RAOD sheet: "Cash" + "Non TRA"' value={data.gross_disbursed} count={data.raod_count} icon={Scale} />
              <StatCard title="Total Disbursed (Net)" subtitle='Disbursement Tracker sheet: "NET"' value={data.net_disbursed} count={data.tracker_count} icon={Banknote} />
              <StatCard title="Available Balance" subtitle="Received NTCA minus Cashiering and Net disbursed (computed)" value={data.available_balance} count={null} icon={PiggyBank} />
            </div>

            {/* Share bars */}
            <div className="grid lg:grid-cols-2 gap-4">
              <ShareBar
                title="NTCA Received vs Not Received"
                subtitle="Share of Total SARO covered by an NTCA so far, for the selected filters"
                totalLabel="Total SARO"
                total={data.total_saro}
                parts={[
                  { label: 'NTCA Received', value: Math.min(data.total_ntca, data.total_saro), color: ORANGE },
                  { label: 'NTCA Not Received', value: Math.max(data.total_saro - data.total_ntca, 0), color: BLUE },
                ]}
              />
              <ShareBar
                title="NTCA Received vs NTCA Disbursed"
                subtitle="Share of Total NTCA Received already disbursed via Cashiering vs what's still remaining"
                totalLabel="Total NTCA Received"
                total={data.total_ntca}
                parts={[
                  { label: 'NTCA Disbursed', value: data.ntca_disbursed, color: GREEN },
                  { label: 'Remaining NTCA Balance', value: Math.max(data.total_ntca - data.ntca_disbursed, 0), color: BLUE },
                ]}
              />
            </div>

            {/* Monthly charts */}
            <div className="grid lg:grid-cols-2 gap-4">
              <MonthlyBars
                title="SARO vs NTCA"
                subtitle="Allotment received vs cash allocation released, per month"
                months={months}
                series={[
                  { label: 'SARO', color: BLUE, values: data.monthly.map((m) => m.saro) },
                  { label: 'NTCA', color: ORANGE, values: data.monthly.map((m) => m.ntca) },
                ]}
              />
              <MonthlyBars
                title="Obligated vs Disbursed (Gross)"
                subtitle="RAOD obligated amount vs cash & non-TRA disbursed, per month"
                months={months}
                series={[
                  { label: 'Obligated', color: BLUE, values: data.monthly.map((m) => m.obligated) },
                  { label: 'Disbursed (Gross)', color: GREEN, values: data.monthly.map((m) => m.gross) },
                ]}
              />
            </div>

            {/* PAP / Project performance */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    PAP / Project Performance <span className="text-sm font-normal text-gray-400">({filteredPaps.length})</span>
                  </h3>
                  <p className="text-xs text-gray-500">Released = SARO allotment · Obligated = RAOD · Utilization = Obligated ÷ Released</p>
                </div>
                <a
                  href={EFAS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0038A8] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#002f8c] transition-colors"
                >
                  View all <ExternalLink size={14} />
                </a>
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search PAP name or code…"
                    className={`${control} w-full pl-9`}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-y border-gray-100 dark:border-gray-700">
                      <th className="text-left font-semibold px-5 py-2">PAP / Project</th>
                      <th className="text-right font-semibold px-3 py-2">Released</th>
                      <th className="text-right font-semibold px-3 py-2">Obligated</th>
                      <th className="text-left font-semibold px-5 py-2 w-48">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaps.slice(0, papLimit).map((p) => (
                      <tr key={p.code} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                          {p.name}
                          <span className="block text-xs text-gray-400">{p.code}</span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-gray-600 dark:text-gray-300">{peso(p.released)}</td>
                        <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-gray-600 dark:text-gray-300">{peso(p.obligated)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.utilization_rate)}%`, background: NAVY }} />
                            </div>
                            <span className="text-xs font-semibold tabular-nums w-14 text-right text-gray-700 dark:text-gray-200">{p.utilization_rate.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPaps.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">
                    {search ? `No PAP matches “${search}”.` : 'No PAP records for the selected filters.'}
                  </p>
                )}
              </div>
              {filteredPaps.length > papLimit && (
                <button
                  onClick={() => setPapLimit((n) => n + PAP_PAGE)}
                  className="w-full py-3 text-sm font-medium text-[#0038A8] dark:text-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700"
                >
                  Show more ({filteredPaps.length - papLimit} remaining)
                </button>
              )}
            </div>

            <div className="flex justify-center">
              <a
                href={EFAS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#0038A8] px-5 py-2.5 text-sm font-semibold text-[#0038A8] dark:text-blue-300 dark:border-blue-400 hover:bg-[#0038A8] hover:text-white transition-colors"
              >
                View all in eFAS <ExternalLink size={14} />
              </a>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Source: eFAS. Figures follow the eFAS dashboard. BUR = RAOD total obligation ÷ Total SARO.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
