// @ts-nocheck
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronRight, FolderKanban, LayoutDashboard, MapPin, Building2 } from 'lucide-react';
import Carousel from '../components/Carousel';
import HeroSlider from '../components/HeroSlider';
import Accomplishments from '../components/Accomplishments';
import Awards from '../components/Awards';
import { useTheme } from '../context/ThemeContext';

import logoFreeWifi from '../assets/project-logo/Free Wifi.png';
import logoILCDB from '../assets/project-logo/ILCDB.png';
import logoeGov from '../assets/project-logo/eGovPH Logo.png';
import logoPNPKI from '../assets/project-logo/PNPKI.jpg';
import logoNBP from '../assets/project-logo/NBP.png';
import logoeLGU from '../assets/project-logo/eLGU Logo.png';
import logoIIDB from '../assets/project-logo/IIDB.png';
import logoNIPPSB from '../assets/project-logo/NIPPSB.png';

const PROJECTS = [
  {
    logo: logoFreeWifi,
    title: 'Free Wi-Fi',
    description: 'Free public Wi-Fi access points deployed across Region 10 communities.',
    path: '/kms/projects/free-wifi',
    accent: 'bg-[#2D284E]',
  },
  {
    logo: logoILCDB,
    title: 'ILCDB',
    description: 'ICT Livelihood & Community Development Barangay program beneficiaries and reports.',
    path: '/kms/projects/ilcdb',
    accent: 'bg-[#14478F]',
  },
  {
    logo: logoeGov,
    title: 'eGov (NGP)',
    description: 'Electronic Government and National Government Portal deployment status.',
    path: '/kms/projects/egov',
    accent: 'bg-[#225AEA]',
  },
  {
    logo: logoPNPKI,
    title: 'Cybersecurity / PNPKI',
    description: 'Philippine National Public Key Infrastructure and cybersecurity readiness reports.',
    path: '/kms/projects/cybersecurity',
    accent: 'bg-[#FDD306]',
  },
  {
    logo: logoNBP,
    title: 'NBP / CDO GovNet',
    description: 'National Broadband Program and Cagayan de Oro Government Network connectivity.',
    path: '/kms/projects/govnet',
    accent: 'bg-[#335567]',
  },
  {
    logo: logoeLGU,
    title: 'eLGU',
    description: 'Electronic Local Government Unit operations and automation program.',
    path: '/kms/projects/elgu',
    accent: 'bg-[#335567]',
  },
  {
    logo: logoIIDB,
    title: 'IIDB',
    description: 'ICT Industry Development Bureau – Region 10 enterprises and ICT professionals.',
    path: '/kms/projects/iidb',
    accent: 'bg-[#FF0180]',
  },
  {
    logo: logoNIPPSB,
    title: 'NIPPSB',
    description: 'National ICT Proficiency and Performance Standard for Barangays program report.',
    path: '/kms/projects/nippsb',
    accent: 'bg-[#1E477F]',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const STATS = [
  { label: 'Active Projects', value: '8', icon: FolderKanban },
  { label: 'Dashboards', value: '8', icon: LayoutDashboard },
  { label: 'Region', value: '10', icon: MapPin },
  { label: 'Province Coverage', value: '7', icon: Building2 },
];

function StatCard({ label, value, icon: Icon }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const numeric = parseInt(value, 10) || 0;
  const suffix = value.replace(/^-?[0-9]+/, '');
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, numeric, { duration: 1.2, ease: 'easeOut' });
    return controls.stop;
  }, [inView, numeric, count]);

  return (
    <motion.div ref={ref} variants={card}>
      <div className="group p-5 rounded-2xl bg-slate-100 dark:bg-card dark:border dark:border-border shadow-sm flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-white dark:hover:border-primary/40">
        <span className="w-10 h-10 rounded-full bg-[#0038A8]/10 dark:bg-primary/10 flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110">
          <Icon size={18} className="text-[#0038A8] dark:text-primary" />
        </span>
        <motion.p className="text-3xl font-black text-[#0038A8] dark:text-primary drop-shadow-sm">
          {display}
        </motion.p>
        <p className="text-sm font-medium text-gray-500 dark:text-muted-foreground mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { dark } = useTheme();
  return (
    <div className="bg-white dark:bg-background transition-colors duration-300 min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative bg-[#0038A8] dark:bg-transparent text-white overflow-hidden border-b border-transparent dark:border-border">
        {!dark && (
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #FCD116 0%, transparent 60%), radial-gradient(circle at 80% 20%, #CE1126 0%, transparent 50%)' }} />
        )}
        {dark && (
          <>
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
          </>
        )}
        <HeroSlider />
        {/* Accent strip */}
        {!dark && <div className="h-2 bg-linear-to-r from-[#0038A8] via-[#CE1126] to-[#0038A8]" />}
      </section>

      {/* Stats bar */}
      <section className="bg-white dark:bg-background border-b border-gray-200 dark:border-border relative z-10">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"
        >
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </motion.div>
      </section>

      {/* Accomplishments */}
      <Accomplishments />

      {/* Image Carousel */}
      <div className="dark:opacity-90 dark:mix-blend-lighten">
        <Carousel />
      </div>

      {/* Projects Grid */}
      <section id="projects" className="bg-gray-50 dark:bg-background py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <p className="text-[#0038A8] dark:text-primary text-sm font-semibold uppercase tracking-wider mb-2">
              Portfolio
            </p>
            <h2 className="text-3xl font-black text-gray-900 dark:text-foreground tracking-tight">Programs & Projects</h2>
            <p className="text-gray-500 dark:text-muted-foreground mt-3 text-lg">Click any project to view its live dashboard</p>
            <div className="mt-4 h-1.5 w-16 bg-[#FCD116] dark:bg-primary rounded-full mx-auto dark:shadow-[0_0_10px_rgba(44,90,255,0.5)]" />
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {PROJECTS.map((project) => {
              const darkCard = 'dark:bg-card dark:border-border dark:text-card-foreground dark:hover:border-primary/50 dark:hover:shadow-[0_8px_30px_rgba(44,90,255,0.15)] bg-white border-gray-200 text-gray-800 shadow-sm';
              return (
                <motion.div key={project.path} variants={card}>
                  <Link
                    to={project.path}
                    className={`group h-full flex flex-col border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${darkCard}`}
                  >
                    {/* Accent stripe */}
                    <div className={`h-1  ${project.accent} ` } />

                    {console.log(project.accent)}
                    {/* Logo banner */}
                    <div className="flex items-center justify-center h-28 relative overflow-hidden bg-slate-50 dark:bg-white p-6">
                      <img
                        src={project.logo}
                        alt={project.title}
                        className="max-h-14 max-w-[65%] object-contain relative z-10 group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg leading-tight mb-2 dark:text-foreground group-hover:text-primary transition-colors">{project.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-muted-foreground leading-relaxed mb-4 flex-1">{project.description}</p>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0038A8] dark:text-primary mt-auto">
                        View Dashboard <ChevronRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Awards */}
      <Awards />

      {/* Call to action */}
      <section className="bg-[#CE1126] dark:bg-card dark:border-t dark:border-border text-white py-16 relative overflow-hidden">
        {dark && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h2 className="text-3xl font-bold mb-3 dark:text-foreground tracking-tight">Stay Informed with DICT R10</h2>
          <p className="text-white/80 dark:text-muted-foreground mb-8 text-lg max-w-xl mx-auto">Access real-time data, maps, and administrative files from one portal.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/kms/maps" className="px-6 py-3 bg-white text-[#CE1126] dark:bg-primary dark:text-primary-foreground rounded-full font-bold hover:bg-gray-100 dark:hover:bg-primary/90 transition-all dark:shadow-[0_0_20px_rgba(44,90,255,0.3)]">
              View Maps
            </Link>
            <Link to="/kms/afd" className="px-6 py-3 bg-white/10 dark:bg-secondary dark:text-secondary-foreground hover:bg-white/20 dark:hover:bg-secondary/80 rounded-full font-medium transition-colors border border-transparent dark:border-border">
              AFD Documents
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

