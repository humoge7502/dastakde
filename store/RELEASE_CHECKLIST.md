# DastakDe — Play Console Release Checklist

Step-by-step runbook from zero to a published app. Application ID:
**`app.dastakde.android`**. Work top to bottom; do not skip the keystore backup step and do not
reuse the retired SahiMauka AAB or upload key.

---

## 0. Prerequisites

- [ ] Node.js 18+ and npm installed; repo cloned at `C:\Users\Devesh tiwari\q-trust-projects\sahimauka`
- [ ] JDK 17+ and the Android SDK (for a local AAB build; only needed if not using EAS)
- [ ] `cd sahimauka-app && npm install && npx tsc --noEmit` passes
- [ ] `python -m unittest discover -s ingest -t . -p "test_*.py"` passes
- [ ] Brand assets generated (`python brand/make_assets.py`) and copied into `sahimauka-app/assets/images/`
- [ ] Site and feed deployed (step 1) — the app reads the live feed, so this must come first
- [ ] Listing copy ready: `store/PLAY_LISTING.md`

## 1. Deploy the site + feed before touching Play

1. Create the GitHub repository `humoge7502/dastakde` and push `main`.
2. Settings → Pages → Source: **Deploy from a branch** · Branch `main` · Folder **`/docs`**.
3. Wait for the Pages build, then verify:
   - `https://humoge7502.github.io/dastakde/` loads with live feed counts
   - `https://humoge7502.github.io/dastakde/feed/index.json` is valid JSON with the expected sources
   - `https://humoge7502.github.io/dastakde/privacy.html` loads
   - `/organizers.html` and `/colleges.html` load
4. Actions → **Feed refresh** → Run workflow once; confirm the run passes and commits only when the
   feed changed. The schedule then runs every 2 hours.

Do not submit to Play while the app points at a missing or stale feed.

## 2. Create the developer account — one-time, $25

1. Go to <https://play.google.com/console> and sign in with the Google account you will keep
   long-term (the publisher identity is public in listing metadata).
2. Accept the Developer Distribution Agreement and pay the **US $25 one-time registration fee**.
3. Complete **identity verification**: government-issued ID + a short video/selfie check as
   prompted. Approval is usually minutes to a couple of days.
4. Set up a **developer profile** (the developer name shown on the listing).
5. **New personal accounts (created after 13 Nov 2023):** before production access for the first
   app, Play requires a closed test with **at least 12 testers opted in for 14 consecutive days**.
   Plan that in (step 9). Organisation accounts are exempt.

## 3. Prepare the Android project (once per machine)

```bash
cd sahimauka-app
npx expo prebuild -p android
```

Confirm `android/app/build.gradle` contains:

```gradle
defaultConfig {
    applicationId "app.dastakde.android"
}
```

If it does not, fix `android.package` in `sahimauka-app/app.json`, delete the generated `android/`
folder, and re-run prebuild. Do not hand-edit unrelated generated files.

## 4. Generate the upload keystore (local, one-time)

The **upload key** signs every AAB you submit. Play App Signing holds a separate release key that
Google manages.

```bash
mkdir -p keystores
keytool -genkeypair -v \
  -keystore keystores/dastakde-upload.keystore \
  -alias dastakde \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

(Windows CMD: replace the `\` continuations with `^`. If `keytool` is missing, use
`"%JAVA_HOME%\bin\keytool"`.)

Prompts — record the values in a password manager:

| Prompt | Value |
|---|---|
| keystore password | strong password (record it) |
| key password (may match) | record it |
| Common Name (CN) | DastakDe |
| Organizational Unit | Mobile |
| Organization | DastakDe |
| City / State / Country | your city / state / `IN` |

Validity 10000 days covers Google's requirement that the upload key stay valid past Oct 2033.

**Secret hygiene:**

- Keystore path: `keystores/dastakde-upload.keystore` (repo root, git-ignored).
- **Never commit it**, never paste its passwords into chat, docs, issues or screenshots.
- Keep **two backups** (encrypted cloud storage + offline USB). A lost upload key requires a Play
  Support key reset (weeks, and only after the app is live).
- Record the alias (`dastakde`) and passwords in `store/KEYSTORE_INFO.txt` — that file is
  git-ignored and must stay untracked.

## 5. Wire signing into Gradle

Put secrets in `android/gradle.properties` (git-ignored) or environment variables:

```properties
DASTAKDE_UPLOAD_STORE_FILE=../../keystores/dastakde-upload.keystore
DASTAKDE_UPLOAD_STORE_PASSWORD=********
DASTAKDE_UPLOAD_KEY_ALIAS=dastakde
DASTAKDE_UPLOAD_KEY_PASSWORD=********
```

In `android/app/build.gradle`, inside `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file(DASTAKDE_UPLOAD_STORE_FILE)
        storePassword DASTAKDE_UPLOAD_STORE_PASSWORD
        keyAlias DASTAKDE_UPLOAD_KEY_ALIAS
        keyPassword DASTAKDE_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
    }
}
```

Alternative: let EAS manage credentials with `npx eas credentials -p android`, then build on EAS.
The file-based path above is for fully local builds.

## 6. Build and verify the AAB

**6a. Local build:**

```bash
cd sahimauka-app/android
./gradlew bundleRelease        # Windows: gradlew.bat bundleRelease
```

Output to upload:

```
sahimauka-app/android/app/build/outputs/bundle/release/app-release.aab
```

**6b. Or EAS build:**

```bash
cd sahimauka-app
npx eas build -p android --profile production
```

Before upload:

- [ ] `npx expo export --platform android` succeeds
- [ ] Version and versionCode are correct in `app.json` (currently `1.0.0` / `1`)
- [ ] Install the release build on a real device or emulator and verify: feed loads from the live
      Pages URL, item taps open the **official** page, reminder fires, tour starts on a clean
      install, `More → List an opportunity` and `College plan` open the live pages
- [ ] No test/demo listings appear anywhere

## 7. Create the app in Play Console

1. Play Console → **All apps → Create app**.
2. App name: `DastakDe: Verified Mauka` · Default language: **English (India) — en-IN**.
3. **App** (not game) · **Free** (not paid).
4. Accept the Developer Program Policies and US export declarations.
5. Create.

## 8. Fill the store listing

Play Console → Grow → **Main store listing**. Copy values verbatim from `store/PLAY_LISTING.md`:

- [ ] App name (24/30), short description (75/80), full description (2,673/4,000)
- [ ] App icon: `store/assets/icon-512.png`
- [ ] Feature graphic: `store/assets/feature-graphic-1024x500.png`
- [ ] Phone screenshots from the running app (≥ 2): feed, item detail showing the official-source
      link, reminders/settings
- [ ] Privacy policy URL (from `store/PRIVACY_URL.txt`):
      `https://humoge7502.github.io/dastakde/privacy.html`
- [ ] Contact email (a monitored inbox)

## 9. App content sections (Policy → App content)

Answers are in `store/PLAY_LISTING.md`:

- [ ] **Privacy policy** — the URL above
- [ ] **Ads** — "No, my app does not contain ads"
- [ ] **Content rating** — IARC questionnaire per PLAY_LISTING §7 (expected Everyone / PEGI 3 / USK 0)
- [ ] **Target audience** — 13–15, 16–17, 18+; designed for children: **No**; appeal to children: No
- [ ] **Data safety** — "Does your app collect or share any required user data types?" → **No**
- [ ] **App access** — "All functionality is available without restrictions"
- [ ] **Government apps** — No · **Financial features** — No · **Health** — No · **News** — No
- [ ] Countries/regions: India first

## 10. Release

1. Release → **Closed testing** first if the account is new (12 testers / 14 days), otherwise
   **Production**.
2. Create release → upload the AAB.
3. Release notes:

   ```
   Initial release. Verified opportunities from official sources — scholarships, hackathons, internships, fellowships, exams and schemes — with deadline reminders, a guided tour, no accounts and no data collection.
   ```

4. Review the pre-launch report; fix or document any crash/ANR.
5. **Start rollout → Send for review.**

**Review timeline:** first app: roughly 1–7 days (new accounts can take longer). Updates to a live
app: usually 1–3 days. Track status under Publishing overview.

## 11. After approval

- [ ] Install from Play on a real device; verify feed, official links, reminders, tour, pages
- [ ] Confirm Play App Signing is active; the upload keystore stays local
- [ ] Monitor Android vitals and reviews
- [ ] Confirm the scheduled feed workflow is still green and the feed timestamp is recent

## 12. Regular update cadence

- **Feed:** automatic every 2 hours via `.github/workflows/feed.yml`; no app release needed.
- **App:** bump `version` and `versionCode` in `sahimauka-app/app.json` → run tests → rebuild AAB →
  new Production release. Target a monthly app update, and ship promptly for any broken source
  parser or security fix.
- When **DastakDe Plus** (IAP) ships: add Play Billing, then update the content-rating purchase
  answer, Data safety, the listing, and this checklist.

## Quick reference

| Thing | Value / path |
|---|---|
| Application ID | `app.dastakde.android` |
| Keystore alias | `dastakde` |
| Keystore path | `keystores/dastakde-upload.keystore` (git-ignored) |
| Signing config | `sahimauka-app/android/app/build.gradle` (secrets in `android/gradle.properties`) |
| AAB output | `sahimauka-app/android/app/build/outputs/bundle/release/app-release.aab` |
| Store listing copy | `store/PLAY_LISTING.md` |
| Privacy policy | `https://humoge7502.github.io/dastakde/privacy.html` |
| Icon / feature graphic | `store/assets/icon-512.png` / `store/assets/feature-graphic-1024x500.png` |
