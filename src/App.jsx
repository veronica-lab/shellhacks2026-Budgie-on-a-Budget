import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import MapPage from './MapPage.jsx';
import PreferenceQuestionnaire from './PreferenceQuestionnaire.jsx';
import BudgetAdvisorChat from './BudgetAdvisorChat.jsx';

const MAP_ROUTE = '#/map';
const QUIZ_ROUTE = '#/quiz';
const BUDGET_ROUTE = '#/budget';

// Plain "#section" hashes remain anchors on the homepage.
function useCurrentRoute() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

function parseZipQuery(query) {
  const params = new URLSearchParams(query);
  const zip = params.get('zip');
  if (!zip) return null;
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  return { zip, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
}

function openMapAtZip(zip) {
  if (!zip?.zip) {
    window.location.hash = MAP_ROUTE;
    return;
  }
  const params = new URLSearchParams({ zip: zip.zip });
  if (zip.lat != null && zip.lng != null) {
    params.set('lat', zip.lat);
    params.set('lng', zip.lng);
  }
  window.location.hash = `${MAP_ROUTE}?${params}`;
}

export default function App() {
  const route = useCurrentRoute();
  // Map route may carry a ZIP to preselect, e.g. "#/map?zip=33139&lat=..&lng=.."
  const [routePath, routeQuery = ''] = route.split('?');
  const isMap = routePath === MAP_ROUTE;
  const isQuiz = route === QUIZ_ROUTE;
  const isBudget = route === BUDGET_ROUTE;

  useEffect(() => {
    if ([MAP_ROUTE, QUIZ_ROUTE, BUDGET_ROUTE].includes(routePath)) {
      window.scrollTo(0, 0);
    }
  }, [routePath]);

  if (isMap) {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <MapPage key={routeQuery} initialZip={parseZipQuery(routeQuery)} />
      </>
    );
  }

  if (isQuiz) {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <PreferenceQuestionnaire onOpenMap={openMapAtZip} />
      </>
    );
  }

  if (isBudget) {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <BudgetAdvisorChat />
      </>
    );
  }

  return <Home />;
}