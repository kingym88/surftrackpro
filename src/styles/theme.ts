export type Theme = 'light' | 'dark';

export const themeClasses = {
  background: "bg-slate-900 dark:bg-slate-900 bg-slate-50",
  surface: "bg-slate-800 dark:bg-slate-800 bg-white",
  cardBg: "bg-slate-800/80 dark:bg-slate-800/80 bg-slate-100",
  textPrimary: "text-white dark:text-white text-slate-900",
  textMuted: "text-slate-400 dark:text-slate-400 text-slate-500",
  border: "border-slate-700 dark:border-slate-700 border-slate-200",
  accent: "bg-cyan-500 text-white",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
} as const;

export const themeTokens = {
  colors: {
    // Shared
    primary: '#137fec', // Primary Blue
    
    // Light Mode
    light: {
      background: '#F8F9FA', // Surface Soft White
      surface: '#FFFFFF',
      text: '#334155', // Slate Dark Gray
      textMuted: '#9CA3AF', // gray-400
      border: '#E5E7EB', // gray-200
      accent1: '#13daec', // Coastal Teal
      accent2: '#FF7F50', // Warm Coral
    },
    
    // Dark Mode
    dark: {
      background: '#0A1622', // Deep Navy
      surface: '#121C26', // Surface Navy
      text: '#FFFFFF',
      textMuted: '#94A3B8', // slate-400
      border: 'rgba(255, 255, 255, 0.1)', // glassBorder
      accent1: '#2ECC71', // Coastal Green (Success)
      accent2: '#F39C12', // Sunset Orange (Warning)
    }
  }
};
