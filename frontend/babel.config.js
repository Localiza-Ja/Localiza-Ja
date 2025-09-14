// ARQUIVO: babel.config.js

module.exports = function (api) {
  api.cache(true);
  return {
    // Sua estrutura de presets, que está CORRETA para o seu projeto.
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // A única mudança é aqui: trocamos o nome do plugin para o novo.
    plugins: [
      "react-native-worklets/plugin", // <-- MUDANÇA AQUI
    ],
  };
};
