// Shared by the app and the server (server/api.js validates categories against this list).
export const EVENT_CATEGORIES = [
  { value: 'cafe', label: 'Café', icon: '☕' },
  { value: 'food', label: 'Food & drink', icon: '🍽️' },
  { value: 'fitness', label: 'Fitness', icon: '🏃' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'market', label: 'Market', icon: '🛍️' },
  { value: 'arts', label: 'Arts', icon: '🎨' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'community', label: 'Community', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export const CATEGORY_ICONS = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.value, c.icon]));
export const categoryLabel = (value) => EVENT_CATEGORIES.find((c) => c.value === value)?.label ?? 'Event';
