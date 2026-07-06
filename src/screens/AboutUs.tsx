// @ts-nocheck
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import CharterSearch from './CitizenCharter/CharterSearch';

/* ─────────────────────────── static data ─────────────────────────── */

const TABS = [
  { id: 'mandate', label: 'Mandate & Powers' },
  { id: 'mission', label: 'Mission & Vision' },
  { id: 'quality', label: 'Quality Policy' },
  { id: 'charter', label: "Citizen's Charter" },
];

const POWERS_SECTIONS = [
  {
    title: 'I. Policy and Planning',
    items: [
      '(a) Formulate, recommend and implement national policies, plans, programs and guidelines that will promote the development and use of ICT with due consideration to the advantages of convergence and emerging technologies;',
      '(b) Formulate policies and initiatives, in coordination with the Department of Education (DepED), the Commission on Higher Education (CHED), and the Technical Education and Skills Development Authority (TESDA), to develop and promote ICT in education consistent with the national goals and objectives, and responsive to the human resource needs of the ICT and ICT-enabled services (ICT-ES) sectors;',
      '(c) Provide an integrated framework in order to optimize all government ICT resources and networks for the identification and prioritization of all E-Government systems and applications as provided for the E-Government Masterplan and the Philippine Development Plan (PDP);',
    ],
  },
  {
    title: 'II. Improved Public Access',
    items: [
      '(d) Prescribe rules and regulations for the establishment, operation and maintenance of ICT infrastructures in unserved and underserved areas, in consultation with the local government units (LGUs), civil society organizations (CSOs), private sector, and the academe;',
      '(e) Establish a free internet service that can be accessed in government offices and public areas using the most cost-effective telecommunications technology, through partnership with private service providers as may be necessary;',
    ],
  },
  {
    title: 'III. Resource-sharing and Capacity Building',
    items: [
      '(f) Harmonize and coordinate all national ICT plans and initiatives to ensure knowledge, information and resource-sharing, database-building and agency networking linkages among government agencies, consistent with E-Government objectives in particular, and national objectives in general;',
      '(g) Ensure the development and protection of integrated government ICT infrastructures and designs, taking into consideration the inventory of existing manpower, plans, programs, software, hardware, and installed systems;',
      '(h) Assist and provide technical expertise to government agencies in the development of guidelines in the enforcement and administration of laws, standards, rules, and regulations governing ICT;',
      '(i) Assess, review and support ICT research and development programs of the government in coordination with the Department of Science and Technology (DOST) and other institutions concerned;',
      '(j) Prescribe the personnel qualifications and other qualification standards essential to the effective development and operation of government ICT infrastructures and systems;',
      '(k) Develop programs that would enhance the career advancement opportunities of ICT workers in government;',
      '(l) Assist in the dissemination of vital information essential to disaster risk reduction through the use of ICT;',
      '(m) Represent and negotiate for Philippine interest on matters pertaining to ICT in international bodies, in coordination with the Department of Foreign Affairs (DFA) and other institutions concerned;',
    ],
  },
  {
    title: 'IV. Consumer Protection and Industry Development',
    items: [
      '(n) Ensure and protect the rights and welfare of consumers and business users to privacy, security and confidentiality in matters relating to ICT, in coordination with agencies concerned, the private sector and relevant international bodies;',
      '(o) Support the promotion of trade and investment opportunities in the ICT and ICT-ES sectors, in coordination with the Department of Trade and Industry (DTI) and other relevant government agencies and the private sector;',
      '(p) Establish guidelines for public-private partnerships in the implementation of ICT projects for government agencies;',
      '(q) Promote strategic partnerships and alliances between and among local and international ICT, research and development, educational and training institutions to speed up industry growth and enhance competitiveness of Philippine workers, firms, and small and medium enterprises in the global markets for ICT and ICT-ES;',
    ],
  },
  {
    title: 'V. Cybersecurity Policy and Program Coordination',
    items: [
      '(r) To formulate a national cybersecurity plan consisting of robust and coherent strategies that would minimize national security risks in order to promote a peaceful, secure, open and cooperative ICT environment;',
      '(s) To extend immediate assistance for the suppression of real-time commission of cybercrime offenses and cyber-attacks against critical infrastructures and/or affecting national security through a computer emergency response team (CERT);',
      '(t) To provide pro-active government countermeasures to address and anticipate all domestic and transnational incidents affecting the Philippine cyberspace and any cybersecurity threats to the country;',
      '(u) To enhance the public-private partnership in the field of information sharing involving cyber-attacks, threats and vulnerabilities, and to coordinate in the preparation of appropriate and effective measures to prevent and suppress cybercrime as provided in R.A. No. 10175;',
      '(v) To monitor cybercrime cases being handled by participating law and prosecution agencies, and to facilitate international cooperation on intelligence, investigations, training and capacity building related to cybercrime prevention, suppression, and prosecution;',
      '(w) To coordinate the support participation of the business sector, local government units and nongovernment organizations in cybercrime prevention programs and other related projects;',
      '(x) To recommend the enactment of appropriate laws, issuances, measures and policies;',
      "(y) To call upon any government agency to render assistance in the accomplishment of the Department's mandated tasks and functions;",
      '(z) To perform all other matters related to cybercrime prevention and suppression including capacity building and such other functions and duties as may be necessary for the proper implementation of R.A. No. 10175;',
    ],
  },
  {
    title: 'VI. Countryside Development',
    items: [
      '(aa) Formulate policies in consultation with local government units and other local stakeholders and line agencies for the implementation of responsive, relevant and comprehensive ICT-related strategies to improve the competitiveness of provincial locations for ICT and ICT-ES industry in order to develop balanced investments between high-growth and economically-depressed areas and to promote the development and widespread use of ICT;',
      '(bb) Develop plans and programs in coordination with LGUs and other local stakeholders and line agencies to ensure that universal access to ICT services and infrastructure are effectively utilized to generate investments and opportunities in the rural area or areas unserved by private sector;',
      '(cc) Assist, guide and support ICT-related activities and initiatives for countryside economic development; and',
      '(dd) Promote and assist LGUs and local stakeholders in developing specialized ICT-enabled investments areas by providing technical and industry-calibrated assistance in the use of ICT for the enhancement of key public services, development and promotion of local arts and culture, tourism, digital literacy, and talent development.',
    ],
  },
];

const MISSION_BULLETS = [
  'Provide every Filipino access to vital ICT infostructure and services',
  'Ensure sustainable growth of Philippine ICT-enabled industries resulting to creation of more jobs',
  'Establish a One Digitized Government, One Nation',
  'Support the administration in fully achieving its goals',
  "Be the enabler, innovator, achiever and leader in pushing the country's development and transition towards a world-class digital economy",
];

const CORE_VALUES = [
  { letter: 'D', value: 'Dignity' },
  { letter: 'I', value: 'Integrity' },
  { letter: 'C', value: 'Competency and Compassion' },
  { letter: 'T', value: 'Transparency' },
];

const TEAM = [
  { name: 'Regional Director', title: 'Office of the Regional Director', initials: 'RD' },
  { name: 'Assistant Regional Director', title: 'Office of the ARD', initials: 'ARD' },
  { name: 'ICT Officer', title: 'Technical Division', initials: 'ICT' },
  { name: 'Administrative Officer', title: 'Administrative & Finance Division', initials: 'AFD' },
];

/* ─────────────────────────── tab panels ──────────────────────────── */

function MandateTab() {
  return (
    <div className="max-w-4xl">
      <div className="bg-[#0038A8]/5 dark:bg-blue-900/10 border-l-4 border-[#0038A8] rounded-r-xl p-5 mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-[#0038A8] dark:text-blue-400 mb-2">
          MANDATE — RA 10844
        </p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
          The Department of Information and Communications Technology (DICT) shall be the primary
          policy, planning, coordinating, implementing, and administrative entity of the Executive
          Branch of the government that will plan, develop, and promote the national ICT development
          agenda. <span className="font-semibold">(RA 10844)</span>
        </p>
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">
        Powers and Functions
      </h3>
      <div className="space-y-8">
        {POWERS_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-sm font-bold text-[#0038A8] dark:text-blue-400 mb-3">
              {section.title}
            </p>
            <ul className="space-y-2.5">
              {section.items.map((item, j) => (
                <li key={j} className="flex gap-3 items-start">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-[#FCD116] dark:bg-blue-400 rounded-full shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* <div className="mt-12 flex items-center gap-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm max-w-sm">
        <img src="/lakip.png" alt="LAKIP" className="h-12 object-contain shrink-0" />
        <div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">LAKIP</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Lingkod Award sa Katawang Pilipino – Annual Performance Accountability Report
          </p>
        </div>
      </div> */}
    </div>
  );
}

function MissionTab() {
  return (
    <div className="max-w-4xl space-y-10">
      <div className="text-center py-6">
        <p className="text-2xl font-black text-[#0038A8] dark:text-blue-400 italic">
          "DICT of the people and for the people."
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-10 h-1 bg-[#CE1126] dark:bg-blue-600 rounded mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mission</h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          The Department of Information and Communications Technology commits to:
        </p>
        <ul className="space-y-2.5">
          {MISSION_BULLETS.map((item, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="mt-1 w-5 h-5 bg-[#0038A8] text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                {i + 1}
              </span>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-10 h-1 bg-[#0038A8] rounded mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Vision</h2>
        <p className="text-[#0038A8] dark:text-blue-300 font-semibold text-sm italic mb-3">
          "An innovative, safe and happy nation that thrives through and is enabled by Information
          and Communications Technology."
        </p>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          DICT aspires for the Philippines to develop and flourish through innovation and constant
          development of ICT in the pursuit of a progressive, safe, secured, contented and happy
          Filipino nation.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Core Values</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CORE_VALUES.map(({ letter, value }) => (
            <div key={letter} className="bg-[#0038A8] rounded-xl p-5 text-center text-white shadow-sm">
              <p className="text-4xl font-black text-[#FCD116] dark:text-blue-300 mb-1">{letter}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QualityTab() {
  return (
    <div className="max-w-3xl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <div className="w-10 h-1 bg-[#FCD116] dark:bg-blue-500 rounded mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">DICT Quality Policy</h2>
        <p>
          We, The Department of Information and Communications Technology, commit to lead in pushing
          the National ICT Development agenda in transitioning toward a world-class digital economy.
        </p>
        <p>
          We support the achievement of national development goals through innovation and provision
          of quality information and communications technology (ICT) products and services compliant
          with pertinent regulatory and statutory requirements and international standards.
        </p>
        <p>
          We adhere to the continual improvement of our Quality Management System by maintaining
          highly competent and committed public servants and by delivering quality services that
          exceed expectations of our stakeholders.
        </p>
      </div>
    </div>
  );
}

function CharterTab() {
  const pdfUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/CC_TARP_Regional_External_2025.pdf`;

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {"Citizen's Charter 2025"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Official DICT Region 10 Citizen's Charter documents
          </p>
        </div>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0038A8] text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          <ExternalLink size={14} /> Open PDF Copy of Citizen's Charter
        </a>
      </div>

      {/* Embedded service search */}
      <CharterSearch />

      
    </div>
  );
}

/* ─────────────────────────── main component ──────────────────────── */

export default function AboutUs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = Math.max(
    0,
    TABS.findIndex((t) => t.id === searchParams.get('tab'))
  );
  const [activeTab, setActiveTab] = useState(initial);

  const switchTab = (i) => {
    setActiveTab(i);
    setSearchParams({ tab: TABS[i].id }, { replace: true });
  };

  return (
    <div className="dark:bg-gray-950 transition-colors duration-300">
      {/* Page header */}
      <section className="bg-[#0038A8] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FCD116] dark:text-blue-300 text-sm font-semibold uppercase tracking-wider mb-2">About</p>
          <h1 className="text-4xl font-black">DICT Region 10</h1>
          <p className="text-white/70 mt-2 max-w-xl">
            Department of Information and Communications Technology – Northern Mindanao Regional Office
          </p>
        </div>
      </section>

      {/* Sticky tab bar */}
      <div className="sticky top-16 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => switchTab(i)}
                className={`shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === i
                    ? 'border-[#0038A8] text-[#0038A8] dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 0 && <MandateTab />}
        {activeTab === 1 && <MissionTab />}
        {activeTab === 2 && <QualityTab />}
        {activeTab === 3 && <CharterTab />}
      </div>

      {/* Key Personnel */}
      {/* <section className="bg-gray-50 dark:bg-gray-900 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Key Personnel</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Placeholder – update with actual team information
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {TEAM.map((member) => (
              <div
                key={member.initials}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 text-center shadow-sm"
              >
                <div className="w-14 h-14 bg-[#0038A8] rounded-full flex items-center justify-center text-white font-black text-sm mx-auto mb-3">
                  {member.initials}
                </div>
                <p className="font-semibold text-gray-800 dark:text-white text-sm">{member.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{member.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Contact */}
      <section className="bg-[#0038A8] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Contact Information</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: MapPin, label: 'Address', value: 'Cagayan de Oro City, Misamis Oriental, Philippines' },
              { icon: Phone, label: 'Phone', value: '(088) 000-0000 (Placeholder)' },
              { icon: Mail, label: 'Email', value: 'region10@dict.gov.ph' },
              { icon: Globe, label: 'Website', value: 'dict.gov.ph' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex gap-3">
                <Icon size={20} className="text-[#FCD116] dark:text-blue-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
                  <p className="text-sm mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


