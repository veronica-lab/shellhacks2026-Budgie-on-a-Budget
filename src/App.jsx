<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import DestinationSearch from './DestinationSearch';
=======
import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import MapPage from './MapPage.jsx';
>>>>>>> de62a006c27fa4b348e6ec3b9a95319186e184bf

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

// Moves the map to the chosen destination
function PanToDestination({ destination }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !destination) return;
    map.panTo({ lat: destination.lat, lng: destination.lng });
    map.setZoom(11);
  }, [map, destination]);
  return null;
}

export default function App() {
<<<<<<< HEAD
  const [destination, setDestination] = useState(null);

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 1, width: 360,
          background: 'white', borderRadius: 8, padding: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <DestinationSearch onSelect={setDestination} />
        </div>

        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
          defaultZoom={4}
          gestureHandling="greedy"
        >
          {destination && (
            <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} />
          )}
          <PanToDestination destination={destination} />
        </Map>
      </div>
    </APIProvider>
  );
}
=======
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
>>>>>>> de62a006c27fa4b348e6ec3b9a95319186e184bf
