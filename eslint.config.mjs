import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next*/**",
      "admin-portal/.next/**",
      ".runs/**",
      "data/**",
      "node_modules/**",
    ],
  },
  ...nextVitals,
];

export default config;
