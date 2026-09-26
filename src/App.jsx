import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import MapPage from './MapPage.jsx';

const MAP_ROUTE = '#/map';

// Minimal hash routing: "#/map" shows the map; everything else is the homepage
// (plain "#section" hashes still scroll within the homepage).
function useIsMapRoute() {
  const [isMap, setIsMap] = useState(() => window.location.hash === MAP_ROUTE);

  useEffect(() => {
    const onHashChange = () => setIsMap(window.location.hash === MAP_ROUTE);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return isMap;
}

export default function App() {
  const isMap = useIsMapRoute();

  useEffect(() => {
    if (isMap) window.scrollTo(0, 0);
  }, [isMap]);

  if (isMap) {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <MapPage />
      </>
    );
  }

  return <Home />;
}
