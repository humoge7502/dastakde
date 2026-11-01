# DastakDe — Business Model & Operating Plan

**DastakDe** (दस्तक दे — "to knock") is a verified opportunity feed for Indian students.
**Tagline:** *Mauka dastak de raha hai.* — "Opportunity is knocking."
**English:** *Verified opportunities. Right on time.*

The product answers two failures in the student-opportunity market:

1. **Discovery is scattered.** Internships live on Internshala, hackathons on Devfolio/Unstop,
   scholarships on Buddy4Study/NSP, exams on NTA/CBSE, schemes on ministry sites.
2. **Deadlines are missed.** Students hear about an opportunity after it closes, or fall for
   pay-to-apply scams that real boards leave up.

DastakDe combines six categories in one feed, verifies every listing against an official source,
shows the evidence, and reminds the student before each deadline.

---

## 1. What is free, forever

| Free core | Why it stays free |
|---|---|
| Full verified feed (hackathons, internships, scholarships, fellowships, exams, schemes) | The mission is access; paywalling public opportunities would recreate the problem |
| Deadline countdowns and local reminders (D-7, D-3, D-1, D0) | Missing a deadline is the core loss we exist to prevent |
| Saved shortlist and category filters | Basic utility, no marginal cost |
| Official-source links, verification evidence, scam warnings | Trust is the product |
| Government exam and public-scheme notices | Public information must never be paywalled |

No account is required. Saved items and reminder settings are stored **on the device**.
There is no student-data resale, no applicant profiling, and no pay-to-rank inside the organic feed.

## 2. Who pays, and for what

### A. Verified posting — ₹499 per opportunity (organizer-paid)

For companies, edtech platforms and commercial hackathon organisers that want a verified,
deadline-aware listing in front of students.

Included:
- Human verification against the organiser's official page
- Category placement and deadline countdown
- Deadline reminders to students who save or track the category
- A "Verified" evidence block (source URL, verification date)
- Correction handling within one business day

Rules:
- Public government notices and non-profit/college-club opportunities are listed **free**.
- A paid listing buys verification and distribution, **not** a better rank.
- Every paid item is labelled. It never masquerades as an editorial pick.
- No pay-to-apply, no lead-selling, no applicant data handed to the organiser.

Why ₹499: it is low enough for a student club or a small edtech team to approve without a
procurement cycle, and high enough to cover a real verification step. It is deliberately far
below the ₹5,000–₹50,000 range of generic job boards, because we sell *verified student reach*,
not résumé access.

### B. College plan — ₹25,000 per year

For placement cells, training-and-placement officers and student-affairs teams.

Included:
- Unlimited verified opportunity submissions for the college
- A branded college board inside the app
- Bulk deadline calendar for the placement team
- Priority verification and a named support contact
- Aggregate, non-personal reporting (views, saves, reminder counts)

Privacy boundary: the college sees **aggregate interest**, never an individual student's
saved list, reminders or application activity.

Why ₹25,000/year (≈ ₹2,083/month): one campus ad or one placement-event refresh usually costs
more, while the plan runs all year and reaches students on their phones. A pilot price of
₹10,000 for the first 25 colleges is allowed, but the public list price stays ₹25,000.

### C. Clearly labelled sponsorship — only after an audience gate

A single sponsored card per 10 organic items, capped at one per screen, labelled **Sponsored**.
Relevant categories only (e.g., a coding bootcamp cannot buy a scholarship slot).

Gate: this inventory is **not sold today**. It opens only when the app sustains 10,000 weekly
active students for two consecutive months. Before that, selling reach would be selling a promise.

### D. DastakDe Plus — future, not shipped

₹49/month or ₹299/year for convenience, not access:
- Unlimited saved searches and alert rules
- Calendar sync and deadline export
- Early alerts (minutes after verification, not the next digest)
- Application checklists

Plus launches only after Google Play Billing is live and after a clear majority of surveyed
students say they would pay for it. Core deadline reminders never move behind Plus.

## 3. Unit economics (illustrative, not a forecast)

Costs are deliberately small because the feed is static JSON on GitHub Pages and verification is
the only human step.

| Item | Approx. cost |
|---|---|
| Hosting, feed (GitHub Pages) | ₹0 |
| Feed generation (GitHub Actions, every 2 hours) | ₹0 at current volume |
| Verification labour per paid listing | 20–30 min |
| College onboarding | ~1 working day, then support |
| Play Console (one-time) | $25 |

Illustrative break-even scenarios:

- **Listings-only:** 100 paid listings/month × ₹499 = ₹49,900/month.
- **Colleges-only:** 20 college plans × ₹25,000 = ₹5,00,000/year.
- **Mixed:** 40 listings/month (₹19,960) + 8 colleges (₹2,00,000/year) ≈ ₹4,39,520/year.

These are arithmetic examples to show the shape of the model, not projections. No revenue has
been claimed or booked.

## 4. Go-to-market

1. **Students first.** Ship the free app where students already are: college WhatsApp groups,
   Reddit/Telegram exam communities, campus clubs. The brag demo and guided tour double as
   onboarding for a cold install.
2. **Clubs as supply.** College clubs and non-profits post free; they become the trusted seed
   content and the reference for verification quality.
3. **Placement cells as the first paid buyer.** One placement officer can bring hundreds of
   students; the ₹25,000 plan is priced for a single departmental budget.
4. **Organisers second.** Once the feed shows repeat weekly usage, paid verified postings are
   pitched to edtech and hackathon platforms with real aggregate numbers.
5. **SEO later.** Public, indexable opportunity pages on the website, each pointing to the
   official source. This is the long-term acquisition channel; it is not built yet.

## 5. Trust & safety (the moat)

- **Source verification:** allow-listed official domains; every item carries `source`, `url`,
  verification date and flags. Items that fail checks do not render.
- **Scam filter:** pay-to-apply patterns, registration fees, and unverifiable "guaranteed"
  claims are excluded; the detail screen tells students what to check.
- **Corrections:** a report link on every item, one-business-day correction target.
- **Privacy:** no account, no analytics SDK, no applicant data. Saved items and settings stay on
  the device. If accounts are added, they ship with consent, export and deletion (DPDP Act 2023).
- **Sponsorship honesty:** every paid placement is labelled; sponsored cards never outrank
  organic results.

## 6. Metrics that decide the next step

| Gate | Metric | Threshold to proceed |
|---|---|---|
| Keep building | Weekly active students | 500 → 5,000 |
| Sell postings | Verified items / week, organiser replies | 50+ live, 10 paid in a month |
| Sell colleges | Pilot colleges retained | 3 pilots, 2 renewals |
| Launch Plus | Survey intent + Play Billing | 60% would pay, billing live |
| Open sponsorship | Weekly active students | 10,000 for 2 months |

Vanity metrics (downloads, page views) are reported but never used to justify a pricing change.

## 7. Honesty rules (binding)

1. The feed contains only items parsed from the listed sources in the current run. A failing
   source contributes nothing and is reported as down — never filler, never demo rows.
2. Every item links to its official source; the app opens that URL rather than a copy.
3. Flagged items never render.
4. Any public metric about supply must trace to `docs/feed/index.json`.
5. No invented users, revenue, sponsors, testimonials or investors. "Coming soon" is labelled
   as such.
6. Student data is never sold, rented or exchanged.

## 8. What DastakDe will never do

- Charge students for government exam or public-scheme alerts
- Hide an organic opportunity behind a paywall
- Sell applicant data or "qualified leads"
- Accept an unlabelled sponsored post
- Rank a paid listing above an organic one
- Publish a deadline without a source link
- Claim Play Store publication before the listing is actually live

## 9. First 12 months

| Window | Focus | Done when |
|---|---|---|
| Now | Free Android app, six verified sources, guided tour, demo video | App installs and refreshes the live feed on a real device |
| 0–3 months | 3 college-club partnerships, 500 weekly actives, first 10 paid listings | Paid listing flow and invoices work end to end |
| 3–6 months | 5,000 weekly actives, 4 college plans, web SEO pages | College board shipped, renewal conversations started |
| 6–12 months | Plus waitlist, sponsorship gate review, iOS evaluation | Billing live, gate metrics met or Plus deferred |

**Current supply (generated by `ingest/ingest.py`, not hand-written):** see
`docs/feed/index.json` for live item counts, per-source status and the generation timestamp.
