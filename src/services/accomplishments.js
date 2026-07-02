// @ts-nocheck
import accomplishmentsData from '../data/accomplishments.json';

/** Returns the list of home page accomplishments. Swap the body for
 *  `const { data } = await axios.get('accomplishments'); return data;`
 *  once the backend endpoint exists — the shape already matches.
 */
export async function getAccomplishments() {
  return accomplishmentsData.data;
}
