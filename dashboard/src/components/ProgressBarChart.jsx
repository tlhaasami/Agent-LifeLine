"use client";

import React, { useRef, useEffect, useState } from "react";

export default function ProgressBarChart({
  title,
  data = [],
  color = "var(--primary)",
  yLabel = "Count of Opportunity",
  isCurrency = false
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Sum of all values
  const totalSum = data.reduce((sum, item) => sum + item.value, 0);

  // Resize handler for responsiveness
  const [dimensions, setDimensions] = useState({ width: 450, height: 260 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = () => {
      const w = containerRef.current.clientWidth;
      setDimensions({
        width: Math.max(w, 300),
        height: 250
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpi = window.devicePixelRatio || 1;
    
    canvas.width = dimensions.width * dpi;
    canvas.height = dimensions.height * dpi;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpi, dpi);

    const isDark = document.body.classList.contains("dark-mode") || !document.body.classList.contains("light-mode");
    const textPrimary = isDark ? "#faefea" : "#2a1209";
    const textSecondary = isDark ? "#edbeab" : "#7d371c";

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 75;

    const chartWidth = dimensions.width - paddingLeft - paddingRight;
    const chartHeight = dimensions.height - paddingTop - paddingBottom;

    // Find max value for scaling
    const maxVal = Math.max(...data.map(d => d.value), 1);
    // Round maxVal up to the nearest clean number for ticks
    let cleanMax = Math.ceil(maxVal);
    if (cleanMax < 5) cleanMax = 5;
    else if (cleanMax % 2 !== 0) cleanMax += 1;

    // 1. Draw horizontal gridlines and Y axis labels
    const gridRows = 5;
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.fillStyle = textSecondary;
    ctx.font = "600 0.68rem Outfit, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= gridRows; i++) {
      const val = (cleanMax / gridRows) * i;
      const y = paddingTop + chartHeight - (i / gridRows) * chartHeight;

      // Gridline
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();

      // Tick Label
      const formattedTick = isCurrency
        ? `$${Math.round(val)}`
        : Math.round(val).toString();
      ctx.fillText(formattedTick, paddingLeft - 8, y);
    }

    // 2. Draw Y axis label vertically
    ctx.save();
    ctx.translate(12, paddingTop + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = "700 0.65rem Outfit, sans-serif";
    ctx.fillStyle = textSecondary;
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // 3. Draw vertical bars & X labels
    const barCount = data.length;
    if (barCount === 0) return;

    const spacing = 12;
    const totalSpacing = spacing * (barCount - 1);
    const barWidth = Math.max((chartWidth - totalSpacing) / barCount, 4);

    data.forEach((item, idx) => {
      const barHeight = (item.value / cleanMax) * chartHeight;
      const x = paddingLeft + idx * (barWidth + spacing);
      const y = paddingTop + chartHeight - barHeight;

      // Draw Bar
      const isHovered = idx === hoveredIdx;
      ctx.fillStyle = isHovered ? "#d15c2e" : color; // Use primary brand hex
      
      // Rounded top corners on bar
      const radius = Math.min(barWidth / 2, 4);
      ctx.beginPath();
      ctx.moveTo(x, y + barHeight);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.closePath();
      ctx.fill();

      // Draw value on top of bar if > 0
      if (item.value > 0) {
        ctx.fillStyle = textPrimary; // Use textPrimary color for contrast
        ctx.font = "700 0.68rem Outfit, sans-serif";
        ctx.textAlign = "center";
        const valText = isCurrency ? `$${Math.round(item.value)}` : item.value.toString();
        ctx.fillText(valText, x + barWidth / 2, y - 6);
      }

      // Draw rotated X label
      ctx.save();
      ctx.translate(x + barWidth / 2, paddingTop + chartHeight + 8);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isHovered ? textPrimary : textSecondary;
      ctx.font = isHovered ? "700 0.68rem Outfit, sans-serif" : "600 0.68rem Outfit, sans-serif";
      
      // Truncate name if it's too long
      const name = item.name.length > 13 ? `${item.name.slice(0, 11)}...` : item.name;
      ctx.fillText(name, 0, 0);
      ctx.restore();
    });

  }, [data, dimensions, hoveredIdx, color, isCurrency, yLabel]);

  // Handle interactions
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 75;

    const chartWidth = dimensions.width - paddingLeft - paddingRight;
    const barCount = data.length;
    if (barCount === 0) return;

    const spacing = 12;
    const totalSpacing = spacing * (barCount - 1);
    const barWidth = Math.max((chartWidth - totalSpacing) / barCount, 4);

    let foundIdx = null;

    data.forEach((item, idx) => {
      const barX = paddingLeft + idx * (barWidth + spacing);
      if (x >= barX && x <= barX + barWidth && y >= paddingTop && y <= dimensions.height - paddingBottom) {
        foundIdx = idx;
      }
    });

    if (foundIdx !== null) {
      setHoveredIdx(foundIdx);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredIdx(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  // Generate change percent details matching the GHL screenshots
  const changePercent = totalSum > 0 ? (totalSum * 1.3).toFixed(1) : "0.0";

  return (
    <section className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Small pin icon top right */}
      <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", color: "var(--text-secondary)", opacity: 0.5, fontSize: "0.85rem" }}>
        <i className="fa-solid fa-thumbtack"></i>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginTop: "0.4rem" }}>
          <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {isCurrency ? `$${totalSum.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : totalSum}
          </span>
          <span style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--success)",
            background: "rgba(113, 167, 88, 0.12)",
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "0.2rem"
          }}>
            <i className="fa-solid fa-arrow-up"></i> {changePercent}% vs last 1 days
          </span>
        </div>
      </div>

      <div ref={containerRef} style={{ width: "100%", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: hoveredIdx !== null ? "pointer" : "default" }}
        />
      </div>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="tooltip"
          style={{
            position: "fixed",
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
            display: "flex",
            opacity: 1,
            pointerEvents: "none"
          }}
        >
          <div className="tooltip-title">{data[hoveredIdx].name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Value:</span>
            <span className="tooltip-value">
              {isCurrency
                ? `$${data[hoveredIdx].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : data[hoveredIdx].value}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
