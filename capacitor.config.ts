import type { CapacitorConfig } from "@capacitor/cli";

// iOS app wrapper: `npm run ios` builds the web bundle into dist/ and copies it into ios/.
const config: CapacitorConfig = {
  appId: "com.montymac.swaytower",
  appName: "Sway Tower",
  webDir: "dist",
  // Matches the page background, so nothing flashes white before the first frame.
  backgroundColor: "#14161f",
  ios: {
    // The page handles the notch itself with env(safe-area-inset-*) (viewport-fit=cover).
    contentInset: "never",
    // A game canvas: no rubber-band scrolling, no link previews.
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
};

export default config;
