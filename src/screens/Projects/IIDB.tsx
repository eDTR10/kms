// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import logoiidb from '../../assets/project-logo/IIDB.png';

export default function IIDB() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-white border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logoiidb} alt="IIDB" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">IIDB Report</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            ICT Industry Development Bureau – Region 10 enterprises and ICT professionals.
          </p>
        </div>
      </div>
      <DashboardEmbed
        title="IIDB Dashboard"
        embedUrl="https://datastudio.google.com/embed/reporting/6e8fb826-5f06-4950-a57d-7c2be915a918/page/p_4mlt23t9gd"
        reportUrl="https://datastudio.google.com/reporting/6e8fb826-5f06-4950-a57d-7c2be915a918/page/p_4mlt23t9gd"
      />
    </div>
  );
}

