// apps/prayantra-b2b/src/constants/colors.ts

// ----- Main gradient colors (cyan → purple) -----
export const GRADIENT_COLORS = ['#00B4DB', '#7B2FBE'] as const;
export const GRADIENT_START = { x: 0, y: 0 };
export const GRADIENT_END = { x: 1, y: 0 };

// ----- Core brand colors -----
export const PRIMARY_COLOR = '#7B2FBE';      // Purple – main actions, headers
export const SECONDARY_COLOR = '#00B4DB';    // Cyan – accents, secondary buttons

// ----- Light variants (for backgrounds, hover states) -----
export const PRIMARY_LIGHT = '#F3F0FF';      // light purple (used for selected items)
export const SECONDARY_LIGHT = '#E6F9FF';    // light cyan

// ----- Semantic / UI colors -----
export const BACKGROUND_COLOR = '#F5F7FA';   // main screen background
export const CARD_BACKGROUND = '#FFFFFF';    // cards, modals
export const TEXT_PRIMARY = '#1A1A1A';       // main text
export const TEXT_SECONDARY = '#666666';     // subtext, placeholders
export const ERROR_COLOR = '#EF4444';        // red for errors
export const SUCCESS_COLOR = '#10B981';      // green for success
export const WARNING_COLOR = '#F59E0B';      // amber for warnings
export const BORDER_COLOR = '#EEEEEE';       // borders, dividers
export const DISABLED_COLOR = '#CCCCCC';     // disabled elements

// ----- Selected / highlighted item background (reusing PRIMARY_LIGHT) -----
export const SELECTED_ITEM_BG = PRIMARY_LIGHT;

// ----- Helper for gradient buttons (if you need a reusable gradient) -----
export const GRADIENT_BUTTON = {
  colors: GRADIENT_COLORS,
  start: GRADIENT_START,
  end: GRADIENT_END,
};