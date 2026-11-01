# DastakDe — Play Store Listing (copy-paste values)

Everything below is written to be pasted directly into Play Console. Character counts are
verified against the Play Console limits. All claims are traceable to the app itself and to
`docs/privacy.html` — no invented metrics, no invented sources, no demo data.

---

## 1. App title — limit 30 characters

```
DastakDe: Verified Mauka
```

**24 characters.** ("DastakDe: Verified Opportunities" is 32 — over the limit;
"DastakDe: Student Opportunities" is 32 — also over.)

## 2. Short description — limit 80 characters

```
Verified scholarships, hackathons, exams and schemes from official sources.
```

**75 characters.**

## 3. Full description — limit 4000 characters

```
DastakDe brings students verified opportunities — scholarships, hackathons, internships, fellowships, competitive exams and government schemes — with every item linked to its official source. Mauka dastak de raha hai: the opportunity is knocking.

WHAT MAKES IT DIFFERENT

• Official sources only. The feed is built from the Devpost API, Devfolio, the National Testing Agency, CBSE circulars and the Press Information Bureau (Government of India), plus a curated registry of official programme pages that is link-checked on every build. Each item opens the issuing organisation's own page — never a copy or a repost.

• Scam patterns are filtered. Listings that match known pay-to-apply and advance-fee patterns are excluded and never rendered in the feed.

• Never miss a deadline. See countdowns, save opportunities, and set a reminder on your phone. Optionally get new-opportunity alerts and one calm 09:00 digest.

• No filler. If a source is down, it contributes nothing that run. The feed shows what the official sources actually published — no demo data, ever.

CATEGORIES

• Hackathons
• Internships
• Scholarships
• Fellowships
• Competitive exams
• Government schemes and education announcements

EASY TO USE

• A short guided tour on first launch shows where everything is: feed, deadlines, saved and settings.
• Category filters, deadline countdowns and a source-health view keep the feed understandable.
• Replay the tour any time from More.

PRIVACY FIRST

• No sign-up, no account, no login.
• No analytics SDK, no advertising SDK.
• Nothing about you leaves your device. Saved items, tracked categories and reminders live only in app-local storage so notifications can fire — delete the app and that data is gone.
• Network activity is limited to downloading the public feed JSON (no identifiers sent) and opening official opportunity links in your browser.

FREE

The verified feed, deadline countdowns, reminders and alerts are free. The app contains no ads.

WHO IT'S FOR

Students in India looking for scholarships, hackathons, internships, fellowships, competitive exams and government welfare or education schemes — and anyone tired of scam "opportunity" boards and dead links.

FOR ORGANISATIONS

Government bodies, non-profits, student clubs, colleges and companies can request a verified posting. Public-interest postings are free; standard verified postings are ₹499. Details are in the app under More → List an opportunity.

HONESTY NOTE

DastakDe is a discovery and reminder tool. We link to official sources; always read the official page before applying. Eligibility rules, deadlines and selection decisions belong to the issuing organisation.
```

**2,673 characters** — under the 4,000 limit.

## 4. Category & tags

| Field | Value |
|---|---|
| App category | **Education** |
| Tags (Play Console tag picker) | Education · Careers · Student life · Productivity |

("Education" is the primary category; pick the closest available secondary tags.)

## 5. Contact details (Store listing → App contact)

| Field | Value |
|---|---|
| Privacy policy | `https://humoge7502.github.io/dastakde/privacy.html` (see `store/PRIVACY_URL.txt`) |
| Website | `https://humoge7502.github.io/dastakde/` |
| Email | the developer Google account's monitored contact email (required by Play Console) |
| Phone | not required (optional field — leave empty) |

## 6. Graphic assets

| Asset | File | Requirement |
|---|---|---|
| App icon (512×512 PNG) | `store/assets/icon-512.png` (same as `brand/assets/play-icon-512.png`) | full-square opaque; Play applies its own rounded mask |
| Feature graphic (1024×500 PNG) | `store/assets/feature-graphic-1024x500.png` | exactly 1024×500 |
| Phone screenshots | capture manually from the running app — minimum 2: feed/home, item detail with the official-source link, reminders/settings; 9:16 portrait, 320–3840 px | required before publishing |
| App video (optional) | YouTube URL for the DastakDe demo (see `docs/media/demo.mp4`) | optional |

## 7. Content rating questionnaire (IARC) — answers

Play Console → Policy → App content → Content rating. Expected outcome:
**Everyone / PEGI 3 / USK 0**.

| Question | Answer |
|---|---|
| Request a rating for a specific country? | No |
| App name | DastakDe (pre-filled) |
| Category that best describes the app | Education / Reference |
| User-generated content (posts, chat, uploads)? | **No** — the feed is read-only; users cannot post, comment or upload |
| Do users share content with each other? | No |
| Can users interact with unknown people through the app? | No |
| Violence (cartoon, realistic, fantasy)? | **No** |
| Illegal drugs, alcohol or tobacco? | No |
| Sexual content or nudity? | No |
| Offensive language or crude humour? | No |
| Gambling, contests or wagering? | **No** — the app is an information feed; hackathons are external events, not in-app contests |
| Users can purchase digital content or goods? | No (v1 is free and has no in-app purchases; if DastakDe Plus ships via Play Billing, update this answer and this questionnaire) |
| Collects, shares or requires personal/financial information? | No |
| Shares location or browsing history with third parties? | No |
| Contains ads? | **No** |
| Religious content? | No |
| Other sensitive topics as asked | No — the feed contains official opportunity announcements only |

## 8. Data safety form (Play Console → App content → Data safety)

Source of truth: `docs/privacy.html` ("This app collects and transmits NO personal data to any
server"). The honest answers:

**Q: Does your app collect or share any of the required user data types?**
→ **No**

Reasoning (for your records, not a form field): Play defines "collect" as data transmitted off
the device. DastakDe:

- has no accounts, no sign-up, no analytics SDK and no ads SDK;
- stores saved items, tracked categories and reminder schedules **only in app-local storage** so
  local notifications can fire — nothing is transmitted;
- its only network activity is downloading the public feed JSON from
  `humoge7502.github.io` (no identifiers sent) and opening official links in the browser.

Because the answer is **No**:

- Play does not ask per-data-type questions (location, contacts, etc.) — there is nothing to
  declare.
- The "data encrypted in transit" question does not appear; it applies only when data types are
  declared. Nothing user-specific is transmitted, so it is N/A.
- "Data deletion mechanism": no server-side user data exists; app-local data is removed when the
  app is uninstalled. If the form demands a deletion URL, point to
  `https://humoge7502.github.io/dastakde/privacy.html`, which documents the local-only storage.

Other App-content sections:

| Section | Answer |
|---|---|
| Ads | **No, my app does not contain ads** |
| Data safety summary shown to users | "No data collected, no data shared" (auto-derived) |
| Privacy policy URL | `https://humoge7502.github.io/dastakde/privacy.html` |
| App access | **All functionality is available without restrictions** — no login, no credentials, no demo mode |

## 9. Target audience & content

| Field | Answer |
|---|---|
| Target age groups | **13–15, 16–17, 18 and over** (do **not** select under-13 groups) |
| Designed for or directed at children? | **No** (it collects no personal data, but it is a student/education tool, not a children's app) |
| Appeal to children aside from selected groups | No |
| News app declaration | No |
| COVID-19 apps declaration | No |
| Government apps declaration | No — it links to PIB and other government sources but is an independent app, not an official government app |
| Financial features declaration | No |
| Health apps declaration | No |

## 10. Release

| Field | Value |
|---|---|
| Countries/regions | India first (add more later) |
| Release track | Production, or Closed testing first if the developer account is new (see `RELEASE_CHECKLIST.md`) |
| What's new (release notes) | `Initial release. Verified opportunities from official sources — scholarships, hackathons, internships, fellowships, exams and schemes — with deadline reminders, a guided tour, no accounts and no data collection.` |
| Type | App (not Game) |
| Free or paid | **Free** |
| Contains ads | No |
| Price | ₹0 (no in-app purchases in v1) |
