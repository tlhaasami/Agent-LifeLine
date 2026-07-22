# CSV File Parsing and Filtering Rules (Updated)

This document explains how each of the input CSV files is parsed, matched, filtered, and aggregated by the Agent LifeLine reporting engine under the new rules.

---

## 1. CRM Opportunities Database (`opportunities.csv`)
* **Purpose:** Represents the master database of all historical and current opportunities. Used to count total opportunities assigned to agents and to lookup agent assignments by contact name or phone.

### Fields Processed
* **`assigned` / `Assigned` / `Assigned user` / `Assigned To` / `assignedTo`:** The agent assigned to the opportunity. Normalized using `normalizeAgentName`.
* **`Contact Name` / `contact_name` / `Contact name`:** The name of the client.
* **`phone` / `Phone` / `Contact phone`:** Normalizes to digits only to map phone numbers to assigned agents.
* **`Opportunity ID` / `opportunityId` / `id`:** Unique ID of the opportunity.

### Filtering Rules
* **What is Kept:**
  * **All rows with an assigned agent** are kept to calculate `assigned_opportunities` and build lookup maps.
  * **Unique ID:** Unique opportunity IDs are kept intact.
* **What is Dropped:**
  * **Unassigned Opportunities:** Rows without a valid assigned agent are completely dropped upon load.
* **Note:** No margin calculations or margin date filtering are performed on the Opportunities database.

---

## 2. GHL Agent Logs (Audit Logs)
* **Purpose:** Captures all actions (audits) taken by agents on GHL (e.g. creating notes, tasks, updating opportunities). Used to calculate workday sessions, active time, breaks, and daily stage transitions.

### Fields Processed
* **`Document ID` / `document_id`:** Checked to identify opportunity transitions.
* **`Module` / `module`:** Checked for types: `OPPORTUNITY`, `NOTE`, `TASK`, `CONTACT`.
* **`Details` / `details`:** Extracted via JSON parser or regex to identify specific actions.
* **`dateAdded` / `Date added` / `Timestamp` / `timestamp`:** Converted to BST/PKT.
* **`User` / `user`:** The agent who performed the action.

### Filtering Rules
* **What is Kept:**
  * **All log rows** are kept and rendered directly on the Activity Timeline. No date filtering is applied to the timeline list, allowing all logged activity to display.
  * Unique opportunity counts engaged by each agent are calculated.
* **What is Dropped:**
  * None of the audit log rows are dropped.

---

## 3. Margin File (`Margin per Agent-*.csv`)
* **Purpose:** A mandatory file representing the leads with margin added.
* **Requirement:** This file is **Required** (not optional).

### Fields Processed
* **`Lead value` / `Lead Value`:** The financial margin value (used as the margin amount).
* **`Phone number` / `Phone Number` / `phone` / `Phone`:** Used to lookup agent in opportunities database.
* **`Opportunity name` / `Opportunity Name` / `Primary Contact name` / `Primary Contact Name`:** Used to lookup agent in opportunities database.
* **`Assigned user` / `assigned` / `Assigned`:** Agent assignment fallback.

### Mapping & Filtering Rules
* **What is Kept:**
  * **Agent Lookup:** For each row in this file, the engine finds the assigned agent from `opportunities.csv` using the contact phone/name lookup index. If no agent is found, it falls back to the agent in the Margin CSV itself.
  * **Margin Value:** Sums the `Lead value` column as the margin amount.
* **What is Dropped:**
  * Rows without a valid assigned agent (including fallback).
