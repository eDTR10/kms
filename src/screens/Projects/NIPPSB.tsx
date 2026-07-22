// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import NIPPSBIndicatorsDashboard from '../../components/nippsb-dashboard/NIPPSBIndicatorsDashboard';
import SheetKpiDashboard from '../../components/egov-dashboard/SheetKpiDashboard';
import { PROJECT_GIDS } from '../../services/sheetKpi';
import logonippsb from '../../assets/project-logo/NIPPSB.png';
export default function NIPPSB() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-white border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logonippsb} alt="NIPPSB" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">NIPPSB Report</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            National ICT Proficiency and Performance Standard for Barangays program.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <SheetKpiDashboard
          gid={PROJECT_GIDS.nippsb}
          heading="Sheet-driven indicators"
          description="NIPPSB program KPIs"
          pollIntervalMs={30000}
        />
      </div>

      <div className="mb-10">
        <NIPPSBIndicatorsDashboard />
      </div>

      <DashboardEmbed
        title="NIPPSB Dashboard"
        embedUrl="https://lookerstudio.google.com/embed/reporting/a41369e5-115f-4e05-8550-679234bad073/page/ZNmIF"
        reportUrl="https://lookerstudio.google.com/reporting/a41369e5-115f-4e05-8550-679234bad073/page/ZNmIF"
      />
    </div>
  );
}

