// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import ELGUIndicatorsDashboard from '../../components/elgu-dashboard/ELGUIndicatorsDashboard';
import SheetKpiDashboard from '../../components/egov-dashboard/SheetKpiDashboard';
import { PROJECT_GIDS } from '../../services/sheetKpi';
import logoElgu from '../../assets/project-logo/eLGU Logo.png';
export default function ELGU() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-white border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoElgu} alt="eLGU" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">eLGU Program</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Electronic Local Government Unit operational dashboard.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <SheetKpiDashboard
          gid={PROJECT_GIDS.elgu}
          heading="Sheet-driven indicators"
          description="eLGU program KPIs"
          pollIntervalMs={30000}
        />
      </div>

      <div className="mb-10">
        <ELGUIndicatorsDashboard />
      </div>

      <DashboardEmbed
        title="eLGU Operational Report"
        embedUrl="https://datastudio.google.com/embed/reporting/5fbcb36d-8893-4cbd-8d4e-a2153d0da75a/page/p_r4d3fta1td"
        reportUrl="https://datastudio.google.com/reporting/5fbcb36d-8893-4cbd-8d4e-a2153d0da75a/page/p_r4d3fta1td"
      />
    </div>
  );
}

