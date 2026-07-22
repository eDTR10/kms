# Sheet-Driven Dashboard — Sample Data Reference

This document contains ready-to-paste sample rows for every chart/tile type supported by the dynamic dashboard. Each project lives on its own **tab** in the shared Google Sheet (`1R4eMbx9P0oPpelsG_qbDSnKkZZIu7YnkH9PBKCDb_aM`).

## Column Contract (A–G)

| Col | Header | Required | Notes |
|---|---|---|---|
| A | `Title` | Yes | Display name of the metric/chart |
| B | `Type` | Yes | Must match one of the 9 controlled strings below |
| C | `Count` | Yes | Numeric value |
| D | `Date` | Most | `yyyy-MM-dd` (e.g., `2026-07-09`) |
| E | `Units` | No | `%`, `Number`, or free text (appended as suffix) |
| F | `Target` | Donut / Target Table | Numeric goal value |
| G | `Group` | Pie / Ranked / Grouped | Breakdown label (slice, bar, or series) |

## Controlled `Type` Dropdown Values (exact strings)

```
Big Number Callout
Highlight Callout
Donut Progress
Map (Coverage)
Line Graph / Area Chart
Pie/Donut Chart
Ranked Bar Chart
Grouped Bar Chart
Target Table
```

> Configure via **Data → Data validation → List of items** (one per line).

## Pass 1 — Single-Row Tiles (built & live)

| Type | Minimal Columns | Notes |
|---|---|---|
| `Big Number Callout` | Title, Count | Animated big number |
| `Highlight Callout` | Title, Count, Date | Star icon, optional confetti |
| `Donut Progress` | Title, Count, Target | Progress ring (skips if Target missing) |
| `Map (Coverage)` | Title, Count, Date | Headline + province breakdown |

---

## Pass 2 — Chart Types (each needs multiple rows sharing a key)

| Type | Group By | Min Rows | Required Columns |
|---|---|---|---|
| `Line Graph / Area Chart` | Same `Title` | 2+ | Title, Count, Date |
| `Pie/Donut Chart` | Same `Title` + `Date` | 2+ | Title, Count, Date, Group |
| `Ranked Bar Chart` | Same `Title` | 2+ | Title, Count, Group |
| `Grouped Bar Chart` | Same `Date` (or `Title`+`Date`) | 4+ (2 cats × 2 series) | Title, Count, Date, Group |
| `Target Table` | One row per sheet row | 1+ | Title, Count, Target |

---

## Sample Data by Project Tab

> Copy the rows under each heading (starting from row 2, leaving row 1 for your header `Title,Type,Count,Date,Units,Target,Group`) into the matching tab.

---

### `eGov` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Test Tickets Resolved | Big Number Callout | 87.5 | 2026-07-09 | % | 100 | |
| Service Uptime | Donut Progress | 94 | 2026-07-09 | % | 100 | |
| Active Municipalities | Map (Coverage) | 1250 | 2026-07-09 | Number | | |

---

### `FreeWifi` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Sites Online | Big Number Callout | 3820 | 2026-07-09 | Number | | |
| Coverage Milestone | Highlight Callout | 85 | 2026-07-09 | % | 100 | |
| Regional Coverage | Donut Progress | 78 | 2026-07-09 | % | 100 | |
| Provincial Breakdown | Map (Coverage) | 4250 | 2026-07-09 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 185000 | 2026-01-31 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 210000 | 2026-02-28 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 238000 | 2026-03-31 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 265000 | 2026-04-30 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 298000 | 2026-05-31 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 325000 | 2026-06-30 | Number | | |
| Cumulative Users | Line Graph / Area Chart | 348000 | 2026-07-31 | Number | | |
| Q3 2026 Access Type | Pie/Donut Chart | 12400 | 2026-09-30 | Number | | Mobile Hotspot |
| Q3 2026 Access Type | Pie/Donut Chart | 8900 | 2026-09-30 | Number | | Fixed Broadband |
| Q3 2026 Access Type | Pie/Donut Chart | 6200 | 2026-09-30 | Number | | Community Center |
| Q3 2026 Access Type | Pie/Donut Chart | 3100 | 2026-09-30 | Number | | Satellite |
| Top Provinces (All Time) | Ranked Bar Chart | 485 | 2026-07-09 | Number | | Bukidnon |
| Top Provinces (All Time) | Ranked Bar Chart | 412 | 2026-07-09 | Number | | Lanao del Norte |
| Top Provinces (All Time) | Ranked Bar Chart | 398 | 2026-07-09 | Number | | Misamis Oriental |
| Top Provinces (All Time) | Ranked Bar Chart | 287 | 2026-07-09 | Number | | Camiguin |
| Top Provinces (All Time) | Ranked Bar Chart | 194 | 2026-07-09 | Number | | Misamis Occidental |
| Monthly New Sites | Grouped Bar Chart | 84 | 2026-04-30 | Number | | Deployed |
| Monthly New Sites | Grouped Bar Chart | 12 | 2026-04-30 | Number | | Decommissioned |
| Monthly New Sites | Grouped Bar Chart | 91 | 2026-05-31 | Number | | Deployed |
| Monthly New Sites | Grouped Bar Chart | 8 | 2026-05-31 | Number | | Decommissioned |
| Monthly New Sites | Grouped Bar Chart | 76 | 2026-06-30 | Number | | Deployed |
| Monthly New Sites | Grouped Bar Chart | 15 | 2026-06-30 | Number | | Decommissioned |
| Monthly New Sites | Grouped Bar Chart | 88 | 2026-07-31 | Number | | Deployed |
| Monthly New Sites | Grouped Bar Chart | 10 | 2026-07-31 | Number | | Decommissioned |
| Monthly Deployment Target | Target Table | 84 | 2026-04-30 | Number | 100 | |
| Monthly Deployment Target | Target Table | 91 | 2026-05-31 | Number | 100 | |
| Monthly Deployment Target | Target Table | 76 | 2026-06-30 | Number | 100 | |
| Monthly Deployment Target | Target Table | 88 | 2026-07-31 | Number | 100 | |

---

### `NBP` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Broadband Sites | Big Number Callout | 2140 | 2026-07-09 | Number | | |
| Phase 3 Completion | Donut Progress | 67 | 2026-07-09 | % | 100 | |
| Regional Footprint | Map (Coverage) | 1850 | 2026-07-09 | Number | | |
| Cumulative Connections | Line Graph / Area Chart | 45000 | 2026-01-31 | Number | | |
| Cumulative Connections | Line Graph / Area Chart | 52000 | 2026-02-28 | Number | | |
| Cumulative Connections | Line Graph / Area Chart | 61000 | 2026-03-31 | Number | | |
| Cumulative Connections | Line Graph / Area Chart | 72000 | 2026-04-30 | Number | | |
| Cumulative Connections | Line Graph / Area Chart | 84000 | 2026-05-31 | Number | | |
| Cumulative Connections | Line Graph / Area Chart | 98000 | 2026-06-30 | Number | | |
| Q2 2026 Install Type | Pie/Donut Chart | 1240 | 2026-06-30 | Number | | Fiber |
| Q2 2026 Install Type | Pie/Donut Chart | 890 | 2026-06-30 | Number | | Wireless |
| Q2 2026 Install Type | Pie/Donut Chart | 560 | 2026-06-30 | Number | | Satellite |
| LGU Performance | Ranked Bar Chart | 89 | 2026-07-09 | % | | Bukidnon |
| LGU Performance | Ranked Bar Chart | 76 | 2026-07-09 | % | | Lanao del Norte |
| LGU Performance | Ranked Bar Chart | 64 | 2026-07-09 | % | | Misamis Oriental |
| Monthly Rollout | Grouped Bar Chart | 45 | 2026-04-30 | Number | | Connected |
| Monthly Rollout | Grouped Bar Chart | 12 | 2026-04-30 | Number | | Pending |
| Monthly Rollout | Grouped Bar Chart | 52 | 2026-05-31 | Number | | Connected |
| Monthly Rollout | Grouped Bar Chart | 8 | 2026-05-31 | Number | | Pending |
| Monthly Rollout | Grouped Bar Chart | 38 | 2026-06-30 | Number | | Connected |
| Monthly Rollout | Grouped Bar Chart | 15 | 2026-06-30 | Number | | Pending |
| Q3 Target Tracker | Target Table | 45 | 2026-07-31 | Number | 50 | |
| Q3 Target Tracker | Target Table | 52 | 2026-08-31 | Number | 50 | |

---

### `Cybersecurity` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Active Certificates | Big Number Callout | 12450 | 2026-07-09 | Number | | |
| Audit Compliance | Donut Progress | 92 | 2026-07-09 | % | 100 | |
| Regional Coverage | Map (Coverage) | 85 | 2026-07-09 | Number | | |
| Incidents Resolved | Line Graph / Area Chart | 840 | 2026-01-31 | Number | | |
| Incidents Resolved | Line Graph / Area Chart | 910 | 2026-02-28 | Number | | |
| Incidents Resolved | Line Graph / Area Chart | 880 | 2026-03-31 | Number | | |
| Incidents Resolved | Line Graph / Area Chart | 950 | 2026-04-30 | Number | | |
| Incidents Resolved | Line Graph / Area Chart | 1020 | 2026-05-31 | Number | | |
| Incidents Resolved | Line Graph / Area Chart | 1100 | 2026-06-30 | Number | | |
| Q2 Incident Type | Pie/Donut Chart | 320 | 2026-06-30 | Number | | Phishing |
| Q2 Incident Type | Pie/Donut Chart | 280 | 2026-06-30 | Number | | Malware |
| Q2 Incident Type | Pie/Donut Chart | 190 | 2026-06-30 | Number | | Unauthorized Access |
| Q2 Incident Type | Pie/Donut Chart | 160 | 2026-06-30 | Number | | Other |
| Agency Readiness | Ranked Bar Chart | 95 | 2026-07-09 | % | | DICT Central |
| Agency Readiness | Ranked Bar Chart | 87 | 2026-07-09 | % | | NBI |
| Agency Readiness | Ranked Bar Chart | 82 | 2026-07-09 | % | | PNP |
| Agency Readiness | Ranked Bar Chart | 74 | 2026-07-09 | % | | NTC |
| Monthly Training | Grouped Bar Chart | 12 | 2026-04-30 | Number | | Completed |
| Monthly Training | Grouped Bar Chart | 3 | 2026-04-30 | Number | | Scheduled |
| Monthly Training | Grouped Bar Chart | 15 | 2026-05-31 | Number | | Completed |
| Monthly Training | Grouped Bar Chart | 2 | 2026-05-31 | Number | | Scheduled |
| Monthly Training | Grouped Bar Chart | 10 | 2026-06-30 | Number | | Completed |
| Monthly Training | Grouped Bar Chart | 4 | 2026-06-30 | Number | | Scheduled |
| Compliance Scorecard | Target Table | 92 | 2026-07-09 | % | 100 | |
| Incident Response Time | Target Table | 2.4 | 2026-07-09 | hrs | 4 | |

---

### `eLGU` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Registered LGUs | Big Number Callout | 1634 | 2026-07-09 | Number | | |
| System Adoption | Donut Progress | 78 | 2026-07-09 | % | 100 | |
| Provincial Reach | Map (Coverage) | 1245 | 2026-07-09 | Number | | |
| Monthly Onboards | Line Graph / Area Chart | 45 | 2026-01-31 | Number | | |
| Monthly Onboards | Line Graph / Area Chart | 52 | 2026-02-28 | Number | | |
| Monthly Onboards | Line Graph / Area Chart | 48 | 2026-03-31 | Number | | |
| Monthly Onboards | Line Graph / Area Chart | 61 | 2026-04-30 | Number | | |
| Monthly Onboards | Line Graph / Area Chart | 58 | 2026-05-31 | Number | | |
| Monthly Onboards | Line Graph / Area Chart | 67 | 2026-06-30 | Number | | |
| Q2 Module Usage | Pie/Donut Chart | 890 | 2026-06-30 | Number | | Business Permits |
| Q2 Module Usage | Pie/Donut Chart | 650 | 2026-06-30 | Number | | Tax Collection |
| Q2 Module Usage | Pie/Donut Chart | 420 | 2026-06-30 | Number | | Building Permits |
| Q2 Module Usage | Pie/Donut Chart | 280 | 2026-06-30 | Number | | Health Certificates |
| LGU Maturity | Ranked Bar Chart | 94 | 2026-07-09 | % | | Cagayan de Oro |
| LGU Maturity | Ranked Bar Chart | 87 | 2026-07-09 | % | | Iligan |
| LGU Maturity | Ranked Bar Chart | 78 | 2026-07-09 | % | | Malaybalay |
| LGU Maturity | Ranked Bar Chart | 65 | 2026-07-09 | % | | Valencia |
| Monthly Transactions | Grouped Bar Chart | 12400 | 2026-04-30 | Number | | Online |
| Monthly Transactions | Grouped Bar Chart | 3200 | 2026-04-30 | Number | | Walk-in |
| Monthly Transactions | Grouped Bar Chart | 13800 | 2026-05-31 | Number | | Online |
| Monthly Transactions | Grouped Bar Chart | 2900 | 2026-05-31 | Number | | Walk-in |
| Monthly Transactions | Grouped Bar Chart | 14500 | 2026-06-30 | Number | | Online |
| Monthly Transactions | Grouped Bar Chart | 2700 | 2026-06-30 | Number | | Walk-in |
| Onboard Target | Target Table | 67 | 2026-07-31 | Number | 80 | |
| Onboard Target | Target Table | 72 | 2026-08-31 | Number | 80 | |

---

### `NIPPSB` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Participating Barangays | Big Number Callout | 3842 | 2026-07-09 | Number | | |
| Assessment Progress | Donut Progress | 64 | 2026-07-09 | % | 100 | |
| Provincial Coverage | Map (Coverage) | 2850 | 2026-07-09 | Number | | |
| Cumulative Assessed | Line Graph / Area Chart | 1240 | 2026-01-31 | Number | | |
| Cumulative Assessed | Line Graph / Area Chart | 1580 | 2026-02-28 | Number | | |
| Cumulative Assessed | Line Graph / Area Chart | 1890 | 2026-03-31 | Number | | |
| Cumulative Assessed | Line Graph / Area Chart | 2140 | 2026-04-30 | Number | | |
| Cumulative Assessed | Line Graph / Area Chart | 2450 | 2026-05-31 | Number | | |
| Cumulative Assessed | Line Graph / Area Chart | 2850 | 2026-06-30 | Number | | |
| Q2 Assessment Result | Pie/Donut Chart | 1850 | 2026-06-30 | Number | | Passed |
| Q2 Assessment Result | Pie/Donut Chart | 620 | 2026-06-30 | Number | | Conditional |
| Q2 Assessment Result | Pie/Donut Chart | 380 | 2026-06-30 | Number | | Failed |
| Municipality Ranking | Ranked Bar Chart | 89 | 2026-07-09 | % | | Maramag |
| Municipality Ranking | Ranked Bar Chart | 82 | 2026-07-09 | % | | Don Carlos |
| Municipality Ranking | Ranked Bar Chart | 76 | 2026-07-09 | % | | Kadingilan |
| Municipality Ranking | Ranked Bar Chart | 71 | 2026-07-09 | % | | Kibawe |
| Monthly Assessments | Grouped Bar Chart | 240 | 2026-04-30 | Number | | New |
| Monthly Assessments | Grouped Bar Chart | 180 | 2026-04-30 | Number | | Re-assessed |
| Monthly Assessments | Grouped Bar Chart | 310 | 2026-05-31 | Number | | New |
| Monthly Assessments | Grouped Bar Chart | 220 | 2026-05-31 | Number | | Re-assessed |
| Monthly Assessments | Grouped Bar Chart | 280 | 2026-06-30 | Number | | New |
| Monthly Assessments | Grouped Bar Chart | 190 | 2026-06-30 | Number | | Re-assessed |
| Assessment Target | Target Table | 240 | 2026-07-31 | Number | 300 | |
| Assessment Target | Target Table | 310 | 2026-08-31 | Number | 300 | |

---

### `IIDB` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Registered Enterprises | Big Number Callout | 842 | 2026-07-09 | Number | | |
| Digital Adoption | Donut Progress | 71 | 2026-07-09 | % | 100 | |
| Provincial Reach | Map (Coverage) | 635 | 2026-07-09 | Number | | |
| Cumulative Registrations | Line Graph / Area Chart | 120 | 2026-01-31 | Number | | |
| Cumulative Registrations | Line Graph / Area Chart | 156 | 2026-02-28 | Number | | |
| Cumulative Registrations | Line Graph / Area Chart | 198 | 2026-03-31 | Number | | |
| Cumulative Registrations | Line Graph / Area Chart | 245 | 2026-04-30 | Number | | |
| Cumulative Registrations | Line Graph / Area Chart | 298 | 2026-05-31 | Number | | |
| Cumulative Registrations | Line Graph / Area Chart | 356 | 2026-06-30 | Number | | |
| Q2 Sector Mix | Pie/Donut Chart | 245 | 2026-06-30 | Number | | IT Services |
| Q2 Sector Mix | Pie/Donut Chart | 180 | 2026-06-30 | Number | | E-commerce |
| Q2 Sector Mix | Pie/Donut Chart | 150 | 2026-06-30 | Number | | Fintech |
| Q2 Sector Mix | Pie/Donut Chart | 120 | 2026-06-30 | Number | | EdTech |
| Enterprise Maturity | Ranked Bar Chart | 88 | 2026-07-09 | % | | Cagayan de Oro |
| Enterprise Maturity | Ranked Bar Chart | 79 | 2026-07-09 | % | | Iligan |
| Enterprise Maturity | Ranked Bar Chart | 72 | 2026-07-09 | % | | Valencia |
| Enterprise Maturity | Ranked Bar Chart | 65 | 2026-07-09 | % | | Malaybalay |
| Monthly Onboards | Grouped Bar Chart | 42 | 2026-04-30 | Number | | Startup |
| Monthly Onboards | Grouped Bar Chart | 28 | 2026-04-30 | Number | | Scale-up |
| Monthly Onboards | Grouped Bar Chart | 53 | 2026-05-31 | Number | | Startup |
| Monthly Onboards | Grouped Bar Chart | 31 | 2026-05-31 | Number | | Scale-up |
| Monthly Onboards | Grouped Bar Chart | 58 | 2026-06-30 | Number | | Startup |
| Monthly Onboards | Grouped Bar Chart | 34 | 2026-06-30 | Number | | Scale-up |
| Registration Target | Target Table | 58 | 2026-07-31 | Number | 70 | |
| Registration Target | Target Table | 64 | 2026-08-31 | Number | 70 | |

---

### `ILCDB` Tab

| Title | Type | Count | Date | Units | Target | Group |
|---|---|---|---|---|---|---|
| Active Barangays | Big Number Callout | 1240 | 2026-07-09 | Number | | |
| Livelihood Programs | Donut Progress | 84 | 2026-07-09 | % | 100 | |
| Community Reach | Map (Coverage) | 980 | 2026-07-09 | Number | | |
| Beneficiaries Over Time | Line Graph / Area Chart | 15200 | 2026-01-31 | Number | | |
| Beneficiaries Over Time | Line Graph / Area Chart | 16800 | 2026-02-28 | Number | | |
| Beneficiaries Over Time | Line Graph / Area Chart | 18400 | 2026-03-31 | Number | | |
| Beneficiaries Over Time | Line Graph / Area Chart | 20100 | 2026-04-30 | Number | | |
| Beneficiaries Over Time | Line Graph / Area Chart | 21800 | 2026-05-31 | Number | | |
| Beneficiaries Over Time | Line Graph / Area Chart | 23500 | 2026-06-30 | Number | | |
| Q2 Program Type | Pie/Donut Chart | 4200 | 2026-06-30 | Number | | Skills Training |
| Q2 Program Type | Pie/Donut Chart | 3100 | 2026-06-30 | Number | | Seed Capital |
| Q2 Program Type | Pie/Donut Chart | 1800 | 2026-06-30 | Number | | Market Linkage |
| Q2 Program Type | Pie/Donut Chart | 1200 | 2026-06-30 | Number | | Tech Assistance |
| Municipal Impact | Ranked Bar Chart | 92 | 2026-07-09 | % | | Baungon |
| Municipal Impact | Ranked Bar Chart | 85 | 2026-07-09 | % | | Libona |
| Municipal Impact | Ranked Bar Chart | 78 | 2026-07-09 | % | | Manolo Fortich |
| Municipal Impact | Ranked Bar Chart | 71 | 2026-07-09 | % | | Impasug-ong |
| Monthly Beneficiaries | Grouped Bar Chart | 1800 | 2026-04-30 | Number | | New |
| Monthly Beneficiaries | Grouped Bar Chart | 400 | 2026-04-30 | Number | | Continuing |
| Monthly Beneficiaries | Grouped Bar Chart | 2100 | 2026-05-31 | Number | | New |
| Monthly Beneficiaries | Grouped Bar Chart | 350 | 2026-05-31 | Number | | Continuing |
| Monthly Beneficiaries | Grouped Bar Chart | 2400 | 2026-06-30 | Number | | New |
| Monthly Beneficiaries | Grouped Bar Chart | 380 | 2026-06-30 | Number | | Continuing |
| Beneficiary Target | Target Table | 2400 | 2026-07-31 | Number | 2500 | |
| Beneficiary Target | Target Table | 2700 | 2026-08-31 | Number | 2500 | |

---

## Quick Verification Checklist

After pasting into each tab:

1. [ ] Header row is `Title,Type,Count,Date,Units,Target,Group` (row 1)
2. [ ] Data starts on row 2
3. [ ] Column B (`Type`) has the **Data Validation** dropdown with all 9 strings
4. [ ] Dates are `yyyy-MM-dd` (no slashes)
5. [ ] Sheet is **File → Share → Anyone with the link → Viewer** (or Published)
6. [ ] Refresh `http://localhost:6980/kms/<project>` — pass 1 tiles appear immediately; pass 2 charts will render once the chart components are wired (next step).

---

## Next: Pass 2 Implementation

When you're ready for the chart types (`Line Graph`, `Pie/Donut`, `Ranked Bar`, `Grouped Bar`, `Target Table`), I'll add the renderers to `SheetKpiDashboard.tsx`. The data above is already shaped correctly — no further sheet changes needed.