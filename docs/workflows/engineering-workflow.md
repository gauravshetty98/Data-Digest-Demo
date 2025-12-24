# Workflow 1 — Engineering Discussions → Summarized Activity Feed → Component Context

## Problem statement
Manufacturing companies often lose “tribal knowledge” (knowledge in transit) that lives inside chats and informal conversations. This makes it hard to understand:
- **Why** a specific change was made
- The full story behind **why a component was changed**
- The latest actions, decisions, and open questions tied to a component

This workflow captures engineering discussions automatically, summarizes them, and maps them to the relevant components—so the context remains searchable and usable over time.

---

## End-to-end flow

### Step 1 — Engineers discuss a component in Slack
A short conversation happens between colleagues about a specific component (example: **M5 eccentric washer**).

![Slack engineering discussion](../assets/slack_discussion_engineering.png)

---

### Step 2 — Discussion is fetched, summarized, and shown in the Activity Feed
The Activity Feed is where discussions across company communication channels are **gathered and summarized** automatically.

In this example, the conversation about the **M5 eccentric washer** is fetched from Slack and displayed in the feed with:
- A concise summary
- The **latest action point** extracted from the thread  
(Highlighted as **“2”** with a blue arrow in the screenshot.)

![Discussion summary in feed](../assets/discussion_summary_page.png)

---

### Step 3 — Open the Discussion Details page for full context
Clicking the discussion card opens a detailed view with richer context, such as:
- Component details
- Parent components
- Other potentially affected components

![Discussion details page](../assets/DT_details_page.png)

---

### Step 4 — Take action: Create an ECR, review drafts, check suppliers, view related discussions
Scrolling further reveals workflow actions powered by the captured history, including:
- **Automatically create an Engineering Change Request (ECR)** based on past discussions
- View **draft ECRs in the pipeline**
- See **suppliers for the component**
- Explore **other discussions related to this component**

![Discussion details page (scrolled)](../assets/DT_details_page_2.png)

---

## Outcome / Why this matters
This workflow ensures that engineering “tribal knowledge” does not disappear inside chat history. Instead, it becomes:
- **Stored safely**
- **Mapped to the exact components**
- Easy to review for anyone catching up later

It also helps employees stay up-to-date on ongoing changes across the company **without requiring extra manual steps**, while enabling higher-leverage actions like **auto-generating ECRs from real discussion context**.
