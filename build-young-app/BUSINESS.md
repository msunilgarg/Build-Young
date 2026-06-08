# Build Young — Business & Legal Setup (Washington State)

> **NOT legal or tax advice.** Build Young takes family payments, makes refund promises, and serves
> **minors**, so this is the higher-stakes track. The single smartest move is one short paid consult
> with a **WA small-business attorney + a CPA** to settle entity, insurance, minors, and tax at once.
> This file is the practical checklist + official links; companion to **GO-LIVE.md** (technical
> go-live) and the "Business & legal setup" section of **CLAUDE.md**. Fees/requirements change —
> **verify current amounts on the official sites** before paying — the figures below were spot-checked against the SOS & DOR sites in **June 2026**.

Founder is in WA (Sammamish area); recommended entity is an **LLC** (shields personal assets — matters
here because of payments, refunds, and minors).

---

## 0. Do this first
- [ ] Book a short consult with a **WA small-business attorney** + a **CPA** (entity + insurance +
      minors + B&O/sales-tax in one sitting). Everything below you *can* do yourself; this just
      de-risks the highest-stakes parts.

## 1. Form the LLC — WA Secretary of State
- [ ] **Pick a name** — unique in WA, must include "LLC" / "Limited Liability Company". Check
      availability in **CCFS** (the SOS filing system).
- [ ] **Registered agent** — a person/service with a *physical* WA street address for legal mail.
      You can be your own (your WA address) or pay a commercial agent (~$100–150/yr) to keep your
      address private.
- [ ] **File the Certificate of Formation** online in CCFS — this *creates* the LLC. Fee **$200 online** ($180 base + a $20 online fee; paper filing is $180) *(WA SOS/CCFS)*. Approval is usually quick.

## 2. Federal — EIN (IRS)
- [ ] **Get an EIN** — free, online, instant (IRS "EIN Assistant"). It's your business tax ID; needed
      for the bank account and taxes.

## 3. State tax & licensing — WA Dept. of Revenue (DOR)
- [ ] **File the Business License Application** via DOR's **Business Licensing Service (BLS)** →
      gives you a **UBI number** and registers you for **B&O tax** (WA's gross-receipts tax). **~$50** processing fee to open a new business's first location *(DOR/BLS; source figures vary — verify on the live DOR page)*.
- [ ] **City endorsement** — Sammamish / your city of operation may require a local business license
      (BLS handles many cities in the same application). Confirm your city's requirement.
- [ ] **CPA to confirm**: whether **B&O** *and* **sales tax** apply to an online educational service
      (tuition is taxable income regardless).

## 4. Operating Agreement
- [ ] Write one (not filed with the state, but strongly recommended even for a single-member LLC) —
      documents ownership/management and reinforces the liability shield. Keep with your records.

## 5. Business bank account  ⚠️ gates Stripe go-live
- [ ] Open a **business checking account** (EIN + Certificate of Formation). Stripe payouts,
      expenses, and taxes must be separate from personal. **Do this before wiring real payments** in
      GO-LIVE.md §3.

## 6. Insurance
- [ ] **General liability** + **professional liability (E&O)** — standard for a business serving
      minors. Ask the attorney/broker what's appropriate for live online instruction.

## 7. Working with minors  (highest-stakes — get counsel's eyes here)
- [ ] **Parental-consent / liability-waiver** language at enrollment.
- [ ] Any **background-check** norms for live instruction.
- [ ] If you run the **First-year builder prize** (contest + a minor's likeness/video), keep the
      **media-release + attorney review** — already flagged in the Terms.

## 8. Refund policy review
- [ ] Have counsel confirm the **full → prorated(first week) → non-refundable** wording is consistent
      across the in-app `LEGAL`, `public/terms.html`, and the enroll/dashboard copy.

## 9. Bookkeeping & tax (ongoing)
- [ ] Set up **bookkeeping** from day one (separate account makes this easy).
- [ ] File **B&O / sales tax** with DOR on the schedule they assign; tuition is taxable income.

## 10. Ongoing compliance
- [ ] File the **WA Annual Report** with the SOS each year (**$70/yr**) to stay in good standing.
- [ ] Keep the registered agent + addresses current.

---

## Dependency order (rough)
name → registered agent → **Certificate of Formation (SOS)** → **EIN (IRS)** → **Business License
(DOR/BLS)** → operating agreement → **business bank account** → insurance → minors/waivers → *then*
flip on real Stripe (GO-LIVE.md).

## Official links
- **WA Secretary of State — CCFS (file the LLC + annual report):** https://ccfs.sos.wa.gov
- **WA SOS — Corporations & Charities:** https://www.sos.wa.gov/corporations-charities
- **IRS — apply for an EIN (free):** https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- **WA Dept. of Revenue — Business Licensing:** https://dor.wa.gov/open-business
- **WA small-business hub:** https://www.business.wa.gov
- **City of Sammamish — business licensing:** check the city site for the local endorsement requirement

> Fees and exact steps change — always confirm the current amount/process on the official site above
> before filing or paying.
