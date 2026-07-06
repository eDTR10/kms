// @ts-nocheck
import DashboardEmbed from '../../components/DashboardEmbed';
import ProjectCarousel from '../../components/ProjectCarousel';
import FreeWifiIndicatorsDashboard from '../../components/freewifi-dashboard/FreeWifiIndicatorsDashboard';
import logofreewifi from '../../assets/project-logo/Free Wifi.png';

export default function FreeWifi() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 dark:bg-gray-950">
      <ProjectCarousel />
      <div className="mb-6 flex items-center gap-6">
        <div className="shrink-0 w-24 h-24 bg-[#ffffff] rounded-xl flex items-center justify-center p-2 shadow-md">
          <img src={logofreewifi} alt="Free Wi-Fi" className="max-h-full max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm text-[#CE1126] font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1">Free Wi-Fi Program</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Live dashboard for Free Public Wi-Fi access points across Region 10.
          </p>
        </div>
      </div>

      <div className="mb-10">
        <FreeWifiIndicatorsDashboard />
      </div>

      {/* <DashboardEmbed
        title="Free Wi-Fi Dashboard"
        embedUrl="https://datastudio.google.com/embed/reporting/c016a68b-488e-41c2-95f3-fd5d8fde0b00/page/p_dqiy4l4zhd"
        reportUrl="https://datastudio.google.com/reporting/c016a68b-488e-41c2-95f3-fd5d8fde0b00/page/p_dqiy4l4zhd"
      /> */}
    </div>
  );
}

