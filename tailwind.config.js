/** Tailwind v3.4.17 — static/index.html için yerel derleme (CDN bağımlılığı yok).
 *  Yeniden derleme:  tools/node_modules/.bin/tailwindcss -c tailwind.config.js -i static/twind.src.css -o static/tailwind.css --minify
 *  (girdi dosyası: static/tailwind.src.css) */
module.exports = {
  darkMode: "class",
  content: ["./static/index.html"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3"
        }
      }
    }
  },
  plugins: []
};
