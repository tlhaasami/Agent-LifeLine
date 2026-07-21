# Agent LifeLine Dashboard: Metrics Guide

This guide details all calculation rules, equations, and definitions for the metrics, grids, charts, and timeline widgets across every section of the dashboard.

---

## 1. Overview Section

The **Overview** dashboard presents aggregated team-wide metrics for the selected day:

*   **Margin Generated today (£)**: 
    *   *Formula:* $\sum \text{Margin Contributed Today}$ of all active agents.
    *   *Data Source:* Opportunities CSV (Lead Value / Margin Amount column).
*   **Total Leads Assigned**: 
    *   *Formula:* $\sum \text{Assigned Opportunities}$ across all agents.
    *   *Data Source:* Opportunities CSV (row allocation by Assigned User).
*   **Active Sprints**: 
    *   *Definition:* Count of agents with at least 1 logged update/activity in audit logs on the selected date.
*   **Avg Daily Team Conv (%)**: 
    *   *Formula:* $\left( \frac{\sum \text{Booked Leads Today}}{\sum \text{Eligible Opportunities Today}} \right) \times 100$
    *   *Eligible Opportunities Today* = Total Opportunities Assigned - Closed Leads - Appointment Booked Leads.
*   **Lead Segmentations Sums**:
    *   *New Leads:* Total count of opportunities assigned plus unique contacts interacted with.
    *   *Referrals:* Sum of leads designated as a referral on the selected date.
    *   *Booked Leads:* Sum of leads marked in a "Booked" status.
    *   *Appointment Booked:* Sum of leads marked in an "Appointment Booked" status.
    *   *Closed Leads:* Sum of leads marked in a "Won", "Closed", or "Lost" status.
*   **Source Distribution**:
    *   A breakdown of lead count grouped by the lead's acquisition origin channel (e.g., Facebook, Organic, Referral).

---

## 2. Activity & Metrics Section (The 19 Cards Grid)

When selecting `"All Agents"` or a specific agent, the dashboard calculates nineteen metric KPIs:

### Engagement & Activity KPIs
1.  **Today Interacted Leads**: Unique counts of contact IDs/opportunity IDs that appear in CRM audit logs today. Phone-call-only logs are excluded.
2.  **Interacted Conversions**: Count of unique leads updated today that reached a converted stage (Booked, Appointment Booked, Won) today.
3.  **Total Conversations**: Count of unique phone number profiles the agent exchanged outbound GHL text messages with today.
4.  **Total Calls Placed**: Sum of outbound and inbound call logs registered today.
5.  **Missed Inbound Calls**: Inbound calls with status other than "Answered".
6.  **Notes Added**: Audit logs of type `NOTE` with action `CREATED`.
7.  **Tasks Added**: Audit logs of type `TASK` with action `CREATED`.
8.  **Total Actions**: Total count of all log actions (Note creation, Task additions, Opportunity stage changes) performed today.

### CRM Stages & Conversions
9.  **Interested Stage**: Number of opportunities moved to the "Interested" pipeline stage.
10. **Contacted Stage**: Number of opportunities moved to the "Contacted" pipeline stage.
11. **Today's New Leads**: Calculated as the sum of assigned opportunities plus unique contacts interacted with.
12. **Today's Referrals**: Opportunities marked as a referral.
13. **Booked Leads**: All booked leads rows for the agent in the uploaded Booked Leads sheet.
14. **Closed Leads**: All closed leads rows for the agent in the uploaded Closed Leads sheet.
15. **Appointment Booked**: All appointment booked leads rows for the agent in the uploaded Appointment Booked sheet.
16. **General Conversion Rate (%)**: 
    *   *Formula:* $\left( \frac{\text{Booked Leads}}{\text{Assigned Opportunities} - \text{Closed Leads} - \text{Appt Booked Leads}} \right) \times 100$
17. **Today's Conversion Rate (%)**:
    *   *Formula:* $\left( \frac{\text{Today's Converted (Booked + Appt Booked)}}{\text{Today's New Leads}} \right) \times 100$
18. **Margin Contributed Today (£)**: Total revenue value of opportunities won or credited on the selected date.

### Workday & Time Metrics
19. **Workday Session Span**: The duration from the agent's first activity timestamp of the day to their last activity timestamp of the day.

---

## 3. Progression Charts Section

This tab renders agent performance rankings for today's KPIs:
*   **New Leads**: Today's New Leads per agent.
*   **Referrals**: Today's Referrals per agent.
*   **Booked Leads**: Today's Booked Leads count per agent.
*   **Appointment Booked Leads**: Today's Appointment Booked Leads count per agent.
*   **Closed Leads**: Today's Closed Leads count per agent.
*   **Margin Contributed Today (£)**: Total monetary margin (£) added per agent today.

---

## 4. Visual Scatter Workday Timeline Section

A visual activity plot mapping events across hours (BST) to inspect agent workday density:
*   **Circles (Light Blue-Purple)**: CRM audit updates (Notes, Task creation, Stage changes).
*   **Small Dots (Sky Blue)**: Outbound GHL text message actions.
*   **Triangles (Orange)**: Calls placed. Solid color indicates Answered, hollow/grey outlines indicate missed/unattended.

---

## 5. Summary Tables Section

*   **Table 1: Main Agent Conversion & Lead Metrics**:
    Summarizes each agent's general performance. Includes `New Leads`, `Referrals`, `Appt Booked`, `Closed`, `Booked`, `Margin`, `Interested`, `Contacted`, `Notes`, and `General Conversion (%)`.
*   **Table 2: Today's New Leads Conversion Sprints**:
    Tracks immediate day-of conversion velocity. Shows `Today's New Leads`, `Today's Referrals`, `Today's Converted`, and `Today's Conversion Rate (%)`.
*   **Table 3: Voice Call Operations & Call Duration Metrics**:
    Detailed call log diagnostics including `Outbound Calls Count`, `Outbound Answered Count`, `Outbound Missed Count`, `Total Outbound Call Duration (Mins)`, `Average Outbound Call Duration (Mins)`, and identical variables for `Inbound Calls`.
