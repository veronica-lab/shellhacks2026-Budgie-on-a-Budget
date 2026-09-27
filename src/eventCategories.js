// Shared by the app and the server (server/api.js validates categories against this list).
export const EVENT_CATEGORIES = [
  { value: 'cafe', label: 'Café' },
  { value: 'food', label: 'Food & drink' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'music', label: 'Music' },
  { value: 'market', label: 'Market' },
  { value: 'arts', label: 'Arts' },
  { value: 'family', label: 'Family' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
];

export const categoryLabel = (value) => EVENT_CATEGORIES.find((c) => c.value === value)?.label ?? 'Event';
