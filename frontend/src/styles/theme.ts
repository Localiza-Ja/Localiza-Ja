// ARQUIVO: frontend/src/styles/theme.ts

import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../tailwind.config.js";

const fullConfig = resolveConfig(tailwindConfig);

const allColors = fullConfig.theme.colors as unknown as Record<string, string>;

// --- CORREÇÃO FINAL AQUI ---
// Esta versão da função é mais segura e robusta.
const parsePixelValues = (values: Record<string, any> | undefined) => {
  // Se o objeto de valores não existir, retorna um objeto vazio.
  if (!values) {
    return {};
  }

  const newValues: Record<string, number> = {};
  for (const key in values) {
    const value = values[key];

    let pixelValue: string | null = null;

    // Verifica se o valor é um array (caso do fontSize) e pega o primeiro item.
    if (Array.isArray(value)) {
      pixelValue = value[0];
    }
    // Verifica se o valor já é uma string.
    else if (typeof value === "string") {
      pixelValue = value;
    }

    // Apenas se tivermos uma string de pixel válida, nós a processamos.
    if (pixelValue) {
      const parsedValue = parseInt(pixelValue.replace("px", ""), 10);
      // Garante que o resultado seja um número antes de adicionar.
      if (!isNaN(parsedValue)) {
        newValues[key] = parsedValue;
      }
    }
  }
  return newValues;
};

// Agora os valores são extraídos e processados com segurança
export const COLORS = allColors;
export const FONT_SIZES = parsePixelValues(fullConfig.theme.fontSize);
export const SPACING = parsePixelValues(fullConfig.theme.spacing);

export { scale, verticalScale, moderateScale };
