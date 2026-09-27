import { useEffect, useRef, useState } from 'react';
import './BudgetPage.css';
import { SiteHeader } from './Home.jsx';

// Layout, calculations, profiles and Alberdy's replies follow budgie_budget_advisor.html.
// Colors from that file: sand nav #E3D5BC, page #F6F1E7, card #FBF9F5, callout #EFE7D6,
// border #DFD5C4, olive #5E772E (soft #EBF0E2, muted #D6DEC4), forest #1B3611 (text #1D2B16, muted #5C6654).

// State-specific tax & utility profiles
const STATE_PROFILES = {
  FL: {
    name: 'Florida',
    metro: 'Miami & South Florida',
    taxRate: 0.175,
    taxNote: 'No state income tax • Estimated 17.5% federal & FICA tax',
    utilities: 750,
    neighborhoods: 'Little Havana, Coral Way, Kendall, or North Beach ($1,700–$1,950/mo)',
  },
  TX: {
    name: 'Texas',
    metro: 'Austin & Dallas Metro',
    taxRate: 0.175,
    taxNote: 'No state income tax • Estimated 17.5% federal & FICA tax',
    utilities: 710,
    neighborhoods: 'South Lamar, Mueller, or Bishop Arts ($1,550–$1,850/mo)',
  },
  NC: {
    name: 'North Carolina',
    metro: 'Raleigh & Charlotte',
    taxRate: 0.215,
    taxNote: 'Includes 4.5% NC flat state tax + federal & FICA',
    utilities: 680,
    neighborhoods: 'NoDa, South End, or Five Points ($1,500–$1,800/mo)',
  },
  GA: {
    name: 'Georgia',
    metro: 'Atlanta Metro',
    taxRate: 0.22,
    taxNote: 'Includes Georgia state tax + federal & FICA',
    utilities: 720,
    neighborhoods: 'Reynoldstown, Virginia-Highland, or Decatur ($1,650–$1,900/mo)',
  },
  CO: {
    name: 'Colorado',
    metro: 'Denver & Front Range',
    taxRate: 0.218,
    taxNote: 'Includes 4.4% CO state tax + federal & FICA',
    utilities: 740,
    neighborhoods: 'Capitol Hill, Baker, or Highlands ($1,650–$1,950/mo)',
  },
};

const RENT = { min: 900, max: 4200, step: 25, initial: 1850 };
const INCOME = { min: 30000, max: 160000, step: 1000, initial: 65000 };

const QUICK_PROMPTS = [
  ['Can I realistically afford this rent?', 'Can I realistically afford this rent?'],
  ['Give me 2 tips to save on groceries & utilities', '2 tips to save on groceries & utilities'],
  ['What if I split with a roommate?', 'What if I split with a roommate?'],
  ['Which neighborhoods fit my budget?', 'Which neighborhoods fit my budget?'],
];

const WELCOME = 'Hi there! I’m Alberdy, your neighborhood budget guide. I’ve loaded your relocation numbers for <strong>Miami, Florida</strong> with a target rent of <strong>$1,850/month</strong> on a <strong>$65,000</strong> income. Ask me anything about neighborhoods, hidden moving costs, or ways to stretch your monthly budget!';

const DEFAULT_BREADCRUMB = 'Florida (Miami Metro)';

// Badge / disposable colors for each affordability level
const TONES = {
  good: { badge: 'bg-[#5E772E]', text: 'text-[#5E772E]' },
  stretch: { badge: 'bg-[#B87D24]', text: 'text-[#B87D24]' },
  tight: { badge: 'bg-[#9E3B28]', text: 'text-[#9E3B28]' },
};

// "-$9", not "$-9"
function formatCurrency(num) {
  const rounded = Math.round(num);
  return (rounded < 0 ? '-$' : '$') + Math.abs(rounded).toLocaleString('en-US');
}

// Recalculate all budget metrics
function calculate(stateCode, rent, income) {
  const profile = STATE_PROFILES[stateCode];

  // 30% Rule Required Salary & Hourly Wage (2080 work hours/yr)
  const requiredAnnual = Math.round((rent * 12) / 0.30);
  const requiredHourly = (requiredAnnual / 2080).toFixed(2);

  // Monthly Cash Flow Calculations
  const monthlyTakeHome = Math.round((income / 12) * (1 - profile.taxRate));
  const utilities = profile.utilities;
  const disposable = monthlyTakeHome - rent - utilities;
  const rentShareOfTakeHome = Math.round((rent / monthlyTakeHome) * 100);

  // Affordability badge
  let affordability;
  if (disposable >= 1400 && rentShareOfTakeHome <= 42) affordability = { label: 'Affordable Fit', tone: 'good' };
  else if (disposable >= 650) affordability = { label: 'Moderate Stretch', tone: 'stretch' };
  else affordability = { label: 'Tight Budget', tone: 'tight' };

  // Upfront Move-In Cash Needed (1st month + 1st month deposit + $1450 setup)
  const setupCost = 1450;
  const upfrontTotal = rent * 2 + setupCost;
  const monthlySaveTarget = Math.ceil(upfrontTotal / 4);

  return {
    profile, requiredAnnual, requiredHourly, monthlyTakeHome, utilities, disposable,
    rentShareOfTakeHome, affordability, setupCost, upfrontTotal, monthlySaveTarget,
  };
}

// Context-aware replies from Alberdy based on the live slider numbers
function generateContextualResponse(question, { stateCode, rent: currentRent, income: currentIncome }) {
  const q = question.toLowerCase();
  const profile = STATE_PROFILES[stateCode];
  const monthlyTakeHome = Math.round((currentIncome / 12) * (1 - profile.taxRate));
  const disposable = monthlyTakeHome - currentRent - profile.utilities;
  const requiredAnnual = Math.round((currentRent * 12) / 0.30);

  if (q.includes('afford') || q.includes('realistically')) {
    if (disposable >= 1500) {
      return `Yes, you can comfortably make <strong>${formatCurrency(currentRent)}/mo</strong> work in ${profile.name}! Even though strict landlords using the 30% rule ask for <strong>${formatCurrency(requiredAnnual)}/yr</strong>, your actual take-home pay is <strong>${formatCurrency(monthlyTakeHome)}/mo</strong>—leaving you with <strong>${formatCurrency(disposable)}/mo</strong> after rent and utilities for savings, dining, and emergencies.`;
    } else if (disposable >= 700) {
      return `It’s doable with mindful budgeting. At <strong>${formatCurrency(currentRent)}/mo</strong> on a <strong>${formatCurrency(currentIncome)}/yr</strong> salary, you’ll have <strong>${formatCurrency(disposable)}/mo</strong> left after basic groceries and utilities. Try trimming rent by $150–$200/mo if you want extra breathing room for car insurance and weekend events.`;
    } else {
      return `Right now, <strong>${formatCurrency(currentRent)}/mo</strong> is a tight stretch on <strong>${formatCurrency(currentIncome)}/yr</strong>—it leaves only <strong>${formatCurrency(disposable)}/mo</strong> after essentials. I’d recommend aiming closer to <strong>${formatCurrency(Math.round((currentIncome * 0.3) / 12))}/mo</strong> or considering a roommate to keep your move stress-free.`;
    }
  }

  if (q.includes('groceries') || q.includes('utilities') || q.includes('tips') || q.includes('save')) {
    return `Here are two high-impact ways to lower your <strong>$${profile.utilities}/mo</strong> essentials in ${profile.name}:<br><br>1. <strong>Smart AC & Off-Peak Cooling:</strong> Cooling accounts for nearly 55% of ${profile.name} electric bills. Ask for a unit without west-facing floor-to-ceiling glass and set a smart schedule at 76°F while away to save ~$65/mo.<br>2. <strong>Local Produce & Bulk Staples:</strong> Pair Aldi or Trader Joe’s runs with local weekend farmers markets—most newcomers cut $110/mo off big-box grocery bills right away.`;
  }

  if (q.includes('split') || q.includes('roommate')) {
    const splitRent = Math.round((currentRent * 1.35) / 2);
    const monthlySavings = currentRent - splitRent + 140;
    return `Splitting a 2-bedroom is a great power move! In ${profile.metro}, a nice 2BR runs around <strong>${formatCurrency(Math.round(currentRent * 1.35))}/mo</strong> total—meaning your half is roughly <strong>${formatCurrency(splitRent)}/mo</strong> plus half the Wi-Fi and electric. That puts an extra <strong>+${formatCurrency(monthlySavings)}/mo</strong> straight back into your savings!`;
  }

  if (q.includes('neighborhood') || q.includes('where') || q.includes('area')) {
    return `For a target budget around <strong>${formatCurrency(currentRent)}/mo</strong> in ${profile.metro}, look into <strong>${profile.neighborhoods}</strong>. These spots offer walkable coffee shops, community events, and easier parking without paying downtown high-rise amenity fees.`;
  }

  return `Looking at your <strong>${formatCurrency(currentRent)}/mo</strong> target rent and <strong>${formatCurrency(currentIncome)}/yr</strong> income in ${profile.name}, you’ll have <strong>${formatCurrency(disposable)}/mo</strong> left over each month after utilities and groceries. Would you like to compare a slightly lower rent target or check out neighborhoods in ${profile.metro}?`;
}

function Slider({ id, label, value, onChange, range, display, ticks }) {
  const pct = ((value - range.min) / (range.max - range.min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label htmlFor={id} className="text-sm font-semibold text-[#1B3611]">{label}</label>
        <output htmlFor={id} className="text-base font-bold text-[#1B3611] bg-[#EFE7D6] px-2.5 py-0.5 rounded-md border border-[#DFD5C4]">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="budgie-slider"
        style={{ background: `linear-gradient(to right, #5E772E 0%, #5E772E ${pct}%, #E5DEC9 ${pct}%, #E5DEC9 100%)` }}
      />
      <div className="flex justify-between text-[11px] text-[#5C6654] mt-1" aria-hidden="true">
        {ticks.map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}

function AlberdyAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#EBF0E2] border border-[#D6DEC4] flex items-center justify-center shrink-0 mt-1 overflow-hidden">
      <img src="/ALBERDIE%20(2).png" alt="" width="1308" height="1497" className="h-6 w-auto" />
    </div>
  );
}

// "Listen" reads a message with the browser's speech synthesis, with an animated waveform while playing.
function ListenButton({ id, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`${active ? 'playing bg-[#5E772E]' : 'bg-[#1B3611]'} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-[#5E772E] text-white text-[11px] font-semibold transition shrink-0`}
    >
      <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
      </span>
      <span>{active ? 'Playing...' : 'Listen'}</span>
    </button>
  );
}

export default function BudgetPage({ session, authLoading }) {
  const [stateCode, setStateCode] = useState('FL');
  const [rent, setRent] = useState(RENT.initial);
  const [income, setIncome] = useState(INCOME.initial);
  const [breadcrumb, setBreadcrumb] = useState(DEFAULT_BREADCRUMB);
  const [messages, setMessages] = useState([{ id: 'welcome-msg', sender: 'alberdy', html: WELCOME }]);
  const [chatInput, setChatInput] = useState('');
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(true);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [toast, setToast] = useState({ message: '', visible: false });
  const chatRef = useRef(null);
  const textRefs = useRef({});
  const toastTimer = useRef(null);
  const nextId = useRef(0);

  const c = calculate(stateCode, rent, income);
  const tone = TONES[c.affordability.tone];

  // Keep the chat scrolled to the newest message without moving the page.
  useEffect(() => {
    const el = chatRef.current;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const showToast = (message) => {
    setToast({ message, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const appendAlberdyMessage = (html) => {
    nextId.current += 1;
    setMessages((prev) => [...prev, { id: `msg-${nextId.current}`, sender: 'alberdy', html }]);
  };

  // Append the user's message, then Alberdy's reply
  const sendQuickPrompt = (text) => {
    nextId.current += 1;
    setMessages((prev) => [...prev, { id: `user-${nextId.current}`, sender: 'user', text }]);
    const ctx = { stateCode, rent, income };
    setTimeout(() => appendAlberdyMessage(generateContextualResponse(text, ctx)), 350);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    sendQuickPrompt(text);
  };

  const handleStateChange = (code) => {
    setStateCode(code);
    const profile = STATE_PROFILES[code];
    setBreadcrumb(`${profile.name} (${profile.metro})`);
    appendAlberdyMessage(
      `I’ve switched your relocation profile to <strong>${profile.name} (${profile.metro})</strong>. With a target rent of <strong>${formatCurrency(rent)}/mo</strong> and an income of <strong>${formatCurrency(income)}/yr</strong>, check out your updated take-home pay and local neighborhoods like ${profile.neighborhoods}!`,
    );
  };

  const resetDefaults = () => {
    setRent(RENT.initial);
    setIncome(INCOME.initial);
    setStateCode('FL');
    setBreadcrumb(DEFAULT_BREADCRUMB);
    showToast('Reset calculator to $1,850/mo rent and $65,000/yr income.');
  };

  const toggleSpeakMessage = (id) => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    const text = textRefs.current[id]?.innerText ?? '';
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setSpeakingId((cur) => (cur === id ? null : cur)), 4000);
    }
  };

  const toggleVoiceGuide = () => {
    const enabled = !voiceGuideEnabled;
    setVoiceGuideEnabled(enabled);
    if (enabled) {
      showToast('Voice guide enabled — click "Listen" on any message.');
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setSpeakingId(null);
      showToast('Voice guide muted.');
    }
  };

  // Simulated voice input, as in the reference: "listens" briefly, then asks the affordability question.
  const triggerVoiceInput = () => {
    if (isRecordingMic) return;
    setIsRecordingMic(true);
    setTimeout(() => {
      setIsRecordingMic(false);
      sendQuickPrompt('Can I realistically afford this rent?');
    }, 1600);
  };

  const disposableText = `${formatCurrency(c.disposable)}/mo`;

  return (
    <div className="budget-page min-h-screen flex flex-col">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main').focus(); }}>
        Skip to content
      </a>
      <SiteHeader session={session} authLoading={authLoading} current="budget" />

      <main id="main" tabIndex={-1} className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 pt-5 pb-12 focus:outline-none">
        {/* Back link + the move being planned */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <a
            href="#top"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E3D5BC]/70 hover:bg-[#E3D5BC] border border-[#C8B99E] text-[#1B3611] text-sm font-medium no-underline transition group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </a>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#5C6654]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#5E772E]" aria-hidden="true"></span>
            <span>Planning your move to <strong className="text-[#1B3611] font-semibold">{breadcrumb}</strong></span>
            <span className="text-[#DFD5C4]" aria-hidden="true">•</span>
            <button type="button" onClick={resetDefaults} className="underline hover:text-[#1B3611] transition cursor-pointer">
              Reset numbers
            </button>
          </div>
        </div>

        {/* Narrower calculator column, wider chat column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Income requirement & sliders */}
            <section className="bg-[#FBF9F5] border border-[#DFD5C4] rounded-2xl p-6 sm:p-7 shadow-warm" aria-labelledby="budget-title">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5E772E]">
                  {c.profile.name} Relocation Guide
                </span>
                <span className="text-xs font-medium text-[#5C6654] bg-[#EBF0E2] px-2.5 py-0.5 rounded-full border border-[#D6DEC4]">
                  30% Rent Rule
                </span>
              </div>

              <h1 id="budget-title" className="text-2xl sm:text-[26px] font-bold text-[#1B3611] leading-snug mb-5">
                What You Need to Earn for{' '}
                <span className="text-[#5E772E] underline decoration-[#D6DEC4] decoration-2 underline-offset-4">{formatCurrency(rent)}/mo</span>{' '}
                Rent
              </h1>

              <div className="grid grid-cols-2 gap-3.5 mb-6">
                <div className="bg-[#1B3611] text-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C6D6B8]">Required Annual Salary</span>
                  <div className="text-2xl sm:text-[26px] font-extrabold tracking-tight mt-1">
                    {formatCurrency(c.requiredAnnual)}<span className="text-base font-medium text-[#C6D6B8]">/yr</span>
                  </div>
                </div>
                <div className="bg-[#5E772E] text-white rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#EBF0E2]">Required Hourly Wage</span>
                  <div className="text-2xl sm:text-[26px] font-extrabold tracking-tight mt-1">
                    ${c.requiredHourly}<span className="text-base font-medium text-[#EBF0E2]">/hr</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <Slider id="rentSlider" label="Target Monthly Rent" value={rent} onChange={setRent} range={RENT}
                  display={`${formatCurrency(rent)}/mo`} ticks={['$900 (Studio/Shared)', '$2,500 (1-2 BR)', '$4,200 (Luxury)']} />
                <Slider id="incomeSlider" label="Your Current / Expected Annual Income" value={income} onChange={setIncome}
                  range={INCOME} display={`${formatCurrency(income)}/yr`} ticks={['$30k/yr', '$85k/yr', '$160k/yr']} />
              </div>
            </section>

            {/* Monthly cash flow */}
            <section className="bg-[#FBF9F5] border border-[#DFD5C4] rounded-2xl p-6 sm:p-7 shadow-warm" aria-labelledby="cashflow-heading">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 id="cashflow-heading" className="text-base font-bold text-[#1B3611] tracking-tight">
                    Monthly Cash Flow in {c.profile.name}
                  </h2>
                  <p className="text-xs text-[#5C6654]">{c.profile.taxNote}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm whitespace-nowrap ${tone.badge}`}>
                  {c.affordability.label}
                </span>
              </div>

              <div className="divide-y divide-[#EAE2D3] text-sm">
                <div className="py-3 flex items-center justify-between gap-3">
                  <span className="text-[#5C6654]">Est. Monthly Take-Home (After {(c.profile.taxRate * 100).toFixed(1)}% Tax)</span>
                  <span className="font-bold text-[#1B3611] text-base">{formatCurrency(c.monthlyTakeHome)}</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-3">
                  <span className="text-[#5C6654]">Target Monthly Rent</span>
                  <span className="font-bold text-[#1B3611] text-base">-{formatCurrency(rent)}</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-3">
                  <span className="text-[#5C6654]">Est. {c.profile.name} Utilities &amp; Basic Groceries</span>
                  <span className="font-bold text-[#1B3611] text-base">-{formatCurrency(c.utilities)}</span>
                </div>
                <div className="pt-4 pb-1 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-[#1B3611] text-base block">Remaining Monthly Disposable / Savings</span>
                    <span className="text-xs text-[#5C6654]">Rent is {c.rentShareOfTakeHome}% of your take-home pay</span>
                  </div>
                  <span className={`font-extrabold text-xl whitespace-nowrap ${tone.text}`}>{disposableText}</span>
                </div>
              </div>

              {/* Upfront move-in cash */}
              <div className="mt-5 bg-[#EFE7D6]/90 border border-[#D8CCB4] rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1B3611] mb-1">
                  <svg className="w-4 h-4 text-[#5E772E] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Total Upfront Move-In Cash Needed: <span className="text-[#5E772E]">{formatCurrency(c.upfrontTotal)}</span></span>
                </div>
                <p className="text-xs text-[#5C6654] leading-relaxed">
                  Includes 1st month rent (<strong>{formatCurrency(rent)}</strong>), security deposit (<strong>{formatCurrency(rent)}</strong>),
                  and moving/utility setup (<strong>{formatCurrency(c.setupCost)}</strong>). Save{' '}
                  <strong className="text-[#1B3611]">{formatCurrency(c.monthlySaveTarget)}/mo</strong> for 4 months.
                </p>
              </div>
            </section>
          </div>

          {/* Alberdy's chat */}
          <div className="lg:col-span-7">
            <section className="bg-[#FBF9F5] border border-[#DFD5C4] rounded-2xl shadow-warm-lg overflow-hidden flex flex-col lg:h-[690px]" aria-labelledby="chat-title">
              <div className="bg-[#5E772E] text-white px-6 py-5 border-b border-[#1B3611]/15">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#E3D5BC] border-2 border-white/80 flex items-center justify-center shadow-md overflow-hidden">
                        <img src="/ALBERDIE%20(2).png" alt="" width="1308" height="1497" className="h-10 w-auto mt-1" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#A3E635] border-2 border-[#1B3611]" title="Online & ready to help"></span>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#E9F0DC] bg-[#1B3611]/30 px-2.5 py-0.5 rounded-full">
                        Your Budgie Financial Neighbor
                      </span>
                      <h2 id="chat-title" className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                        Alberdy — Relocation Budget Guide
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={toggleVoiceGuide}
                      aria-pressed={voiceGuideEnabled}
                      title="Toggle spoken voice responses"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1B3611]/35 hover:bg-[#1B3611]/50 border border-white/30 text-xs font-semibold text-white transition cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${voiceGuideEnabled ? 'bg-[#A3E635]' : 'bg-white/40'}`} aria-hidden="true"></span>
                      <span>{voiceGuideEnabled ? 'Voice Guide: On' : 'Voice Guide: Muted'}</span>
                    </button>

                    <div className="relative">
                      <select
                        value={stateCode}
                        onChange={(e) => handleStateChange(e.target.value)}
                        aria-label="Select relocation state"
                        className="appearance-none bg-[#1B3611]/35 hover:bg-[#1B3611]/50 border border-white/40 text-white text-xs font-semibold rounded-lg pl-3.5 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                      >
                        {Object.entries(STATE_PROFILES).map(([code, p]) => (
                          <option key={code} value={code} className="text-[#1B3611] bg-[#FBF9F5]">{p.name} ({code})</option>
                        ))}
                      </select>
                      <svg className="w-3.5 h-3.5 text-white pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatRef}
                role="log"
                aria-live="polite"
                aria-label="Conversation with Alberdy"
                tabIndex={0}
                className="flex-1 min-h-[320px] max-h-[60svh] lg:max-h-none overflow-y-auto chat-scroll p-5 sm:p-6 space-y-4 bg-gradient-to-b from-[#F8F4EC] to-[#FBF9F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5E772E]"
              >
                {messages.map((m) => (
                  m.sender === 'user' ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="bg-[#1B3611] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[82%] shadow-sm text-sm sm:text-[15px] break-words">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-start gap-3 sm:max-w-[90%]">
                      <AlberdyAvatar />
                      <div className="bg-[#EFE9DC] border border-[#DFD5C4] rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-sm text-[#1D2B16]">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-xs font-bold text-[#5E772E] tracking-wide">Alberdy • Local Budget Guide</span>
                          <ListenButton id={m.id} active={speakingId === m.id} onToggle={toggleSpeakMessage} />
                        </div>
                        {/* Alberdy's replies are built from our own templates and numbers, never from user input */}
                        <p
                          ref={(el) => { textRefs.current[m.id] = el; }}
                          className="text-sm sm:text-[15px] leading-relaxed text-[#1D2B16]"
                          dangerouslySetInnerHTML={{ __html: m.html }}
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Suggested questions */}
              <div className="px-5 sm:px-6 py-3 bg-[#F5EFE4] border-t border-[#DFD5C4]">
                <div className="text-[11px] font-semibold text-[#5C6654] mb-2 flex flex-wrap items-center justify-between gap-x-3">
                  <span>Suggested questions for your budget:</span>
                  <span className="text-[#5E772E] font-medium">Click a topic to ask Alberdy</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map(([prompt, label]) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendQuickPrompt(prompt)}
                      className="px-3.5 py-1.5 rounded-full bg-[#FBF9F5] hover:bg-[#EBF0E2] border border-[#D5C9B4] hover:border-[#5E772E] text-xs font-semibold text-[#1B3611] transition shadow-sm cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <form onSubmit={handleChatSubmit} className="p-4 sm:px-6 bg-[#FBF9F5] border-t border-[#DFD5C4] flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={triggerVoiceInput}
                  title="Speak to Alberdy"
                  className={`${isRecordingMic ? 'mic-recording' : ''} h-11 px-3.5 rounded-xl border border-[#DFD5C4] bg-[#F6F1E7] hover:bg-[#EBF0E2] text-[#1B3611] font-semibold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer`}
                >
                  <svg className={`w-4 h-4 ${isRecordingMic ? '' : 'text-[#5E772E]'}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                  <span>{isRecordingMic ? 'Listening...' : 'Mic'}</span>
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  aria-label="Ask Alberdy"
                  placeholder={isRecordingMic ? 'Listening to your question...' : 'Ask Alberdy about rent, utilities, or neighborhoods...'}
                  className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-[#F6F1E7] border border-[#DFD5C4] text-sm text-[#1B3611] placeholder:text-[#5C6654]/80 focus:outline-none focus:ring-2 focus:ring-[#5E772E] focus:bg-white transition"
                />

                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-[#1B3611] hover:bg-[#5E772E] text-white font-bold text-xs sm:text-sm tracking-wide transition shadow-sm shrink-0 cursor-pointer"
                >
                  Ask Alberdy
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      {/* Toast for reset and voice-guide changes */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-5 right-5 z-50 pointer-events-none transition-all duration-300 bg-[#1B3611] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#5E772E] flex items-center gap-2.5 text-xs sm:text-sm font-medium ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        <span className="w-2 h-2 rounded-full bg-[#F5E06B]" aria-hidden="true"></span>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
