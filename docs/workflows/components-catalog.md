# Components Catalog — Searchable Repository for Parts, Usage, ECRs, and Discussions

## Problem statement
In fast-moving manufacturing environments, teams often struggle with:
- Finding the *right* component quickly (IDs, naming differences, categories)
- Understanding where a component is used across assemblies / BOMs
- Tracking pending changes (draft ECRs) to avoid duplicated or conflicting work
- Losing “tribal knowledge” buried in chats, making it hard to understand why past decisions were made

A components catalog acts as a centralized, always-available source of truth that connects:
**component metadata + assembly context + change pipeline (ECRs) + discussions**.

---

## Solution overview
The **Components Catalog** is accessible from the left-side burger menu. It provides:
- A searchable list of all components currently used by the company
- A detailed component view (material, mass, identifiers, etc.)
- Where-used context (parent components, assembly lines)
- Draft ECR visibility (to reduce ECR collisions)
- Links to supplier options and historical discussions for traceability

---

## UI flow

### Step 1 — Open the Components Catalog and search/browse
Click **Components** in the left-side menu to open the catalog.  
The page shows all components with a search bar that supports searching by:
- Name
- ID
- Category

![Components catalog](../assets/components_catalog.png)

---

### Step 2 — Open a component to view full details + where-used context
Selecting a component opens its details page.  
Example: **M5 eccentric spacer**.

This page includes:
- Component details (name, material, mass, etc.)
- Parent components
- Other assembly lines where the component is used

![Component details](../assets/component_details.png)

---

### Step 3 — Reduce ECR collision risk by surfacing draft ECRs and change actions
Scrolling further shows:
- **Draft ECRs in the pipeline** for this component (helps prevent duplicate or conflicting ECRs)
- An option to **create a draft ECR** based on past discussions
- An option to view **available suppliers** for this component

![Component details (ECR + suppliers)](../assets/component_details_2.png)

---

### Step 4 — Centralize tribal knowledge with all past discussions for the component
Further down the page, users can view:
- **Past discussions related to the component**

This creates a centralized repository of context and decision history tied to the component.

![Component details (discussions)](../assets/component_details_3.png)

---

## Outcome / Why this matters
The Components Catalog becomes a hub for:
- Fast component discovery and verification
- Assembly and where-used context
- Visibility into ongoing change work (draft ECRs) to reduce ECR collisions
- Centralized “tribal knowledge” through component-linked discussions

This supports better decisions, faster onboarding, and more reliable change management.
