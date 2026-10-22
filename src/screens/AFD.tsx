import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Coins, Landmark, RefreshCw, Search, Wallet, X } from 'lucide-react';
import axios from '../plugin/axios';
import AnimatedNumber from '../components/kpi/AnimatedNumber';

interface BurBreakdown {
  allotment: number;
  obligation: number;
  remaining: number;
  bur: number;
}
interface ClassRow extends BurBreakdown {
  code: string;
  name: string;
}
interface PapRow extends BurBreakdown {
  pap_code: string;
  pap: string;
}
interface MonthRow {
  month: number;
  obligation: number;
  cumulative: number;
}
interface BudgetData {
  year: number;
  as_of: string;
  total_allotment: number;
  total_obligation: number;
  remaining_obligation: number;
  bur: number;
  total_disbursed: number;
  disbursement_rate: number;
  target_bur: number;
  target_date: string;
  by_class: ClassRow[];
  by_pap: PapRow[];
  monthly: MonthRow[];
  options: { class_types: Option[]; fund_sources: Option[]; paps: Option[] };
}
interface Option {
  code: string;
  name: string;
}

const peso = (n: number) =>
  `₱ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compactPeso = (n: number) =>
  `₱${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`;
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NAVY = '#2b2d75';
const NAVY_DEEP = '#1f2060';

/** Circular BUR gauge, drawn in the infographic's navy-on-white ring style. */
function RingGauge({ pct }: { pct: number }) {
  const size = 200;
  const stroke = 38;
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
        <span className="text-3xl font-black" style={{ color: NAVY }}>
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

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: NAVY }} />
    </div>
  );
}

export default function AFD() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [classType, setClassType] = useState('');
  const [fundSource, setFundSource] = useState('');
  const [papCode, setPapCode] = useState('');
  const [throughMonth, setThroughMonth] = useState(0);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    axios
      .get<BudgetData>('kms/budget-utilization/', {
        params: {
          year,
          class_type: classType || undefined,
          fund_source: fundSource || undefined,
          pap_code: papCode || undefined,
          through_month: throughMonth || undefined,
        },
      })
      .then((res) => !cancelled && setData(res.data))
      .catch(() => !cancelled && setError('Could not load budget data from eFAS.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year, classType, fundSource, papCode, throughMonth, reloadKey]);

  const filteredPaps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data.by_pap;
    return data.by_pap.filter((p) => p.pap.toLowerCase().includes(q) || p.pap_code.toLowerCase().includes(q));
  }, [data, search]);

  const filtersActive = !!(classType || fundSource || papCode || throughMonth || search);
  const clearFilters = () => {
    setClassType('');
    setFundSource('');
    setPapCode('');
    setThroughMonth(0);
    setSearch('');
  };
  const selectCls =
    'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0038A8]/40';

  const maxMonth = useMemo(() => Math.max(1, ...(data?.monthly.map((m) => m.obligation) ?? [1])), [data]);
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
  const hasData = !!data && (data.total_allotment > 0 || data.total_obligation > 0);

  return (
    <div className="dark:bg-gray-950 transition-colors duration-300">
      <section className="bg-[#0038A8] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FCD116] dark:text-blue-300 text-sm font-semibold uppercase tracking-wider mb-2">Division</p>
          <h1 className="text-4xl font-black">Administrative & Finance Division</h1>
          <p className="text-white/70 mt-2">Budget utilization, allotments and obligations from the eFAS Registry (RAOD).</p>
        </div>
      </section>

      <div className="h-1 overflow-hidden" aria-hidden="true">
        {loading && <div className="h-full w-1/3 bg-[#FCD116] animate-[afd-slide_1.1s_ease-in-out_infinite]" />}
      </div>
      <style>{`@keyframes afd-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8" aria-busy={loading}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    year === y
                      ? 'bg-[#0038A8] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  FY {y}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#0038A8] dark:hover:text-blue-400 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search program / PAP name or code…"
                className={`${selectCls} w-full pl-9`}
              />
            </div>
            <select value={papCode} onChange={(e) => setPapCode(e.target.value)} className={`${selectCls} max-w-[260px]`} aria-label="Program / PAP">
              <option value="">All programs (PAP)</option>
              {data?.options.paps.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            <select value={classType} onChange={(e) => setClassType(e.target.value)} className={selectCls} aria-label="Expense class">
              <option value="">All expense classes</option>
              {data?.options.class_types.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <select value={fundSource} onChange={(e) => setFundSource(e.target.value)} className={selectCls} aria-label="Fund source">
              <option value="">All fund sources</option>
              {data?.options.fund_sources.map((f) => (
                <option key={f.code} value={f.code}>{f.code} — {f.name}</option>
              ))}
            </select>
            <select value={throughMonth} onChange={(e) => setThroughMonth(Number(e.target.value))} className={selectCls} aria-label="As of month">
              <option value={0}>Whole year</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>Through {m}</option>
              ))}
            </select>
            {filtersActive && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 px-2 py-1.5">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {loading && !data && (
          <div className="space-y-5 animate-pulse" role="status" aria-label="Loading budget data">
            <div className="h-24 rounded-sm bg-gray-200 dark:bg-gray-800" />
            <div className="grid lg:grid-cols-[1fr_2fr] gap-5">
              <div className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-32 rounded-3xl bg-gray-200 dark:bg-gray-800" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!error && !loading && !hasData && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-12 text-center text-gray-500 dark:text-gray-400">
            No RAOD records found for FY {year}.
          </div>
        )}

        {data && hasData && (
          <div className={`space-y-8 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Infographic */}
            <div className="rounded-sm overflow-hidden shadow-md" style={{ background: '#e8eefc' }}>
              <div className="flex flex-wrap items-end justify-between gap-2 px-5 sm:px-8 py-4" style={{ background: '#2b2d5e' }}>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">BUDGET UTILIZATION</h2>
                <p className="text-sm sm:text-base italic font-bold text-white">as of {longDate(data.as_of)}</p>
              </div>

              <div className="p-4 sm:p-8 space-y-5" style={{ background: '#b8cfe8' }}>
                <div className="grid lg:grid-cols-[minmax(240px,1fr)_2fr] gap-5 items-stretch">
                  <div className="flex flex-col items-center justify-center gap-4 py-2">
                    <p className="text-2xl font-black tracking-tight" style={{ color: NAVY_DEEP }}>CURRENT BUR</p>
                    <RingGauge pct={data.bur} />
                  </div>
                  <div className="rounded-[2rem] p-4 sm:p-6 space-y-3" style={{ background: '#1f2060' }}>
                    <MetricRow icon={Landmark} label="Total Allotment:" value={data.total_allotment} />
                    <MetricRow icon={Wallet} label="Total Obligation:" value={data.total_obligation} />
                    <MetricRow icon={Coins} label="Remaining Obligation:" value={data.remaining_obligation} />
                  </div>
                </div>

                <div className="rounded-[2rem] px-5 sm:px-10 py-6 flex flex-wrap items-center justify-between gap-6 text-white" style={{ background: NAVY }}>
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shrink-0" style={{ background: '#b8cfe8', color: '#fff' }}>
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

            {/* Gap to target + disbursement */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Gap to target', value: `${Math.max(0, data.target_bur - data.bur).toFixed(2)} pts`, sub: `Target ${data.target_bur}%` },
                { label: 'Disbursed (cash + non-TRA)', value: compactPeso(data.total_disbursed), sub: `${data.disbursement_rate.toFixed(2)}% of obligations` },
                { label: 'Yet to obligate to reach target', value: compactPeso(Math.max(0, (data.total_allotment * data.target_bur) / 100 - data.total_obligation)), sub: `of ${compactPeso(data.total_allotment)} allotment` },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{k.label}</p>
                  <p className="text-2xl font-black mt-1 text-[#0038A8] dark:text-blue-300">{k.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* By expense class */}
            {data.by_class.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">BUR by Expense Class</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {data.by_class.map((c) => (
                    <div key={c.code} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <p className="font-bold text-gray-800 dark:text-gray-100">{c.code} <span className="font-normal text-gray-500 text-sm">{c.name !== c.code ? c.name : ''}</span></p>
                        <p className="text-xl font-black text-[#0038A8] dark:text-blue-300">{c.bur.toFixed(2)}%</p>
                      </div>
                      <ProgressBar pct={c.bur} />
                      <dl className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between"><dt>Allotment</dt><dd className="tabular-nums">{peso(c.allotment)}</dd></div>
                        <div className="flex justify-between"><dt>Obligation</dt><dd className="tabular-nums">{peso(c.obligation)}</dd></div>
                        <div className="flex justify-between"><dt>Remaining</dt><dd className="tabular-nums">{peso(c.remaining)}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly obligations */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Monthly Obligations</h3>
              <div className="flex items-end gap-2 h-44">
                {data.monthly.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${MONTHS[m.month - 1]}: ${peso(m.obligation)} (cumulative ${peso(m.cumulative)})`}>
                    <span className="text-[10px] text-gray-400 tabular-nums">{m.obligation > 0 ? compactPeso(m.obligation) : ''}</span>
                    <div className="w-full rounded-t" style={{ height: `${(m.obligation / maxMonth) * 100}%`, minHeight: m.obligation > 0 ? 3 : 0, background: NAVY }} />
                    <span className="text-[10px] text-gray-500">{MONTHS[m.month - 1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By PAP */}
            {data.by_pap.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 px-5 pt-5 pb-3">BUR by Program / Activity / Project <span className="text-sm font-normal text-gray-400">({filteredPaps.length})</span></h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-y border-gray-100 dark:border-gray-700">
                        <th className="text-left font-semibold px-5 py-2">PAP</th>
                        <th className="text-right font-semibold px-3 py-2">Allotment</th>
                        <th className="text-right font-semibold px-3 py-2">Obligation</th>
                        <th className="text-right font-semibold px-3 py-2">Remaining</th>
                        <th className="text-left font-semibold px-5 py-2 w-44">BUR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPaps.map((p) => (
                        <tr key={p.pap_code} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <td className="px-5 py-3 text-gray-800 dark:text-gray-100">
                            {p.pap}
                            <span className="block text-xs text-gray-400">{p.pap_code}</span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{peso(p.allotment)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{peso(p.obligation)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{peso(p.remaining)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1"><ProgressBar pct={p.bur} /></div>
                              <span className="text-xs font-semibold tabular-nums w-14 text-right text-gray-700 dark:text-gray-200">{p.bur.toFixed(2)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPaps.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">No programs match “{search}”.</p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Source: eFAS Registry of Allotment, Obligation and Disbursement (RAOD). BUR = total obligation ÷ total allotment.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
