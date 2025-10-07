// ARQUIVO: tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FCA14E",
        "gradient-end": "#FFE6CE",
        background: "#FFF",
        "text-primary": "#22212E",
        "text-secondary": "#6c757d",
        placeholder: "#ADB5BD",
        "input-background": "#F3F7FB",
        border: "#CED4DA",

        white: "#FFFFFF",
        black: "#000000",
        gray: {
          100: "#F8F9FA",
          200: "#E9ECEF",
          300: "#DEE2E6",
          400: "#CED4DA",
          500: "#ADB5BD",
          600: "#6C757D",
          700: "#495057",
          800: "#343A40",
          900: "#212529",
        },
        success: "#28a745",
        danger: "#dc3545",
        warning: "#ffc107",
      },
      fontSize: {
        sm: "14px",
        base: "16px",
        "2xl": "24px",
        "4xl": "36px",
      },
      spacing: {
        2: "8px",
        4: "16px",
        6: "24px",
      },
      borderRadius: {
        xl: "12px",
        "4xl": "40px",
      },
      fontFamily: {
        regular: ["GoogleSansCode-Regular"],
        slogan: ["GoogleSansCode-Italic"],
      },
    },
  },
  plugins: [],
};
