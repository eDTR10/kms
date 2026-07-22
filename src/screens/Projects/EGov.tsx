// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import EgovIndicatorsDashboard from '../../components/egov-dashboard/EgovIndicatorsDashboard';
import SheetKpiDashboard from '../../components/egov-dashboard/SheetKpiDashboard';
import { PROJECT_GIDS } from '../../services/sheetKpi';
import logoeGov from '../../assets/project-logo/eGovPH Logo.png';
export default function EGov() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-white border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoeGov} alt="eGovPH" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">eGov / NGP Report</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Electronic Government and National Government Portal deployment dashboard.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <SheetKpiDashboard
          gid={PROJECT_GIDS.egov}
          heading="Sheet-driven indicators"
          description="eGov / NGP program KPIs"
          pollIntervalMs={30000}
        />
      </div>

      <div className="mb-10">
        <EgovIndicatorsDashboard />
      </div>

      <DashboardEmbed
        title="eGov NGP Report"
        embedUrl="https://lookerstudio.google.com/embed/reporting/81b02c41-dbbc-46d4-ad8e-e349a72a2814/page/af24D"
        reportUrl="https://lookerstudio.google.com/reporting/81b02c41-dbbc-46d4-ad8e-e349a72a2814/page/af24D"
      />
    </div>
  );
}

