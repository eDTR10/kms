// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import NBPIndicatorsDashboard from '../../components/nbp-dashboard/NBPIndicatorsDashboard';
import logogovnet from '../../assets/project-logo/NBP.png';
export default function GovNet() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-[#2d4a6e] rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logogovnet} alt="National Broadband Plan" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">NBP / CDO GovNet</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            National Broadband Program and Cagayan de Oro Government Network connectivity report.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <NBPIndicatorsDashboard />
      </div>

      <DashboardEmbed
        title="CDO GovNet Report"
        embedUrl="https://datastudio.google.com/embed/reporting/d18767f5-b034-40b4-9215-93674ff57e47/page/fADIF"
        reportUrl="https://datastudio.google.com/reporting/d18767f5-b034-40b4-9215-93674ff57e47/page/fADIF"
      />
    </div>
  );
}

