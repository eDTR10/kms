// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import CybersecurityIndicatorsDashboard from '../../components/cybersecurity-dashboard/CybersecurityIndicatorsDashboard';
import SheetKpiDashboard from '../../components/egov-dashboard/SheetKpiDashboard';
import { PROJECT_GIDS } from '../../services/sheetKpi';
import PNPKI from '../../assets/project-logo/PNPKI.jpg';
export default function Cybersecurity() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-white border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={PNPKI} alt="PNPKI" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">Cybersecurity / PNPKI</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Philippine National Public Key Infrastructure and Cybersecurity program report.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <SheetKpiDashboard
          gid={PROJECT_GIDS.cybersecurity}
          heading="Sheet-driven indicators"
          description="Cybersecurity / PNPKI program KPIs"
          pollIntervalMs={30000}
        />
      </div>

      <div className="mb-10">
        <CybersecurityIndicatorsDashboard />
      </div>

      <DashboardEmbed
        title="Cybersecurity / PNPKI Report"
        embedUrl="https://lookerstudio.google.com/embed/reporting/b6d40d56-33bd-4567-8d8a-20d16876deb4/page/p_gzgpvldahd"
        reportUrl="https://lookerstudio.google.com/reporting/b6d40d56-33bd-4567-8d8a-20d16876deb4/page/p_gzgpvldahd"
      />
    </div>
  );
}

