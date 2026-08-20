// @ts-nocheck
import ProjectHighlightsSlider from '../../components/ProjectHighlightsSlider';
import ProjectChartsDisplay from '../../components/ProjectChartsDisplay';
import logoLakip from '../../assets/project-logo/lakip.png';

export default function LAKIP() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectHighlightsSlider slug="lakip" />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-[#F9FAFB] rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoLakip} alt="LAKIP" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Regional Initiative</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">LAKIP</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Localized Accessible Knowledge and Inclusive Platform.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <ProjectChartsDisplay slug="lakip" />
      </div>
    </div>
  );
}
