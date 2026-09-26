import { useState } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import PreferenceQuestionnaire from './PreferenceQuestionnaire';
import BudgetAdvisorChat from './BudgetAdvisorChat';

const API_KEY = import.meta.env.VITE_MAPS_BROWSER_KEY;
const MAP_ID = import.meta.env.VITE_MAP_ID;

export default function App() {
  const [view, setView] = useState('quiz'); // 'quiz', 'budget', or 'map'

  return (
    <div className="min-h-screen flex flex-col bg-[#D5D3CC] text-[#19350C]">
      {/* Top Navigation Bar */}
      <header className="w-full bg-[#19350C] text-[#D5D3CC] border-b border-[#406768]/40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-widest uppercase text-white">
            We-Removers
          </span>
          <span className="text-xs text-[#6FA9BB] hidden sm:inline">
            | US Relocation & Neighborhood Index
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#244715] p-1 rounded-lg">
          <button
            onClick={() => setView('quiz')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              view === 'quiz'
                ? 'bg-[#687D31] text-white'
                : 'text-[#D5D3CC] hover:text-white'
            }`}
          >
            Relocation Questionnaire
          </button>
          <button
            onClick={() => setView('budget')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              view === 'budget'
                ? 'bg-[#687D31] text-white'
                : 'text-[#D5D3CC] hover:text-white'
            }`}
          >
            Budget Advisor Chat
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              view === 'map'
                ? 'bg-[#406768] text-white'
                : 'text-[#D5D3CC] hover:text-white'
            }`}
          >
            Interactive Map
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {view === 'quiz' && (
          <PreferenceQuestionnaire
            onOpenMap={() => setView('map')}
            onComplete={(data) => {
              console.log('Saved Relocation Preferences:', data);
            }}
          />
        )}

        {view === 'budget' && <BudgetAdvisorChat />}

        {view === 'map' && (
          <APIProvider apiKey={API_KEY}>
            <div style={{ height: 'calc(100vh - 57px)', width: '100%' }}>
              <Map
                mapId={MAP_ID}
                defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
                defaultZoom={4}
                gestureHandling="greedy"
              />
            </div>
          </APIProvider>
        )}
      </main>
    </div>
  );
}