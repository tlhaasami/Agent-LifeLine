"use client";

import React, { useState } from "react";

export default function AgentTable({ agents, selectedAgent, onSelectAgent }) {
  const [sortColumn, setSortColumn] = useState("actions");
  const [sortAsc, setSortAsc] = useState(false); // Default sort desc by actions like original

  const formatSecondsToTime = (seconds) => {
    const sec = Math.round(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(column === "name"); // Default name to ascending, others descending
    }
  };

  const getSortedAgents = () => {
    const sorted = [...agents];
    sorted.sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "actions":
          valA = a.actions;
          valB = b.actions;
          break;
        case "opps":
          valA = a.opps;
          valB = b.opps;
          break;
        case "span":
          valA = a.span;
          valB = b.span;
          break;
        case "active":
          valA = a.active;
          valB = b.active;
          break;
        case "breaks":
          valA = a.breaks;
          valB = b.breaks;
          break;
        default:
          valA = a.name;
          valB = b.name;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return <i className="fa-solid fa-sort"></i>;
    return sortAsc ? <i className="fa-solid fa-sort-up"></i> : <i className="fa-solid fa-sort-down"></i>;
  };

  const sortedAgents = getSortedAgents();

  return (
    <section className="card table-card" style={{ flex: 1.3 }}>
      <div className="card-header split-header">
        <h2>
          <i className="fa-solid fa-list-check"></i> Agent Comparison Table
        </h2>
      </div>
      <div className="table-container">
        <table id="agent-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} className={`sortable ${sortColumn === "name" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Agent Name {getSortIcon("name")}
              </th>
              <th onClick={() => handleSort("actions")} className={`sortable ${sortColumn === "actions" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Actions {getSortIcon("actions")}
              </th>
              <th onClick={() => handleSort("opps")} className={`sortable ${sortColumn === "opps" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Opps {getSortIcon("opps")}
              </th>
              <th onClick={() => handleSort("span")} className={`sortable ${sortColumn === "span" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Span {getSortIcon("span")}
              </th>
              <th onClick={() => handleSort("active")} className={`sortable ${sortColumn === "active" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Net Active {getSortIcon("active")}
              </th>
              <th onClick={() => handleSort("breaks")} className={`sortable ${sortColumn === "breaks" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Breaks {getSortIcon("breaks")}
              </th>
            </tr>
          </thead>
          <tbody id="agent-table-body">
            {sortedAgents.map((agent) => {
              const isSelected = selectedAgent && selectedAgent.name === agent.name;
              return (
                <tr
                  key={agent.name}
                  className={isSelected ? "selected" : ""}
                  onClick={() => onSelectAgent(agent)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{agent.name}</td>
                  <td style={{ fontWeight: 700, color: "var(--primary)" }}>{agent.actions}</td>
                  <td>{agent.opps}</td>
                  <td>{formatSecondsToTime(agent.span)}</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatSecondsToTime(agent.active)}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: "var(--warning-glow)", color: "var(--warning)" }}>
                      {agent.breaks}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sortedAgents.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                  No agents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
