/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'piggy-bg': '#FEF3C7',      // Style C background (Creamy Yellow)
        'piggy-pink': '#F472B6',    // Style C primary pink
        'piggy-pink-dark': '#DB2777', // Style C border/shadow pink
        'piggy-card-bg': '#FFFFFF',
      },
      fontFamily: {
        'piggy': ['"ZCOOL KuaiLe"', '"Comic Sans MS"', 'cursive', 'sans-serif'],
      },
      boxShadow: {
        'piggy': '4px 4px 0px #FBCFE8',     // Style C soft pink shadow
        'piggy-sm': '2px 2px 0px #FBCFE8',
        'piggy-btn': '2px 2px 0px #DB2777', // Style C button shadow
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}
