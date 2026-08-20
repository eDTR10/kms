// @ts-nocheck
import ProjectHighlightsSlider from '../../components/ProjectHighlightsSlider';
import ProjectChartsDisplay from '../../components/ProjectChartsDisplay';
import logoSvsi from '../../assets/project-logo/svsi.jpg';

export default function SVSI() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectHighlightsSlider slug="svsi" />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-white rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoSvsi} alt="SVSI" className="max-h-full max-w-full object-contain rounded" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Regional Initiative</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">SVSI</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Smart Villages Smart Island Initiative.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <ProjectChartsDisplay slug="svsi" />
      </div>
    </div>
  );
}
