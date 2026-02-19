export type Theme = 'light' | 'dark';

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
