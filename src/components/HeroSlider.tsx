// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Award as AwardIcon, Image as ImageIcon } from 'lucide-react';
import { getAwards } from '../services/awards';
import { getHighlights } from '../services/highlights';
import './HeroSlider.css';
import mindanaoSvgUrl from './../assets/maps/ph.svg';

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */

const MINDANAO_IDS = ['PH09', 'PH10', 'PH11', 'PH12', 'PH13', 'PH14'];
const REGION_10 = 'PH10';

/** Every other DICT region to draw a connection line to. */
const ALL_TARGET_REGIONS = [
  { id: 'PH09', name: 'Region IX', mindanao: true },
  { id: 'PH11', name: 'Region XI', mindanao: true },
  { id: 'PH12', name: 'Region XII', mindanao: true },
  { id: 'PH13', name: 'Region XIII', mindanao: true },
  { id: 'PH14', name: 'BARMM', mindanao: true },
  { id: 'PH06', name: 'Region VI', mindanao: false },
  { id: 'PH07', name: 'Region VII', mindanao: false },
  { id: 'PH08', name: 'Region VIII', mindanao: false },
  { id: 'PH01', name: 'Region I', mindanao: false },
  { id: 'PH02', name: 'Region II', mindanao: false },
  { id: 'PH03', name: 'Region III', mindanao: false },
  { id: 'PH04A', name: 'Region IV-A', mindanao: false },
  { id: 'PH05', name: 'Region V', mindanao: false },
  { id: 'PHNCR', name: 'NCR', mindanao: false },
  { id: 'PH15', name: 'CAR', mindanao: false },
];

const NODES = [
  { x: '8%', y: '20%', size: 3, delay: '0s' },
  { x: '92%', y: '15%', size: 2, delay: '1s' },
  { x: '85%', y: '78%', size: 3, delay: '2s' },
  { x: '10%', y: '82%', size: 2, delay: '0.5s' },
  { x: '50%', y: '8%', size: 2, delay: '1.5s' },
  { x: '65%', y: '90%', size: 3, delay: '2.5s' },
  { x: '25%', y: '55%', size: 2, delay: '0.8s' },
  { x: '75%', y: '30%', size: 2, delay: '1.8s' },
  { x: '5%', y: '45%', size: 3, delay: '3s' },
  { x: '95%', y: '50%', size: 2, delay: '0.3s' },
];

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

function regionOf(el: Element, root: Element): string | null {
  let cur: Element | null = el;
  while (cur && cur !== root) {
    if (cur.id) {
      const m = MINDANAO_IDS.find(
        (id) => cur!.id === id || cur!.id.startsWith(id + '_') || cur!.id.startsWith(id + '-')
      );
      if (m) return m;
    }
    cur = cur.parentElement;
  }
  return null;
}

function bboxOf(el: Element): { x: number; y: number; w: number; h: number } | null {
  const paths = el.tagName === 'path' ? [el as SVGElement] : [...el.querySelectorAll('path')];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  paths.forEach((p) => {
    try {
      const b = (p as SVGGraphicsElement).getBBox();
      if (b.width > 0) {
        x0 = Math.min(x0, b.x);
        y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.width);
        y1 = Math.max(y1, b.y + b.height);
      }
    } catch {}
  });
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Create an SVG element with attributes. */
function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/* ═══════════════════════════════════════════════════════════════════
   RealMindanaoMap
   Loads /maps/ph.svg, restyles, zooms to Mindanao, highlights
   Region 10, and draws fiber connection lines to every other region.
   ═══════════════════════════════════════════════════════════════════ */

function RealMindanaoMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(mindanaoSvgUrl);
        if (!res.ok) throw new Error('SVG not found');
        const text = await res.text();
        if (!alive) return;

        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const svg = doc.documentElement;
        if (svg.tagName !== 'svg') throw new Error('Invalid SVG');

        /* ── Strip existing styles & text ── */
        svg.querySelectorAll('style').forEach((s) => s.remove());
        svg.querySelectorAll('text').forEach((t) => t.remove());

        /* ── Inject defs (gradients + filter, NO inline <style>) ── */
        const defs = svgEl('defs', {});
        defs.innerHTML = `
          <radialGradient id="goldFill" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stop-color="#FCD116" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#FCD116" stop-opacity="0.08"/>
          </radialGradient>
          <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b"/>
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FCD116" stop-opacity="0"/>
            <stop offset="30%" stop-color="#FCD116" stop-opacity="0.4"/>
            <stop offset="70%" stop-color="#FCD116" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#FCD116" stop-opacity="0"/>
          </linearGradient>
        `;
        svg.prepend(defs);

        /* ── Restyle paths by region ── */
        svg.querySelectorAll('path').forEach((p) => {
          p.removeAttribute('style');
          const rid = regionOf(p, svg);

          if (rid === REGION_10) {
            p.setAttribute('fill', 'url(#goldFill)');
            p.setAttribute('stroke', '#FCD116');
            p.setAttribute('stroke-width', '2');
            p.setAttribute('stroke-opacity', '0.8');
            p.setAttribute('filter', 'url(#goldGlow)');
            p.classList.add('r10-anim');

            const dash = p.cloneNode() as SVGPathElement;
            dash.removeAttribute('id');
            dash.removeAttribute('filter');
            dash.setAttribute('fill', 'none');
            dash.setAttribute('stroke', '#FCD116');
            dash.setAttribute('stroke-width', '1.2');
            dash.setAttribute('stroke-opacity', '0.3');
            dash.classList.add('r10-dash');
            p.after(dash);
          } else if (rid) {
            p.setAttribute('fill', 'rgba(0,60,160,0.05)');
            p.setAttribute('stroke', '#38bdf8');
            p.setAttribute('stroke-width', '1');
            p.setAttribute('stroke-opacity', '0.25');
          } else {
            p.setAttribute('fill', 'rgba(255,255,255,0.012)');
            p.setAttribute('stroke', 'rgba(255,255,255,0.04)');
            p.setAttribute('stroke-width', '0.5');
          }
        });

        /* ── Prep for DOM injection ── */
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';

        if (!ref.current || !alive) return;
        ref.current.innerHTML = '';
        ref.current.appendChild(svg);

        /* ════════════════════════════════════════
           Post-injection decorations
           ════════════════════════════════════════ */
        const live = ref.current.querySelector('svg');
        if (!live) return;

        /* ── Zoom viewBox to Mindanao ── */
        let mX0 = Infinity, mY0 = Infinity, mX1 = -Infinity, mY1 = -Infinity;
        MINDANAO_IDS.forEach((id) => {
          const el = live.querySelector(`[id="${id}"]`);
          if (!el) return;
          const bb = bboxOf(el);
          if (bb) {
            mX0 = Math.min(mX0, bb.x);
            mY0 = Math.min(mY0, bb.y);
            mX1 = Math.max(mX1, bb.x + bb.w);
            mY1 = Math.max(mY1, bb.y + bb.h);
          }
        });

        if (mX0 !== Infinity) {
          const px = (mX1 - mX0) * 0.12;
          const py = (mY1 - mY0) * 0.12;
          live.setAttribute('viewBox',
            `${mX0 - px} ${mY0 - py} ${mX1 - mX0 + px * 2} ${mY1 - mY0 + py * 2}`
          );
        }

        /* ── Region 10 center ── */
        const r10El = live.querySelector(`[id="${REGION_10}"]`);
        const r10 = r10El && bboxOf(r10El);
        if (!r10) { if (alive) setState('ready'); return; }

        const cx = r10.x + r10.w / 2;
        const cy = r10.y + r10.h / 2;
        const diag = Math.hypot(r10.w, r10.h);

        /* ════════════════════════════════════
           1. SIGNAL ARCS (concentric rings)
           ════════════════════════════════════ */
        const arcsGroup = svgEl('g', { class: 'r10-arcs' });
        [0.10, 0.18, 0.28].forEach((frac, i) => {
          const r = diag * frac;
          const circle = svgEl('circle', {
            cx: String(cx), cy: String(cy), r: String(r),
            fill: 'none', stroke: 'url(#arcGrad)', 'stroke-width': '1',
          });
          circle.style.transformOrigin = `${cx}px ${cy}px`;
          circle.style.animation = `signalArc ${3.5 + i * 0.8}s ease-out infinite ${i * 0.7}s`;
          arcsGroup.appendChild(circle);
        });
        live.appendChild(arcsGroup);

        /* ════════════════════════════════════
           2. FIBER CONNECTIONS to every region
           ════════════════════════════════════ */
        const connGroup = svgEl('g', { class: 'r10-connections' });
        const linesToAnimate: SVGPathElement[] = [];

        ALL_TARGET_REGIONS.forEach((region, i) => {
          const el = live.querySelector(`[id="${region.id}"]`);
          if (!el) return;
          const bb = bboxOf(el);
          if (!bb) return;

          const tx = bb.x + bb.w / 2;
          const ty = bb.y + bb.h / 2;
          const dx = tx - cx;
          const dy = ty - cy;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          /* Line length: full distance for Mindanao, capped for distant */
          const lineLen = region.mindanao ? dist : diag * 0.55;
          const ex = cx + Math.cos(angle) * lineLen;
          const ey = cy + Math.sin(angle) * lineLen;

          /* Gentle curve via quadratic bezier control point */
          const cpOff = lineLen * 0.22;
          const cpAngle = angle + (i % 2 === 0 ? 0.5 : -0.5);
          const cpx = cx + Math.cos(cpAngle) * cpOff + Math.cos(angle) * lineLen * 0.45;
          const cpy = cy + Math.sin(cpAngle) * cpOff + Math.sin(angle) * lineLen * 0.45;

          const d = `M ${cx} ${cy} Q ${cpx} ${cpy} ${ex} ${ey}`;

          /* Base line (dim dashed) */
          connGroup.appendChild(svgEl('path', {
            d, fill: 'none',
            stroke: region.mindanao ? '#FCD116' : '#38bdf8',
            'stroke-opacity': region.mindanao ? '0.18' : '0.06',
            'stroke-width': region.mindanao ? '1' : '0.6',
            'stroke-dasharray': region.mindanao ? '4 6' : '3 8',
          }));

          /* Traveling pulse (animated after DOM insert) */
          const pulse = svgEl('path', {
            d, fill: 'none',
            stroke: region.mindanao ? '#FCD116' : '#38bdf8',
            'stroke-opacity': region.mindanao ? '0.75' : '0.25',
            'stroke-width': region.mindanao ? '2' : '1.2',
            'stroke-linecap': 'round',
            'stroke-dasharray': '0 10000',
          });
          connGroup.appendChild(pulse);
          linesToAnimate.push(pulse);

          /* Endpoint markers for Mindanao regions */
          if (region.mindanao) {
            connGroup.appendChild(svgEl('circle', {
              cx: String(tx), cy: String(ty), r: '2',
              fill: '#FCD116', opacity: '0.45',
            }));

            /* Expanding ping at endpoint */
            const pingA = svgEl('circle', {
              cx: String(tx), cy: String(ty), r: '2',
              fill: 'none', stroke: '#FCD116', 'stroke-width': '0.5', opacity: '0.3',
            });
            const animR = svgEl('animate', {
              attributeName: 'r', from: '2', to: '10', dur: '3s', repeatCount: 'indefinite',
            });
            const animO = svgEl('animate', {
              attributeName: 'opacity', from: '0.3', to: '0', dur: '3s', repeatCount: 'indefinite',
            });
            pingA.appendChild(animR);
            pingA.appendChild(animO);
            connGroup.appendChild(pingA);

            /* Region name label */
            const label = svgEl('text', {
              x: String(tx), y: String(ty + 6),
              'text-anchor': 'middle', fill: '#FCD116',
              'font-size': '3.5', 'font-family': 'monospace',
              opacity: '0.22', 'letter-spacing': '0.3',
            });
            label.textContent = region.name;
            connGroup.appendChild(label);
          }
        });

        live.appendChild(connGroup);

        /* Animate pulses after DOM insertion (need getTotalLength) */
        linesToAnimate.forEach((pulse, i) => {
          try {
            const L = pulse.getTotalLength();
            const pLen = Math.max(6, Math.min(15, L * 0.08));
            pulse.setAttribute('stroke-dasharray', `${pLen} 10000`);

            const anim = svgEl('animate', {
              attributeName: 'stroke-dashoffset',
              from: '0',
              to: String(-L),
              dur: `${2.5 + (i * 0.2)}s`,
              repeatCount: 'indefinite',
            });
            pulse.appendChild(anim);
          } catch {}
        });

        /* ════════════════════════════════════
           3. CITY MARKERS inside Region 10
           ════════════════════════════════════ */
        const cities = [
          { name: 'Misamis Oriental', xr: 0.70, yr: 0.28, primary: true },
          { name: 'Cagayan de Oro City', xr: 0.64, yr: 0.40, primary: false},
          { name: 'Bukidnon', xr: 0.72, yr: 0.72, primary: true },
          { name: 'Iligan City', xr: 0.42, yr: 0.45, primary: false },
          { name: 'Lanao del Norte', xr: 0.30, yr: 0.58, primary: true },
          { name: 'Misamis Occidental', xr: 0.10, yr: 0.45, primary: true},
          { name: 'Camiguin', xr: 0.64, yr: 0.02, primary: false}

          // { name: 'Lanao del Norte', xr: 0.50, yr: 0.18, primary: true },
          // { name: 'Iligan', xr: 0.18, yr: 0.42, primary: false },
          // { name: 'Bukidnon', xr: 0.52, yr: 0.62, primary: false },
          // { name: 'Misamis Occidental', xr: 0.04, yr: 0.15, primary: false },
        ];

        const markersGroup = svgEl('g', { class: 'r10-markers' });

        cities.forEach((c) => {
          const ccx = r10.x + r10.w * c.xr;
          const ccy = r10.y + r10.h * c.yr;

          markersGroup.appendChild(svgEl('circle', {
            cx: String(ccx), cy: String(ccy),
            r: c.primary ? '3' : '1.5',
            fill: '#FCD116', opacity: c.primary ? '0.9' : '0.3',
          }));

          if (c.primary) {
            /* Ping ring A */
            const pA = svgEl('circle', {
              cx: String(ccx), cy: String(ccy), r: '4',
              fill: 'none', stroke: '#FCD116', 'stroke-width': '0.8',
            });
            pA.appendChild(svgEl('animate', {
              attributeName: 'r', from: '4', to: '18', dur: '2.5s', repeatCount: 'indefinite',
            }));
            pA.appendChild(svgEl('animate', {
              attributeName: 'opacity', from: '0.7', to: '0', dur: '2.5s', repeatCount: 'indefinite',
            }));
            markersGroup.appendChild(pA);

            /* Ping ring B */
            const pB = svgEl('circle', {
              cx: String(ccx), cy: String(ccy), r: '4',
              fill: 'none', stroke: '#FCD116', 'stroke-width': '0.5',
            });
            pB.appendChild(svgEl('animate', {
              attributeName: 'r', from: '4', to: '26', dur: '2.5s', begin: '0.7s', repeatCount: 'indefinite',
            }));
            pB.appendChild(svgEl('animate', {
              attributeName: 'opacity', from: '0.4', to: '0', dur: '2.5s', begin: '0.7s', repeatCount: 'indefinite',
            }));
            markersGroup.appendChild(pB);
          }

          const lbl = svgEl('text', {
            x: String(ccx), y: String(ccy - (c.primary ? 7 : 4)),
            'text-anchor': 'middle', fill: '#FCD116',
            'font-size': c.primary ? '5' : '3.5',
            'font-family': 'monospace', opacity: c.primary ? '0.6' : '0.18',
            'letter-spacing': '0.4',
          });
          lbl.textContent = c.name;
          markersGroup.appendChild(lbl);
        });

        /* "REGION X" title */
        const title = svgEl('text', {
          x: String(cx), y: String(r10.y - 8),
          'text-anchor': 'middle', fill: '#FCD116',
          'font-size': '7', 'font-family': 'monospace',
          'letter-spacing': '2.5', 'font-weight': 'bold',
        });
        title.classList.add('lbl-pulse');
        title.textContent = 'REGION X';
        markersGroup.appendChild(title);

        /* "NORTHERN MINDANAO" subtitle */
        const sub = svgEl('text', {
          x: String(cx), y: String(r10.y + r10.h + 14),
          'text-anchor': 'middle', fill: '#FCD116',
          'font-size': '4.5', 'font-family': 'monospace',
          opacity: '0.15', 'letter-spacing': '1.5',
        });
        sub.textContent = 'NORTHERN MINDANAO';
        markersGroup.appendChild(sub);

        live.appendChild(markersGroup);

        /* ── "MINDANAO" watermark ── */
        if (mX0 !== Infinity) {
          const wm = svgEl('text', {
            x: String((mX0 + mX1) / 2),
            y: String(mY1 + (mY1 - mY0) * 0.08),
            'text-anchor': 'middle', fill: '#38bdf8',
            'font-size': '10', 'font-family': 'monospace',
            opacity: '0.04', 'letter-spacing': '6', 'font-weight': 'bold',
          });
          wm.textContent = 'MINDANAO';
          live.appendChild(wm);
        }

        if (alive) setState('ready');
      } catch {
        if (alive) setState('fallback');
      }
    })();

    return () => { alive = false; };
  }, []);

  if (state === 'fallback') return <InlineFallbackMap />;

  return (
    <div
      ref={ref}
      className="absolute top-1/2 left-1/2  -translate-x-[80%]   sm:-translate-x-[30%]  scale-[2] sm:scale-[1.1]  -translate-y-[65%]  sm:-translate-y-[45%]
                 w-[90vmin] h-[90vmin] max-w-[850px] max-h-[850px]"
      style={{ opacity: state === 'ready' ? 1 : 0, transition: 'opacity 0.8s ease' }}
    />
  );
}


/* ═══════════════════════════════════════════════════════
   InlineFallbackMap — used when /maps/ph.svg is missing
   Shows simplified Mindanao with connection lines to
   other Mindanao regions using hardcoded positions.
   ═══════════════════════════════════════════════════════ */

function InlineFallbackMap() {
  /* Region 10 center (approximate) */
  const cx = 142;
  const cy = 78;
  const diag = 100;

  /** Other Mindanao regions with approximate centers */
  const fallbackRegions = [
    { name: 'Region IX', tx: 45, ty: 95 },
    { name: 'Region XI', tx: 235, ty: 155 },
    { name: 'Region XII', tx: 185, ty: 165 },
    { name: 'Region XIII', tx: 255, ty: 105 },
    { name: 'BARMM', tx: 110, ty: 148 },
  ];

  /** Non-Mindanao directions (capped line length) */
  const distantRegions = [
    { name: 'Visayas', angle: -2.3 },
    { name: 'Luzon', angle: -1.5 },
    { name: 'NCR', angle: -1.7 },
  ];

  const connections = fallbackRegions.map((r, i) => {
    const dx = r.tx - cx;
    const dy = r.ty - cy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const cpOff = dist * 0.22;
    const cpAngle = angle + (i % 2 === 0 ? 0.5 : -0.5);
    const cpx = cx + Math.cos(cpAngle) * cpOff + Math.cos(angle) * dist * 0.45;
    const cpy = cy + Math.sin(cpAngle) * cpOff + Math.sin(angle) * dist * 0.45;
    return { d: `M ${cx} ${cy} Q ${cpx} ${cpy} ${r.tx} ${r.ty}`, dist, name: r.name };
  });

  const distantLines = distantRegions.map((r, i) => {
    const len = diag * 0.55;
    const ex = cx + Math.cos(r.angle) * len;
    const ey = cy + Math.sin(r.angle) * len;
    const cpAngle = r.angle + (i % 2 === 0 ? 0.4 : -0.4);
    const cpx = cx + Math.cos(cpAngle) * len * 0.3 + Math.cos(r.angle) * len * 0.4;
    const cpy = cy + Math.sin(cpAngle) * len * 0.3 + Math.sin(r.angle) * len * 0.4;
    return { d: `M ${cx} ${cy} Q ${cpx} ${cpy} ${ex} ${ey}`, dist: len };
  });

  return (
    <svg
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%]
                 w-[85vmin] h-[85vmin] max-w-[750px] max-h-[750px]"
      viewBox="0 0 300 260"
    >
      <defs>
        <radialGradient id="if-r10glow" cx="45%" cy="28%" r="50%">
          <stop offset="0%" stopColor="#FCD116" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FCD116" stopOpacity="0" />
        </radialGradient>
        <filter id="if-glow">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="if-arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FCD116" stopOpacity="0" />
          <stop offset="30%" stopColor="#FCD116" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#FCD116" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FCD116" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Full Mindanao */}
      <path
        d="M 50,45 C 70,30 110,25 140,28 C 170,32 200,40 225,55
           C 250,72 268,95 278,122 C 286,148 284,178 272,202
           C 258,225 235,240 208,248 C 178,256 148,252 122,240
           C 96,228 72,210 55,188 C 38,166 25,142 20,118
           C 16,94 22,72 35,58 C 42,48 48,46 50,45 Z"
        fill="rgba(0,56,168,0.04)" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.25"
      />

      {/* Region 10 */}
      <path
        d="M 60,45 C 75,32 110,26 140,28 C 165,30 188,36 208,48
           C 222,58 228,72 225,88 C 220,104 206,118 188,126
           C 168,134 148,136 130,132 C 112,126 96,114 84,100
           C 72,86 64,68 60,52 Z"
        fill="url(#if-r10glow)" stroke="#FCD116" strokeWidth="1.5"
        strokeOpacity="0.8" filter="url(#if-glow)" className="r10-anim"
      />
      <path
        d="M 60,45 C 75,32 110,26 140,28 C 165,30 188,36 208,48
           C 222,58 228,72 225,88 C 220,104 206,118 188,126
           C 168,134 148,136 130,132 C 112,126 96,114 84,100
           C 72,86 64,68 60,52 Z"
        fill="none" stroke="#FCD116" strokeWidth="1" opacity="0.2" className="r10-dash"
      />

      {/* Camiguin */}
      <path
        d="M 222,32 C 226,28 234,28 236,34 C 238,40 232,46 226,44 C 220,42 220,36 222,32 Z"
        fill="rgba(252,209,22,0.15)" stroke="#FCD116" strokeWidth="0.8" opacity="0.4"
      />

      {/* Signal arcs from R10 center */}
      {[0.12, 0.22, 0.35].map((frac, i) => (
        <circle key={`arc-${i}`} cx={cx} cy={cy} r={diag * frac}
          fill="none" stroke="url(#if-arcGrad)" strokeWidth="1"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: `signalArc ${3.5 + i * 0.8}s ease-out infinite ${i * 0.7}s`,
          }}
        />
      ))}

      {/* Distant connection lines (pointing off-screen) */}
      {distantLines.map((l, i) => (
        <g key={`dist-${i}`}>
          <path d={l.d} fill="none" stroke="#38bdf8" strokeOpacity="0.06"
            strokeWidth="0.6" strokeDasharray="3 8" />
          <path d={l.d} fill="none" stroke="#38bdf8" strokeOpacity="0.25"
            strokeWidth="1" strokeLinecap="round" strokeDasharray="8 10000">
            <animate attributeName="stroke-dashoffset" from="0" to={String(-l.dist)}
              dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
          </path>
        </g>
      ))}

      {/* Mindanao connection lines */}
      {connections.map((c, i) => (
        <g key={`conn-${i}`}>
          <path d={c.d} fill="none" stroke="#FCD116" strokeOpacity="0.18"
            strokeWidth="1" strokeDasharray="4 6" />
          <path d={c.d} fill="none" stroke="#FCD116" strokeOpacity="0.75"
            strokeWidth="2" strokeLinecap="round" strokeDasharray="8 10000">
            <animate attributeName="stroke-dashoffset" from="0" to={String(-c.dist)}
              dur={`${2.5 + i * 0.2}s`} repeatCount="indefinite" />
          </path>
          {/* Endpoint dot */}
          <circle cx={c.d.match(/Q[^,]+,[^ ]+ ([\d.]+)/)?.[1]}
            cy={c.d.match(/Q[^,]+,[^ ]+ [\d.]+ ([\d.]+)/)?.[1]}
            r="2" fill="#FCD116" opacity="0.45" />
        </g>
      ))}

      {/* CDO marker */}
      <circle cx="182" cy="42" r="3.5" fill="#FCD116" opacity="0.9" />
      <circle cx="182" cy="42" fill="none" stroke="#FCD116" strokeWidth="0.8">
        <animate attributeName="r" from="4" to="18" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.7" to="0" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="182" cy="42" fill="none" stroke="#FCD116" strokeWidth="0.5">
        <animate attributeName="r" from="4" to="26" dur="2.5s" begin="0.7s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2.5s" begin="0.7s" repeatCount="indefinite" />
      </circle>

      {/* Labels */}
      <text x={cx} y="30" textAnchor="middle" fill="#FCD116" fontSize="7"
        fontFamily="monospace" opacity="0.4" letterSpacing="2.5" fontWeight="bold">
        REGION X
      </text>
      <text x="182" y="56" textAnchor="middle" fill="white" fontSize="4"
        fontFamily="monospace" opacity="0.35">
        Cagayan de Oro
      </text>
      {fallbackRegions.map((r) => (
        <text key={r.name} x={r.tx} y={r.ty + 6} textAnchor="middle" fill="#FCD116"
          fontSize="3.5" fontFamily="monospace" opacity="0.22" letterSpacing="0.3">
          {r.name}
        </text>
      ))}
      <text x={cx} y="148" textAnchor="middle" fill="#FCD116" fontSize="5"
        fontFamily="monospace" opacity="0.12" letterSpacing="1.5">
        NORTHERN MINDANAO
      </text>
      <text x="160" y="245" textAnchor="middle" fill="#38bdf8" fontSize="10"
        fontFamily="monospace" opacity="0.04" letterSpacing="6" fontWeight="bold">
        MINDANAO
      </text>
    </svg>
  );
}


/* ═══════════════════════════════════════════════
   DICT Background
   ═══════════════════════════════════════════════ */

function DICTBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep navy gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#001233] via-[#001e50] to-[#002b6e]" />

      {/* Central radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[50%]
                      w-[110%] h-[110%] rounded-full
                      bg-[radial-gradient(circle,rgba(252,209,22,0.07)_0%,rgba(0,56,168,0.05)_35%,transparent_70%)]
                      animate-slow-pulse" />

      {/* Ambient blobs */}
      <div className="absolute -top-1/4 -left-1/4 w-[55%] h-[55%] rounded-full
                      bg-[#0038A8]/20 blur-[120px] animate-blob-drift-a" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full
                      bg-[#FCD116]/15 blur-[120px] animate-blob-drift-c" />

      {/* Tech grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(252,209,22,0.5) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(252,209,22,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Map with fiber connections */}
      <RealMindanaoMap />

      {/* Floating data nodes */}
      {NODES.map((n, i) => (
        <span key={i}
          className="absolute rounded-full bg-[#FCD116]/40 animate-node-float
                     shadow-[0_0_6px_rgba(252,209,22,0.25)]"
          style={{ left: n.x, top: n.y, width: n.size * 2, height: n.size * 2, animationDelay: n.delay }}
        />
      ))}

      {/* Bottom depth fade */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3
                      bg-gradient-to-t from-[#001233] to-transparent" />
    </div>
  );
}


/* ═══════════════════════════════════════════════
   Slide components
   ═══════════════════════════════════════════════ */

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.4 },
};

function getSlideImage(slide: any) {
  if (slide.type === 'award' && slide.award.image) return { src: slide.award.image, fallback: null };
  if (slide.type === 'highlight' && slide.highlight.image) return { src: slide.highlight.image, fallback: null };
  return null;
}

function SlideBackground({ slideKey, image }: { slideKey: number; image: { src: string; fallback: string | null } }) {
  const [src, setSrc] = useState(image.src);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setSrc(image.src); setHidden(false); }, [image.src]);
  if (hidden) return null;
  return (
    <>
      <img key={slideKey} src={src} alt=""
        crossOrigin={image.fallback ? 'anonymous' : undefined}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => { if (image.fallback && src !== image.fallback) setSrc(image.fallback); else setHidden(true); }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#001233]/95 via-[#0038A8]/70 to-[#0038A8]/30" />
    </>
  );
}

function IntroSlide() {
  return (
    <motion.div key="intro" {...fade}>
      <div className="inline-flex items-center gap-2 bg-[#FCD116]/10 border border-[#FCD116]/25
                      rounded-full px-4 py-1.5 text-sm mb-6
                      shadow-[0_0_15px_rgba(252,209,22,0.15)]">
        <span className="w-2 h-2 bg-[#FCD116] rounded-full animate-pulse
                         shadow-[0_0_8px_rgba(252,209,22,0.8)]" />
        <span className="text-[#FCD116] font-medium">Knowledge Management System</span>
      </div>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight tracking-tight text-white">
        DICT Region 10<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD116] to-[#FFD84D]">
          KMS Portal
        </span>
      </h1>
      <p className="text-white/70 text-lg max-w-2xl mx-auto mb-3 sm:mb-6">
        Centralized access to programs, projects, and performance dashboards of the
        Department of Information and Communications Technology — Northern Mindanao.
      </p>
      <div className="flex sm:flex-row gap-4 justify-center">
        <a href="#projects"
          className="px-6 py-3 bg-[#FCD116] text-[#001233] rounded-full font-bold
                     hover:bg-[#ffe14d] transition-all flex items-center justify-center gap-2
                     shadow-[0_0_24px_rgba(252,209,22,0.35)]
                     hover:shadow-[0_0_36px_rgba(252,209,22,0.55)]">
          View Projects <ArrowRight size={16} />
        </a>
        <Link to="/kms/about"
          className="px-6 py-3 bg-white/8 hover:bg-white/15 rounded-full font-medium
                     text-white transition-colors border border-white/15">
          About Us
        </Link>
      </div>
    </motion.div>
  );
}

function AwardSlide({ award }: { award: any }) {
  return (
    <motion.div key={`award-${award.id}`} {...fade} className="flex flex-col items-center">
      <span className="inline-flex items-center gap-2 bg-[#FCD116]/10 border border-[#FCD116]/25
                       rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider
                       mb-6 text-[#FCD116]">
        <AwardIcon size={14} /> Award
      </span>
      {!award.image && (
        <span className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <AwardIcon size={36} className="text-[#FCD116]" />
        </span>
      )}
      <h2 className="text-2xl sm:text-4xl font-black mb-3 leading-tight tracking-tight
                     max-w-3xl drop-shadow-lg text-white">{award.title}</h2>
      <p className="text-white/70 text-base mb-8 drop-shadow">
        {award.issuer} &middot; {award.year}
      </p>
      <a href="#awards"
        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-medium
                   transition-colors border border-white/15 inline-flex items-center gap-2 text-white">
        View All Awards <ArrowRight size={16} />
      </a>
    </motion.div>
  );
}

function HighlightSlide({ highlight }: { highlight: any }) {
  return (
    <motion.div key={`highlight-${highlight.id}`} {...fade} className="flex flex-col items-center">
      <span className="inline-flex items-center bg-[#FCD116]/10 border border-[#FCD116]/25
                       rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider
                       mb-6 text-[#FCD116]">
        Office Highlight
      </span>
      {!highlight.image && (
        <span className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
          <ImageIcon size={36} className="text-[#FCD116]" />
        </span>
      )}
      {highlight.title && (
        <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight
                       max-w-2xl drop-shadow-lg text-white">{highlight.title}</h2>
      )}
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════
   Hero Slider
   ═══════════════════════════════════════════════ */

export default function HeroSlider() {
  const [awards, setAwards] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    getAwards().then(setAwards);
    getHighlights().then(setHighlights);
  }, []);

  const slides = [
    { type: 'intro' },
    ...awards.map((a) => ({ type: 'award', award: a })),
    ...highlights.map((h) => ({ type: 'highlight', highlight: h })),
  ];

  useEffect(() => { if (current >= slides.length) setCurrent(0); }, [slides.length, current]);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);
//  slider counter
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(next, 10000);
    return () => clearInterval(t);
  }, [slides.length, paused, next]);

  const slide = slides[current] || slides[0];
  const slideImage = getSlideImage(slide);

  return (
    <div className="relative h-[70vh] flex items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      {slide.type === 'intro' && <DICTBackground />}

      <AnimatePresence mode="wait">
        {slideImage && (
          <motion.div key={current} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0">
            <SlideBackground slideKey={current} image={slideImage} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
                      py-10 max-h-full overflow-y-auto text-center">
        <AnimatePresence mode="wait">
          {slide.type === 'intro' && <IntroSlide />}
          {slide.type === 'award' && <AwardSlide award={slide.award} />}
          {slide.type === 'highlight' && <HighlightSlide highlight={slide.highlight} />}
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous slide"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20
                       bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <button onClick={next} aria-label="Next slide"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20
                       bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors">
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 bg-[#FCD116]' : 'w-2 bg-white/40'
                }`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}