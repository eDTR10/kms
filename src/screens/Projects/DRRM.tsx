// @ts-nocheck
import ProjectHighlightsSlider from '../../components/ProjectHighlightsSlider';
import ProjectChartsDisplay from '../../components/ProjectChartsDisplay';
import logoDrrm from '../../assets/project-logo/drrm.png';

export default function DRRM() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectHighlightsSlider slug="drrm" />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-[#0038A8] rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoDrrm} alt="DRRM" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">DRRM Program</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Disaster Risk Reduction and Management dashboard.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <ProjectChartsDisplay slug="drrm" />
      </div>
    </div>
  );
}
