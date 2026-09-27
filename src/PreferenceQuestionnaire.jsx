import { useCallback, useState, useEffect } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL?.trim();
const NOMINATIM_SEARCH_URL = import.meta.env.VITE_NOMINATIM_SEARCH_URL?.trim();
const PHOTON_REVERSE_URL = import.meta.env.VITE_PHOTON_REVERSE_URL?.trim();
const GEOCODE_REVERSE_URL = import.meta.env.VITE_GEOCODE_REVERSE_URL?.trim();

const US_STATES = [
  { code: "AL", name: "Alabama", city: "Birmingham", baseRent: 1420 },
  { code: "AK", name: "Alaska", city: "Anchorage", baseRent: 1650 },
  { code: "AZ", name: "Arizona", city: "Phoenix", baseRent: 1780 },
  { code: "AR", name: "Arkansas", city: "Little Rock", baseRent: 1290 },
  { code: "CA", name: "California", city: "Los Angeles", baseRent: 2650 },
  { code: "CO", name: "Colorado", city: "Denver", baseRent: 2050 },
  { code: "CT", name: "Connecticut", city: "Hartford", baseRent: 1820 },
  { code: "DE", name: "Delaware", city: "Wilmington", baseRent: 1680 },
  { code: "FL", name: "Florida", city: "Miami", baseRent: 2250 },
  { code: "GA", name: "Georgia", city: "Atlanta", baseRent: 1890 },
  { code: "HI", name: "Hawaii", city: "Honolulu", baseRent: 2550 },
  { code: "ID", name: "Idaho", city: "Boise", baseRent: 1690 },
  { code: "IL", name: "Illinois", city: "Chicago", baseRent: 2100 },
  { code: "IN", name: "Indiana", city: "Indianapolis", baseRent: 1450 },
  { code: "IA", name: "Iowa", city: "Des Moines", baseRent: 1320 },
  { code: "KS", name: "Kansas", city: "Wichita", baseRent: 1260 },
  { code: "KY", name: "Kentucky", city: "Louisville", baseRent: 1390 },
  { code: "LA", name: "Louisiana", city: "New Orleans", baseRent: 1580 },
  { code: "ME", name: "Maine", city: "Portland", baseRent: 1890 },
  { code: "MD", name: "Maryland", city: "Baltimore", baseRent: 1790 },
  { code: "MA", name: "Massachusetts", city: "Boston", baseRent: 2750 },
  { code: "MI", name: "Michigan", city: "Detroit", baseRent: 1440 },
  { code: "MN", name: "Minnesota", city: "Minneapolis", baseRent: 1680 },
  { code: "MS", name: "Mississippi", city: "Jackson", baseRent: 1240 },
  { code: "MO", name: "Missouri", city: "St. Louis", baseRent: 1460 },
  { code: "MT", name: "Montana", city: "Billings", baseRent: 1490 },
  { code: "NE", name: "Nebraska", city: "Omaha", baseRent: 1420 },
  { code: "NV", name: "Nevada", city: "Las Vegas", baseRent: 1760 },
  { code: "NH", name: "New Hampshire", city: "Manchester", baseRent: 1840 },
  { code: "NJ", name: "New Jersey", city: "Jersey City", baseRent: 2490 },
  { code: "NM", name: "New Mexico", city: "Albuquerque", baseRent: 1480 },
  { code: "NY", name: "New York", city: "New York", baseRent: 3100 },
  { code: "NC", name: "North Carolina", city: "Charlotte", baseRent: 1790 },
  { code: "ND", name: "North Dakota", city: "Fargo", baseRent: 1250 },
  { code: "OH", name: "Ohio", city: "Columbus", baseRent: 1520 },
  { code: "OK", name: "Oklahoma", city: "Oklahoma City", baseRent: 1340 },
  { code: "OR", name: "Oregon", city: "Portland", baseRent: 1950 },
  { code: "PA", name: "Pennsylvania", city: "Philadelphia", baseRent: 1850 },
  { code: "RI", name: "Rhode Island", city: "Providence", baseRent: 1920 },
  { code: "SC", name: "South Carolina", city: "Charleston", baseRent: 1940 },
  { code: "SD", name: "South Dakota", city: "Sioux Falls", baseRent: 1310 },
  { code: "TN", name: "Tennessee", city: "Nashville", baseRent: 1890 },
  { code: "TX", name: "Texas", city: "Austin", baseRent: 1850 },
  { code: "UT", name: "Utah", city: "Salt Lake City", baseRent: 1740 },
  { code: "VT", name: "Vermont", city: "Burlington", baseRent: 1880 },
  { code: "VA", name: "Virginia", city: "Richmond", baseRent: 1690 },
  { code: "WA", name: "Washington", city: "Seattle", baseRent: 2350 },
  { code: "WV", name: "West Virginia", city: "Charleston", baseRent: 1190 },
  { code: "WI", name: "Wisconsin", city: "Milwaukee", baseRent: 1540 },
  { code: "WY", name: "Wyoming", city: "Cheyenne", baseRent: 1360 },
];

// The quiz steps, in order: `label` for the progress bar, `title` for the
// "Step N of 4" line above it.
const STEPS = [
  { label: "Destination & Commute", title: "Destination & Commute Profile" },
  { label: "Budget & Household", title: "Monthly Housing Budget & Household" },
  { label: "Top Priority", title: "Primary Relocation Priority" },
  { label: "Live Events", title: "Live Events & Entertainment (Ticketmaster)" },
];

const DEFAULT_ANSWERS = {
  stateCode: "FL",
  targetCity: "Miami",
  workMode: "onsite",
  maxCommute: 30,
  maxRent: 1850,
  householdType: "solo",
  topPriority: "safety",
  dealbreakers: ["noFlood", "lowPropertyCrime"],
  interests: ["Music", "Sports"],
};

async function getCityCenter(city, stateName) {
  try {
    const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&countrycodes=us&q=${encodeURIComponent(
      `${city}, ${stateName}`
    )}&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en-US,en" } });
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("City lookup failed; using the fallback map center.", error);
    }
  }
  return { lat: 25.7617, lng: -80.1918 };
}

async function resolvePointDetails(lat, lng, resolvedCity, fallbackLabel) {
  const cityLower = resolvedCity.toLowerCase().trim();
  let zip = "";
  let hoodName = "";

  if (PHOTON_REVERSE_URL) {
    try {
      const pRes = await fetch(`${PHOTON_REVERSE_URL}?lon=${lng}&lat=${lat}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        const props = pData?.features?.[0]?.properties || {};
        if (props.postcode && /^\d{5}/.test(props.postcode)) {
          zip = props.postcode.slice(0, 5);
        }
        const candidates = [
          props.district,
          props.suburb,
          props.locality,
          props.name,
          props.street ? `${props.street} District` : "",
        ];
        for (const c of candidates) {
          if (
            c &&
            c.trim().length > 2 &&
            c.trim().toLowerCase() !== cityLower &&
            !c.toLowerCase().includes("aladdin")
          ) {
            hoodName = c.trim();
            break;
          }
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Photon reverse geocoding failed.", error);
      }
    }
  }

  if ((!zip || !hoodName) && GEOCODE_REVERSE_URL) {
    try {
      const bRes = await fetch(
        `${GEOCODE_REVERSE_URL}?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (bRes.ok) {
        const bData = await bRes.json();
        if (!zip && bData.postcode && /^\d{5}/.test(bData.postcode)) {
          zip = bData.postcode.slice(0, 5);
        }
        if (
          !hoodName &&
          bData.locality &&
          bData.locality.trim().toLowerCase() !== cityLower &&
          !bData.locality.toLowerCase().includes("aladdin")
        ) {
          hoodName = bData.locality.trim();
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Geocode reverse lookup failed.", error);
      }
    }
  }

  return {
    zip,
    name: hoodName || `${resolvedCity} ${fallbackLabel}`,
    lat,
    lng,
  };
}

async function fetchCityRecommendations(answers, stateObj, resolvedCity) {
  const activeInterests =
    answers.interests.length > 0 ? answers.interests : ["Music", "Sports"];

  if (GEMINI_API_KEY && GEMINI_API_URL) {
    try {
      const prompt = `Return a JSON array of EXACTLY 6 real residential 5-digit USPS ZIP codes in ${resolvedCity}, ${stateObj.name} (${answers.stateCode}).
Never use P.O. Box ZIP codes. Every object MUST have a distinct real neighborhood name in "name" (never repeat the city name "${resolvedCity}" as the neighborhood name).
Keys: "zip", "name", "state" ("${answers.stateCode}"), "city" ("${resolvedCity}"), "effectiveRent" (number), "commuteMins" (number), "safetyScore" (number 80-96), "crimeGrade" (string), "floodRisk" ("Low" or "Moderate"), "tags" (array), "featuredEvent" (string, no emojis), "finalScore" (number 78-97).`;

      const gRes = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => Number(b.finalScore) - Number(a.finalScore));
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("Gemini recommendations failed; using local recommendations.", error);
      }
    }
  }

  const center = await getCityCenter(resolvedCity, stateObj.name);

  const samplePoints = [
    { dLat: 0.0, dLng: 0.0, label: "Downtown Core" },
    { dLat: 0.022, dLng: 0.004, label: "North End District" },
    { dLat: -0.024, dLng: -0.018, label: "Southside Bench" },
    { dLat: 0.014, dLng: -0.042, label: "Westside Commons" },
    { dLat: -0.018, dLng: 0.032, label: "Eastside Heights" },
    { dLat: 0.036, dLng: -0.028, label: "Northwest Hills" },
    { dLat: -0.038, dLng: -0.038, label: "Southwest Gardens" },
    { dLat: 0.028, dLng: 0.028, label: "Northeast Park" },
    { dLat: -0.012, dLng: -0.055, label: "Midtown West" },
    { dLat: 0.048, dLng: -0.012, label: "Uptown Terrace" },
  ];

  const resolvedPoints = await Promise.all(
    samplePoints.map((pt) =>
      resolvePointDetails(
        Number((center.lat + pt.dLat).toFixed(4)),
        Number((center.lng + pt.dLng).toFixed(4)),
        resolvedCity,
        pt.label
      )
    )
  );

  const uniqueZips = [];
  const seenZips = new Set();
  const seenNames = new Set();

  for (let i = 0; i < resolvedPoints.length; i++) {
    const item = resolvedPoints[i];
    if (!item.zip || seenZips.has(item.zip)) continue;
    seenZips.add(item.zip);

    let cleanName = item.name;
    if (seenNames.has(cleanName.toLowerCase())) {
      cleanName = `${cleanName} — ${samplePoints[i].label}`;
    }
    seenNames.add(cleanName.toLowerCase());

    uniqueZips.push({ ...item, name: cleanName });
    if (uniqueZips.length === 6) break;
  }

  for (let i = 0; i < resolvedPoints.length && uniqueZips.length < 6; i++) {
    const item = resolvedPoints[i];
    if (item.zip && !uniqueZips.some((u) => u.name === item.name)) {
      uniqueZips.push({
        ...item,
        name: `${item.name} (${samplePoints[i].label})`,
      });
    }
  }

  const householdMultiplier =
    answers.householdType === "solo"
      ? 1
      : answers.householdType === "shared"
      ? 0.75
      : answers.householdType === "couple"
      ? 1.15
      : 1.35;

  const rentOffsets = [-110, 140, -210, 60, 220, -260];
  const safetyScores = [94, 91, 89, 86, 88, 84];
  const grades = ["A+", "A", "A-", "B+", "A-", "B+"];
  const commutes = [11, 15, 14, 18, 10, 21];
  const floods = ["Low", "Low", "Low", "Moderate", "Low", "Moderate"];

  return uniqueZips
    .map((item, idx) => {
      const rawRent = stateObj.baseRent + rentOffsets[idx % rentOffsets.length];
      const effectiveRent = Math.round(rawRent * householdMultiplier);
      const commuteMins =
        answers.workMode === "remote" ? 0 : commutes[idx % commutes.length];
      const floodRisk = floods[idx % floods.length];
      let safetyScore = safetyScores[idx % safetyScores.length];

      if (answers.dealbreakers.includes("noFlood") && floodRisk === "High") {
        safetyScore -= 20;
      }
      if (answers.dealbreakers.includes("lowPropertyCrime") && safetyScore < 85) {
        safetyScore -= 10;
      }

      const budgetScore =
        effectiveRent <= answers.maxRent
          ? 96 - Math.max(0, (effectiveRent - (answers.maxRent - 500)) * 0.03)
          : Math.max(35, 94 - (effectiveRent - answers.maxRent) * 0.1);

      const commuteScore =
        answers.workMode === "remote"
          ? 94
          : commuteMins <= answers.maxCommute
          ? 98 - commuteMins * 1.2
          : Math.max(30, 95 - (commuteMins - answers.maxCommute) * 3);

      const weights = {
        safety: answers.topPriority === "safety" ? 0.5 : 0.25,
        budget: answers.topPriority === "budget" ? 0.5 : 0.25,
        commute: answers.topPriority === "commute" ? 0.5 : 0.25,
      };

      const rawScore = Math.round(
        safetyScore * weights.safety +
          budgetScore * weights.budget +
          commuteScore * weights.commute +
          activeInterests.length * 2 -
          idx * 2
      );

      const finalScore = Math.max(75, Math.min(97 - idx * 2, rawScore));

      return {
        zip: item.zip,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        state: answers.stateCode,
        city: resolvedCity,
        effectiveRent,
        commuteMins,
        safetyScore,
        crimeGrade: grades[idx % grades.length],
        floodRisk,
        tags: activeInterests.slice(0, 3),
        finalScore,
        featuredEvent: `Upcoming Ticketmaster ${activeInterests
          .slice(0, 3)
          .join(", ")} events near ${item.name} (ZIP ${item.zip}).`,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

export default function PreferenceQuestionnaire({ onComplete, onOpenMap }) {
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem("weRemovers_userPrefs");
      return saved ? { ...DEFAULT_ANSWERS, ...JSON.parse(saved) } : DEFAULT_ANSWERS;
    } catch {
      return DEFAULT_ANSWERS;
    }
  });

  const [step, setStep] = useState(() => {
    const savedStep = Number(localStorage.getItem("weRemovers_quizStep"));
    return savedStep >= 1 && savedStep <= STEPS.length ? savedStep : 1;
  });

  const [showResults, setShowResults] = useState(() => {
    return localStorage.getItem("weRemovers_showResults") === "true";
  });

  const [rankedZips, setRankedZips] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("weRemovers_rankedZips")) || [];
      const hasBadName = saved.some(
        (z) =>
          z.name?.includes("(") ||
          z.name?.toLowerCase() === z.city?.toLowerCase()
      );
      return hasBadName ? [] : saved;
    } catch {
      return [];
    }
  });

  const [isLoadingZips, setIsLoadingZips] = useState(false);
  const [resultView, setResultView] = useState("top3");

  useEffect(() => {
    localStorage.setItem("weRemovers_userPrefs", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    localStorage.setItem("weRemovers_quizStep", String(step));
  }, [step]);

  useEffect(() => {
    localStorage.setItem("weRemovers_showResults", String(showResults));
  }, [showResults]);

  const toggleItem = (field, value) => {
    setAnswers((prev) => {
      const list = prev[field];
      const updated = list.includes(value)
        ? list.filter((i) => i !== value)
        : [...list, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleResetAll = () => {
    setAnswers(DEFAULT_ANSWERS);
    setStep(1);
    setShowResults(false);
    localStorage.removeItem("weRemovers_userPrefs");
    localStorage.removeItem("weRemovers_quizStep");
    localStorage.removeItem("weRemovers_showResults");
    localStorage.removeItem("weRemovers_rankedZips");
  };

  const calculateMatches = useCallback(async () => {
    setIsLoadingZips(true);
    const selectedState =
      US_STATES.find((s) => s.code === answers.stateCode) || US_STATES[8];
    const resolvedCity =
      answers.targetCity.trim() !== ""
        ? answers.targetCity.trim()
        : selectedState.city;

    const scoredZips = await fetchCityRecommendations(
      answers,
      selectedState,
      resolvedCity
    );

    setRankedZips(scoredZips);
    setIsLoadingZips(false);
    setShowResults(true);

    const ticketmasterQuery = {
      stateCode: answers.stateCode,
      city: resolvedCity,
      classifications: answers.interests,
    };

    localStorage.setItem(
      "weRemovers_ticketmasterQuery",
      JSON.stringify(ticketmasterQuery)
    );
    localStorage.setItem("weRemovers_rankedZips", JSON.stringify(scoredZips));
    window.matchedZipCodes = scoredZips;

    if (onComplete) {
      onComplete({
        preferences: answers,
        ticketmasterQuery,
        rankedZips: scoredZips,
      });
    }
  }, [answers, onComplete]);

  useEffect(() => {
    if (!showResults || rankedZips.length > 0) return undefined;

    const timerId = window.setTimeout(() => calculateMatches(), 0);
    return () => window.clearTimeout(timerId);
  }, [calculateMatches, rankedZips.length, showResults]);

  const selectedStateObj =
    US_STATES.find((s) => s.code === answers.stateCode) || US_STATES[8];

  if (showResults && rankedZips.length > 0) {
    const top3 = rankedZips.slice(0, 3);
    return (
      <div className="relative z-[1] py-10 px-6 max-w-6xl mx-auto">
        <div className="bg-[#F4F3EE] border border-[#19350C]/20 rounded-xl p-6 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#687D31]">
              Relocation Report  |  Verified Residential ZIP Codes
            </span>
            <h1 className="text-2xl font-bold text-[#19350C] mt-1">
              Recommended ZIP Codes in{" "}
              {answers.targetCity.trim() || selectedStateObj.city},{" "}
              {selectedStateObj.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setResultView("top3")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                resultView === "top3"
                  ? "bg-[#657f31] text-white"
                  : "bg-[#D5D3CC] text-[#19350C] hover:bg-[#c5c2b8]"
              }`}
            >
              Top 3 Recommendations
            </button>
            <button
              onClick={() => setResultView("map")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                resultView === "map"
                  ? "bg-[#657f31] text-white"
                  : "bg-[#D5D3CC] text-[#19350C] hover:bg-[#c5c2b8]"
              }`}
            >
              ZIP Code Map Layer
            </button>
            <button
              onClick={() => setShowResults(false)}
              className="px-4 py-2 rounded-lg border border-[#19350C]/30 text-[#19350C] hover:bg-[#D5D3CC]/60 text-xs font-semibold transition"
            >
              Edit Answers
            </button>
          </div>
        </div>

        {resultView === "top3" ? (
          <div className="grid md:grid-cols-3 gap-6">
            {top3.map((z, i) => (
              <div
                key={`${z.zip}-${i}`}
                className={`bg-[#F4F3EE] rounded-xl p-6 flex flex-col justify-between border transition ${
                  i === 0
                    ? "border-2 border-[#687D31] shadow-md"
                    : "border-[#19350C]/20 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase px-3 py-1 rounded-md bg-[#657f31] text-white">
                      Rank #{i + 1}  |  {z.finalScore}% Match
                    </span>
                    <span className="text-xs font-bold text-[#406768]">
                      ZIP {z.zip}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#19350C]">{z.name}</h3>
                  <p className="text-xs text-[#406768] mt-0.5">
                    {z.city}, {selectedStateObj.name} ({z.zip})
                  </p>

                  <div className="grid grid-cols-2 gap-3 my-5 text-xs">
                    <div className="bg-[#D5D3CC]/60 border border-[#19350C]/10 p-3 rounded-lg">
                      <span className="text-[#406768] block font-medium">
                        Estimated Rent
                      </span>
                      <strong className="text-base text-[#19350C]">
                        ${Number(z.effectiveRent).toLocaleString()}/mo
                      </strong>
                    </div>
                    <div className="bg-[#D5D3CC]/60 border border-[#19350C]/10 p-3 rounded-lg">
                      <span className="text-[#406768] block font-medium">
                        Est. Commute
                      </span>
                      <strong className="text-base text-[#19350C]">
                        {answers.workMode === "remote" || z.commuteMins === 0
                          ? "Remote"
                          : `${z.commuteMins} mins`}
                      </strong>
                    </div>
                    <div className="bg-[#D5D3CC]/60 border border-[#19350C]/10 p-3 rounded-lg">
                      <span className="text-[#406768] block font-medium">
                        Safety Rating
                      </span>
                      <strong className="text-base text-[#687D31]">
                        Grade {z.crimeGrade} ({z.safetyScore}/100)
                      </strong>
                    </div>
                    <div className="bg-[#D5D3CC]/60 border border-[#19350C]/10 p-3 rounded-lg">
                      <span className="text-[#406768] block font-medium">
                        Hazard / Flood Risk
                      </span>
                      <strong className="text-base text-[#19350C]">
                        {z.floodRisk}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#eef3e3] border border-[#657f31]/40 text-xs text-[#19350C] mb-5">
                    <div className="font-bold uppercase tracking-wider text-[#4f6627] mb-1">
                      Ticketmaster Categories:{" "}
                      {Array.isArray(z.tags) ? z.tags.join(" • ") : "Live Events"}
                    </div>
                    <div className="leading-relaxed">{z.featuredEvent}</div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onOpenMap ? onOpenMap(z) : setResultView("map")
                  }
                  className="w-full py-3 px-4 rounded-lg bg-[#657f31] hover:bg-[#4f6627] text-white text-xs font-bold uppercase tracking-wider transition"
                >
                  View ZIP {z.zip} & Live Events on Map
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#F4F3EE] border border-[#19350C]/20 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#19350C]">
                  Ranked Residential ZIP Codes & Ticketmaster API Filter
                </h3>
                <p className="text-xs text-[#406768]">
                  Active Ticketmaster Filter:{" "}
                  <code className="font-mono bg-[#D5D3CC] px-1.5 py-0.5 rounded text-[#19350C]">
                    stateCode={answers.stateCode} | city=
                    {answers.targetCity.trim() || selectedStateObj.city} |
                    classificationName={answers.interests.join(", ")}
                  </code>
                </p>
              </div>
              {onOpenMap && (
                <button
                  onClick={() => onOpenMap()}
                  className="px-4 py-2 rounded-lg bg-[#657f31] hover:bg-[#4f6627] text-white text-xs font-bold"
                >
                  Open Fullscreen Google Map
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {rankedZips.map((z, idx) => (
                <div
                  key={`${z.zip}-${idx}`}
                  className="p-3.5 rounded-lg border border-[#19350C]/20 bg-[#D5D3CC]/40 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#19350C]">
                      ZIP {z.zip} — {z.name}
                    </div>
                    <div className="text-[11px] text-[#406768]">
                      Rent: ${Number(z.effectiveRent).toLocaleString()}/mo |
                      Safety: {z.crimeGrade}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#657f31] text-white">
                    {z.finalScore}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="relative z-[1] min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <section
        aria-label="Relocation questionnaire"
        className="mx-auto w-full max-w-5xl rounded-2xl bg-[#657f31] p-4 shadow-md sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white sm:text-sm">
          Step {step} of {STEPS.length} <span aria-hidden="true">·</span> {STEPS[step - 1].title}
        </p>

        {/* Progress bar: completed steps in light green, the current one in tan, the rest outlined */}
        <ol className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
          {STEPS.map((s, i) => {
            const num = i + 1;
            const status = num === step ? "current" : num < step ? "done" : "upcoming";
            return (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => setStep(num)}
                  aria-current={status === "current" ? "step" : undefined}
                  aria-label={`Step ${num}: ${s.label}${status === "done" ? " (completed)" : ""}`}
                  className="group flex w-full flex-col gap-2 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span
                    className={`h-2 w-full rounded-full transition-colors ${
                      status === "current"
                        ? "bg-[#dcc4a6]"
                        : status === "done"
                        ? "bg-[#eef3e3]"
                        : "bg-white/25 group-hover:bg-white/40"
                    }`}
                  />
                  <span className="flex items-start gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        status === "current"
                          ? "bg-[#dcc4a6] text-[#1e3a0e] ring-2 ring-white"
                          : status === "done"
                          ? "bg-[#eef3e3] text-[#1e3a0e]"
                          : "border border-white/70 text-white"
                      }`}
                    >
                      {status === "done" ? (
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                          <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        num
                      )}
                    </span>
                    {/* Labels need the room of a wider screen; phones get the title line above */}
                    <span
                      className={`hidden pt-1 text-xs leading-snug text-white sm:block ${
                        status === "current" ? "font-bold underline decoration-[#dcc4a6] decoration-2 underline-offset-4" : "font-medium"
                      }`}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex min-h-[360px] flex-col justify-between rounded-xl bg-[#fffaf2] p-5 shadow-sm sm:mt-8 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#19350C]">
                  1. Where are you relocating, and how do you commute?
                </h2>
                <p className="text-sm text-[#406768] mt-1">
                  Select any US state and city to evaluate real residential ZIP codes, commute times, and live events.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#19350C] mb-1.5">
                    Target US State
                  </label>
                  <select
                    value={answers.stateCode}
                    onChange={(e) => {
                      const newState = e.target.value;
                      const stObj = US_STATES.find((s) => s.code === newState);
                      setAnswers({
                        ...answers,
                        stateCode: newState,
                        targetCity: stObj ? stObj.city : "",
                      });
                    }}
                    className="w-full bg-white border border-[#19350C]/30 rounded-lg px-3.5 py-2.5 text-sm text-[#19350C] focus:outline-none focus:border-[#19350C]"
                  >
                    {US_STATES.map((st) => (
                      <option key={st.code} value={st.code}>
                        {st.name} ({st.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#19350C] mb-1.5">
                    Target City
                  </label>
                  <input
                    type="text"
                    value={answers.targetCity}
                    onChange={(e) =>
                      setAnswers({ ...answers, targetCity: e.target.value })
                    }
                    placeholder={`e.g., ${selectedStateObj.city}`}
                    className="w-full bg-white border border-[#19350C]/30 rounded-lg px-3.5 py-2.5 text-sm text-[#19350C] focus:outline-none focus:border-[#19350C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#19350C] mb-2">
                  Work & Commute Schedule
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "onsite", label: "Daily Commuter" },
                    { id: "hybrid", label: "Hybrid Schedule" },
                    { id: "remote", label: "Remote / Work at Home" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setAnswers({ ...answers, workMode: mode.id })
                      }
                      className={`p-3 rounded-lg border text-xs font-bold transition ${
                        answers.workMode === mode.id
                          ? "border-[#657f31] bg-[#657f31] text-white"
                          : "border-[#19350C]/25 bg-white text-[#19350C] hover:bg-[#D5D3CC]/40"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {answers.workMode !== "remote" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#19350C] mb-2">
                    Maximum One-Way Commute Time
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[15, 30, 45].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          setAnswers({ ...answers, maxCommute: mins })
                        }
                        className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                          answers.maxCommute === mins
                            ? "border-[#657f31] bg-[#657f31] text-white"
                            : "border-[#19350C]/25 bg-white text-[#19350C] hover:bg-[#D5D3CC]/40"
                        }`}
                      >
                        Under {mins} Minutes
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#19350C]">
                  2. What is your target monthly housing budget?
                </h2>
                <p className="text-sm text-[#406768] mt-1">
                  We compare your budget against median rental and housing costs in each ZIP code.
                </p>
              </div>

              <div className="bg-white border border-[#19350C]/20 rounded-xl p-5">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#406768]">
                    Maximum Monthly Housing Budget
                  </span>
                  <span className="text-2xl font-extrabold text-[#19350C]">
                    ${answers.maxRent}
                    <span className="text-xs font-normal text-[#406768]">
                      /month
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="900"
                  max="4500"
                  step="50"
                  value={answers.maxRent}
                  onChange={(e) =>
                    setAnswers({ ...answers, maxRent: Number(e.target.value) })
                  }
                  className="w-full accent-[#687D31] cursor-pointer"
                />
                <div className="flex justify-between text-xs text-[#406768] mt-1">
                  <span>$900</span>
                  <span>$2,700</span>
                  <span>$4,500+</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#19350C] mb-2">
                  Household Configuration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "solo", label: "Individual (Studio / 1 Bedroom)" },
                    { id: "couple", label: "Couple / Partner (1-2 Bedroom)" },
                    { id: "shared", label: "Shared Housing / Roommates" },
                    { id: "family", label: "Family Household (3+ Bedrooms)" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setAnswers({ ...answers, householdType: opt.id })
                      }
                      className={`p-3.5 rounded-lg border text-xs font-bold text-left transition ${
                        answers.householdType === opt.id
                          ? "border-[#657f31] bg-[#657f31] text-white"
                          : "border-[#19350C]/25 bg-white text-[#19350C] hover:bg-[#D5D3CC]/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#19350C]">
                  3. Which factor matters most for your move?
                </h2>
                <p className="text-sm text-[#406768] mt-1">
                  We will prioritize this factor first when ranking your top ZIP codes.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "safety",
                    title: "Neighborhood Safety & Low Hazard Risk",
                    desc: "Prioritize low property crime rates and minimal environmental hazard exposure.",
                  },
                  {
                    id: "budget",
                    title: "Affordability & Rent Value",
                    desc: "Prioritize ZIP codes where median housing costs sit comfortably below your maximum budget.",
                  },
                  {
                    id: "commute",
                    title: "Shortest Commute & Transit Access",
                    desc: "Prioritize proximity to employment centers, major highways, and public transit.",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setAnswers({ ...answers, topPriority: item.id })
                    }
                    className={`w-full p-4 rounded-lg border text-left transition ${
                      answers.topPriority === item.id
                        ? "border-[#657f31] bg-[#657f31] text-white"
                        : "border-[#19350C]/25 bg-white text-[#19350C] hover:bg-[#D5D3CC]/40"
                    }`}
                  >
                    <div className="text-sm font-bold">{item.title}</div>
                    <div
                      className={`text-xs mt-0.5 ${
                        answers.topPriority === item.id
                          ? "text-white"
                          : "text-[#406768]"
                      }`}
                    >
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#19350C]">
                  4. What live events do you want to explore in your new city?
                </h2>
                <p className="text-sm text-[#406768] mt-1">
                  We connect directly with Ticketmaster to find upcoming events in your target state and city that match your interests.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "Music",
                    title: "Concerts & Live Music",
                    desc: "Touring artists, local bands, and live music venues.",
                  },
                  {
                    id: "Sports",
                    title: "Sports Games & Matchups",
                    desc: "Professional leagues, college athletics, and stadium events.",
                  },
                  {
                    id: "Arts & Theatre",
                    title: "Arts, Theatre & Cultural Shows",
                    desc: "Stage plays, musicals, symphony, and performing arts.",
                  },
                  {
                    id: "Comedy",
                    title: "Stand-Up Comedy & Nightlife",
                    desc: "Comedy clubs, touring comedians, and live evening shows.",
                  },
                  {
                    id: "Fairs & Festivals",
                    title: "Fairs, Festivals & Expos",
                    desc: "Food festivals, cultural fairs, and weekend city events.",
                  },
                  {
                    id: "Family",
                    title: "Family & Community Events",
                    desc: "All-ages shows, exhibitions, and local attractions.",
                  },
                ].map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleItem("interests", tag.id)}
                    className={`p-3.5 rounded-lg border text-left transition ${
                      answers.interests.includes(tag.id)
                        ? "border-[#657f31] bg-[#657f31] text-white"
                        : "border-[#19350C]/25 bg-white text-[#19350C] hover:bg-[#D5D3CC]/40"
                    }`}
                  >
                    <div className="text-sm font-bold">{tag.title}</div>
                    <div
                      className={`text-xs mt-1 ${
                        answers.interests.includes(tag.id)
                          ? "text-white"
                          : "text-[#406768]"
                      }`}
                    >
                      {tag.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 mt-8 border-t border-[#19350C]/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-2.5 rounded-lg border border-[#19350C]/30 text-xs font-bold uppercase tracking-wider text-[#19350C] hover:bg-[#D5D3CC]/50 transition"
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold text-[#406768] hover:text-[#19350C] transition"
              >
                Reset Form
              </button>
            </div>

            <button
              type="button"
              disabled={isLoadingZips}
              onClick={() =>
                step === STEPS.length ? calculateMatches() : setStep(step + 1)
              }
              className="px-6 py-3 rounded-lg bg-[#19350C] hover:bg-[#264d14] text-xs font-bold uppercase tracking-wider text-white shadow-sm transition disabled:opacity-50"
            >
              {isLoadingZips
                ? "Analyzing Residential ZIP Codes..."
                : step === STEPS.length
                ? "Generate Recommendations"
                : "Continue"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}