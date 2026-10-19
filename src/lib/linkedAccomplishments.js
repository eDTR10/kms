// @ts-nocheck
import api from '../services/api';
import { computeBindingDisplay } from '../screens/Admin/FreeWifi/FreeWifiCharts';

// Accomplishments linked to a project highlight whose title is dataset-driven get their
// big metric computed from that dataset (same maths as a Value Card); everything else
// passes through untouched. Datasets are fetched once per project.
export async function resolveLinkedAccomplishments(items) {
  const bound = items.filter((i) => i.linked_highlight?.title_binding?.enabled);
  if (!bound.length) return items;
  const offices = [...new Set(bound.map((i) => i.linked_highlight.office))];
  const byOffice = {};
  await Promise.all(offices.map((o) =>
    api.get('kms/project-datasets/', { params: { office: o } })
      .then(({ data }) => { byOffice[o] = data.results ?? data; })
      .catch(() => { byOffice[o] = []; })));
  return items.map((i) => {
    const lh = i.linked_highlight;
    if (!lh?.title_binding?.enabled) return i;
    const b = lh.title_binding;
    const table = (byOffice[lh.office] || []).find((t) => t.id === Number(b.dataset));
    const display = computeBindingDisplay(table, b);
    return display == null ? i : { ...i, metric: display };
  });
}
