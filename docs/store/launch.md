# Flyleaf Journal: App Store and Google Play

The store apps are the web journal in a Capacitor shell (`ios/`, `android/`, id `com.feyidesigns.journal`,
name **Flyleaf Journal**). Everything native sits behind `native` in `src/native/platform.ts`; the website
build is unchanged and stays free and complete.

What the store apps do differently:

- **Free:** the timeline for 3 books, with quotes, words, notes and photographs. Backups (save and load) free.
- **Unlock** ($4.99) or **Supporter** ($9.99), one-time, same contents: unlimited books, voice memos,
  characters, places, threads, the printed journal and keepsake sharing, sync.
- **Trial:** 14 days of everything. iOS: a $0 non-consumable the reader taps. Android: counted from first launch.
- Nobody loses anything: a reader over the limit keeps and edits every book and keep, and is only asked to
  unlock to add a fourth book or start a locked kind of keep.
- Purchases are checked on the device (StoreKit 2 / Play Billing via `@capgo/native-purchases`),
  cached for offline launches, re-read at start-up. Restore lives in the unlock sheet.
- No tip jar (Paystack), no install prompt, no update toast, no service worker, no page-view counter.
- Camera / photo library through the phone's own sheet; microphone for voice memos; share sheet in place
  of downloads; the system print sheet (with Save as PDF) for the printed journal.

Code: `src/native/` (platform, unlock, UnlockSheet, device), `capacitor.config.ts`, local Print plugins in
`ios/App/App/SceneDelegate.swift` and `android/.../PrintPlugin.java`.

## 0 · Build

```bash
npm run ios        # build + cap sync ios, then open ios/App/App.xcodeproj in Xcode
npm run android    # build + cap sync android
```

Gradle needs a JDK and the SDK on this Mac:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
```

Build the store apps **with** the production `.env` (`VITE_GOOGLE_CLIENT_ID`, `VITE_API_BASE` …) so sign-in
and sync point at api.flyleaf.cc. Raise the version for every upload: iOS `MARKETING_VERSION` /
`CURRENT_PROJECT_VERSION` in Xcode, Android `versionCode` / `versionName` in `android/app/build.gradle`.

The Xcode scheme uses `ios/App/App/FlyleafJournal.storekit`, so purchases work in the Simulator with no
App Store Connect setup (Debug → StoreKit → Manage Transactions to refund or reset).

## 1 · Google sign-in (Google Cloud console, the project that owns the web client)

The apps sign in natively and hand Google's ID token to the same `/auth/google` the website uses, with the
**web** client as the audience. Nothing changes on the server.

- [ ] **iOS client:** Credentials → Create OAuth client ID → iOS, bundle id `com.feyidesigns.journal`.
  - Put its id in `.env` as `VITE_GOOGLE_IOS_CLIENT_ID=…apps.googleusercontent.com`.
  - Add its **reversed** id (`com.googleusercontent.apps.…`) as a URL scheme: Xcode → App target → Info →
    URL Types → +. Without it the Google sheet cannot return to the app.
- [ ] **Android clients**, package `com.feyidesigns.journal`, one per SHA-1:
  - debug: `keytool -list -v -keystore ~/.android/debug.keystore -storepass android | grep SHA1`
  - upload key (step 3b) and the Play App Signing key (Play Console → App integrity).
- [ ] **Sign in with Apple** (App Review guideline 4.8): Apple asks for it when an app offers a third-party
  login. Sync is optional and the app works fully without an account, which is the usual argument; if review
  pushes back, add it using `/auth/apple` from the shared contract below.

## 2 · App Store Connect

- [ ] Apple Developer Program, team Feyi Designs. Certificates, IDs & Profiles → Identifiers →
  `com.feyidesigns.journal`, capability **In-App Purchase**. In Xcode set the team on the App target.
- [ ] My Apps → + → New App: name **Flyleaf Journal**, primary language English (UK),
  bundle id `com.feyidesigns.journal`, SKU `flyleaf-journal`. Category Books (secondary Lifestyle).
- [ ] Agreements, Tax and Banking: Paid Apps agreement signed, bank and tax forms in.
- [ ] Monetization → In-App Purchases, all **Non-Consumable**, each with a review screenshot of the
  unlock sheet and a one-line description:

  | Product id | Reference name | Price | Display name |
  |---|---|---|---|
  | `com.feyidesigns.journal.unlock` | Unlock | $4.99 (tier) | Unlock Flyleaf |
  | `com.feyidesigns.journal.supporter` | Supporter | $9.99 (tier) | Flyleaf Supporter |
  | `com.feyidesigns.journal.trial` | 14-day trial | Free | 14-day full trial |

  The trial must be named so the length is clear (Apple's rule for free trials of non-subscription apps,
  guideline 3.1.1). Attach all three to the first version you submit.
- [ ] App Privacy (nutrition labels). Data linked to the reader, only when they sign in to sync:
  - Contact Info → **Email address**, **Name**: App Functionality.
  - User Content → **Photos**, **Audio data**, **Other user content** (notes, quotes): App Functionality.
  - Nothing used for tracking; no analytics in the app; purchases are Apple's.
  - Privacy policy URL: `https://flyleaf.cc/legal/privacy` (see "Privacy text" below).
- [ ] Age rating questionnaire: all None → 4+. Export compliance is answered in Info.plist
  (`ITSAppUsesNonExemptEncryption` = NO).
- [ ] App Review notes: "Sync is optional; the whole journal works without an account. The 14-day trial is a
  free non-consumable in the unlock sheet (Settings → Flyleaf)."
- [ ] Upload: Xcode → Product → Archive → Distribute → App Store Connect. TestFlight internal testing first,
  buy with a Sandbox tester (Users and Access → Sandbox).

## 3 · Google Play Console

### 3a · Account
- [ ] play.google.com/console ($25 once). An **Organization** account (with a D-U-N-S) skips the tester rule;
  a **Personal** account must run a **closed test with at least 12 testers for 14 days in a row** before it
  may apply for production.
- [ ] Create app: **Flyleaf Journal**, App, Free, English (UK).

### 3b · Upload key (you, once, keep forever)

```bash
keytool -genkeypair -v -keystore ~/flyleaf-journal-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Wire it into `android/app/build.gradle` (`signingConfigs.release` reading an ignored
`android/keystore.properties`, as Naija Farm does) and keep the .jks and passwords in your password manager.
Then `npm run android:bundle` makes `android/app/build/outputs/bundle/release/app-release.aab`.

### 3c · In-app products (Monetize → Products → One-time products)
- [ ] Payments profile set up.
- [ ] `com.feyidesigns.journal.unlock` $4.99 and `com.feyidesigns.journal.supporter` $9.99. Activate both.
  No trial product on Android: the app counts 14 days from first launch.

### 3d · App content
- [ ] Privacy policy URL (same as iOS).
- [ ] **Data safety**:
  - Collected, only when the reader signs in to sync: Personal info → **Email address**, **Name**;
    Photos and videos → **Photos**; Audio → **Voice or sound recordings**; App activity →
    **Other user-generated content**. Purpose: App functionality. Not shared. Encrypted in transit.
    Users can ask for deletion (Settings → sync → remove from Flyleaf's servers).
  - Not collected: location, contacts, identifiers, analytics, financial info (Play handles payment).
- [ ] Ads: none. Content rating (IARC): no user interaction, no sharing between users → Everyone.
  Target audience 13+. News / government / financial features: no.
- [ ] Account deletion web link: a short paragraph on the privacy page saying how to delete without the app.

### 3e · Testing tracks
- [ ] Internal testing: upload the .aab, add yourself, buy with a licence tester (Settings → License testing)
  so no money moves. Check restore after reinstall.
- [ ] Closed testing (personal account): 12+ testers opted in for 14 consecutive days, then apply for
  production. Use the closed test to check the Android trial counting down and sync across two devices.

## 4 · Store listing (both stores)

- Name: **Flyleaf Journal**. Subtitle (iOS, 30 chars): "A reading journal, book by book".
- Icon: `public/icon-512.png` (Play 512², iOS 1024² from the same master; no transparency on iOS).
- Screenshots: iPhone 6.9" and Play phone, from the Simulator: timeline, a book's keeps, the printed journal.
- Play feature graphic 1024×500: not made yet.

## 5 · Privacy text (before submitting)

`src/legal/documents.tsx` describes the website. For the store apps it should also say: no page-view counter
in the apps; purchases go through Apple / Google and Flyleaf sees only that the unlock is owned; camera,
photos and microphone are used only when the reader adds a picture or a voice memo. It mentions Paystack
(the web tip jar), which the apps do not offer. One shared page with a short "In the iPhone and Android apps"
section is enough.

## 6 · Server check later (not built, nothing on the server changed)

Today the device decides. When api.flyleaf.cc should know about purchases (to unlock across platforms or to
catch refunds while offline), use the shared contract written for Flyleaf eReader and Press, so one change
to the Worker serves all three apps, with app key `journal`:

- `POST /iap/verify` (session) `{ app: 'journal', jws }` on iOS or `{ app: 'journal', token, product }` on
  Android → `{ unlocked, products }`; 409 when the purchase belongs to another Flyleaf account.
- `GET /unlock/journal` → `{ unlocked, products }`.
- `POST /iap/notify/journal`: App Store Server Notifications v2, REFUND / REVOKE marks the row revoked.
- `POST /auth/apple` `{ credential, app: 'journal' }` if Sign in with Apple is needed.
- Sync stays free on the server (the website syncs for free); the store builds gate it on the device.

On the device, `refresh()` in `src/native/unlock.ts` is the one place to call `/unlock/journal`, keeping the
store check as the offline fallback. Play's Voided Purchases API (Android refunds) is not covered yet.
