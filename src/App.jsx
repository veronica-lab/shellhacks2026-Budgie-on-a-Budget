import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import DestinationSearch from './DestinationSearch';

const API_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;
const MAP_ID = import.meta.env.VITE_MAP_ID;

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