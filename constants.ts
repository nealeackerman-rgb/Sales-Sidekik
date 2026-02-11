import { FrameworkCategory, Frameworks, SellerInfo } from './types';

export const INITIAL_SELLER_INFO: SellerInfo = {
  sellerName: '',
  companyName: '',
  role: 'rep', // Default role for new users
  companyDescription: '',
  products: '',
  idealCustomerProfile: {
    industries: '',
    roles: '',
    painPoints: '',
    companySize: '',
  },
};

export const INITIAL_FRAMEWORKS: Frameworks = {
  [FrameworkCategory.TERRITORY_PLANNING]: `
# Territory Planning Framework
**Core Philosophy:** Focus 80% of time on "Priority 1" accounts (High Budget + High Use Case).

## 1. Account Scoring (Prioritization)
Score every account 1-3 based on two signals:
* **Use Case:** Do they build software/products that need our solution?
* **Budget:** Do they have headcount growth in target depts? Do they use competitor tech?

**Priority Definitions:**
* **P1 (High Fit):** Clear Use Case AND Evidence of Budget (e.g., Hiring devs, using competitors).
* **P2 (Medium Fit):** Use Case OR Budget, but not both. (Automate outreach here).
* **P3 (Low Fit):** No Use Case, No Budget. (Ignore).

## 2. Customer Expansion
* Identify customers renewing in 6 months.
* **Gap Analysis:** List problems we solve vs. problems we *should* be solving.
* **Action:** Request referrals from champions using the "Problems We Should Be Solving" framework.
`,

  [FrameworkCategory.ACCOUNT_PLANNING]: `
# Account Planning Framework
**Objective:** deeply understand the "Why Now" and "Why Us".

## 1. The "3x3" Research
Find 3 relevant facts in 3 minutes before engaging.
* **Company News:** IPOs, earnings, layoffs, acquisitions.
* **Hiring Trends:** Are they growing our target personas?
* **Tech Stack:** Do they use complementary or competitive tools?

## 2. Power Matrix
Map the account:
* **Champion:** Who sells for us when we aren't there?
* **Economic Buyer:** Who can sign the check?
* **Blocker:** Who loses if we win?
`,

  [FrameworkCategory.PIPELINE_GENERATION]: `
# Pipeline Generation & Prospecting
**Philosophy:** "Emotional Relevance" - Connect to their aspirations or fears.

## The "Good Day" Metric (Target: 8 Points/Day)
* **Add 10 Prospects:** 1 pt
* **Conversation (Call):** 1 pt
* **5 Custom Emails:** 1 pt
* **Meeting Set:** 1 pt
* **Opp Created:** 1 pt

## Messaging Framework (Emotional Relevance)
1.  **Hook:** "The best managers are never surprised..." (Evoke emotion).
2.  **Problem:** "But with remote work, it's hard to see metrics..." (Validate pain).
3.  **Solution:** "What if you got alerted on your phone?" (Ideal state).
4.  **Proof:** "Acme Corp cut reaction time by 50%."
`,

  [FrameworkCategory.DISCOVERY]: `
# Discovery Call Framework
**Objective:** Disqualify early or build a business case. NOT "Check the box."

## Pitfalls to Avoid
1.  **"Tell me about your role":** (Lazy). Instead: "I see you lead X, how does that relate to [Problem]?"
2.  **Interrogation:** Don't just ask questions. Trade value. "The reason I ask is [Industry Insight]..."
3.  **Happy Ears:** Dig deeper. "You said 'efficiency' is a goal—what happens if you don't solve it?"

## Key Questions (Level 2 & 3)
* "If you were writing the press release for this project's success, what would the headline be?"
* "Who else cares about this problem?"
* "What is the cost of doing nothing?"
`,

  [FrameworkCategory.PROSPECTING_EMAIL]: `
# Cold Email Framework
**Structure:**
1.  **Observation:** "I saw you are hiring X..." or "I read your post about Y..."
2.  **Insight/Problem:** "Typically, teams growing that fast struggle with Z."
3.  **Value/Solution:** "We help [Similar Co] solve Z by doing A, B, C."
4.  **CTA:** "Worth a conversation?" (Low friction).

**The "Competitor Website Test":**
If you remove your logo and paste your competitor's, does the email still make sense? If yes, it's too generic. Be specific.
`,

  [FrameworkCategory.PROSPECTING_LINKEDIN]: `
# LinkedIn Outreach
**Style:** Conversational, not salesy.

**Connection Request:**
"Hi [Name], saw you're leading [Team]. Writing a piece on [Topic] and would love to follow your work." (No pitch).

**Follow-up (Video/Voice):**
"Hey, thanks for connecting. Noticed [Observation]. Curious if that's a focus for Q3?"
`,

  [FrameworkCategory.SOLUTION_PRESENTATION]: `
# Demo & Solution Presentation
**Rule:** No more than 8 slides.

**The "Pareto Demo":**
* Spend 20% of time on table-stakes features (what everyone has).
* Spend 80% of time on **Unique Differentiators** (what only we have).

**Structure:**
1.  **Re-state Discovery:** "Here is what we heard..."
2.  **The "After State":** "Here is where you want to go..."
3.  **The Bridge (Demo):** "Here is how we get you there."
4.  **Proof:** "Here is who else we did this for."
`,

  [FrameworkCategory.NEGOTIATION]: `
# Negotiation (Never Split the Difference)
**Core Rules:**
1.  **Anchor High:** Start with the standard price.
2.  **Don't drop price without dropping scope:** "If we lower the price, we need to remove [Feature/Seats]."
3.  **Labels:** "It seems like budget is a major blocker for you."
4.  **Calibrated Questions:** "How am I supposed to do that?" (Put the problem on them).
`,

  [FrameworkCategory.DEAL_MANAGEMENT]: `
# Deal Management (MEDDIC)
* **M (Metrics):** What is the Economic Impact? ($$$)
* **E (Economic Buyer):** Who has the budget authority?
* **D (Decision Criteria):** Technical/Financial requirements?
* **D (Decision Process):** Steps to sign? (Legal, InfoSec, Procurement).
* **I (Identify Pain):** What happens if they don't buy?
* **C (Champion):** Who is selling for us internally?
`,

  [FrameworkCategory.EXECUTIVE_SUMMARY_TEMPLATE]: `
**Executive Summary**

**Current Situation:**
[Client] is currently experiencing [Pain Point] due to [Root Cause], resulting in [Negative Impact/Cost].

**Proposed Solution:**
Implement [Product] to automate [Process].

**Business Value (ROI):**
* Estimated Annual Savings: $X
* Payback Period: X Months
* Strategic Benefit: [Benefit]
`,

  [FrameworkCategory.DISCOVERY_AGREEMENT_TEMPLATE]: `
**Discovery Agreement / Mutual Success Plan**

**Goal:** Determine if [Solution] is the right partner for [Client].

**What We've Heard:**
* Priority 1: [Goal]
* Priority 2: [Goal]

**Timeline:**
* [Date]: Tech Demo
* [Date]: Security Review
* [Date]: Go/No-Go Decision
`,

  [FrameworkCategory.MUTUAL_ACTION_PLAN]: `
# Mutual Action Plan (MAP)
* **Project Kickoff:** [Date]
* **Stakeholder Alignment:** [Date]
* **Technical Validation:** [Date]
* **Commercial Review:** [Date]
* **Signature:** [Date]
* **Implementation Start:** [Date]
`
};
