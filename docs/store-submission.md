# Store submission — compliance answers, listing copy, runbook

> Everything a submission needs, written down **before** the consoles ask, so no
> answer is improvised. Where an answer is a reading of a store policy rather
> than a fact about the app, it says so, with the reasoning — re-check the
> policy text on the day you file (`02-TRD.md` §11).

Owner: Visweswar. Milestone M7. Last revised: 21 September 2026.

---

## 0. Blockers — nothing below can be submitted until these are done

| # | Blocker | Who | Status |
|---|---|---|---|
| B1 | **Exam format verified at an RTO** (`exam-config.json` → `formatVerifiedOn`). Until then the app tells users the format is unconfirmed — a reviewer will read that too | Visweswar | ☐ |
| B2 | **GitHub Pages enabled** for `docs/` on the default branch, so <https://komalsivvala.github.io/app1/privacy-policy/> resolves. Both listings and the About screen link to it | Visweswar (repo Settings → Pages → Deploy from a branch → `main` / `docs`) | ☐ |
| B3 | **Support email** — replace `{{SUPPORT_EMAIL}}` in `docs/privacy-policy.md`, set `supportEmail` in `src/config/links.ts` (About screen shows "Report a wrong answer" only when set). Play requires a developer email; Apple a support URL (the Pages site is fine) | Visweswar | ☐ |
| B4 | **EAS Update decision — decided: manual, user-initiated (option 3).** `checkAutomatically: NEVER`; Settings has a "Check for updates" button that is the app's only network request. Remaining: `eas init` and `eas update:configure` with your Expo account, which write `updates.url` and `extra.eas.projectId` into `app.json` (until then the button reads "Not available in this build") | Visweswar | ☐ config |
| B5 | **Guide values confirmed on Sarathi** (fees, ages, validity) and `lastVerified` updated in `src/content/guide.json` | Visweswar | ☐ |
| B6 | **Ten real users** complete a mock on a physical device (plan Day 26–27); the 200% text-size check on a device (plan Day 22) | Visweswar | ☐ |
| B7 | Developer accounts: Google Play Console (one-time fee), Apple Developer Program (annual) | Visweswar | ☐ |

### 0.1 Step by step

**B7 — accounts (start first; lead times).**
1. Expo: free account at expo.dev; `npm i -g eas-cli && eas login`; in the repo `eas init` (writes `extra.eas.projectId`), then `eas update:configure` (writes `updates.url`). Commit both.
2. Google Play Console: register (one-time fee), complete identity verification. **Personal accounts created after Nov 2023 must run a closed test — minimum tester count (12, formerly 20; confirm in the console) opted in for 14 continuous days — before production access.** An organisation account skips that but needs a D-U-N-S number.
3. Apple Developer Program (annual). Individual enrolment is quick; organisation enrolment needs D-U-N-S and takes days to weeks. Match the choice to the publisher name used in the listing copyright line.

**B2 — Pages.** Merge to the default branch → repository Settings → Pages → Build and deployment → Source: Deploy from a branch → default branch, `/docs` → Save → wait for the Pages workflow → open <https://komalsivvala.github.io/app1/privacy-policy/>. Free-plan Pages require a public repository.

**B3 — support email.** Choose a durable address → replace `{{SUPPORT_EMAIL}}` in `docs/privacy-policy.md` → set `supportEmail` in `src/config/links.ts` → `npm run check` → commit.

**B5 — guide values.** On Sarathi and aptransport.org confirm: application fee per class, test fee, the three age limits, LL validity, wait before the DL test, Form 1 / Form 1A, the document list, test-from-home availability. Edit `src/content/guide.json`, set each `lastVerified` to the date checked → `npm run test:node` → commit.

**B1 — RTO.** Sit at the test terminal or watch a candidate: count, pass mark, clock (per question or per paper, and the seconds), back navigation, skipping, negative marking, section split. Edit `src/content/exam-config.json`, set `formatVerifiedOn` → `npm run validate:config` → commit. The pre-exam banner disappears by itself.

**B6 — device tests.** `eas build --profile preview --platform android` (APK link) and `... --platform ios` + `eas submit` to a TestFlight **internal** group. Ten AP candidates complete a mock unaided while you watch; note every hesitation. On one phone set text size to maximum and walk every screen. Read Play's reported download size and time a cold start on a 3 GB phone. Fix, rebuild, repeat; two days.

---

## 1. Compliance answers

### 1.1 Google Play — Government apps declaration

**"Is your app developed by or on behalf of a government entity?" → No.**

The app is an independent study aid. It is not developed by, for, or with the Transport Department of Andhra Pradesh, MoRTH, Parivahan or Sarathi, and provides no government service (no application, booking, payment or licence issuance — PRD §5 non-goals). The listing says so in its first paragraph, the app says so on Home and About, the icon carries no emblem, and the name contains none of "Official", "Parivahan", "Sarathi", "RTO" as a brand.

### 1.2 Google Play — Data safety

**"Does your app collect or share any of the required user data types?" → No.**

Reasoning, recorded per `02-TRD.md` §11:

- Nothing the user does is transmitted anywhere. No analytics, crash, ad or any third-party SDK is present (auditable: `package.json`, and the Android export's module list).
- The one network request the app can make is the `expo-updates` check, and it runs **only when the user taps "Check for updates" in Settings** (`checkAutomatically: NEVER`; `src/updates/`). That request carries the device IP address and app version/platform to Expo's update service as transport metadata for that single request. Because the user initiates it, it is also a disclosed, optional action rather than background collection. Play's Data safety definitions treat data that is processed only to service a request in real time and not retained as **ephemeral processing**, which does not need to be declared as collection. The app sends no user identifier, no usage data and no content. **Re-read the current Data safety definitions of "collection" and "ephemeral processing" when filing;** if they have changed, declare "Device or other IDs: IP address — collected, not shared, app functionality, not optional" and link Expo's policy.
- Security practices: "Data is encrypted in transit" — not applicable (nothing is transmitted); "Users can request that data be deleted" — not applicable, and Reset progress deletes everything locally.

### 1.3 Apple — App Privacy ("nutrition label")

**"Data Not Collected."** Same reasoning as 1.2. Apple's definition of "collect" is transmitting data off the device in a way that lets it be accessed later; the crash-recovery update check is a plain HTTPS request with no identifier. Re-check the App Privacy definitions when filing; the fallback declaration would be "Identifiers → Device ID: not linked to the user, not used for tracking, app functionality" — **not** Tracking, because nothing is linked to third-party data.

`ITSAppUsesNonExemptEncryption` is already `false` in `app.json` (standard HTTPS only) — no export-compliance document is needed.

### 1.4 Content rating (IARC via Play) and Apple age rating

Every questionnaire answer is "No": no violence, no sexual content, no profanity, no controlled substances, no gambling or simulated gambling, no user-generated content, no user-to-user communication, no location sharing, no digital purchases, no ads. Expected results: **Everyone** (ESRB), **PEGI 3**, **3+** elsewhere; Apple **4+**.

### 1.5 Other Play declarations

| Declaration | Answer |
|---|---|
| App access | All functionality available without special access (no login) |
| Ads | No ads |
| Target audience and content | Age groups **16–17** and **18 and over** (a learner's licence is possible from 16). "Does the app appeal to children unintentionally?" → No. Not a Families app |
| News app | No |
| COVID-19 contact tracing / status | No |
| Financial features | None |
| Health apps | Not a health app |
| Data safety | see 1.2 |
| Government apps | see 1.1 |
| Advertising ID | Not used (the manifest declares no `AD_ID` permission) |

Note on India's DPDP Act 2023, which defines a child as under 18: the app processes no personal data of anyone, so its parental-consent provisions do not apply. This is my reading, not legal advice.

### 1.6 Apple review notes (paste into "Notes" in App Store Connect)

> This is an unofficial study aid for the Andhra Pradesh (India) learner's licence written test. It is not affiliated with any government body, which the app states on its Home screen, its About screen and in this listing. It provides no government service: no application, booking, payment or licence.
>
> No sign-in exists; every feature is available immediately, offline. No demo account is needed.
>
> Content: the questions are the ones the state transport department publishes for candidates to study (linked from the About screen); the explanations and all road-sign artwork are our own, drawn to the Indian Roads Congress conventions. No government logos, emblems or seals are used anywhere.
>
> The app collects no data (App Privacy: Data Not Collected). It requests no permissions. Its only network access is a content-update check the user starts by tapping "Check for updates" in Settings (expo-updates, automatic checks disabled).

### 1.7 Icon audit (plan Day 24)

The mark is a red **L** on white — the learner plate every candidate will display. Checked against: no national or state emblem, no Ashoka lion capital, no tricolour, no seal, no wheel/chakra, no map outline, no "Official" wording. Source SVGs and rationale in `assets/brand/`.

### 1.8 Non-affiliation and source, everywhere they are required

| Place | Text |
|---|---|
| Store listing, first paragraph (both stores) | "This is an unofficial study aid, not affiliated with…" (see §3) |
| Store listing, source link | <https://www.aptransport.org/html/llr-question-bank.html> in the description body of both stores (Play allows links in the description; Apple does too) |
| In-app Home | disclaimer banner |
| In-app About | full disclaimer, source link, privacy policy link — two taps from anywhere (PRD R13) |
| Privacy policy page | closing line |

---

## 2. Privacy policy hosting

`docs/privacy-policy.md` renders at <https://komalsivvala.github.io/app1/privacy-policy/> once GitHub Pages is enabled with source **Deploy from a branch → `main` → `/docs`** (`docs/_config.yml` sets the theme and excludes the screenshot folder). `docs/index.md` is the landing page, which doubles as the **marketing/support URL** for both stores. The app links the same URL from About (`src/config/links.ts`).

---

## 3. Listing copy (English)

English only in v1: a Telugu-language listing would imply a Telugu-language app, and v1 is English (PRD Amendment A1: "the store listing must not promise Telugu"). Add the Telugu listing in v1.1 with the Telugu content.

### 3.1 Google Play

**Title** (≤ 30): `AP Learner's Licence Practice`

**Short description** (≤ 80): `Unofficial practice for the AP RTO learner's licence test. Offline, no ads.`

**Full description** (≤ 4000):

```
Practise for the Andhra Pradesh learner's licence (LLR) computer test — offline, without ads, accounts or tracking.

This is an unofficial study aid. It is not affiliated with, endorsed by, or connected to the Transport Department, Government of Andhra Pradesh, the Ministry of Road Transport & Highways, Parivahan, or Sarathi. It provides no government service: you still apply, pay and book on the official portal.

MOCK TEST
• The real format: 20 questions, 12 to pass, one question at a time with a time limit, no going back.
• Questions drawn from all three sections — road signs, rules of the road, and general driving principles.
• Instant result with a pass/fail verdict and a full review of every question: your answer, the correct one, and why.
• Finish where you stopped: a test survives a phone call or a closed app.

LEARN
• Every question in the published bank, by topic, with a plain-language explanation.
• Every road sign — mandatory, cautionary and informatory — with clear artwork and its meaning.
• Flashcards, search, and bookmarks for the ones you keep getting wrong.

PROGRESS
• See whether you are ready: pass rate over your last tests, accuracy by topic.
• Practise your weak areas: the questions you got wrong or have not seen.

DOCUMENTS & THE RTO PROCESS
• Who can apply, what to carry, what it costs and how to book — each item dated, with a reminder to confirm on the official portal, because fees and rules change.

PRIVACY
• Nothing is collected, stored online or shared. No account, no analytics, no ads. Everything stays on your phone.

SOURCE
Questions are derived from the LLR question bank published for candidates by the AP Transport Department (https://www.aptransport.org/html/llr-question-bank.html). Explanations and sign artwork are the app's own. Always verify current rules, fees and the test format on the official portal.

Language: English. A Telugu edition is planned.
```

### 3.2 Apple App Store

**Name** (≤ 30): `AP Learner's Licence Practice`
**Subtitle** (≤ 30): `Unofficial RTO test practice`
**Promotional text** (≤ 170): `Unofficial, offline practice for the Andhra Pradesh learner's licence test: the real format, every question, every sign, plain explanations. No ads, no account.`
**Keywords** (≤ 100): `llr,learner,licence,license,rto,andhra,pradesh,driving,test,road,signs,mock,practice,exam`
**Description**: the Play full description above, verbatim.
**Support URL**: <https://komalsivvala.github.io/app1/> · **Marketing URL**: same · **Privacy Policy URL**: <https://komalsivvala.github.io/app1/privacy-policy/>
**Category**: Education (secondary: Reference).
**Copyright**: `© 2026 Vensai Inc.` — *assumption from the bundle identifier `com.vensai.aplearnerslicence`; confirm the legal entity.*

---

## 4. Assets

| Asset | Where | Status |
|---|---|---|
| App icon 1024 | `assets/images/icon.png` (from `assets/brand/icon.svg`) | ✅ rendered by `npm run brand:assets` |
| Android adaptive icon (fg / bg / monochrome) | `assets/images/android-icon-*.png` | ✅ |
| Splash | `assets/images/splash-icon.png`, white / `#0B0B0D` backgrounds via `expo-splash-screen` | ✅ |
| Play feature graphic 1024×500 | — | ☐ **not produced** (optional since 2023 for most listings; make one from the L mark on white if the console asks) |
| Store screenshots | `store/screenshots/<device>/` — Android phone 1080×2340, iPhone 6.7" 1290×2796, iPad 12.9" 2048×2732; 8 per device: home, pre-exam, question, result, review, learn, road signs, progress | ✅ rendered from the web export by `npm run store:screenshots` — the same components, fonts and content as the phone build. **Recapture on a device if a reviewer objects**; Apple requires screenshots to show the app as it runs |
| iPad | `ios.supportsTablet` is `true`, so App Store Connect requires iPad screenshots (supplied) and the app must run acceptably on iPad. Content is capped at 560 dp wide and centred. *If you would rather not support iPad in v1, set `supportsTablet: false` and drop the iPad set* | decision |

---

## 5. Build and submit runbook (EAS)

Prerequisites: an Expo account, `npm i -g eas-cli`, `eas login`, then `eas init` (writes `extra.eas.projectId`). Resolve B4 first.

```bash
# 0. sanity — everything green locally
npm run check && npm run content:validate

# 1. internal test builds (plan Day 26–27)
eas build --profile preview --platform android     # APK, install link — no Play review
eas build --profile preview --platform ios         # ad hoc / TestFlight internal group
eas submit --platform ios --profile production     # uploads to TestFlight; use an INTERNAL group
                                                   # (external groups need Beta App Review — a day or two)

# 2. production
eas build --profile production --platform all      # AAB + IPA, build numbers auto-incremented remotely
eas submit --platform android --profile production # Play: internal track, draft release
eas submit --platform ios --profile production     # App Store Connect

# 3. after a store release, content or copy fixes without a resubmission (if B4 keeps updates on)
eas update --channel production --message "content 2026.10.1"
```

`eas.json` profiles: `development` (dev client), `preview` (internal distribution, APK), `production` (AAB, auto-increment, channel `production`). The Play service-account JSON path is git-ignored; create the account in Play Console → API access and download the key to `./play-service-account.json`. Replace `ascAppId` after creating the app record in App Store Connect.

---

## 6. Pre-submission checklist (PRD §10 launch criteria, plan Day 28)

- [ ] B1–B7 above
- [ ] `npm run check` green on the commit being built; `content:validate --strict` green
- [ ] `formatVerifiedOn` set, pre-exam screen no longer says "unconfirmed"
- [ ] Privacy policy resolves; both listings and About link it
- [ ] Data safety / App Privacy filed per §1.2–1.3 after re-reading the current definitions
- [ ] Government apps declaration filed per §1.1
- [ ] Content rating questionnaire filed per §1.4
- [ ] Listing description contains the non-affiliation paragraph and the source link (§3)
- [ ] Icon audit (§1.7) re-done on the built binary's icon
- [ ] Ten-user test done and its findings fixed (plan Day 26–27)
- [ ] App name in both consoles exactly `AP Learner's Licence Practice`; no "Official", "Parivahan", "Sarathi" anywhere in name, subtitle or keywords

---

## 7. What could not be done from the build environment

- Enabling GitHub Pages, creating store accounts, `eas init/build/submit`: need your accounts.
- Device captures for the store: no device or simulator here; the web-rendered sets are the fallback.
- Verifying the stores' current character limits, screenshot sizes and questionnaire wording: the consoles are unreachable from here (egress blocked). The values above are from the documented limits as of this writing; treat them as defaults to confirm in the console.
- The Play feature graphic: not produced.
