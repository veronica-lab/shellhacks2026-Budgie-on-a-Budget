import { APIProvider, Map } from '@vis.gl/react-google-maps';

const API_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;
const MAP_ID = import.meta.env.VITE_MAP_ID;

export default function MapPage() {
  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ height: '100vh', width: '100%' }}>
        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
          defaultZoom={4}
          gestureHandling="greedy"
        />
      </div>
    </APIProvider>
  );
}
