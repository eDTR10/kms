// Canonical list of KMS showcase projects — labels match AdminLayout.tsx's PROJECTS
// array / Navbar.tsx's PROJECT_LINKS. Each project is backed by one offices_office row
// (its officeType is "Project" on the Offices admin page), identified here by that
// row's officeID — set officeId below once the office exists. Matching used to be done
// by normalizing and comparing the office's *name* against the label, but that broke
// silently whenever an office was renamed or didn't match exactly, so it's now an
// explicit, manually-set id instead.
export const KMS_PROJECTS = [
  { slug: 'free-wifi', label: 'Free Wi-Fi', officeId: 29 },
  { slug: 'ilcdb', label: 'ILCDB', officeId: 25 },
  { slug: 'egov', label: 'eGov (NGP)', officeId: 36 },
  { slug: 'cybersecurity', label: 'Cybersecurity / PNPKI', officeId: 27 },
  { slug: 'govnet', label: 'NBP / CDO GovNet', officeId: 30 },
  { slug: 'elgu', label: 'eLGU', officeId: 31 },
  { slug: 'iidb', label: 'IIDB', officeId: 26 },
  { slug: 'nippsb', label: 'NIPPSB', officeId: 28 },
  { slug: 'drrm', label: 'DRRM', officeId: 37 },
];

/** Match an office (as returned by getOfficesSlim(), shape { office_id, name, type })
 * to one of the known KMS projects by id — the office's own name/type no longer
 * matter for this lookup, only KMS_PROJECTS[].officeId above. */
export function matchProjectByOffice(office:any) {
  if (!office || office.office_id == null) return null;
  return KMS_PROJECTS.find((p) => p.officeId != null && p.officeId === office.office_id) || null;
}

/** Same match as above, but straight from an office id — no office-object indirection
 * needed. Used for a user's `projects` array (a list of office ids from /users/me/),
 * which is what actually determines an acc_lvl-2 user's project-admin assignment. */
export function matchProjectByOfficeId(officeId:any) {
  if (officeId == null) return null;
  return KMS_PROJECTS.find((p) => p.officeId != null && p.officeId === officeId) || null;
}
