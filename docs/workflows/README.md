# Workflows

This folder contains step-by-step walkthroughs of the core product flows in the dashboard. Each workflow explains the problem being solved, the end-to-end user journey, and includes screenshots from the UI.

## Available workflows

### 1) Engineering Discussions → Summarized Activity Feed → Component Context
Manufacturing teams often lose “tribal knowledge” inside chat threads. This workflow shows how engineering discussions are automatically captured from Slack, summarized into the Activity Feed, and mapped to the relevant components—so context is preserved and actions like ECR creation become easier.

- **File:** [`engineering-workflow.md`](./engineering-workflow.md)

---

### 2) Supply Chain Discussions → Summarized Activity Feed → Supplier + Component Context
Supply chain teams often share crucial qualitative insights about supplier behavior (delays, defects, reliability) that don’t show up in standard dashboard metrics. This workflow shows how supply chain discussions are captured from Slack, summarized, tagged as Supply Chain, and mapped to suppliers (and relevant components).

- **File:** [`supply-chain-workflow.md`](./supply-chain-workflow.md)

---

### 3) Automatic ECR Creation from Past Component Discussions
To reduce documentation overhead, this workflow shows how an **ECR (Engineering Change Request)** can be automatically generated using past component discussions plus a small amount of structured user input (priority, severity, etc.), then made downloadable using a standard template.

- **File:** [`ecr-workflow.md`](./ecr-workflow.md)

---

## Catalog pages

### Components Catalog — Central repository for component details, usage, ECR pipeline, and discussions
A searchable component repository that provides where-used context, draft ECR visibility (to reduce ECR collisions), supplier options, and a centralized history of discussions for each component.

- **File:** [`components-catalog.md`](./components-catalog.md)

---

### Supplier Catalog — Central repository for supplier profiles, supplied components, and discussions
A searchable supplier repository that centralizes supplier details, the components they supply, and supplier-linked discussions/notes—preserving qualitative operational knowledge that often gets lost in chat.

- **File:** [`supplier-catalog.md`](./supplier-catalog.md)

---

## Assets
All workflow screenshots are stored here:

- `docs/assets/`

Each workflow markdown references images using relative paths so they render correctly on GitHub.

## How to view
Open any file directly in GitHub:

- [`engineering-workflow.md`](./engineering-workflow.md)
- [`supply-chain-workflow.md`](./supply-chain-workflow.md)
- [`ecr-workflow.md`](./ecr-workflow.md)
- [`components-catalog.md`](./components-catalog.md)
- [`supplier-catalog.md`](./supplier-catalog.md)
