import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import DestinationSearch from './DestinationSearch';
import { findNearbyZips } from './nearbyZips';

const API_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;
const MAP_ID = import.meta.env.VITE_MAP_ID;

function PanToDestination({ destination }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !destination) return;
    map.panTo({ lat: destination.lat, lng: destination.lng });
    map.setZoom(10);
  }, [map, destination]);
  return null;
}

export default function MapPage() {
  const [destination, setDestination] = useState(null);
  const [nearbyZips, setNearbyZips] = useState([]);

  // Whenever a destination is picked, find ZIPs within 30 miles
  useEffect(() => {
    if (!destination) return;
    findNearbyZips(destination, 30).then(setNearbyZips);
  }, [destination]);

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1, width: 360, maxWidth: '90%',
          background: 'white', borderRadius: 8, padding: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <DestinationSearch onSelect={setDestination} />
          {nearbyZips.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 14, color: '#333' }}>
              {nearbyZips.length} ZIP codes within 30 miles
            </div>
          )}
        </div>

        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
          defaultZoom={4}
          gestureHandling="greedy"
        >
          {nearbyZips.map(z => (
            <AdvancedMarker key={z.zip} position={{ lat: z.lat, lng: z.lng }} title={z.zip}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: '#2563eb', border: '2px solid white',
              }} />
            </AdvancedMarker>
          ))}
          {destination && (
            <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} />
          )}
          <PanToDestination destination={destination} />
        </Map>
      </div>
    </APIProvider>
  );
}