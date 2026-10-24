import type { CapacitorConfig } from '@capacitor/cli'

// The App Store and Google Play apps bundle dist/ (npm run ios / npm run android);
// nothing is loaded from the website. Branch `store`; see docs/store/launch.md.
const config: CapacitorConfig = {
  appId: 'com.feyidesigns.journal',
  appName: 'Flyleaf Journal',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  plugins: {
    // Android 15+ draws edge to edge; with viewport-fit=cover (index.html, native
    // only) the app's own env(safe-area-inset-*) padding does the rest.
    SystemBars: { insetsHandling: 'native' },
  },
}

export default config
