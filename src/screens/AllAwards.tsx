// @ts-nocheck
import Awards from '../components/Awards';

// Full award listing — Awards.tsx already renders its own "Recognition / Awards"
// section header, so this page is just that component with no `limit`, unlike the
// homepage's capped teaser (see Home.tsx's <Awards limit={6} hideInactive />).
// hideInactive={false}: this page is the complete archive — the admin's hide toggle
// only takes an award off the homepage teaser, it isn't a full unpublish.
export default function AllAwards() {
  return (
    <div className="dark:bg-gray-950 min-h-screen">
      <Awards hideInactive={false} />
    </div>
  );
}
