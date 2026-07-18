"use client";

import React, { useRef, useEffect, useState } from "react";

export default function ExecutiveReport({ agents, bstCallsList = [], bstUpdatesList = [], activeSection = "" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null); // { type, agent, time, label, x, y }
  const [selectedAgents, setSelectedAgents] = useState(agents.map(a => a.name));
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Time workday window bounds state
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(20);

  // Checklist filters for visual events
  const [filterGhlUpdates, setFilterGhlUpdates] = useState(true);
  const [filterCalls, setFilterCalls] = useState(true);
  const [filterMissedOnly, setFilterMissedOnly] = useState(false);
  const [filterNotesOnly, setFilterNotesOnly] = useState(false);
  const [filterOppsOnly, setFilterOppsOnly] = useState(false);
  const [filterContactsOnly, setFilterContactsOnly] = useState(false);

  // Sync selected agents when data loads
  useEffect(() => {
    setSelectedAgents(agents.map(a => a.name));
  }, [agents]);

  // Canvas styling constants
  const timelineLeftMargin = 160;
  const timelineRightMargin = 40;
  const timelineRowHeight = 40;
  const timelineTopMargin = 30;
  const timelineBottomMargin = 20;

  // BST Limits based on startHour and endHour
  const getMinTime = () => new Date(Date.UTC(2026, 6, 17, startHour, 0, 0));
  const getMaxTime = () => new Date(Date.UTC(2026, 6, 17, endHour, 0, 0));

  const getX = (timeMs, width) => {
    const startMs = getMinTime().getTime();
    const endMs = getMaxTime().getTime();
    const drawableWidth = width - timelineLeftMargin - timelineRightMargin;
    const fraction = (timeMs - startMs) / (endMs - startMs);
    return timelineLeftMargin + fraction * drawableWidth;
  };

  const formatBSTTime = (dateObj) => {
    return (
      dateObj.getUTCHours().toString().padStart(2, "0") +
      ":" +
      dateObj.getUTCMinutes().toString().padStart(2, "0")
    );
  };

  // Formatted details renderer for GHL action updates
  const renderFormattedDetails = (detailsStr) => {
    if (!detailsStr) return null;
    
    try {
      const parsed = JSON.parse(detailsStr);
      
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(255,255,255,0.01)", padding: "0.85rem 1rem", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
          {parsed.body && (
            <div>
              <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>Content / Body:</span>
              <div 
                style={{ marginTop: "2px", color: "#f8fafc", fontSize: "0.82rem", lineHeight: "1.4" }}
                dangerouslySetInnerHTML={{ __html: parsed.body }}
              />
            </div>
          )}
          {parsed.pipelineStageName && (
            <div>
              <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>Pipeline Stage:</span>
              <span style={{ marginLeft: "0.4rem", color: "#f8fafc", fontWeight: 700 }}>{parsed.pipelineStageName}</span>
            </div>
          )}
          {parsed.pipelineName && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem" }}>Pipeline Name:</span>
              <span style={{ marginLeft: "0.4rem", color: "#e2e8f0" }}>{parsed.pipelineName}</span>
            </div>
          )}
          {parsed.status && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem" }}>Opportunity Status:</span>
              <span style={{ marginLeft: "0.4rem", color: "#e2e8f0", textTransform: "capitalize" }}>{parsed.status}</span>
            </div>
          )}
          {parsed.contactId && (
            <div>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem" }}>Contact Record ID:</span>
              <span style={{ marginLeft: "0.4rem", color: "#cbd5e1", fontFamily: "monospace" }}>{parsed.contactId}</span>
            </div>
          )}
          {parsed.relations && parsed.relations.length > 0 && (
            <div style={{ marginTop: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.25rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Linked Relations:</span>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {parsed.relations.map((rel, idx) => (
                  <span key={idx} style={{ background: "rgba(255,255,255,0.05)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontFamily: "monospace", color: "#cbd5e1" }}>
                    {rel.objectKey}: {rel.recordId}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Other raw metadata properties if they exist */}
          {Object.entries(parsed).some(([key]) => !["body", "pipelineStageName", "pipelineName", "status", "contactId", "relations"].includes(key)) && (
            <div style={{ marginTop: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.25rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Metadata:</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.75rem" }}>
                {Object.entries(parsed)
                  .filter(([key]) => !["body", "pipelineStageName", "pipelineName", "status", "contactId", "relations"].includes(key))
                  .map(([key, val]) => (
                    <div key={key}>
                      <strong style={{ color: "#aaca9b" }}>{key}:</strong> <span style={{ color: "#cbd5e1" }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      );
    } catch (e) {
      return (
        <code style={{ display: "block", background: "rgba(0,0,0,0.2)", padding: "0.6rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", border: "1px solid rgba(255,255,255,0.03)", wordBreak: "break-all", whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
          {detailsStr}
        </code>
      );
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = containerRef.current.clientWidth;
    
    // Filter agents list based on multi-select checkbox array
    const filteredAgents = agents.filter(a => selectedAgents.includes(a.name));
    const displayHeight = timelineTopMargin + timelineBottomMargin + Math.max(1, filteredAgents.length) * timelineRowHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    ctx.scale(dpr, dpr);

    const isDark = document.body.classList.contains("dark-mode") || !document.body.classList.contains("light-mode");
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 1. Draw Grid Lines and Labels
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.font = "500 11px Outfit";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";

    const startMs = getMinTime().getTime();
    const endMs = getMaxTime().getTime();
    const drawDate = new Date(startMs);

    while (drawDate.getTime() <= endMs) {
      const xVal = getX(drawDate.getTime(), displayWidth);
      ctx.beginPath();
      ctx.moveTo(xVal, timelineTopMargin - 10);
      ctx.lineTo(xVal, displayHeight - timelineBottomMargin);
      ctx.stroke();

      const label = formatBSTTime(drawDate) + " BST";
      ctx.fillText(label, xVal, timelineTopMargin - 15);

      drawDate.setUTCHours(drawDate.getUTCHours() + 1);
    }

    // 2. Draw rows and scatter points for each agent
    filteredAgents.forEach((agent, idx) => {
      const rowTop = timelineTopMargin + idx * timelineRowHeight;
      const yCenter = rowTop + timelineRowHeight / 2;

      // Divider line
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
      ctx.beginPath();
      ctx.moveTo(0, rowTop + timelineRowHeight);
      ctx.lineTo(displayWidth, rowTop + timelineRowHeight);
      ctx.stroke();

      // Agent Y-Label
      ctx.fillStyle = isDark ? "#faefea" : "#2a1209";
      ctx.font = "600 12px Outfit";
      ctx.textAlign = "left";
      ctx.fillText(agent.name, 15, yCenter + 4);

      // Filter GHL updates
      if (filterGhlUpdates) {
        let updatesForAgent = bstUpdatesList.filter(
          (up) => up.agent === agent.name && up.time >= getMinTime() && up.time <= getMaxTime()
        );

        if (filterNotesOnly) {
          updatesForAgent = updatesForAgent.filter(up => up.module === "NOTE");
        }
        if (filterOppsOnly) {
          updatesForAgent = updatesForAgent.filter(up => up.module === "OPPORTUNITY");
        }
        if (filterContactsOnly) {
          updatesForAgent = updatesForAgent.filter(up => up.module === "CONTACT");
        }

        updatesForAgent.forEach((up) => {
          const xVal = getX(up.time.getTime(), displayWidth);
          const isHovered = hoveredItem && hoveredItem.type === "update" && hoveredItem.data === up;

          ctx.fillStyle = "#818cf8"; // Light purple-blue circle
          ctx.beginPath();
          ctx.arc(xVal, yCenter, isHovered ? 7.5 : 5, 0, 2 * Math.PI);
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }

      // Filter Calls
      if (filterCalls) {
        let callsForAgent = bstCallsList.filter(
          (cl) => cl.agent === agent.name && cl.time >= getMinTime() && cl.time <= getMaxTime()
        );

        if (filterMissedOnly) {
          callsForAgent = callsForAgent.filter(cl => cl.status && cl.status.toLowerCase() !== "answered");
        }

        callsForAgent.forEach((cl) => {
          const xVal = getX(cl.time.getTime(), displayWidth);
          const isHovered = hoveredItem && hoveredItem.type === "call" && hoveredItem.data === cl;

          ctx.fillStyle = "#fb923c"; // Light orange triangle
          ctx.beginPath();
          const size = isHovered ? 7.5 : 5.5;
          ctx.moveTo(xVal, yCenter - size);
          ctx.lineTo(xVal - size, yCenter + size - 1);
          ctx.lineTo(xVal + size, yCenter + size - 1);
          ctx.closePath();
          ctx.fill();

          if (isHovered) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        });
      }
    });
  }, [
    agents,
    bstCallsList,
    bstUpdatesList,
    hoveredItem,
    selectedAgents,
    startHour,
    endHour,
    filterGhlUpdates,
    filterCalls,
    filterMissedOnly,
    filterNotesOnly,
    filterOppsOnly,
    filterContactsOnly
  ]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const filteredAgents = agents.filter(a => selectedAgents.includes(a.name));

    if (y < timelineTopMargin || y > timelineTopMargin + filteredAgents.length * timelineRowHeight) {
      setHoveredItem(null);
      return;
    }

    const idx = Math.floor((y - timelineTopMargin) / timelineRowHeight);
    const agent = filteredAgents[idx];
    if (!agent) {
      setHoveredItem(null);
      return;
    }

    const displayWidth = rect.width;
    const yCenter = timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;

    let found = null;

    // Check GHL updates
    if (filterGhlUpdates) {
      let updatesForAgent = bstUpdatesList.filter(
        (up) => up.agent === agent.name && up.time >= getMinTime() && up.time <= getMaxTime()
      );

      if (filterNotesOnly) {
        updatesForAgent = updatesForAgent.filter(up => up.module === "NOTE");
      }
      if (filterOppsOnly) {
        updatesForAgent = updatesForAgent.filter(up => up.module === "OPPORTUNITY");
      }
      if (filterContactsOnly) {
        updatesForAgent = updatesForAgent.filter(up => up.module === "CONTACT");
      }

      for (const up of updatesForAgent) {
        const xVal = getX(up.time.getTime(), displayWidth);
        const dist = Math.sqrt((x - xVal) * (x - xVal) + (y - yCenter) * (y - yCenter));
        if (dist <= 8) {
          found = {
            type: "update",
            agent: agent.name,
            time: up.time,
            label: `GHL Log: ${up.module} - ${up.action}`,
            data: up,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    // Check Call events
    if (!found && filterCalls) {
      let callsForAgent = bstCallsList.filter(
        (cl) => cl.agent === agent.name && cl.time >= getMinTime() && cl.time <= getMaxTime()
      );

      if (filterMissedOnly) {
        callsForAgent = callsForAgent.filter(cl => cl.status && cl.status.toLowerCase() !== "answered");
      }

      for (const cl of callsForAgent) {
        const xVal = getX(cl.time.getTime(), displayWidth);
        const dist = Math.sqrt((x - xVal) * (x - xVal) + (y - yCenter) * (y - yCenter));
        if (dist <= 8) {
          found = {
            type: "call",
            agent: agent.name,
            time: cl.time,
            label: `Call: ${cl.direction} (${cl.status}) - ${cl.duration}`,
            data: cl,
            x: e.clientX,
            y: e.clientY,
          };
          break;
        }
      }
    }

    setHoveredItem(found);
  };

  const handleCanvasClick = () => {
    if (hoveredItem) {
      setSelectedEvent(hoveredItem);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadCSV = (headers, rows, filename) => {
    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = "\uFEFF" 
      + [headers.map(escapeCell).join(",")].concat(rows.map(r => r.map(escapeCell).join(","))).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTable1 = () => {
    const headers = ["Agent", "New Leads", "Appt Booked", "Closed Leads", "Booked Leads", "Margin ($)", "Interested Stage", "Contacted Stage", "Notes Count", "General Conversion (%)"];
    const rows = agents.map(a => {
      const seg = a.segmentations || {};
      return [
        a.name,
        seg.newLeads || 0,
        seg.apptBookedLeads || 0,
        seg.closedLeads || 0,
        seg.bookedLeads || 0,
        a.margin_added_today,
        a.stage_interested_today,
        a.stage_contacted_today,
        a.notes_updated_today,
        a.general_conv_rate.toFixed(1)
      ];
    });
    downloadCSV(headers, rows, "agent_conversion_report.csv");
  };

  const handleExportTable2 = () => {
    const headers = ["Agent", "Today's New Leads", "Today's Converted (Booked/Appt Booked)", "Today's Conversion Rate (%)"];
    const rows = agents.map(a => [
      a.name,
      a.new_leads_today,
      a.converted_today,
      a.today_conv_rate.toFixed(1)
    ]);
    downloadCSV(headers, rows, "lead_sprints_report.csv");
  };

  const handleExportTable3 = () => {
    const headers = [
      "Agent", 
      "Outbound Calls", "Outbound Answered", "Outbound Missed", "Outbound Total Mins", "Outbound Avg Dur (Mins)",
      "Inbound Calls", "Inbound Answered", "Inbound Missed", "Inbound Total Mins", "Inbound Avg Dur (Mins)"
    ];
    const rows = agents.map(a => {
      const call = a.call_metrics || {};
      return [
        a.name,
        call.outboundCount,
        call.outboundAttended,
        call.outboundMissed,
        call.outboundMinutes.toFixed(1),
        call.outboundAvgDuration.toFixed(1),
        call.inboundCount,
        call.inboundAttended,
        call.inboundMissed,
        call.inboundMinutes.toFixed(1),
        call.inboundAvgDuration.toFixed(1)
      ];
    });
    downloadCSV(headers, rows, "call_analytics_report.csv");
  };

  // Switch display elements based on selected sidebar section
  const showAll = !activeSection || activeSection === "executive-report";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. Header (hidden during printing if we are printing specific tables) */}
      <div className="card no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>
            <i className="fa-solid fa-file-invoice"></i> Executive Operations Report - July 17, 2026
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>BST (British Summer Time) standard timezone analysis</span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button className="btn-primary-small" onClick={handlePrint}>
            <i className="fa-solid fa-print"></i> Print Full PDF
          </button>
        </div>
      </div>

      {/* 2. Glossary & Descriptions */}
      {(showAll || activeSection === "exec-conversion" || activeSection === "exec-sprints") && (
        <section className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Report Glossary & Calculations</h3>
          <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.75rem", paddingLeft: "1.25rem" }}>
            <li>
              <strong>Eligible Interacted Base:</strong> (Total Opportunity Leads - Closed Leads - Appointment Booked Leads). Reflects true conversion pipeline.
            </li>
            <li>
              <strong>General Conversion Rate:</strong> (Booked Leads &divide; Eligible Interacted Base) &times; 100.
            </li>
            <li>
              <strong>Today's Conversion Rate:</strong> (July 17 Converted &divide; July 17 Created New Leads) &times; 100.
            </li>
            <li>
              <strong>Stage Advancements:</strong> Pipeline movements to <em>'Interested'</em> and <em>'Contacted'</em>.
            </li>
          </ul>
        </section>
      )}

      {/* 3. Scatter timeline chart */}
      {(showAll || activeSection === "exec-timeline") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>
              <i className="fa-solid fa-timeline"></i> Visual Scatter Workday Timeline (09:00 - 20:00 BST)
            </h2>
            
            {/* Filters */}
            <div className="no-print" style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
              {/* Agent Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Agent:</span>
                <select
                  value={selectedAgentFilter}
                  onChange={(e) => { setSelectedAgentFilter(e.target.value); setSelectedEvent(null); }}
                  className="custom-select-small"
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Agents</option>
                  {agents.map(a => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Event Type Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Filter:</span>
                <select
                  value={eventFilter}
                  onChange={(e) => { setEventFilter(e.target.value); setSelectedEvent(null); }}
                  className="custom-select-small"
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Events</option>
                  <option value="calls">Calls Only</option>
                  <option value="missed">Missed Calls Only</option>
                  <option value="notes">Notes Updates Only</option>
                  <option value="stage">Stage Updates Only</option>
                  <option value="contact">Contact Updates Only</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="timeline-legend" style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", fontWeight: 700 }}>
              <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span className="legend-color" style={{ backgroundColor: "#818cf8", borderRadius: "50%", width: "10px", height: "10px" }} />
                GHL Updates
              </span>
              <span className="legend-item" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span className="legend-color" style={{ borderBottom: "10px solid #fb923c", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", width: 0, height: 0 }} />
                Calls Events
              </span>
            </div>
          </div>

          <div className="no-print text-secondary" style={{ padding: "0.5rem 1.5rem", fontSize: "0.78rem", borderBottom: "1px solid rgba(255,255,255,0.03)", fontStyle: "italic" }}>
            <i className="fa-solid fa-circle-info" style={{ color: "var(--primary)", marginRight: "0.3rem" }}></i> 
            Click on any GHL circle or Call triangle in the timeline to inspect detailed action parameters.
          </div>

          <div className="timeline-container-outer" ref={containerRef}>
            <div className="timeline-container">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={handleCanvasClick}
                style={{ cursor: hoveredItem ? "pointer" : "default" }}
              />
            </div>
          </div>

          {/* Interactive Event Detail Inspector */}
          {selectedEvent && (
            <div className="no-print" style={{ margin: "0.5rem 1.5rem 1.5rem", padding: "1.25rem", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <i className={selectedEvent.type === "update" ? "fa-solid fa-cube" : "fa-solid fa-phone"}></i> Action Detail Inspector
                </h4>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700 }}
                >
                  &times;
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>AGENT</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.agent}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>EVENT TYPE</span>
                  <span style={{ fontWeight: 700, color: selectedEvent.type === "update" ? "#818cf8" : "#fb923c" }}>
                    {selectedEvent.type === "update" ? "GHL Update Log" : "Phone Call Event"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>TIMESTAMP</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                    {new Date(selectedEvent.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} BST
                  </span>
                </div>
                {selectedEvent.type === "call" && (
                  <>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>DIRECTION</span>
                      <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--text-primary)" }}>{selectedEvent.data.direction}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>STATUS / OUTCOME</span>
                      <span style={{ fontWeight: 700, color: selectedEvent.data.status.toLowerCase() === "answered" ? "var(--success)" : "var(--danger)" }}>
                        {selectedEvent.data.status}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>DURATION</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.data.duration}</span>
                    </div>
                  </>
                )}
                {selectedEvent.type === "update" && (
                  <>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>CRM MODULE</span>
                      <span style={{ fontWeight: 700, color: "var(--info)" }}>{selectedEvent.data.module}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>CRM ACTION</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{selectedEvent.data.action}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedEvent.data.details && (
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>ACTION DESCRIPTION DETAILS</span>
                  <code style={{ display: "block", background: "rgba(0,0,0,0.2)", padding: "0.6rem 0.8rem", borderRadius: "6px", fontSize: "0.8rem", border: "1px solid rgba(255,255,255,0.03)", wordBreak: "break-all", whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                    {selectedEvent.data.details}
                  </code>
                </div>
              )}
            </div>
          )}

          {hoveredItem && (
            <div className="tooltip" style={{ left: `${hoveredItem.x + 15}px`, top: `${hoveredItem.y + 15}px`, display: "flex", opacity: 1 }}>
              <div className="tooltip-title">{hoveredItem.agent}</div>
              <div className="tooltip-row">
                <span className="tooltip-label">Type:</span>
                <span className="tooltip-value" style={{ color: hoveredItem.type === "update" ? "#818cf8" : "#fb923c" }}>
                  {hoveredItem.type === "update" ? "GHL Update" : "Call Event"}
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Event:</span>
                <span className="tooltip-value">{hoveredItem.label}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Time:</span>
                <span className="tooltip-value">{formatBSTTime(hoveredItem.time)} BST</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. Table 1: Main Conversion */}
      {(showAll || activeSection === "exec-conversion") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Table 1: Main Agent Conversion & Lead Metrics</h2>
            <button className="btn-primary-small no-print" onClick={handleExportTable1}>
              <i className="fa-solid fa-file-excel"></i> Export Table 1
            </button>
          </div>
          <div className="table-container">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>New Leads</th>
                  <th>Appt Booked</th>
                  <th>Closed Leads</th>
                  <th>Booked Leads</th>
                  <th>Margin ($)</th>
                  <th>Interested Stage</th>
                  <th>Contacted Stage</th>
                  <th>Notes Count</th>
                  <th>General Conversion (%)</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const seg = a.segmentations || {};
                  return (
                    <tr key={a.name}>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      <td>{seg.newLeads || 0}</td>
                      <td>{seg.apptBookedLeads || 0}</td>
                      <td>{seg.closedLeads || 0}</td>
                      <td>{seg.bookedLeads || 0}</td>
                      <td style={{ fontWeight: 700, color: "var(--success)" }}>
                        ${a.margin_added_today.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td>{a.stage_interested_today}</td>
                      <td>{a.stage_contacted_today}</td>
                      <td>{a.notes_updated_today}</td>
                      <td style={{ fontWeight: 700 }}>{a.general_conv_rate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Table 2: Conversion Sprints */}
      {(showAll || activeSection === "exec-sprints") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Table 2: Today's (July 17) New Leads Conversion Sprints</h2>
            <button className="btn-primary-small no-print" onClick={handleExportTable2}>
              <i className="fa-solid fa-file-excel"></i> Export Table 2
            </button>
          </div>
          <div className="table-container">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Today's New Leads</th>
                  <th>Today's Converted (Booked/Appt Booked)</th>
                  <th>Today's Conversion Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.name}>
                    <td style={{ fontWeight: 700 }}>{a.name}</td>
                    <td>{a.new_leads_today}</td>
                    <td>{a.converted_today}</td>
                    <td style={{ fontWeight: 700, color: "var(--primary)" }}>{a.today_conv_rate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Table 3: Call Metrics */}
      {(showAll || activeSection === "exec-calls") && (
        <section className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Table 3: Granular Inbound vs. Outbound Call Metrics</h2>
            <button className="btn-primary-small no-print" onClick={handleExportTable3}>
              <i className="fa-solid fa-file-excel"></i> Export Table 3
            </button>
          </div>
          <div className="table-container">
            <table className="print-table" style={{ fontSize: "0.78rem" }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ verticalAlign: "middle" }}>Agent</th>
                  <th colSpan="5" style={{ textAlign: "center", backgroundColor: "rgba(219, 131, 36, 0.08)" }}>Outbound Calls</th>
                  <th colSpan="5" style={{ textAlign: "center", backgroundColor: "rgba(113, 167, 88, 0.08)" }}>Inbound Calls</th>
                </tr>
                <tr>
                  <th>Calls</th>
                  <th>Answered</th>
                  <th>Missed</th>
                  <th>Total Mins</th>
                  <th>Avg Dur (Mins)</th>
                  <th>Calls</th>
                  <th>Answered</th>
                  <th>Missed</th>
                  <th>Total Mins</th>
                  <th>Avg Dur (Mins)</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const call = a.call_metrics || {};
                  return (
                    <tr key={a.name}>
                      <td style={{ fontWeight: 700 }}>{a.name}</td>
                      {/* Outbound */}
                      <td>{call.outboundCount}</td>
                      <td>{call.outboundAttended}</td>
                      <td>{call.outboundMissed}</td>
                      <td>{call.outboundMinutes.toFixed(1)}</td>
                      <td style={{ fontWeight: 600 }}>{call.outboundAvgDuration.toFixed(1)}</td>
                      {/* Inbound */}
                      <td>{call.inboundCount}</td>
                      <td>{call.inboundAttended}</td>
                      <td>{call.inboundMissed}</td>
                      <td>{call.inboundMinutes.toFixed(1)}</td>
                      <td style={{ fontWeight: 600 }}>{call.inboundAvgDuration.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Export Centre (PDF + Excel Exports) */}
      {activeSection === "exec-export" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <section className="card" style={{ padding: "2rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800 }}>
                <i className="fa-solid fa-file-export" style={{ color: "var(--primary)" }}></i> Operations Export & PDF Centre
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: "0.3rem" }}>
                Generate official operation reports as high-fidelity PDF documents or export raw CRM metrics into CSV/Excel files.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
              {/* PDF Column */}
              <div style={{ border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <i className="fa-solid fa-file-pdf" style={{ fontSize: "1.5rem", color: "var(--danger)" }}></i>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Print Operations Summary (PDF)</h3>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", minHeight: "60px" }}>
                  Format the current workspace metrics including GHL transitions, activity Gantts, and sprint reports as an landscape operations PDF doc.
                </p>
                <button className="btn-primary-small" onClick={handlePrint} style={{ alignSelf: "flex-start", padding: "0.6rem 1.25rem" }}>
                  <i className="fa-solid fa-print"></i> Generate PDF Document
                </button>
              </div>

              {/* Excel Column */}
              <div style={{ border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <i className="fa-solid fa-file-excel" style={{ fontSize: "1.5rem", color: "var(--success)" }}></i>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Export Spreadsheets (Excel / CSV)</h3>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", minHeight: "60px" }}>
                  Download complete spreadsheets of each table compiled directly from GHL audit records and standard phone report CSVs.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button className="btn-primary-small" onClick={handleExportTable1} style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", background: "rgba(113, 167, 88, 0.1)", color: "var(--success)", border: "1px solid rgba(113, 167, 88, 0.2)" }}>
                    <i className="fa-solid fa-download"></i> Download Table 1 (Agent Conversion)
                  </button>
                  <button className="btn-primary-small" onClick={handleExportTable2} style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", background: "rgba(113, 167, 88, 0.1)", color: "var(--success)", border: "1px solid rgba(113, 167, 88, 0.2)" }}>
                    <i className="fa-solid fa-download"></i> Download Table 2 (Lead Sprints)
                  </button>
                  <button className="btn-primary-small" onClick={handleExportTable3} style={{ textAlign: "left", width: "100%", justifyContent: "flex-start", background: "rgba(113, 167, 88, 0.1)", color: "var(--success)", border: "1px solid rgba(113, 167, 88, 0.2)" }}>
                    <i className="fa-solid fa-download"></i> Download Table 3 (Call Analytics)
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
