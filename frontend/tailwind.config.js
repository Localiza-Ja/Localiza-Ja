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
        // Cores antigas (mantemos para não quebrar o código existente)
        primary: "#FCA14E",
        "gradient-end": "#FFE6CE",
        background: "#FFF",
        "text-primary": "#22212E",
        "text-secondary": "#6c757d",
        placeholder: "#ADB5BD",
        "input-background": "#F3F7FB",
        border: "#CED4DA",

        // --- NOVAS OPÇÕES DE CORES ---
        white: "#FFFFFF",
        black: "#000000",
        // Paleta de Cinzas
        gray: {
          100: "#F8F9FA", // Super claro
          200: "#E9ECEF", // Borda sutil
          300: "#DEE2E6",
          400: "#CED4DA",
          500: "#ADB5BD", // Cor do seu placeholder
          600: "#6C757D", // Cor do seu text-secondary
          700: "#495057",
          800: "#343A40",
          900: "#212529", // Super escuro
        },
        // Cores de Feedback
        success: "#28a745",
        danger: "#dc3545",
        warning: "#ffc107",
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
