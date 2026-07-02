// @ts-nocheck
import awardsData from '../data/awards.json';

/** Returns the list of awards. Swap the body for
 *  `const { data } = await axios.get('awards'); return data;`
 *  once the backend endpoint exists — the shape already matches.
 */
export async function getAwards() {
  return awardsData.data;
}
