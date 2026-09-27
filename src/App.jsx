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

export default function App() {
  const route = useCurrentRoute();
  const isMap = route === MAP_ROUTE;
  const isQuiz = route === QUIZ_ROUTE;
  const isBudget = route === BUDGET_ROUTE;

  useEffect(() => {
    if ([MAP_ROUTE, QUIZ_ROUTE, BUDGET_ROUTE].includes(route)) {
      window.scrollTo(0, 0);
    }
  }, [route]);

  if (isMap) {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <MapPage />
      </>
    );
  }

  if (isQuiz) {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <PreferenceQuestionnaire onOpenMap={() => { window.location.hash = MAP_ROUTE; }} />
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