// @ts-nocheck
import highlightsData from '../data/highlights.json';

/** Returns the list of hero-slider office highlights. Swap the body for
 *  `const { data } = await axios.get('highlights'); return data;`
 *  once the backend endpoint exists — the shape already matches.
 */
export async function getHighlights() {
  return highlightsData.data;
}
