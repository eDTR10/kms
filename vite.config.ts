import path from "path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig, type Plugin } from "vite"

// Injects a Content-Security-Policy <meta> tag into the built dist/index.html
// only (apply: "build" — never touches `vite dev`, whose HMR client relies on
// eval() that a strict script-src would otherwise break). This is what
// actually ships to GitHub Pages, which has no way to send the CSP as a real
// HTTP response header.
//
// script-src has no 'unsafe-inline'/'unsafe-eval': the sha256 hash below
// allowlists index.html's own GitHub Pages SPA-redirect bootstrap script
// without opening the door to injected <script> content. If that script's
// content in index.html changes, its hash must be recomputed - and over the
// LF-normalized text (browsers normalize CRLF/CR to LF before hashing, so a
// hash taken over this file's raw Windows CRLF bytes will NOT match and the
// script will silently stop running; verified against a live browser).
function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com 'sha256-0ERhwvqjjWTE3W+b7kTPVoD4jGbeW+Ad00NHy/QpHWA='",
    // 'unsafe-inline' here only enables CSS (style="..."), never script — kept
    // for framer-motion (writes style.cssText directly) and the DOMPurify-
    // sanitized color-only style="" that Citizen Charter content may carry.
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    // Backend API host is env-driven (VITE_SERVER_URL differs per deployment)
    // — allow any HTTPS host rather than hardcoding one that could change and
    // break API calls.
    "connect-src 'self' https:",
    // accounts.google.com renders the actual Sign-in-with-Google button in an
    // iframe; www.google.com is the Maps embed on the Maps page.
    "frame-src 'self' https://accounts.google.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")

  return {
    name: "inject-csp",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />`
      )
    },
  }
}

export default defineConfig({
  // REPO-NAME
  base: "/kms",
  plugins: [react(), cspPlugin()],
  server: {
    host: '0.0.0.0', // IP address, 0.0.0.0 makes it accessible on your local network
    port: 6980, // specify the port you want here
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
