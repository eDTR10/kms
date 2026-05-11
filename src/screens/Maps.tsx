// @ts-nocheck
export default function Maps() {
  const AREAS = [
    { name: 'Cagayan de Oro City', embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126103.59898803897!2d124.5953!3d8.4542!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32fff0ef06ee3603%3A0x8e03563e9da9ec89!2sCagayan%20de%20Oro%2C%20Misamis%20Oriental!5e0!3m2!1sen!2sph!4v1' },
    { name: 'Iligan City', embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125835.5!2d124.1!3d8.2333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32ffd8f5d69f1e95%3A0x36c1e22e7d94c70e!2sIligan%20City%2C%20Lanao%20del%20Norte!5e0!3m2!1sen!2sph!4v1' },
  ];

  return (
    <div className="dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <section className="bg-[#0038A8] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FCD116] dark:text-blue-300 text-sm font-semibold uppercase tracking-wider mb-2">Coverage</p>
          <h1 className="text-4xl font-black">Maps</h1>
          <p className="text-white/70 mt-2">Geographic coverage of DICT Region 10 programs and services.</p>
        </div>
      </section>

      {/* Region overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Region 10 – Northern Mindanao</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Region 10 covers 5 provinces: Bukidnon, Camiguin, Lanao del Norte, Misamis Occidental, and Misamis Oriental,
          plus 2 highly urbanized cities: Cagayan de Oro and Iligan.
        </p>
        <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md" style={{ height: '500px' }}>
          <iframe
            title="Region 10 Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1010274.5!2d124.0!3d8.3!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32fff9b00aeb3603%3A0x1b23456789abcdef!2sRegion%2010%2C%20Northern%20Mindanao!5e0!3m2!1sen!2sph!4v1"
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* City Maps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Key Cities</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {AREAS.map((area) => (
            <div key={area.name}>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{area.name}</h3>
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm" style={{ height: '300px' }}>
                <iframe
                  title={area.name}
                  src={area.embed}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

