import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import DestinationSearch from './DestinationSearch';
import ZipInfoCard from './ZipInfoCard';
import EventCard from './EventCard';
import HomeCard from './HomeCard';
import { findNearbyZips } from './nearbyZips';
import { useEvents } from './eventStore';
import { CATEGORY_ICONS } from './eventCategories';
import { fetchTicketmasterEvents } from './ticketmaster';
import { fetchCommuteTimes } from './commute';
import { fetchListings, formatPrice, median } from './listings';
import CompareModal from './CompareModal';
import { compareHomes } from './compareHomes';

const API_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;
const MAP_ID = import.meta.env.VITE_MAP_ID;
// Comparing just two homes keeps each comparison light on API calls
const MAX_SAVED = 2;

// Ticketmaster events can be "sports", which businesses can't post
const PIN_ICONS = { ...CATEGORY_ICONS, sports: '🏟️' };

// Green = comfortably under the limit, yellow = close to it, gray = still loading
function dotColor(zip, maxCommute) {
  if (zip.commute_mins == null) return '#9ca3af';
  if (zip.commute_mins <= maxCommute * 0.6) return '#16a34a';
  return '#eab308';
}

// Moves/zooms the map whenever "focus" changes
function MapFocus({ focus }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    map.setZoom(focus.zoom);
  }, [map, focus]);
  return null;
}

const toggleStyle = active => ({
  flex: 1, padding: '6px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  borderRadius: 6, border: '1px solid #d1d5db',
  background: active ? '#111' : '#f9fafb', color: active ? 'white' : '#111',
});

const iconButtonStyle = {
  border: 'none', background: 'none', cursor: 'pointer',
  fontSize: 16, color: '#555', padding: '0 4px', lineHeight: 1,
};

export default function MapPage({ initialZip = null }) {
  const [destination, setDestination] = useState(null);
  // ZIP handed over from the quiz; selected once the nearby ZIPs load
  const [pendingZip, setPendingZip] = useState(initialZip?.zip ?? null);
  const [focus, setFocus] = useState(null);
  const [nearbyZips, setNearbyZips] = useState([]);
  const [commuteLoaded, setCommuteLoaded] = useState(false);
  const [maxCommute, setMaxCommute] = useState(30);
  const [tmEvents, setTmEvents] = useState([]);
  const [selectedZip, setSelectedZip] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [searchMode, setSearchMode] = useState('job'); // 'job' = commute matters, 'area' = just exploring

  // Homes view: { zip, type: 'rent' | 'sale', listings, loading, error } or null
  const [homes, setHomes] = useState(null);
  const [selectedHome, setSelectedHome] = useState(null);

  // Up to MAX_SAVED homes for comparison
  const [savedHomes, setSavedHomes] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareState, setCompareState] = useState({ loading: false, error: null, result: null });

  // Live posts published through the business page
  const { events: businessEvents } = useEvents();

  // Coming from the quiz: center the search on that ZIP
  const { zip: startZip, lat: startLat, lng: startLng } = initialZip ?? {};
  useEffect(() => {
    if (!startZip) return;
    let cancelled = false;
    const label = `ZIP ${startZip}`;
    if (startLat != null && startLng != null) {
      setDestination({ label, lat: startLat, lng: startLng });
      return;
    }
    fetch('/zip-centroids.json')
      .then(r => r.json())
      .then(zips => {
        const match = zips.find(z => z.zip === startZip);
        if (!cancelled && match) setDestination({ label, lat: match.lat, lng: match.lng });
      })
      .catch(err => console.error('ZIP lookup error:', err));
    return () => { cancelled = true; };
  }, [startZip, startLat, startLng]);

  // Once nearby ZIPs are in, open the card for the ZIP picked in the quiz
  useEffect(() => {
    if (!pendingZip || nearbyZips.length === 0) return;
    const match = nearbyZips.find(z => z.zip === pendingZip);
    if (match) {
      setSelectedZip(match);
      setFocus({ lat: match.lat, lng: match.lng, zoom: 12 });
    }
    setPendingZip(null);
  }, [pendingZip, nearbyZips]);

  // When a destination is picked: find nearby ZIPs, commute times, and real events
  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    setSelectedZip(null);
    setSelectedEvent(null);
    setHomes(null);
    setSelectedHome(null);
    setTmEvents([]);
    setCommuteLoaded(false);
    setFocus({ lat: destination.lat, lng: destination.lng, zoom: 10 });

    findNearbyZips(destination, 30).then(async zips => {
  if (cancelled) return;
  setNearbyZips(zips);
  if (searchMode !== 'job') { setCommuteLoaded(true); return; } // no commute needed
  try {
    const times = await fetchCommuteTimes(destination, zips.slice(0, 150));
    if (!cancelled) {
      setNearbyZips(zips.map(z => ({ ...z, commute_mins: times[z.zip] ?? null })));
      setCommuteLoaded(true);
    }
  } catch (err) {
    console.error('Commute error:', err);
  }
});

    fetchTicketmasterEvents(destination.lat, destination.lng, 30)
      .then(evts => { if (!cancelled) setTmEvents(evts); })
      .catch(err => console.error('Ticketmaster error:', err));

    return () => { cancelled = true; };
  }, [destination]);

  // Collapse the panel whenever a card opens, so it never covers the card
  useEffect(() => {
    if (selectedZip || selectedEvent || selectedHome) setPanelOpen(false);
  }, [selectedZip, selectedEvent, selectedHome]);

  function showHomes(zip, type) {
    setSelectedZip(null);
    setSelectedEvent(null);
    setSelectedHome(null);
    setHomes({ zip, type, listings: [], loading: true, error: null });
    setFocus({ lat: zip.lat, lng: zip.lng, zoom: 13 });

    fetchListings(zip.zip, type)
      .then(listings => setHomes(h =>
        h && h.zip.zip === zip.zip && h.type === type ? { ...h, listings, loading: false } : h))
      .catch(err => setHomes(h =>
        h && h.zip.zip === zip.zip && h.type === type ? { ...h, loading: false, error: err.message } : h));
  }

  function toggleSaveHome(home) {
    setSavedHomes(prev => {
      const exists = prev.some(h => h.id === home.id);
      if (exists) return prev.filter(h => h.id !== home.id);
      if (prev.length >= MAX_SAVED || !homes) return prev;
      return [...prev, {
        id: home.id, address: home.address, price: home.price,
        lat: home.lat, lng: home.lng, listingType: homes.type,
        zip: homes.zip.zip, homeValue: homes.zip.home_value,
        beds: home.beds, baths: home.baths, sqft: home.sqft, daysOnMarket: home.days_on_market,
      }];
    });
  }

  async function runCompare() {
    setCompareOpen(true);
    setCompareState({ loading: true, error: null, result: null });
    try {
      const result = await compareHomes(savedHomes);
      setCompareState({ loading: false, error: null, result });
    } catch (err) {
      console.error('Compare error:', err);
      setCompareState({ loading: false, error: err.message, result: null });
    }
  }

  function exitHomes() {
    setHomes(null);
    setSelectedHome(null);
    setPanelOpen(true);
    if (destination) setFocus({ lat: destination.lat, lng: destination.lng, zoom: 10 });
  }

  const inHomesView = homes != null;

  const visibleZips = inHomesView ? [] : (searchMode === 'job' && commuteLoaded)
  ? nearbyZips.filter(z => z.commute_mins != null && z.commute_mins <= maxCommute)
  : nearbyZips;

  const events = destination && !inHomesView
    ? [...tmEvents, ...businessEvents]
    : [];

  const medianPrice = homes ? median(homes.listings.map(l => l.price)) : null;

  const closeCards = () => { setSelectedZip(null); setSelectedEvent(null); setSelectedHome(null); };
  const selectedZipData = selectedZip
    ? nearbyZips.find(z => z.zip === selectedZip.zip) ?? selectedZip
    : null;

  // Short summary shown when the panel is collapsed
  const pillText = inHomesView
    ? `${homes.type === 'rent' ? '🏠 Rentals' : '🏡 For sale'} in ${homes.zip.zip}`
    : destination
      ? `🔍 ${destination.label} · ${visibleZips.length} areas`
      : '🔍 Search';

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>

        {/* Collapsed: small pill in the top-left */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            style={{
              position: 'absolute', top: 88, left: 12, zIndex: 1, maxWidth: 320,
              background: 'white', color: '#222', border: 'none', borderRadius: 20,
              padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {pillText} ▸
          </button>
        )}

        {/* Expanded panel in the top-left (kept mounted so the search box keeps its text) */}
        <div style={{
          display: panelOpen ? 'block' : 'none',
          position: 'absolute', top: 88, left: 12, zIndex: 1, width: 340, maxWidth: '85%',
          background: 'white', borderRadius: 8, padding: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', color: '#222',
        }}>
          {/* Normal view: search + commute slider */}
          <div style={{ display: inHomesView ? 'none' : 'block' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
  <button
    onClick={() => setSearchMode('job')}
    style={toggleStyle(searchMode === 'job')}
  >
    Near my job
  </button>
  <button
    onClick={() => setSearchMode('area')}
    style={toggleStyle(searchMode === 'area')}
  >
    Explore an area
  </button>
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
  <span style={{ fontSize: 14, fontWeight: 600 }}>
    {searchMode === 'job' ? 'Where do you work or study?' : 'What city or area are you considering?'}
  </span>
              {destination && (
                <button style={iconButtonStyle} onClick={() => setPanelOpen(false)} title="Minimize">◂</button>
              )}
            </div>
            <DestinationSearch onSelect={setDestination} />

            {nearbyZips.length > 0 && searchMode === 'job' && (
  <div style={{ marginTop: 8, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Max commute: <strong>{maxCommute} min</strong>
                  <input
                    type="range" min={10} max={60} step={5}
                    value={maxCommute}
                    onChange={e => setMaxCommute(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </label>
                <div style={{ marginTop: 4, color: '#555' }}>
                  {commuteLoaded
                    ? `${visibleZips.length} areas within ${maxCommute} min · ${events.length} events`
                    : 'Calculating commute times…'}
                </div>
                {commuteLoaded && (
                  <div style={{ marginTop: 2, fontSize: 12, color: '#777' }}>
                    🟢 under {Math.round(maxCommute * 0.6)} min · 🟡 up to {maxCommute} min
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Homes view: which ZIP, rent/buy toggle, status, back button */}
          {inHomesView && (
            <div style={{ fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={exitHomes}
                  style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  ← Back to all areas
                </button>
                <button style={iconButtonStyle} onClick={() => setPanelOpen(false)} title="Minimize">◂</button>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, margin: '6px 0' }}>
                Homes in ZIP {homes.zip.zip}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={toggleStyle(homes.type === 'rent')} onClick={() => showHomes(homes.zip, 'rent')}>
                  🏠 Rentals
                </button>
                <button style={toggleStyle(homes.type === 'sale')} onClick={() => showHomes(homes.zip, 'sale')}>
                  🏡 For sale
                </button>
              </div>
              <div style={{ marginTop: 6, color: homes.error ? '#b91c1c' : '#555' }}>
                {homes.loading && 'Loading listings…'}
                {homes.error && homes.error}
                {!homes.loading && !homes.error && (homes.listings.length
                  ? `${homes.listings.length} listings · median ${formatPrice(medianPrice, homes.type)}${homes.type === 'rent' ? '/mo' : ''}`
                  : 'No active listings found here')}
              </div>
            </div>
          )}
        </div>

        {/* Saved homes / compare */}
        {savedHomes.length > 0 && !compareOpen && (
          <button
            onClick={runCompare}
            disabled={savedHomes.length < 2}
            style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1, background: '#19350C', color: 'white', border: 'none',
              borderRadius: 24, padding: '10px 20px', fontSize: 14, fontWeight: 700,
              cursor: savedHomes.length < 2 ? 'not-allowed' : 'pointer',
              opacity: savedHomes.length < 2 ? 0.6 : 1,
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            ♥ {savedHomes.length}/{MAX_SAVED} saved — {savedHomes.length < MAX_SAVED ? 'save 1 more to compare' : 'Compare'}
          </button>
        )}

        {compareOpen && (
          <CompareModal
            state={compareState}
            count={savedHomes.length}
            onClose={() => setCompareOpen(false)}
            onRetry={runCompare}
          />
        )}

        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
          defaultZoom={4}
          gestureHandling="greedy"
          onClick={closeCards}
        >
          {/* ZIP dots, colored by commute */}
          {visibleZips.map(z => (
            <AdvancedMarker
              key={z.zip}
              position={{ lat: z.lat, lng: z.lng }}
              title={z.zip}
              onClick={() => { setSelectedEvent(null); setSelectedZip(z); }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
                background: selectedZip?.zip === z.zip ? '#f97316' : (searchMode === 'job' ? dotColor(z, maxCommute) : '#2563eb'),
                border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
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
                {PIN_ICONS[ev.category] ?? '📍'}
              </div>
            </AdvancedMarker>
          ))}

          {/* House price-tag pins: purple = saved, black = open */}
          {inHomesView && homes.listings.map(home => {
            const isSelected = selectedHome?.id === home.id;
            const isSaved = savedHomes.some(h => h.id === home.id);
            return (
              <AdvancedMarker
                key={home.id}
                position={{ lat: home.lat, lng: home.lng }}
                title={home.address}
                zIndex={isSelected ? 30 : isSaved ? 25 : 20}
                onClick={() => setSelectedHome(home)}
              >
                <div style={{
                  background: isSaved ? '#9333ea' : isSelected ? '#111' : (homes.type === 'rent' ? '#0d9488' : '#2563eb'),
                  color: 'white', fontSize: 12, fontWeight: 700, padding: '3px 7px',
                  borderRadius: 12, border: `2px solid ${isSaved && isSelected ? '#111' : 'white'}`, whiteSpace: 'nowrap',
                  boxShadow: isSaved ? '0 0 8px 2px rgba(147,51,234,0.55)' : '0 1px 4px rgba(0,0,0,0.35)',
                  cursor: 'pointer',
                }}>
                  {isSaved && '♥ '}{formatPrice(home.price, homes.type)}
                </div>
              </AdvancedMarker>
            );
          })}

          {selectedZipData && (
            <InfoWindow
              position={{ lat: selectedZipData.lat, lng: selectedZipData.lng }}
              pixelOffset={[0, -10]}
              onCloseClick={() => setSelectedZip(null)}
            >
              <ZipInfoCard
                zip={selectedZipData}
                onShowHomes={type => showHomes(selectedZipData, type)}
              />
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

          {selectedHome && homes && (
            <InfoWindow
              position={{ lat: selectedHome.lat, lng: selectedHome.lng }}
              pixelOffset={[0, -14]}
              onCloseClick={() => setSelectedHome(null)}
            >
              <HomeCard
                home={selectedHome}
                type={homes.type}
                medianPrice={medianPrice}
                zipHomeValue={homes.zip.home_value}
                isSaved={savedHomes.some(h => h.id === selectedHome.id)}
                canSave={savedHomes.length < MAX_SAVED || savedHomes.some(h => h.id === selectedHome.id)}
                onToggleSave={() => toggleSaveHome(selectedHome)}
              />
            </InfoWindow>
          )}

          {destination && (
            <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} />
          )}
          <MapFocus focus={focus} />
        </Map>
      </div>
    </APIProvider>
  );
}