import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor 셸은 단순히 Vercel에 배포된 PWA를 WebView로 띄움.
// 코드 변경 없이 iOS / Android 양쪽 네이티브 앱으로 패키징.
const config: CapacitorConfig = {
  appId: 'com.dongtony12.mylovenotes',
  appName: 'my love notes',
  webDir: 'capacitor-shell',
  server: {
    url: 'https://my-love-notes.vercel.app',
    cleartext: false,
  },
  backgroundColor: '#fff8ec',
}

export default config
