import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'a-primary': '#0891B2',
        'a-primary-dark': '#164E63',
        'a-primary-light': '#E0F2FE',
        'a-secondary': '#475569',
        'a-dark': '#0F172A',
        'a-light': '#F1F5F9',
        'a-bg-card': '#FFFFFF',
      },
      fontFamily: {
        times: ['"Times New Roman"', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
