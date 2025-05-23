import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/react-tailwindcss-datepicker/dist/index.esm.{js,ts}"
  ],
  theme: {
    extend: {
      opacity: {
        "1": "1",
        "0": "0"
      },
      colors: {
        // Marine/Teal palette
        'marine': {
          DEFAULT: '#78FFF0', // Primary 500
          '50': '#F4F9F8',
          '100': '#E6FFFC',
          '200': '#B9F7F2',
          '300': '#9AFFF8',
          '400': '#78FFF0', // Primary 500
          '500': '#5CDBCF',
          '600': '#40B7AF',
          '700': '#447671', // Primary 700
          '800': '#086F6F',
          '900': '#232323'
        },
        // Error/warning colors
        'error': {
          DEFAULT: '#FE1B4E',
          '50': '#FFE6EB',
          '300': '#FE809C',
          '500': '#FE1B4E',
          '700': '#E40134',
          '900': '#980123'
        },
        'warning': {
          DEFAULT: '#FFFF93',
          '300': '#FFFFB9',
          '500': '#FFFF93',
          '700': '#E6E684'
        }
      }
    }
  }
}

export default config
