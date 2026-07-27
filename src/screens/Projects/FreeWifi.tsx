// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import FreeWifiIndicatorsDashboard from '../../components/freewifi-dashboard/FreeWifiIndicatorsDashboard';
import FreeWifiLiveCharts from './FreeWifiLiveCharts';
import { getFreeWifiHighlights, getFreeWifiSliderDesign } from '../../services/freewifiData';
import { designFromBackend, highlightFromBackend } from '../Admin/FreeWifi/FreeWifiHighlights';
import logofreewifi from '../../assets/project-logo/Free Wifi.png';

// Highlights Slider Component
function HighlightsSlider() {
  const [highlights, setHighlights] = useState([]);
  const [design, setDesign] = useState({
    bgColor: '#0038A8',
    bgGradient: '#001a52',
    textColor: '#ffffff',
    overlayOpacity: 30,
    height: 'h-64',
    autoPlay: true,
    interval: 5000,
  });
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    Promise.all([getFreeWifiHighlights(), getFreeWifiSliderDesign()])
      .then(([h, d]) => {
        setHighlights(h.map(highlightFromBackend).filter(x => x.active));
        setDesign(prev => ({ ...prev, ...designFromBackend(d) }));
      })
      .catch(console.error);
  }, []);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % highlights.length);
  }, [highlights.length]);

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + highlights.length) % highlights.length);
  }, [highlights.length]);

  useEffect(() => {
    if (highlights.length < 2 || paused || !design.autoPlay) return;
    const timer = setInterval(next, design.interval);
    return () => clearInterval(timer);
  }, [highlights.length, paused, design.autoPlay, design.interval, next]);

  if (highlights.length === 0) return null;

  const highlight = highlights[current];
  const template = design.template || 'classic-center';
  const heightClass = design.height === 'custom' ? '' : design.height;
  const heightStyle = design.height === 'custom' && design.customHeight ? { height: `${design.customHeight}px` } : {};

  // Render template content
  const renderTemplateContent = () => {
    const title = highlight.showTitle !== false && highlight.title;
    const desc = highlight.showDescription !== false && highlight.description;

    switch (template) {
      case 'left-hero':
        return (
          <div className="relative z-10 h-full flex items-center px-12">
            <div className="max-w-lg text-left">
              {title && <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'right-hero':
        return (
          <div className="relative z-10 h-full flex items-center justify-end px-12">
            <div className="max-w-lg text-right">
              {title && <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'bottom-banner':
        return (
          <div className="relative z-10 h-full flex flex-col justify-end">
            <div className="bg-black/50 backdrop-blur-sm px-8 py-6">
              {title && <h2 className="text-2xl sm:text-3xl font-black mb-2 text-center" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-sm text-center max-w-2xl mx-auto" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'top-banner':
        return (
          <div className="relative z-10 h-full flex flex-col justify-start">
            <div className="bg-black/50 backdrop-blur-sm px-8 py-6">
              {title && <h2 className="text-2xl sm:text-3xl font-black mb-2 text-center" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-sm text-center max-w-2xl mx-auto" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'split-screen':
        return (
          <div className="relative z-10 h-full flex">
            <div className="w-1/2" />
            <div className="w-1/2 flex items-center px-10 bg-black/30 backdrop-blur-sm">
              <div className="text-left">
                {title && <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
                {desc && <p className="text-sm" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
              </div>
            </div>
          </div>
        );
      case 'card-overlay':
        return (
          <div className="relative z-10 h-full flex items-end justify-center px-8 pb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-6 max-w-xl border border-white/20">
              {title && <h2 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-sm" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      case 'minimal':
        return (
          <div className="relative z-10 h-full flex items-center justify-center px-8">
            <div className="text-center max-w-md">
              {title && <h2 className="text-3xl sm:text-4xl font-black" style={{ color: design.textColor }}>{highlight.title}</h2>}
            </div>
          </div>
        );
      case 'spotlight':
        return (
          <div className="relative z-10 h-full flex items-center justify-center px-8 overflow-hidden">
            <div className="absolute w-[70%] h-[70%] rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${design.textColor}, transparent 65%)` }} />
            <div className="relative text-center max-w-2xl">
              {(title || desc) && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="h-px w-8 bg-[#FCD116]" />
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FCD116]">Featured</span>
                  <span className="h-px w-8 bg-[#FCD116]" />
                </div>
              )}
              {title && <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
      default: // classic-center
        return (
          <div className="relative z-10 h-full flex items-center justify-center px-8">
            <div className="text-center max-w-2xl">
              {title && <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: design.textColor }}>{highlight.title}</h2>}
              {desc && <p className="text-base" style={{ color: `${design.textColor}cc` }}>{highlight.description}</p>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mb-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`${heightClass} rounded-2xl overflow-hidden relative`} style={heightStyle}>
        {/* Background Image */}
        {highlight.image && (
          <img src={highlight.image} alt={highlight.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: (100 - design.overlayOpacity) / 100 }} />
        )}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${design.bgColor}, ${design.bgGradient})`,
          opacity: highlight.image ? 0.7 : 1,
        }} />
        
        {/* Template Content */}
        {renderTemplateContent()}

        {/* Navigation */}
        {highlights.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
              {highlights.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-[#FCD116]' : 'w-2 bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function FreeWifi() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
          {/* Highlights Slider */}
      <HighlightsSlider />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-[#ffffff] rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logofreewifi} alt="Free Wi-Fi" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">Free Wi-Fi Program</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Live dashboard for Free Public Wi-Fi access points across Region 10.
          </p>
        </div>
      </div>



      {/* Link to FPIAP Dashboard */}
      {/* <Link
        to="/kms/projects/free-wifi/dashboard"
        className="mb-8 flex items-center justify-between p-4 bg-gradient-to-r from-[#0038A8] to-[#0055f1] rounded-xl text-white hover:shadow-lg transition-all group"
      >
        <div className="flex items-center gap-3">
          <BarChart3 size={24} />
          <div>
            <p className="font-bold">FPIAP Region 10 Dashboard</p>
            <p className="text-sm text-white/80">View detailed site breakdown by province</p>
          </div>
        </div>
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </Link> */}

      <div className="mb-10">
      
        <FreeWifiLiveCharts />
      </div>

      <div className="mb-10">
        <FreeWifiIndicatorsDashboard />
      </div>
    </div>
  );
}
