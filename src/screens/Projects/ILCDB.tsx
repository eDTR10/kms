// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import logoIlcdb from '../../assets/project-logo/ILCDB.png';
export default function ILCDB() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-[#0038A8] rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoIlcdb} alt="ILCDB" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">ILCDB Program</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            ICT Livelihood and Community Development Barangay – beneficiaries and report dashboard.
          </p>
        </div>
      </div>
      <DashboardEmbed
        title="ILCDB Report"
        embedUrl="https://datastudio.google.com/embed/reporting/f8914384-b24f-4008-a338-a7f7ac14b425/page/IXtzD"
        reportUrl="https://datastudio.google.com/reporting/f8914384-b24f-4008-a338-a7f7ac14b425/page/IXtzD"
      />
    </div>
  );
}

