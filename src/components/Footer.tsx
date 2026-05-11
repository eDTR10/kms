// @ts-nocheck
import dictLogo from '../assets/project-logo/DICT Logo.png';
export default function Footer() {
  return (
    <footer className="bg-[#0038A8] dark:bg-[#030912] text-white mt-auto">
      <div className="h-1 bg-linear-to-r from-[#CE1126] via-[#FCD116] to-[#CE1126] dark:from-blue-900 dark:via-blue-600 dark:to-blue-900" />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <img src={dictLogo} alt="DICT Logo" className="w-14 h-14 object-contain shrink-0" />
            <div>
              <h3 className="font-bold text-lg mb-1">DICT Region 10</h3>
              <p className="text-white/70 text-sm">
                Department of Information and Communications Technology<br />
                Northern Mindanao Region
              </p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#FCD116] dark:text-blue-300 mb-2">Quick Links</h3>
            <ul className="space-y-1 text-sm text-white/70">
              <li><a href="https://dict.gov.ph" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">DICT Official Website</a></li>
              <li><a href="https://sites.google.com/dict.gov.ph/dict-region-10-kms/home" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Original KMS Site</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#FCD116] dark:text-blue-300 mb-2">Contact</h3>
            <p className="text-white/70 text-sm">Region 10 – Northern Mindanao<br />Cagayan de Oro City, Philippines</p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-white/20 text-center text-white/50 text-xs">
          © {new Date().getFullYear()} DICT Region 10 KMS PortalX. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

