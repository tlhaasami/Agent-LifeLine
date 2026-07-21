"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CustomDatePicker from "@/components/CustomDatePicker";
import { parseCSV } from "@/utils/csvParser";
import { processAgentData } from "@/utils/analysisEngine";

export default function UploadDataPage() {
  const [theme, setTheme] = useState("dark");
  const [reportDate, setReportDate] = useState(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const year = yesterday.getUTCFullYear();
    const month = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [timezone, setTimezone] = useState("BST");
  const [syncConversations, setSyncConversations] = useState(false);
  const [ghlToken, setGhlToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  
  // Files states
  const [auditFiles, setAuditFiles] = useState([]);
  const [oppsFile, setOppsFile] = useState(null);
  const [callsFile, setCallsFile] = useState(null);
  const [newLeadsFile, setNewLeadsFile] = useState(null);
  const [bookedLeadsFile, setBookedLeadsFile] = useState(null);
  const [apptLeadsFile, setApptLeadsFile] = useState(null);
  const [closedLeadsFile, setClosedLeadsFile] = useState(null);

  const [uploadMode, setUploadMode] = useState("bulk"); // 'bulk' or 'single'
  const [processStatus, setProcessStatus] = useState("");
  const [processingState, setProcessingState] = useState(null);

  // Load theme and GHL configurations on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "light";
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
      } else {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
      }

      setGhlToken(localStorage.getItem("ghl_token") || "");
      setGhlLocationId(localStorage.getItem("ghl_location_id") || "");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    } else {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    }
  };

  const handleGhlTokenChange = (val) => {
    setGhlToken(val);
    localStorage.setItem("ghl_token", val);
  };

  const handleGhlLocationChange = (val) => {
    setGhlLocationId(val);
    localStorage.setItem("ghl_location_id", val);
  };

  const readFileText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleBulkFiles = (e) => {
    const files = Array.from(e.target.files);
    const identifiedAudits = [];
    let identifiedOpps = oppsFile;
    let identifiedCalls = callsFile;
    let identifiedNew = newLeadsFile;
    let identifiedBooked = bookedLeadsFile;
    let identifiedAppt = apptLeadsFile;
    let identifiedClosed = closedLeadsFile;

    files.forEach((file) => {
      const name = file.name.toLowerCase();
      if (name.includes("opportunity") || name.includes("opportunities") || name.includes("margin")) {
        identifiedOpps = file;
      } else if (
        name.includes("call-report") ||
        name.includes("call report") ||
        name.includes("call_report") ||
        name.includes("call logs") ||
        name.includes("call log")
      ) {
        identifiedCalls = file;
      } else if (name.includes("new leads") || name.includes("new_leads")) {
        identifiedNew = file;
      } else if (
        name.includes("appointment booked") ||
        name.includes("appt booked") ||
        name.includes("appointment_booked")
      ) {
        identifiedAppt = file;
      } else if (
        name.includes("booked leads") ||
        name.includes("booked_leads") ||
        name.includes("booked")
      ) {
        if (!name.includes("appointment")) {
          identifiedBooked = file;
        }
      } else if (name.includes("closed leads") || name.includes("closed_leads")) {
        identifiedClosed = file;
      } else {
        identifiedAudits.push(file);
      }
    });

    if (identifiedAudits.length > 0) setAuditFiles(identifiedAudits);
    if (identifiedOpps) setOppsFile(identifiedOpps);
    if (identifiedCalls) setCallsFile(identifiedCalls);
    if (identifiedNew) setNewLeadsFile(identifiedNew);
    if (identifiedBooked) setBookedLeadsFile(identifiedBooked);
    if (identifiedAppt) setApptLeadsFile(identifiedAppt);
    if (identifiedClosed) setClosedLeadsFile(identifiedClosed);
  };

  // Live GHL API fetch helper
  const fetchGhlOutboundMessages = async (targetDate, token, locationId, tz = "BST") => {
    try {
      const usersRes = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/users/",
          token,
          params: { locationId }
        })
      });
      const usersData = await usersRes.json();
      if (usersData.error) throw new Error(usersData.error);
      const userMap = {};
      if (usersData.users) {
        usersData.users.forEach(u => {
          userMap[u.id] = u.name;
        });
      }

      const outboundMsgs = [];
      let currentStartAfterDate = null;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < 5) {
        pageCount++;
        const params = {
          locationId,
          limit: 20,
          status: "all",
          sortBy: "last_message_date",
          sort: "desc"
        };
        if (currentStartAfterDate) {
          params.startAfterDate = currentStartAfterDate;
        }

        const convRes = await fetch("/api/ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: "/conversations/search",
            token,
            params
          })
        });
        const convData = await convRes.json();
        if (convData.error) throw new Error(convData.error);
        if (!convData.conversations || convData.conversations.length === 0) {
          break;
        }

        for (const c of convData.conversations) {
          const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
          if (!lastMsgDate) continue;

          // Check if message date lies in target date YYYY-MM-DD
          const msgDateObj = new Date(lastMsgDate);
          const formattedMsgDate = msgDateObj.toISOString().split("T")[0]; // UTC simple
          
          if (formattedMsgDate === targetDate) {
            // Fetch messages in this conversation
            const msgRes = await fetch("/api/ghl", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: `/conversations/${c.id}/messages`,
                token,
                params: { limit: 50 }
              })
            });
            const msgData = await msgRes.json();
            if (msgData.messages && msgData.messages.messages) {
              const list = msgData.messages.messages
                .filter(m => m.direction === "outbound" && m.type === "message")
                .map(m => {
                  const time = new Date(m.dateAdded).toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" });
                  return {
                    id: m.id,
                    body: m.body || "",
                    direction: "outbound",
                    timestamp: time
                  };
                });
              if (list.length > 0) {
                outboundMsgs.push({
                  agentName: userMap[c.userId] || "GHL Agent",
                  fullName: c.contactName || "Contact",
                  messages: list
                });
              }
            }
          }
        }

        if (convData.conversations.length < 20) {
          hasMore = false;
        } else {
          const lastConv = convData.conversations[convData.conversations.length - 1];
          currentStartAfterDate = lastConv.dateUpdated || lastConv.dateCreated;
        }
      }
      return outboundMsgs;
    } catch (e) {
      console.error("Failed to load GHL messages", e);
      return [];
    }
  };

  const processUploadedFiles = async () => {
    if (auditFiles.length === 0) return;

    const steps = [
      { id: "read-audit", name: `Parsing ${auditFiles.length} GHL Agent Log file(s)`, status: "processing" },
      { id: "read-opps", name: "Parsing CRM Opportunities Master", status: "pending" },
      { id: "read-calls", name: "Parsing Call Report Logs", status: "pending" },
      { id: "read-segments", name: "Parsing Lead Segmentation files", status: "pending" },
      { id: "compile", name: "Compiling CSV metrics & activity logs", status: "pending" },
      { id: "ghl-sync", name: "Syncing outbound conversations & calls from GHL API", status: "pending" },
      { id: "build-dashboard", name: "Generating dashboard charts & unified JSON", status: "pending" },
      { id: "github-sync", name: "Uploading compiled JSON to private GitHub repo", status: "pending" }
    ];

    setProcessingState({
      steps,
      progressPercent: 5,
    });

    try {
      // Step 1: Read Audit Logs
      await new Promise(resolve => setTimeout(resolve, 300));
      const auditRows = [];
      for (const file of auditFiles) {
        const text = await readFileText(file);
        const rows = parseCSV(text);
        auditRows.push(...rows);
      }

      steps[0].status = "done";
      steps[1].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 15 });

      // Step 2: Read Opportunities Master
      let oppsRows = [];
      if (oppsFile) {
        const text = await readFileText(oppsFile);
        oppsRows = parseCSV(text);
      }

      steps[1].status = "done";
      steps[2].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 30 });

      // Step 3: Read Call report
      let callsRows = [];
      if (callsFile) {
        const text = await readFileText(callsFile);
        callsRows = parseCSV(text);
      }

      steps[2].status = "done";
      steps[3].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 45 });

      // Step 4: Lead segmentations
      let newLeadsRows = [];
      if (newLeadsFile) {
        const text = await readFileText(newLeadsFile);
        newLeadsRows = parseCSV(text);
      }

      let bookedRows = [];
      if (bookedLeadsFile) {
        const text = await readFileText(bookedLeadsFile);
        bookedRows = parseCSV(text);
      }

      let apptRows = [];
      if (apptLeadsFile) {
        const text = await readFileText(apptLeadsFile);
        apptRows = parseCSV(text);
      }

      let closedRows = [];
      if (closedLeadsFile) {
        const text = await readFileText(closedLeadsFile);
        closedRows = parseCSV(text);
      }

      steps[3].status = "done";
      steps[4].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 60 });

      // Step 5: BST Alignment & compile data
      const isMarginOnly = oppsFile && oppsFile.name.toLowerCase().includes("margin");
      const processed = processAgentData(
        auditRows,
        oppsRows,
        callsRows,
        newLeadsRows,
        bookedRows,
        apptRows,
        closedRows,
        reportDate,
        30,
        5,
        timezone,
        isMarginOnly
      );

      steps[4].status = "done";
      steps[5].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 75 });

      // Step 6: Fetch GHL Outbound Messages
      let msgList = [];
      if (syncConversations && ghlToken && ghlLocationId) {
        setProcessStatus("Fetching live GHL conversations & outbound messages...");
        msgList = await fetchGhlOutboundMessages(reportDate, ghlToken, ghlLocationId, timezone);
      }

      steps[5].status = "done";
      steps[6].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 85 });

      // Step 7: Build dashboard object
      steps[6].status = "done";
      steps[7].status = "processing";
      setProcessingState({ steps: [...steps], progressPercent: 95 });

      // Step 8: Upload backup to GitHub Private Repo (Always upload on compile)
      setProcessStatus("Uploading backup to GitHub repository...");
      
      // Check if file exists to warn/confirm overwrite
      const checkRes = await fetch(`/api/backup?date=${reportDate}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.exists) {
          const overwrite = window.confirm(
            `A backup file for ${reportDate} already exists in your GitHub repository.\n\nDo you want to overwrite it?`
          );
          if (!overwrite) {
            setProcessingState(null);
            setProcessStatus("");
            return; // Abort
          }
        }
      }

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: processed,
          date: reportDate
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `GitHub Backup failed (${res.status})`);
      }

      steps[7].status = "done";
      setProcessingState({
        steps: [...steps],
        progressPercent: 100
      });

      await new Promise(resolve => setTimeout(resolve, 800));
      setProcessingState(null);
      setProcessStatus("");
      alert(`Successfully processed and saved backup to GitHub for date: ${reportDate}`);

      // Redirect to main dashboard page with target date parameter
      window.location.href = `/?date=${reportDate}`;
    } catch (err) {
      console.error(err);
      const activeStep = steps.find(s => s.status === "processing");
      if (activeStep) activeStep.status = "error";
      setProcessingState(prev => prev ? { ...prev, error: err.message } : null);
      setProcessStatus("");
    }
  };

  return (
    <div className="upload-layout" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-color)" }}>
      <header style={{ borderBottom: "1px solid var(--card-border)", padding: "1.2rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, backgroundColor: "var(--bg-color)", marginTop: 0, paddingTop: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <img src="/logo.png" alt="LifeLine Logo" style={{ height: "30px", width: "auto" }} />
          <h2 style={{ margin: 0, fontSize: "1.4rem" }}>LifeLine Onboarding Portal</h2>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/" className="btn-primary-small" style={{ textDecoration: "none", backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-primary)", border: "1px solid var(--card-border)" }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
          </Link>
          <button id="theme-toggle" className="btn-theme" onClick={toggleTheme}>
            <i className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}></i>
          </button>
        </div>
      </header>

      <main className="upload-main-area" style={{ padding: "3rem 2.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%", flex: 1 }}>
        <section className="card" style={{ padding: "2.5rem" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 800 }}>
              <i className="fa-solid fa-cloud-arrow-up" style={{ color: "var(--primary)" }}></i> Daily Datasets Onboarding
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.4rem" }}>
              Upload your CRM report files to standardize timezone conversions and generate dashboard metrics.
            </p>
          </div>

          {/* GoHighLevel API Integration & Report Date Configuration */}
          <div
            style={{
              background: "var(--card-bg, rgba(209, 92, 46, 0.04))",
              border: "2px solid var(--card-border, #e5e7eb)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
              borderRadius: "14px",
              padding: "2rem",
              marginBottom: "2.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
          >
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <i className="fa-regular fa-calendar-check" style={{ color: "var(--primary)" }}></i> Workspace & Date Configuration
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
              Configure your workspace target date and GoHighLevel credentials. Changing the date will automatically filter and sync activity logs and conversations.
            </p>

            {/* Row 1: Target Report Date, Target Timezone, Live API Sync */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginTop: "0.2rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Target Report Date
                </label>
                <CustomDatePicker
                  value={reportDate}
                  onChange={(val) => setReportDate(val)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Target Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="BST">British Summer Time (BST, UTC+1)</option>
                  <option value="PKT">Pakistan Standard Time (PKT, UTC+5)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Live API Sync
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", height: "38px" }}>
                  <input
                    type="checkbox"
                    id="sync-conversations-checkbox"
                    checked={syncConversations}
                    onChange={(e) => setSyncConversations(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--primary)" }}
                  />
                  <label htmlFor="sync-conversations-checkbox" style={{ fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer", userSelect: "none" }}>
                    Pull live chat messages
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2: Location ID, Private Integration Key */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Location ID
                </label>
                <input
                  type="text"
                  value={ghlLocationId}
                  onChange={(e) => handleGhlLocationChange(e.target.value)}
                  placeholder="e.g. gCr3FJTylSWPTvuQjR6V"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
                  Private Integration Key
                </label>
                <input
                  type="password"
                  value={ghlToken}
                  onChange={(e) => handleGhlTokenChange(e.target.value)}
                  placeholder="pit-xxxxxx..."
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: "flex", gap: "1.25rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1.25rem" }}>
            <button
              onClick={() => setUploadMode("bulk")}
              style={{
                background: uploadMode === "bulk" ? "var(--primary)" : "transparent",
                color: uploadMode === "bulk" ? "white" : "var(--text-secondary)",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                border: uploadMode === "bulk" ? "none" : "1px solid var(--card-border)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: uploadMode === "bulk" ? "0 4px 12px var(--primary-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease"
              }}
            >
              <i className="fa-solid fa-folder-open"></i> Bulk Upload
            </button>
            <button
              onClick={() => setUploadMode("single")}
              style={{
                background: uploadMode === "single" ? "var(--primary)" : "transparent",
                color: uploadMode === "single" ? "white" : "var(--text-secondary)",
                padding: "0.65rem 1.5rem",
                borderRadius: "8px",
                border: uploadMode === "single" ? "none" : "1px solid var(--card-border)",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: uploadMode === "single" ? "0 4px 12px var(--primary-glow)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease"
              }}
            >
              <i className="fa-solid fa-file-csv"></i> Single Uploads
            </button>
          </div>

          {/* Bulk All-in-One Upload Area */}
          {uploadMode === "bulk" && (
            <div
              style={{
                border: "2px dashed var(--primary)",
                borderRadius: "12px",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                background: "rgba(209, 92, 46, 0.03)",
                marginBottom: "1.5rem",
              }}
            >
              <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: "var(--primary)" }}></i>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>All-in-One Bulk Document Upload</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 auto", maxWidth: "600px" }}>
                Select or drag all your CRM documents at once. We'll automatically identify opportunities, calls, audit logs, and lead segmentations!
              </p>
              <input
                type="file"
                multiple
                accept=".csv"
                onChange={handleBulkFiles}
                style={{ display: "none" }}
                id="bulk-file-upload-input"
              />
              <label
                htmlFor="bulk-file-upload-input"
                className="btn-primary-small"
                style={{ alignSelf: "center", marginTop: "0.5rem", padding: "0.65rem 1.5rem", cursor: "pointer", fontSize: "0.88rem" }}
              >
                <i className="fa-solid fa-plus"></i> Select All Files At Once
              </label>
            </div>
          )}

          {/* Single Uploads Section */}
          {uploadMode === "single" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "1.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "1.25rem", color: "var(--text-primary)" }}>
                  Upload Files Individually
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {/* 1. GHL Logs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      1. GHL Audit Logs (multiple):
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        multiple
                        accept=".csv"
                        onChange={(e) => setAuditFiles(Array.from(e.target.files))}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--primary)" }}>
                        <i className="fa-solid fa-file-csv"></i>{" "}
                        {auditFiles.length > 0 ? `${auditFiles.length} logs chosen` : "Choose Audit Logs..."}
                      </div>
                    </div>
                  </div>

                  {/* 2. Opportunities */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      2. Opportunities Database:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setOppsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--info)" }}>
                        <i className="fa-solid fa-database"></i>{" "}
                        {oppsFile ? oppsFile.name : "Choose Opportunities..."}
                      </div>
                    </div>
                  </div>

                  {/* 3. Call Logs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      3. Call Report Log:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCallsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--warning)" }}>
                        <i className="fa-solid fa-phone"></i>{" "}
                        {callsFile ? callsFile.name : "Choose Call Report..."}
                      </div>
                    </div>
                  </div>

                  {/* 4. New Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      4. New Leads Segmentation:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setNewLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--info)" }}>
                        <i className="fa-solid fa-user-plus"></i>{" "}
                        {newLeadsFile ? newLeadsFile.name : "Choose New Leads..."}
                      </div>
                    </div>
                  </div>

                  {/* 5. Booked Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      5. Booked Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBookedLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--success)" }}>
                        <i className="fa-solid fa-calendar-check"></i>{" "}
                        {bookedLeadsFile ? bookedLeadsFile.name : "Choose Booked..."}
                      </div>
                    </div>
                  </div>

                  {/* 6. Appt Booked Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      6. Appt Booked Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setApptLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--warning)" }}>
                        <i className="fa-solid fa-calendar-days"></i>{" "}
                        {apptLeadsFile ? apptLeadsFile.name : "Choose Appt Booked..."}
                      </div>
                    </div>
                  </div>

                  {/* 7. Closed Leads */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      7. Closed Leads:
                    </label>
                    <div className="custom-file-input-wrapper">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setClosedLeadsFile(e.target.files[0] || null)}
                      />
                      <div className="custom-file-label" style={{ borderLeft: "3px solid var(--danger)" }}>
                        <i className="fa-solid fa-circle-xmark"></i>{" "}
                        {closedLeadsFile ? closedLeadsFile.name : "Choose Closed..."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Identified Summary Status */}
          {(auditFiles.length > 0 || oppsFile || callsFile || newLeadsFile || bookedLeadsFile || apptLeadsFile || closedLeadsFile) && (
            <div
              style={{
                background: "var(--bg-color)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                padding: "1.2rem 1.5rem",
                fontSize: "0.82rem",
                marginBottom: "1.5rem",
              }}
            >
              <h4 style={{ fontWeight: 700, marginBottom: "0.6rem" }}>
                <i className="fa-solid fa-circle-info"></i> Mapped Bulk Files:
              </h4>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem", listStyle: "none", padding: 0 }}>
                <li>
                  GHL Agent Logs:{" "}
                  <strong style={{ color: auditFiles.length > 0 ? "var(--success)" : "var(--text-secondary)" }}>
                    {auditFiles.length > 0 ? `✓ ${auditFiles.length} files` : "Missing"}
                  </strong>
                </li>
                <li>
                  Opportunities Master:{" "}
                  <strong style={{ color: oppsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {oppsFile ? `✓ ${oppsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Call Report Log:{" "}
                  <strong style={{ color: callsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {callsFile ? `✓ ${callsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  New Leads Segmentation:{" "}
                  <strong style={{ color: newLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {newLeadsFile ? `✓ ${newLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Booked Leads:{" "}
                  <strong style={{ color: bookedLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {bookedLeadsFile ? `✓ ${bookedLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Appt Booked Leads:{" "}
                  <strong style={{ color: apptLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {apptLeadsFile ? `✓ ${apptLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
                <li>
                  Closed Leads:{" "}
                  <strong style={{ color: closedLeadsFile ? "var(--success)" : "var(--text-secondary)" }}>
                    {closedLeadsFile ? `✓ ${closedLeadsFile.name}` : "Missing"}
                  </strong>
                </li>
              </ul>
            </div>
          )}

          {/* Trigger options */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
              borderTop: "1px solid var(--card-border)",
              paddingTop: "1.5rem",
            }}
          >
            <button
              className="btn-primary-small"
              onClick={processUploadedFiles}
              disabled={auditFiles.length === 0}
              style={{
                opacity: auditFiles.length === 0 ? 0.5 : 1,
                cursor: auditFiles.length === 0 ? "not-allowed" : "pointer",
                padding: "0.65rem 2rem",
                fontSize: "0.9rem",
              }}
            >
              <i className="fa-solid fa-gears"></i> Process and Compile Workspace
            </button>

            {processStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.95rem" }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "var(--primary)" }}></i>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{processStatus}</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Progress Loader Overlay */}
      {processingState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "550px",
              padding: "2rem",
              textAlign: "left",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
              margin: "0 1rem"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Compiling Datasets...</span>
              <span style={{ color: "var(--primary)" }}>{processingState.progressPercent}%</span>
            </h3>

            {/* Progress Bar Container */}
            <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${processingState.progressPercent}%`,
                  height: "100%",
                  background: "var(--primary)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>

            {/* Error Message */}
            {processingState.error && (
              <div style={{ padding: "0.8rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--danger)", borderRadius: "6px", fontSize: "0.85rem", wordBreak: "break-all" }}>
                <strong>Error:</strong> {processingState.error}
                <button className="btn-primary-small" onClick={() => setProcessingState(null)} style={{ marginTop: "0.5rem", display: "block", backgroundColor: "var(--danger)", color: "white" }}>Close</button>
              </div>
            )}

            {/* Steps list */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {processingState.steps.map((step, idx) => (
                <li key={step.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", opacity: step.status === "pending" ? 0.4 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    {step.status === "pending" && <i className="fa-regular fa-circle" style={{ color: "var(--text-secondary)" }}></i>}
                    {step.status === "processing" && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "var(--primary)" }}></i>}
                    {step.status === "done" && <i className="fa-solid fa-circle-check" style={{ color: "var(--success)" }}></i>}
                    {step.status === "error" && <i className="fa-solid fa-circle-xmark" style={{ color: "var(--danger)" }}></i>}
                    <span>{step.name}</span>
                  </div>
                  <span style={{ fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 700, color: step.status === "done" ? "var(--success)" : step.status === "processing" ? "var(--primary)" : "var(--text-secondary)" }}>
                    {step.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
