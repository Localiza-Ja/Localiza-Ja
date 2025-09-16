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
      },
      fontSize: {
        // Mapeando para as classes do Tailwind (ex: text-sm, text-base)
        sm: "14px", // FONT_SIZES.small
        base: "16px", // FONT_SIZES.medium
        "2xl": "24px", // FONT_SIZES.large (Padrão do Tailwind para 24px)
        "4xl": "36px", // FONT_SIZES.xlarge (Padrão do Tailwind para 36px)
      },
      spacing: {
        // Mapeando para as classes de padding/margin (ex: p-2, m-4)
        2: "8px", // SPACING.small
        4: "16px", // SPACING.medium
        6: "24px", // SPACING.large
      },
      borderRadius: {
        xl: "12px", // Raio de 12px para o InputField
        "4xl": "40px", // Raio de 40px para a borda do Header
      },
    },
  },
  plugins: [],
};
