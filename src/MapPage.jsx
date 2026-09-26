import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import DestinationSearch from './DestinationSearch';
import ZipInfoCard from './ZipInfoCard';
import EventCard from './EventCard';
import { findNearbyZips } from './nearbyZips';
import { MOCK_EVENTS } from './mockEvents';

const API_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;
const MAP_ID = import.meta.env.VITE_MAP_ID;

const CATEGORY_ICONS = { cafe: '☕', fitness: '🏃', music: '🎵', market: '🛍️' };

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
  const [selectedZip, setSelectedZip] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Swap MOCK_EVENTS for the teammate's real events later
  const events = destination ? MOCK_EVENTS : [];

  useEffect(() => {
    if (!destination) return;
    setSelectedZip(null);
    findNearbyZips(destination, 30).then(setNearbyZips);
  }, [destination]);

  const closeCards = () => { setSelectedZip(null); setSelectedEvent(null); };

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
        <div style={{
          position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1, width: 360, maxWidth: '90%',
          background: 'white', borderRadius: 8, padding: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#222' }}>
            Where do you work or study?
          </div>
          <DestinationSearch onSelect={setDestination} />
          {nearbyZips.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 14, color: '#333' }}>
              {nearbyZips.length} areas within 30 miles. Click one for details.
            </div>
          )}
        </div>

        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
          defaultZoom={4}
          gestureHandling="greedy"
          onClick={closeCards}
        >
          {/* ZIP dots */}
          {nearbyZips.map(z => (
            <AdvancedMarker
              key={z.zip}
              position={{ lat: z.lat, lng: z.lng }}
              title={z.zip}
              onClick={() => { setSelectedEvent(null); setSelectedZip(z); }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: '50%', cursor: 'pointer',
                background: selectedZip?.zip === z.zip ? '#f59e0b' : '#2563eb',
                border: '2px solid white',
              }} />
            </AdvancedMarker>
          ))}

          {/* Event pins: gold = promoted business, purple = regular */}
          {events.map(ev => (
            <AdvancedMarker
              key={ev.event_id}
              position={{ lat: ev.lat, lng: ev.lng }}
              title={ev.title}
              zIndex={10}
              onClick={() => { setSelectedZip(null); setSelectedEvent(ev); }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, border: '2px solid white',
                background: ev.is_promoted ? '#f59e0b' : '#7c3aed',
                boxShadow: ev.is_promoted ? '0 0 10px 3px rgba(245,158,11,0.6)' : '0 1px 4px rgba(0,0,0,0.3)',
              }}>
                {CATEGORY_ICONS[ev.category] ?? '📍'}
              </div>
            </AdvancedMarker>
          ))}

          {selectedZip && (
            <InfoWindow
              position={{ lat: selectedZip.lat, lng: selectedZip.lng }}
              pixelOffset={[0, -10]}
              onCloseClick={() => setSelectedZip(null)}
            >
              <ZipInfoCard zip={selectedZip} />
            </InfoWindow>
          )}

          {selectedEvent && (
            <InfoWindow
              position={{ lat: selectedEvent.lat, lng: selectedEvent.lng }}
              pixelOffset={[0, -18]}
              onCloseClick={() => setSelectedEvent(null)}
            >
              <EventCard event={selectedEvent} />
            </InfoWindow>
          )}

          {destination && (
            <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} />
          )}
          <PanToDestination destination={destination} />
        </Map>
      </div>
    </APIProvider>
  );
}