import { useEffect, useState } from 'react';
import AuthPage from './AuthPage.jsx';
import BusinessPage from './BusinessPage.jsx';
import CommunityPage from './CommunityPage.jsx';
import Home from './Home.jsx';
import MapPage from './MapPage.jsx';
import PreferenceQuestionnaire from './PreferenceQuestionnaire.jsx';
import BudgetAdvisorChat from './BudgetAdvisorChat.jsx';
import { useAuth } from './useAuth.js';

const ROUTES = {
  '#/map': 'map',
  '#/quiz': 'quiz',
  '#/budget': 'budget',
  '#/login': 'login',
  '#/signup': 'signup',
  '#/business': 'business',
  '#/community': 'community',
  '#community': 'community', // the feed used to be a homepage section; keep old links working
};

// An expired or already-used confirmation link lands here with the error in
// the hash (e.g. "#error=access_denied&error_description=..."). Read it once.
const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description') || '';

// Minimal hash routing: "#/map", "#/quiz", "#/login", etc. are pages; everything
// else is the homepage (plain "#section" hashes still scroll within it).
// A page can take a query after "?", e.g. "#/community?zip=33174".
function useRoute() {
  const [hash, setHash] = useState(() => (linkError ? '#/login' : window.location.hash));

  useEffect(() => {
    if (linkError) window.history.replaceState(null, '', '#/login');
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goHome = () => {
    window.history.replaceState(null, '', '#top');
    setHash('#top');
  };

  const [path, query = ''] = hash.split('?');
  return [ROUTES[path] ?? 'home', goHome, new URLSearchParams(query)];
}

// The map can open on a ZIP picked in the quiz, e.g. "#/map?zip=33139&lat=..&lng=..".
function parseZipQuery(params) {
  const zip = params.get('zip');
  if (!zip) return null;
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  return { zip, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null };
}

function openMapAtZip(zip) {
  if (!zip?.zip) {
    window.location.hash = '#/map';
    return;
  }
  const params = new URLSearchParams({ zip: zip.zip });
  if (zip.lat != null && zip.lng != null) {
    params.set('lat', zip.lat);
    params.set('lng', zip.lng);
  }
  window.location.hash = `#/map?${params}`;
}

export default function App() {
  const [route, goHome, params] = useRoute();
  const { session, loading } = useAuth();
  const isAuthRoute = route === 'login' || route === 'signup';

  // New pages start at the top. Coming back to the homepage from another page
  // with a section hash (e.g. "#how-it-works"), scroll to that section once it renders.
  useEffect(() => {
    if (route !== 'home') {
      window.scrollTo(0, 0);
      return;
    }
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [route]);

  // Once signed in, the login/signup pages send you to the main page.
  useEffect(() => {
    if (session && isAuthRoute) {
      goHome();
      window.scrollTo(0, 0);
    }
  });

  if (route === 'map') {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <MapPage key={params.toString()} initialZip={parseZipQuery(params)} />
      </>
    );
  }

  if (route === 'quiz') {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <PreferenceQuestionnaire onOpenMap={openMapAtZip} />

      </>
    );
  }

  if (route === 'budget') {
    return (
      <>
        <a className="map-back" href="#top">&larr; Back to home</a>
        <BudgetAdvisorChat />
      </>
    );
  }

  if (route === 'community') {
    const zip = params.get('zip') ?? '';
    return <CommunityPage session={session} authLoading={loading} zip={/^\d{5}$/.test(zip) ? zip : ''} />;
  }

  if (route === 'business') {
    return <BusinessPage session={session} authLoading={loading} />;
  }

  if (isAuthRoute && !session) {
    return <AuthPage key={route} mode={route} initialError={route === 'login' && linkError && `That link didn't work: ${linkError}. Log in, or sign up again to get a new link.`} />;
  }

  return <Home session={session} authLoading={loading} />;
}
