import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next*/**",
      ".open-next/**",
      "admin-portal/.next/**",
      "admin-portal/.next-*/**",
      "admin-portal/.open-next/**",
      "tmp/**",
      ".wrangler/**",
      "admin-portal/.wrangler/**",
      ".runs/**",
      "data/**",
      "node_modules/**",
    ],
  },
  ...nextVitals,
];

export default config;
