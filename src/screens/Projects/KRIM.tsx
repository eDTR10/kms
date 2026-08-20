// @ts-nocheck
import { Database } from 'lucide-react';
import ProjectHighlightsSlider from '../../components/ProjectHighlightsSlider';
import ProjectChartsDisplay from '../../components/ProjectChartsDisplay';

export default function KRIM() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectHighlightsSlider slug="krim" />
      <div className="mb-6 flex items-center gap-6">
        {/* No logo file supplied yet for KRIM — a lucide icon stands in, same box
            size/style every other project's <img> uses. */}
        <div className="shrink-0 w-24 h-24 bg-[#6B3FA0] rounded-xl flex items-center justify-center shadow-md">
          <Database size={40} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Regional Initiative</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">KRIM</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Knowledge And RDI Infrastructure Management.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <ProjectChartsDisplay slug="krim" />
      </div>
    </div>
  );
}
