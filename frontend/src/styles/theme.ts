// ARQUIVO: frontend/src/styles/theme.ts (Corrigido e Seguro)

import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../tailwind.config.js";

const fullConfig = resolveConfig(tailwindConfig);

const theme = fullConfig.theme || {};

export const COLORS = (theme.colors || {}) as any;

const parsePixelValues = (values: Record<string, any> | undefined) => {
  if (!values) return {};
  const newValues: Record<string, number> = {};
  for (const key in values) {
    const value = values[key];
    let pixelValue: string | null = null;
    if (Array.isArray(value)) {
      pixelValue = value[0];
    } else if (typeof value === "string") {
      pixelValue = value;
    }
    if (pixelValue) {
      const parsedValue = parseInt(pixelValue.replace("px", ""), 10);
      if (!isNaN(parsedValue)) {
        newValues[key] = parsedValue;
      }
    }
  }
  return newValues;
};

export const FONT_SIZES = parsePixelValues(theme.fontSize);
export const SPACING = parsePixelValues(theme.spacing);

export { scale, verticalScale, moderateScale };
