import React, { useState, useEffect, useRef } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();

const STATE_TAX_DATA = {
  AL: { name: "Alabama", taxRate: 0.04, utilities: 310 },
  AK: { name: "Alaska", taxRate: 0.0, utilities: 360 },
  AZ: { name: "Arizona", taxRate: 0.025, utilities: 320 },
  AR: { name: "Arkansas", taxRate: 0.039, utilities: 290 },
  CA: { name: "California", taxRate: 0.065, utilities: 380 },
  CO: { name: "Colorado", taxRate: 0.044, utilities: 310 },
  CT: { name: "Connecticut", taxRate: 0.05, utilities: 370 },
  DE: { name: "Delaware", taxRate: 0.048, utilities: 315 },
  FL: { name: "Florida", taxRate: 0.0, utilities: 330 },
  GA: { name: "Georgia", taxRate: 0.053, utilities: 315 },
  HI: { name: "Hawaii", taxRate: 0.068, utilities: 440 },
  ID: { name: "Idaho", taxRate: 0.056, utilities: 285 },
  IL: { name: "Illinois", taxRate: 0.0495, utilities: 325 },
  IN: { name: "Indiana", taxRate: 0.0305, utilities: 295 },
  IA: { name: "Iowa", taxRate: 0.048, utilities: 290 },
  KS: { name: "Kansas", taxRate: 0.046, utilities: 300 },
  KY: { name: "Kentucky", taxRate: 0.04, utilities: 295 },
  LA: { name: "Louisiana", taxRate: 0.035, utilities: 305 },
  ME: { name: "Maine", taxRate: 0.058, utilities: 340 },
  MD: { name: "Maryland", taxRate: 0.0475, utilities: 345 },
  MA: { name: "Massachusetts", taxRate: 0.05, utilities: 375 },
  MI: { name: "Michigan", taxRate: 0.0425, utilities: 310 },
  MN: { name: "Minnesota", taxRate: 0.058, utilities: 320 },
  MS: { name: "Mississippi", taxRate: 0.044, utilities: 290 },
  MO: { name: "Missouri", taxRate: 0.045, utilities: 300 },
  MT: { name: "Montana", taxRate: 0.052, utilities: 295 },
  NE: { name: "Nebraska", taxRate: 0.05, utilities: 300 },
  NV: { name: "Nevada", taxRate: 0.0, utilities: 315 },
  NH: { name: "New Hampshire", taxRate: 0.0, utilities: 345 },
  NJ: { name: "New Jersey", taxRate: 0.055, utilities: 365 },
  NM: { name: "New Mexico", taxRate: 0.045, utilities: 295 },
  NY: { name: "New York", taxRate: 0.062, utilities: 385 },
  NC: { name: "North Carolina", taxRate: 0.045, utilities: 305 },
  ND: { name: "North Dakota", taxRate: 0.02, utilities: 290 },
  OH: { name: "Ohio", taxRate: 0.035, utilities: 300 },
  OK: { name: "Oklahoma", taxRate: 0.042, utilities: 295 },
  OR: { name: "Oregon", taxRate: 0.075, utilities: 325 },
  PA: { name: "Pennsylvania", taxRate: 0.0307, utilities: 330 },
  RI: { name: "Rhode Island", taxRate: 0.047, utilities: 355 },
  SC: { name: "South Carolina", taxRate: 0.05, utilities: 310 },
  SD: { name: "South Dakota", taxRate: 0.0, utilities: 290 },
  TN: { name: "Tennessee", taxRate: 0.0, utilities: 300 },
  TX: { name: "Texas", taxRate: 0.0, utilities: 325 },
  UT: { name: "Utah", taxRate: 0.0465, utilities: 295 },
  VT: { name: "Vermont", taxRate: 0.055, utilities: 350 },
  VA: { name: "Virginia", taxRate: 0.05, utilities: 330 },
  WA: { name: "Washington", taxRate: 0.0, utilities: 340 },
  WV: { name: "West Virginia", taxRate: 0.045, utilities: 290 },
  WI: { name: "Wisconsin", taxRate: 0.05, utilities: 310 },
  WY: { name: "Wyoming", taxRate: 0.0, utilities: 290 },
};

export default function BudgetAdvisorChat() {
  const savedPrefs = (() => {
    try {
      return JSON.parse(localStorage.getItem("weRemovers_userPrefs")) || {};
    } catch {
      return {};
    }
  })();

  const savedZips = (() => {
    try {
      return JSON.parse(localStorage.getItem("weRemovers_rankedZips")) || [];
    } catch {
      return [];
    }
  })();

  const initialStateCode = savedPrefs.stateCode || "FL";
  const initialRent =
    savedZips.length > 0
      ? savedZips[0].effectiveRent
      : savedPrefs.maxRent || 1850;
  const initialCity =
    savedZips.length > 0
      ? savedZips[0].city
      : savedPrefs.targetCity || "Miami";

  const [stateCode, setStateCode] = useState(initialStateCode);
  const [targetRent, setTargetRent] = useState(initialRent);
  const [userAnnualIncome, setUserAnnualIncome] = useState(65000);
  const [monthsUntilMove, setMonthsUntilMove] = useState(4);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const stateInfo = STATE_TAX_DATA[stateCode] || STATE_TAX_DATA.FL;

  const estUtilitiesAndGroceries = stateInfo.utilities + 420;
  const requiredMonthlyGross = Math.round(targetRent / 0.3);
  const requiredAnnualGross = requiredMonthlyGross * 12;
  const requiredHourlyWage = (requiredAnnualGross / 2080).toFixed(2);

  const federalAndFicaRate = 0.175;
  const totalTaxRate = federalAndFicaRate + stateInfo.taxRate;
  const userMonthlyGross = Math.round(userAnnualIncome / 12);
  const userMonthlyNet = Math.round(userMonthlyGross * (1 - totalTaxRate));
  const leftoverAfterLiving =
    userMonthlyNet - targetRent - estUtilitiesAndGroceries;

  const securityDeposit = targetRent;
  const firstMonthRent = targetRent;
  const movingAndSetupCost = 1450;
  const totalMoveOutCashNeeded =
    securityDeposit + firstMonthRent + movingAndSetupCost;
  const monthlySavingsTarget = Math.round(
    totalMoveOutCashNeeded / Math.max(1, monthsUntilMove)
  );

  const [messages, setMessages] = useState(() => [
    {
      sender: "alberto",
      text: `Hello! I am Alberto, your Budgie Advisor powered by Gemini AI. I loaded your relocation profile for ${initialCity}, ${stateInfo.name} with a target rent of $${initialRent.toLocaleString()}/month. Ask me any question about budgeting, groceries, rent, or moving costs!`,
    },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const syncSlidersFromUserText = (rawText) => {
    const clean = rawText.toLowerCase();
    const nums =
      rawText
        .match(/\d[\d,.]*/g)
        ?.map((n) => Number(n.replace(/,/g, "")))
        .filter((n) => !isNaN(n)) || [];

    let updatedRent = targetRent;
    let updatedIncome = userAnnualIncome;
    let updatedMonths = monthsUntilMove;

    if (clean.includes("hour") || clean.includes("/hr") || clean.includes("hr")) {
      if (nums[0] && nums[0] >= 8 && nums[0] <= 200) {
        updatedIncome = Math.round(nums[0] * 2080);
        setUserAnnualIncome(updatedIncome);
      }
    } else if (clean.includes("rent") && nums[0] >= 400 && nums[0] <= 10000) {
      updatedRent = nums[0];
      setTargetRent(updatedRent);
    } else if (nums[0] >= 15000 && nums[0] <= 500000) {
      updatedIncome = nums[0];
      setUserAnnualIncome(updatedIncome);
    } else if (clean.includes("month") && nums[0] >= 1 && nums[0] <= 36) {
      updatedMonths = nums[0];
      setMonthsUntilMove(updatedMonths);
    }

    return { updatedRent, updatedIncome, updatedMonths };
  };

  const buildSmartAdvisorReply = (
    userMessage,
    updatedRent,
    updatedIncome,
    updatedMonths
  ) => {
    const clean = userMessage.toLowerCase();
    const reqAnnual = Math.round((updatedRent / 0.3) * 12);
    const reqHourly = (reqAnnual / 2080).toFixed(2);
    const netMonthly = Math.round((updatedIncome / 12) * (1 - totalTaxRate));
    const leftover = netMonthly - updatedRent - estUtilitiesAndGroceries;
    const upfrontCash = updatedRent * 2 + movingAndSetupCost;
    const savePerMonth = Math.round(upfrontCash / Math.max(1, updatedMonths));

    if (clean.includes("grocer") || clean.includes("food") || clean.includes("meal")) {
      return `Here are two smart ways to cut grocery costs when relocating to ${stateInfo.name}: First, avoid buying pantry staples at full-price supermarkets during week one—do a single bulk stock-up at Aldi, Trader Joe's, or a wholesale club to save 25% to 30%. Second, plan 3 batch meals for your first month so you avoid takeout while unpacking, keeping your food and utility costs near $${estUtilitiesAndGroceries}/month and preserving your $${leftover.toLocaleString()}/month disposable cushion.`;
    }

    if (clean.includes("utilit") || clean.includes("electric") || clean.includes("bill") || clean.includes("ac")) {
      return `In ${stateInfo.name}, average utilities run around $${stateInfo.utilities}/month for electricity, water, and internet. Two quick ways to lower that: ask the landlord for the unit's past 12-month electric average before signing, and set up autopay with a fixed-rate internet provider in ${initialCity} to waive the equipment setup fee.`;
    }

    if (clean.includes("roommate") || clean.includes("split") || clean.includes("share") || clean.includes("partner")) {
      const splitRent = Math.round(updatedRent * 0.62);
      const splitAnnual = Math.round((splitRent / 0.3) * 12);
      const splitHourly = (splitAnnual / 2080).toFixed(2);
      return `Splitting a 2-bedroom in ${stateInfo.name} lowers your share of rent from $${updatedRent.toLocaleString()}/month to roughly $${splitRent.toLocaleString()}/month. That drops your required qualifying income from $${reqAnnual.toLocaleString()}/year down to $${splitAnnual.toLocaleString()}/year ($${splitHourly}/hour) and cuts utilities in half.`;
    }

    if (clean.includes("save") || clean.includes("plan") || clean.includes("upfront") || clean.includes("deposit") || clean.includes("month")) {
      return `To move into a $${updatedRent.toLocaleString()}/month home in ${stateInfo.name}, you need $${upfrontCash.toLocaleString()} upfront ($${updatedRent.toLocaleString()} first month's rent + $${updatedRent.toLocaleString()} security deposit + $${movingAndSetupCost} moving setup). Over ${updatedMonths} months, set aside $${savePerMonth.toLocaleString()}/month.`;
    }

    if (clean.includes("tax") || clean.includes("paycheck") || clean.includes("take home") || clean.includes("net")) {
      return `${stateInfo.name} has a ${(stateInfo.taxRate * 100).toFixed(1)}% effective state income tax. On your $${updatedIncome.toLocaleString()}/year income, your estimated take-home pay is $${netMonthly.toLocaleString()}/month, leaving $${leftover.toLocaleString()}/month after $${updatedRent.toLocaleString()} rent and $${estUtilitiesAndGroceries} in utilities and groceries.`;
    }

    if (clean.includes("afford") || clean.includes("realistic") || clean.includes("qualify") || clean.includes("enough")) {
      const maxRent = Math.round((updatedIncome / 12) * 0.3);
      return updatedIncome >= reqAnnual
        ? `Yes, you can afford this! Your $${updatedIncome.toLocaleString()}/year income exceeds the $${reqAnnual.toLocaleString()}/year ($${reqHourly}/hour) 30% landlord rule for a $${updatedRent.toLocaleString()}/month lease in ${stateInfo.name}, leaving $${leftover.toLocaleString()}/month in savings.`
        : `Right now, $${updatedRent.toLocaleString()}/month is above the 30% rule for a $${updatedIncome.toLocaleString()}/year income (landlords look for $${reqAnnual.toLocaleString()}/year or $${reqHourly}/hour). Your safest solo rent limit is $${maxRent.toLocaleString()}/month, or you can split a 2-bedroom with a roommate.`;
    }

    if (/^(hi|hello|hey|hola)\b/.test(clean)) {
      return `Hi! I am Alberto, your Budgie Advisor. Your ${stateInfo.name} budget is set to $${updatedRent.toLocaleString()}/month rent on a $${updatedIncome.toLocaleString()}/year income, leaving $${leftover.toLocaleString()}/month after taxes, utilities, and groceries. Ask me for grocery tips, roommate math, or a savings plan!`;
    }

    return `For your move to ${stateInfo.name} at $${updatedRent.toLocaleString()}/month rent, aim for at least $${reqAnnual.toLocaleString()}/year ($${reqHourly}/hour) under the 30% rule. On $${updatedIncome.toLocaleString()}/year, your estimated take-home pay is $${netMonthly.toLocaleString()}/month with $${leftover.toLocaleString()}/month remaining after rent, utilities, and groceries.`;
  };

  const askGeminiAlberto = async (userMessage, currentHistory) => {
    const { updatedRent, updatedIncome, updatedMonths } =
      syncSlidersFromUserText(userMessage);

    const reqAnnual = Math.round((updatedRent / 0.3) * 12);
    const reqHourly = (reqAnnual / 2080).toFixed(2);
    const netMonthly = Math.round((updatedIncome / 12) * (1 - totalTaxRate));
    const leftover = netMonthly - updatedRent - estUtilitiesAndGroceries;

    const systemInstruction = `You are Alberto, the Budgie Advisor for We-Removers. Give concise (2-4 sentences), friendly moving and budgeting advice with zero emojis. State: ${stateInfo.name}, Rent: $${updatedRent}/mo, Required Income: $${reqAnnual}/yr ($${reqHourly}/hr), User Income: $${updatedIncome}/yr, Net Monthly: $${netMonthly}/mo, Utilities+Groceries: $${estUtilitiesAndGroceries}/mo, Leftover: $${leftover}/mo.`;

    const contents = currentHistory.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    if (GEMINI_API_KEY) {
      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        }
      } catch {
        // Fallback handled below
      }
    }

    await new Promise((r) => setTimeout(r, 400));
    return buildSmartAdvisorReply(
      userMessage,
      updatedRent,
      updatedIncome,
      updatedMonths
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText.trim();
    const updatedHistory = [...messages, { sender: "user", text: userMsg }];

    setMessages(updatedHistory);
    setInputText("");
    setIsLoading(true);

    const reply = await askGeminiAlberto(userMsg, updatedHistory);

    setMessages((prev) => [...prev, { sender: "alberto", text: reply }]);
    setIsLoading(false);
  };

  const triggerQuickPrompt = async (promptText) => {
    if (isLoading) return;
    const updatedHistory = [...messages, { sender: "user", text: promptText }];
    setMessages(updatedHistory);
    setIsLoading(true);

    const reply = await askGeminiAlberto(promptText, updatedHistory);

    setMessages((prev) => [...prev, { sender: "alberto", text: reply }]);
    setIsLoading(false);
  };

  return (
    <div className="py-10 px-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#F4F3EE] border border-[#19350C]/20 rounded-xl p-6 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-[#687D31]">
              Income Requirement ({stateInfo.name})
            </span>
            <h3 className="text-xl font-bold text-[#19350C] mt-1">
              What You Need to Earn for ${targetRent.toLocaleString()}/mo Rent
            </h3>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-lg bg-[#19350C] text-white">
                <span className="text-[11px] uppercase tracking-wider text-[#D5D3CC] block">
                  Required Annual Salary
                </span>
                <strong className="text-xl font-extrabold">
                  ${requiredAnnualGross.toLocaleString()}/yr
                </strong>
              </div>
              <div className="p-3.5 rounded-lg bg-[#406768] text-white">
                <span className="text-[11px] uppercase tracking-wider text-[#D5D3CC] block">
                  Required Hourly Wage
                </span>
                <strong className="text-xl font-extrabold">
                  ${requiredHourlyWage}/hr
                </strong>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#19350C]/15 text-xs">
              <div>
                <div className="flex justify-between font-bold text-[#19350C] mb-1">
                  <span>Target Monthly Rent</span>
                  <span>${targetRent.toLocaleString()}/mo</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="4500"
                  step="50"
                  value={targetRent}
                  onChange={(e) => setTargetRent(Number(e.target.value))}
                  className="w-full accent-[#687D31] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-[#19350C] mb-1">
                  <span>Your Current / Expected Annual Income</span>
                  <span>${userAnnualIncome.toLocaleString()}/yr</span>
                </div>
                <input
                  type="range"
                  min="25000"
                  max="180000"
                  step="2500"
                  value={userAnnualIncome}
                  onChange={(e) => setUserAnnualIncome(Number(e.target.value))}
                  className="w-full accent-[#406768] cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#F4F3EE] border border-[#19350C]/20 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#19350C]">
                Monthly Cash Flow in {stateInfo.name}
              </h4>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold ${
                  leftoverAfterLiving >= 400
                    ? "bg-[#687D31] text-white"
                    : "bg-[#406768] text-white"
                }`}
              >
                {leftoverAfterLiving >= 400
                  ? "Affordable Fit"
                  : "Tight Budget"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#19350C]/10">
                <span className="text-[#406768]">
                  Est. Monthly Take-Home (After {(totalTaxRate * 100).toFixed(1)}% Tax)
                </span>
                <strong className="text-[#19350C]">
                  ${userMonthlyNet.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#19350C]/10">
                <span className="text-[#406768]">Target Monthly Rent</span>
                <strong className="text-[#19350C]">
                  -${targetRent.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#19350C]/10">
                <span className="text-[#406768]">
                  Est. {stateInfo.name} Utilities & Basic Groceries
                </span>
                <strong className="text-[#19350C]">
                  -${estUtilitiesAndGroceries.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-[#19350C]">
                <span>Remaining Monthly Disposable / Savings</span>
                <span
                  className={
                    leftoverAfterLiving >= 0
                      ? "text-[#687D31]"
                      : "text-red-700"
                  }
                >
                  ${leftoverAfterLiving.toLocaleString()}/mo
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#6FA9BB]/20 border border-[#406768]/30 text-xs text-[#19350C]">
              <div className="font-bold uppercase tracking-wider text-[#406768] mb-1">
                Total Upfront Move-Out Cash Needed: $
                {totalMoveOutCashNeeded.toLocaleString()}
              </div>
              <div>
                Includes 1st month rent (${firstMonthRent}), security deposit ($
                {securityDeposit}), and moving/utility setup ($
                {movingAndSetupCost}). Save{" "}
                <strong>${monthlySavingsTarget.toLocaleString()}/mo</strong> for{" "}
                {monthsUntilMove} months.
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#F4F3EE] border border-[#19350C]/20 rounded-xl shadow-sm flex flex-col h-[620px] overflow-hidden">
          <div className="p-5 bg-[#19350C] text-[#D5D3CC] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#687D31] text-white font-extrabold text-sm flex items-center justify-center border border-[#D5D3CC]/40">
                AB
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6FA9BB]">
                  Budgie Advisor | Powered by Gemini AI
                </span>
                <h2 className="text-lg font-bold text-white leading-tight">
                  Alberto — Relocation Financial Guide
                </h2>
              </div>
            </div>

            <select
              value={stateCode}
              onChange={(e) => {
                const newCode = e.target.value;
                setStateCode(newCode);
                const st = STATE_TAX_DATA[newCode];
                setMessages((prev) => [
                  ...prev,
                  {
                    sender: "alberto",
                    text: `I switched your destination state to ${st.name}. State income tax here is ${(
                      st.taxRate * 100
                    ).toFixed(1)}% and average monthly utilities are $${st.utilities}.`,
                  },
                ]);
              }}
              className="bg-[#244715] border border-[#6FA9BB]/40 text-white text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none"
            >
              {Object.entries(STATE_TAX_DATA).map(([code, data]) => (
                <option key={code} value={code}>
                  {data.name} ({code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F4F3EE]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#19350C] text-white"
                      : "bg-[#D5D3CC]/70 border border-[#19350C]/15 text-[#19350C]"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-75">
                    {msg.sender === "user"
                      ? "You"
                      : "Alberto | Budgie Advisor (Gemini AI)"}
                  </div>
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-4 py-3 text-xs font-semibold bg-[#D5D3CC]/50 border border-[#19350C]/15 text-[#406768]">
                  Alberto is thinking with Gemini AI...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="px-5 py-2.5 bg-[#D5D3CC]/50 border-t border-[#19350C]/10 flex gap-2 overflow-x-auto">
            {[
              "Can I realistically afford this rent?",
              "Give me 2 tips to save on groceries & utilities",
              "What if I split a 2-bedroom with a roommate?",
              "Give me a 3-month move-out savings plan",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isLoading}
                onClick={() => triggerQuickPrompt(prompt)}
                className="px-3 py-1.5 rounded-md bg-white border border-[#19350C]/20 text-[#19350C] hover:bg-[#687D31] hover:text-white text-xs font-semibold shrink-0 transition disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-[#19350C]/15 flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Alberto anything about your move, groceries, salary, taxes, or rent..."
              className="flex-1 bg-[#F4F3EE] border border-[#19350C]/25 rounded-lg px-4 py-2.5 text-sm text-[#19350C] focus:outline-none focus:border-[#19350C]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-[#19350C] hover:bg-[#264d14] text-white text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              {isLoading ? "Thinking..." : "Ask Alberto"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}