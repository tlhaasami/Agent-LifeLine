// App JavaScript - Agent Performance Hub & Interactive Dashboard

document.addEventListener('DOMContentLoaded', () => {
    let rawData = {};
    let agentsList = [];
    let selectedAgent = null;
    let judgmentAgent = null;
    
    // Hover states
    let hoveredElement = null; // { agent, type, data, x, y }
    let hoveredJudgElement = null; // { type, data, x, y }
    
    let currentSort = { column: 'name', ascending: true };
    let searchQuery = '';

    // Color definitions
    const colors = {
        active: '#10b981',      // Success Green
        activeHover: '#059669',
        break: '#f59e0b',       // Warning Orange
        breakHover: '#d97706',
        primary: '#4f46e5',     // Indigo
        accent: '#8b5cf6',      // Violet/Purple
        info: '#0ea5e9',        // Info Blue
        danger: '#ef4444',      // Red
        chartColors: ['#4f46e5', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
    };

    // Canvas settings for Team Timeline
    const teamCanvas = document.getElementById('timeline-canvas');
    const teamCtx = teamCanvas.getContext('2d');
    const teamTimelineContainer = document.getElementById('timeline-canvas-container');

    // Canvas settings for Single Agent Judgment Timeline
    const judgCanvas = document.getElementById('judgment-timeline-canvas');
    const judgCtx = judgCanvas.getContext('2d');
    const judgTimelineContainer = document.getElementById('judgment-canvas-container');

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const agentTableBody = document.getElementById('agent-table-body');
    const themeToggle = document.getElementById('theme-toggle');
    const tooltip = document.getElementById('tooltip');

    // Details Panel Elements (Team Tab)
    const detailsPanel = document.getElementById('details-panel');
    const detailsDefault = document.getElementById('details-default-state');
    const detailsActive = document.getElementById('details-active-state');
    const closeInspectBtn = document.getElementById('close-inspect');

    // Tab Navigation Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Judgment Workspace Elements
    const agentSelect = document.getElementById('judgment-agent-select');
    const auditorNotes = document.getElementById('auditor-notes');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const notesStatus = document.getElementById('notes-status');

    // Time boundaries (default to full 24-hour day of July 17, 2026 UTC)
    let teamMinTime = new Date(Date.UTC(2026, 6, 17, 0, 0, 0));
    let teamMaxTime = new Date(Date.UTC(2026, 6, 17, 24, 0, 0));
    let judgMinTime = new Date(Date.UTC(2026, 6, 17, 0, 0, 0));
    let judgMaxTime = new Date(Date.UTC(2026, 6, 17, 24, 0, 0));

    // 1. Fetch JSON Data
    fetch('output/agent_analysis_data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load JSON data');
            }
            return response.json();
        })
        .then(data => {
            rawData = data;
            // Parse agent records
            agentsList = Object.entries(rawData).map(([name, stats]) => {
                return {
                    name,
                    actions: stats.total_actions,
                    opps: stats.assigned_opportunities,
                    span: stats.workday_span,
                    active: stats.active_duration,
                    breaks: stats.breaks.length,
                    firstAction: new Date(stats.first_action),
                    lastAction: new Date(stats.last_action),
                    breakDuration: stats.total_break_duration,
                    calls: stats.calls || [],
                    details: stats
                };
            }).sort((a, b) => b.actions - a.actions);

            initializeDashboard();
        })
        .catch(err => {
            console.error('Error loading data:', err);
            document.body.innerHTML = `
                <div style="padding: 3rem; text-align: center; font-family: sans-serif;">
                    <h2 style="color: #ef4444;">Error Loading Dashboard Data</h2>
                    <p style="margin-top: 1rem; color: #64748b;">Make sure to run the python script first to generate output/agent_analysis_data.json</p>
                </div>
            `;
        });

    // 2. Initialize Dashboard View
    function initializeDashboard() {
        calculateKPIs();
        renderTable();
        
        // Setup dropdown agents
        populateAgentSelect();
        
        // Setup global timelines boundaries
        setupTimelineCanvasBoundaries();
        
        // Draw team chart
        resizeTeamCanvas();
        drawTeamTimeline();
        
        // Set default judgment agent
        if (agentsList.length > 0) {
            selectJudgmentAgent(agentsList[0].name);
        }

        setupEventListeners();
    }

    // 3. Populate Agent Selector for Judgment Workspace
    function populateAgentSelect() {
        agentSelect.innerHTML = '';
        agentsList.forEach(agent => {
            const opt = document.createElement('option');
            opt.value = agent.name;
            opt.textContent = `${agent.name} (${agent.actions} actions, ${agent.calls.length} calls)`;
            agentSelect.appendChild(opt);
        });
    }

    // 4. Calculate Overall KPIs
    function calculateKPIs() {
        document.getElementById('val-total-agents').textContent = agentsList.length;
        
        // Most Active Agent
        const topAgent = agentsList.reduce((max, agent) => agent.actions > max.actions ? agent : max, agentsList[0]);
        document.getElementById('val-most-active').textContent = topAgent.name;
        document.getElementById('sub-most-active').textContent = `${topAgent.actions} GHL Actions`;

        // Total Actions
        const totalActions = agentsList.reduce((sum, agent) => sum + agent.actions, 0);
        document.getElementById('val-total-actions').textContent = totalActions;

        // Average Active Duration
        const totalActiveSecs = agentsList.reduce((sum, agent) => sum + agent.active, 0);
        const avgActiveSecs = totalActiveSecs / agentsList.length;
        document.getElementById('val-avg-active').textContent = formatSecondsToTime(avgActiveSecs);
    }

    // 5. Setup Event Listeners
    function setupEventListeners() {
        // Tab switching
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Toggle tab button states
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Toggle content panels
                tabContents.forEach(content => {
                    if (content.id === targetTab) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                });

                // Redraw canvases when switching tabs
                if (targetTab === 'team-summary-tab') {
                    resizeTeamCanvas();
                    drawTeamTimeline();
                } else if (targetTab === 'agent-judgment-tab') {
                    resizeJudgmentCanvas();
                    drawJudgmentTimeline();
                }
                
                tooltip.classList.add('hidden');
            });
        });

        // Search Filter (Team Overview Tab)
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderTable();
            resizeTeamCanvas();
            drawTeamTimeline();
        });

        // Table Column Sorting (Team Overview Tab)
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                if (currentSort.column === column) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.column = column;
                    currentSort.ascending = true;
                }

                // Update sort arrows
                document.querySelectorAll('th.sortable').forEach(header => {
                    const arrow = header.querySelector('i');
                    if (header === th) {
                        arrow.className = currentSort.ascending ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                        header.className = 'sortable ' + (currentSort.ascending ? 'sorted-asc' : 'sorted-desc');
                    } else {
                        arrow.className = 'fa-solid fa-sort';
                        header.className = 'sortable';
                    }
                });

                renderTable();
            });
        });

        // Close Inspector panel (Team Tab)
        closeInspectBtn.addEventListener('click', () => {
            deselectAgent();
        });

        // Selector for Judgment Agent Workspace
        agentSelect.addEventListener('change', (e) => {
            selectJudgmentAgent(e.target.value);
        });

        // Notes Saver
        saveNotesBtn.addEventListener('click', () => {
            if (judgmentAgent) {
                localStorage.setItem(`audit_notes_${judgmentAgent.name}`, auditorNotes.value);
                notesStatus.className = 'status-msg success';
                notesStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Notes Saved!';
                notesStatus.style.opacity = 1;
                setTimeout(() => { 
                    notesStatus.style.opacity = 0; 
                    setTimeout(() => { notesStatus.innerHTML = ''; }, 300); 
                }, 2000);
            }
        });

        // Theme Toggle
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode', !isDark);
            themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
            
            // Redraw everything
            drawTeamTimeline();
            drawJudgmentTimeline();
            
            if (selectedAgent) {
                renderAgentCharts(selectedAgent);
            }
            if (judgmentAgent) {
                renderJudgmentCharts(judgmentAgent);
            }
        });
    }

    // 6. Render Team Overview Comparison Table
    function renderTable() {
        let filtered = agentsList.filter(agent => agent.name.toLowerCase().includes(searchQuery));

        // Sort agents
        filtered.sort((a, b) => {
            let valA, valB;
            switch(currentSort.column) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 'actions':
                    valA = a.actions;
                    valB = b.actions;
                    break;
                case 'opps':
                    valA = a.opps;
                    valB = b.opps;
                    break;
                case 'span':
                    valA = a.span;
                    valB = b.span;
                    break;
                case 'active':
                    valA = a.active;
                    valB = b.active;
                    break;
                case 'breaks':
                    valA = a.breaks;
                    valB = b.breaks;
                    break;
                default:
                    valA = a.name;
                    valB = b.name;
            }

            if (valA < valB) return currentSort.ascending ? -1 : 1;
            if (valA > valB) return currentSort.ascending ? 1 : -1;
            return 0;
        });

        // Build Table Rows
        agentTableBody.innerHTML = '';
        filtered.forEach(agent => {
            const tr = document.createElement('tr');
            if (selectedAgent && selectedAgent.name === agent.name) {
                tr.className = 'selected';
            }

            tr.innerHTML = `
                <td>${agent.name}</td>
                <td style="font-weight: 700; color: var(--primary);">${agent.actions}</td>
                <td>${agent.opps}</td>
                <td>${formatSecondsToTime(agent.span)}</td>
                <td style="font-weight: 700; color: var(--success);">${formatSecondsToTime(agent.active)}</td>
                <td><span class="badge" style="background-color: var(--warning-glow); color: var(--warning);">${agent.breaks}</span></td>
            `;

            tr.addEventListener('click', () => {
                selectAgent(agent);
            });

            agentTableBody.appendChild(tr);
        });
    }

    // 7. Team Tab Select Agent Details inspector
    function selectAgent(agent) {
        selectedAgent = agent;
        
        // Highlight in table
        document.querySelectorAll('#agent-table-body tr').forEach(tr => {
            tr.classList.remove('selected');
            if (tr.children[0].textContent === agent.name) {
                tr.classList.add('selected');
            }
        });

        // Toggle details screen
        detailsDefault.classList.add('hidden');
        detailsActive.classList.remove('hidden');

        // Populate detail stats
        document.getElementById('inspect-agent-name').textContent = agent.name;
        document.getElementById('agent-avatar-char').textContent = agent.name.charAt(0).toUpperCase();
        document.getElementById('inspect-agent-opps').textContent = `${agent.opps} Opportunities`;
        document.getElementById('inspect-total-actions').textContent = agent.actions;
        document.getElementById('inspect-workday-span').textContent = formatSecondsToTime(agent.span);
        document.getElementById('inspect-active-duration').textContent = formatSecondsToTime(agent.active);
        document.getElementById('inspect-breaks-count').textContent = agent.breaks;

        // Render pie charts
        renderAgentCharts(agent);

        // Populate breaks list
        const listContainer = document.getElementById('inspect-breaks-list');
        listContainer.innerHTML = '';
        
        const details = agent.details;
        if (details.breaks && details.breaks.length > 0) {
            details.breaks.forEach((b, i) => {
                const li = document.createElement('li');
                const startStr = formatIsoToTime(b.start);
                const endStr = formatIsoToTime(b.end);
                const durationStr = formatSecondsToTime(b.duration);
                li.innerHTML = `
                    <span>Break ${i + 1}: <span class="break-time">${startStr} - ${endStr}</span></span>
                    <span class="break-duration">${durationStr}</span>
                `;
                listContainer.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.style.borderLeftColor = 'var(--success)';
            li.innerHTML = `<span style="color: var(--text-secondary);">No major breaks recorded.</span>`;
            listContainer.appendChild(li);
        }

        drawTeamTimeline(); // Highlight selected in timeline
    }

    function deselectAgent() {
        selectedAgent = null;
        document.querySelectorAll('#agent-table-body tr').forEach(tr => tr.classList.remove('selected'));
        detailsDefault.classList.remove('hidden');
        detailsActive.classList.add('hidden');
        drawTeamTimeline();
    }

    function renderAgentCharts(agent) {
        const details = agent.details;
        drawPieChart('module-pie-chart', 'module-legend', details.module_counts, colors.chartColors);
        drawPieChart('action-pie-chart', 'action-legend', details.action_counts, colors.chartColors.slice().reverse());
    }

    // 8. Select Agent in JUDGMENT Tab
    function selectJudgmentAgent(agentName) {
        const agent = agentsList.find(a => a.name === agentName);
        if (!agent) return;

        judgmentAgent = agent;
        agentSelect.value = agentName;

        // Update single-agent KPI cards
        document.getElementById('val-judg-actions').textContent = agent.actions;
        
        // Calls count and answered count
        const answeredCalls = agent.calls.filter(c => c.status === 'Answered').length;
        document.getElementById('val-judg-calls').textContent = agent.calls.length;
        document.getElementById('sub-judg-calls').textContent = `${answeredCalls} answered calls`;
        
        document.getElementById('val-judg-active').textContent = formatSecondsToTime(agent.active);
        document.getElementById('val-judg-breaks').textContent = agent.breaks;
        document.getElementById('sub-judg-breaks').textContent = `${formatSecondsToTime(agent.breakDuration)} total away`;

        // Render single-agent charts
        renderJudgmentCharts(agent);

        // Load persisted auditor notes from localStorage
        const savedNotes = localStorage.getItem(`audit_notes_${agentName}`);
        auditorNotes.value = savedNotes || '';

        // Build Chronological Unified Activity Log & Call Feed
        buildUnifiedLogFeed(agent);

        // Redraw single judgment timeline Gantt
        resizeJudgmentCanvas();
        drawJudgmentTimeline();
    }

    function renderJudgmentCharts(agent) {
        const details = agent.details;
        drawPieChart('judgment-module-chart', 'judgment-module-legend', details.module_counts, colors.chartColors);
        drawPieChart('judgment-action-chart', 'judgment-action-legend', details.action_counts, colors.chartColors.slice().reverse());
    }

    // 9. Build Unified Chronological Feed (Merged GHL Actions + Phone Calls)
    function buildUnifiedLogFeed(agent) {
        const feedContainer = document.getElementById('unified-feed');
        feedContainer.innerHTML = '';

        const feedItems = [];

        // 1. Add GHL Actions
        if (agent.details.actions_list) {
            agent.details.actions_list.forEach(act => {
                feedItems.push({
                    type: 'action',
                    timestamp: new Date(act.timestamp),
                    module: act.module,
                    actionName: act.action,
                    data: act
                });
            });
        }

        // 2. Add calls
        if (agent.calls) {
            agent.calls.forEach(call => {
                feedItems.push({
                    type: 'call',
                    timestamp: new Date(call.timestamp),
                    contact: call.contact_name,
                    duration: call.duration,
                    status: call.status,
                    direction: call.direction,
                    data: call
                });
            });
        }

        // 3. Sort chronologically (earliest to latest)
        feedItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Update count badge
        document.getElementById('feed-items-count').textContent = `${feedItems.length} entries`;

        if (feedItems.length === 0) {
            feedContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No logs or calls recorded.</div>';
            return;
        }

        // 4. Render DOM items
        feedItems.forEach(item => {
            const el = document.createElement('div');
            const timeStr = item.timestamp.getUTCHours().toString().padStart(2, '0') + ':' + 
                          item.timestamp.getUTCMinutes().toString().padStart(2, '0') + ':' +
                          item.timestamp.getUTCSeconds().toString().padStart(2, '0');

            if (item.type === 'action') {
                const modClass = `badge-${item.module.toLowerCase()}`;
                const feedClass = `feed-action-${item.module.toLowerCase()}`;
                
                let icon = 'fa-circle-dot';
                if (item.module === 'NOTE') icon = 'fa-note-sticky';
                else if (item.module === 'OPPORTUNITY') icon = 'fa-file-invoice-dollar';
                else if (item.module === 'CONTACT') icon = 'fa-address-book';

                el.className = `feed-item ${feedClass}`;
                el.innerHTML = `
                    <div class="feed-icon"><i class="fa-solid ${icon}"></i></div>
                    <div class="feed-content">
                        <div class="feed-text">
                            <h4>GHL ${item.module} ${item.actionName}</h4>
                            <p>Agent performed standard operation in HighLevel</p>
                        </div>
                        <div class="feed-meta">
                            <span class="feed-time-badge">${timeStr} UTC</span>
                            <span class="feed-item-badge ${modClass}">${item.module}</span>
                        </div>
                    </div>
                `;
            } else {
                const callStatusClass = `feed-call-${item.status.toLowerCase().replace(' ', '-')}`;
                const dirBadge = item.direction === 'inbound' ? 'badge-call-in' : 'badge-call-out';
                const isAnswered = item.status === 'Answered';
                const callIcon = isAnswered ? 'fa-phone-flip' : 'fa-phone-slash';
                
                el.className = `feed-item ${callStatusClass}`;
                el.innerHTML = `
                    <div class="feed-icon"><i class="fa-solid ${callIcon}"></i></div>
                    <div class="feed-content">
                        <div class="feed-text">
                            <h4>Phone Call with ${item.contact || 'Unknown Contact'}</h4>
                            <p>Status: <strong>${item.status}</strong> ${isAnswered ? `| Duration: ${item.duration}` : ''}</p>
                        </div>
                        <div class="feed-meta">
                            <span class="feed-time-badge">${timeStr} UTC</span>
                            <span class="feed-item-badge ${dirBadge}">${item.direction}</span>
                        </div>
                    </div>
                `;
            }

            feedContainer.appendChild(el);
        });
    }

    // Custom Pie Chart implementation in canvas (no heavy dependencies)
    function drawPieChart(canvasId, legendId, dataDict, chartColors) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Adjust for sharp retina screens
        const dpr = window.devicePixelRatio || 1;
        const size = canvasId.includes('judgment') ? 200 : 150;
        
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, size, size);
        
        const total = Object.values(dataDict).reduce((a, b) => a + b, 0);
        if (total === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '12px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('No activity recorded', size/2, size/2);
            return;
        }
        
        let startAngle = -Math.PI / 2;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = (size / 2) - 15;
        
        const legend = document.getElementById(legendId);
        legend.innerHTML = '';
        
        let colorIdx = 0;
        for (const [key, value] of Object.entries(dataDict)) {
            const percentage = (value / total) * 100;
            const sliceAngle = (value / total) * 2 * Math.PI;
            const color = chartColors[colorIdx % chartColors.length];
            colorIdx++;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#1e293b' : '#f1f5f9';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            startAngle += sliceAngle;
            
            // Add legend row
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `
                <span class="legend-label-col">
                    <span class="legend-dot" style="background-color: ${color}"></span>
                    ${key}
                </span>
                <span class="legend-value-col">${value} (${percentage.toFixed(0)}%)</span>
            `;
            legend.appendChild(row);
        }
    }

    // 10. Canvas Boundaries Setup
    let timelineLeftMargin = 160;
    let timelineRightMargin = 40;
    let timelineRowHeight = 40;
    let timelineTopMargin = 30;
    let timelineBottomMargin = 20;

    function getX(timeStrOrMs, isJudgment = false) {
        const timeMs = new Date(timeStrOrMs).getTime();
        const startMs = isJudgment ? judgMinTime.getTime() : teamMinTime.getTime();
        const endMs = isJudgment ? judgMaxTime.getTime() : teamMaxTime.getTime();
        const currentCanvas = isJudgment ? judgCanvas : teamCanvas;
        const width = currentCanvas.width / (window.devicePixelRatio || 1);
        const drawableWidth = width - timelineLeftMargin - timelineRightMargin;
        
        const fraction = (timeMs - startMs) / (endMs - startMs);
        return timelineLeftMargin + fraction * drawableWidth;
    }

    function getTimeFromX(x, isJudgment = false) {
        const currentCanvas = isJudgment ? judgCanvas : teamCanvas;
        const width = currentCanvas.width / (window.devicePixelRatio || 1);
        const drawableWidth = width - timelineLeftMargin - timelineRightMargin;
        const fraction = (x - timelineLeftMargin) / drawableWidth;
        const startMs = isJudgment ? judgMinTime.getTime() : teamMinTime.getTime();
        const endMs = isJudgment ? judgMaxTime.getTime() : teamMaxTime.getTime();
        
        return new Date(startMs + fraction * (endMs - startMs));
    }

    function populateHourDropdowns(startSelectId, endSelectId, defaultStart, defaultEnd, onChangeCallback) {
        const startSelect = document.getElementById(startSelectId);
        const endSelect = document.getElementById(endSelectId);
        
        startSelect.innerHTML = '';
        endSelect.innerHTML = '';
        
        for (let h = 0; h <= 23; h++) {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = `${h.toString().padStart(2, '0')}:00`;
            startSelect.appendChild(opt);
        }
        
        for (let h = 1; h <= 24; h++) {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = `${h.toString().padStart(2, '0')}:00`;
            endSelect.appendChild(opt);
        }
        
        startSelect.value = defaultStart;
        endSelect.value = defaultEnd;
        
        startSelect.addEventListener('change', () => {
            let startVal = parseInt(startSelect.value, 10);
            let endVal = parseInt(endSelect.value, 10);
            if (startVal >= endVal) {
                endVal = startVal + 1;
                if (endVal > 24) endVal = 24;
                endSelect.value = endVal;
            }
            onChangeCallback(startVal, endVal);
        });
        
        endSelect.addEventListener('change', () => {
            let startVal = parseInt(startSelect.value, 10);
            let endVal = parseInt(endSelect.value, 10);
            if (startVal >= endVal) {
                startVal = endVal - 1;
                if (startVal < 0) startVal = 0;
                startSelect.value = startVal;
            }
            onChangeCallback(startVal, endVal);
        });
    }

    function setupTimelineCanvasBoundaries() {
        // Initialize dynamic dropdowns
        populateHourDropdowns('team-start-hour', 'team-end-hour', 0, 24, (start, end) => {
            teamMinTime = new Date(Date.UTC(2026, 6, 17, start, 0, 0));
            teamMaxTime = new Date(Date.UTC(2026, 6, 17, end, 0, 0));
            drawTeamTimeline();
        });
        
        populateHourDropdowns('judg-start-hour', 'judg-end-hour', 0, 24, (start, end) => {
            judgMinTime = new Date(Date.UTC(2026, 6, 17, start, 0, 0));
            judgMaxTime = new Date(Date.UTC(2026, 6, 17, end, 0, 0));
            drawJudgmentTimeline();
        });

        // Bind interactive event listeners for Team Timeline
        teamCanvas.addEventListener('mousemove', handleTeamMouseMove);
        teamCanvas.addEventListener('mouseleave', handleTeamMouseLeave);
        teamCanvas.addEventListener('click', handleTeamClick);

        // Bind interactive event listeners for Judgment Timeline
        judgCanvas.addEventListener('mousemove', handleJudgMouseMove);
        judgCanvas.addEventListener('mouseleave', handleJudgMouseLeave);
    }

    // 11. TEAM TIMELINE CANVAS RENDERER
    function resizeTeamCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = teamTimelineContainer.clientWidth;
        
        const visibleAgents = agentsList.filter(agent => agent.name.toLowerCase().includes(searchQuery));
        const displayHeight = timelineTopMargin + timelineBottomMargin + Math.max(1, visibleAgents.length) * timelineRowHeight;
        
        teamCanvas.width = displayWidth * dpr;
        teamCanvas.height = displayHeight * dpr;
        teamCanvas.style.width = displayWidth + 'px';
        teamCanvas.style.height = displayHeight + 'px';
        
        teamCtx.scale(dpr, dpr);
    }

    function drawTeamTimeline() {
        const isDark = document.body.classList.contains('dark-mode');
        const width = teamCanvas.width / (window.devicePixelRatio || 1);
        const height = teamCanvas.height / (window.devicePixelRatio || 1);
        
        teamCtx.clearRect(0, 0, width, height);

        const visibleAgents = agentsList.filter(agent => agent.name.toLowerCase().includes(searchQuery));
        if (visibleAgents.length === 0) {
            teamCtx.fillStyle = isDark ? '#94a3b8' : '#475569';
            teamCtx.font = '14px Outfit';
            teamCtx.textAlign = 'center';
            teamCtx.fillText('No agents match the search criteria', width / 2, height / 2);
            return;
        }

        // Draw time grid labels and lines
        drawXAxisGrid(teamCtx, width, height, isDark);

        // Draw Agent Timelines
        visibleAgents.forEach((agent, idx) => {
            const yCenter = timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;
            const rowTop = timelineTopMargin + idx * timelineRowHeight;

            // Row background highlights
            const isHovered = hoveredElement && hoveredElement.agent.name === agent.name;
            const isSelected = selectedAgent && selectedAgent.name === agent.name;

            if (isSelected) {
                teamCtx.fillStyle = isDark ? 'rgba(79, 70, 229, 0.15)' : 'rgba(67, 56, 202, 0.08)';
                teamCtx.fillRect(0, rowTop, width, timelineRowHeight);
            } else if (isHovered) {
                teamCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)';
                teamCtx.fillRect(0, rowTop, width, timelineRowHeight);
            }

            // Row divider lines
            teamCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
            teamCtx.beginPath();
            teamCtx.moveTo(0, rowTop + timelineRowHeight);
            teamCtx.lineTo(width, rowTop + timelineRowHeight);
            teamCtx.stroke();

            // Y-axis label: Agent Name
            teamCtx.fillStyle = isSelected ? (isDark ? '#8b5cf6' : '#4338ca') : (isDark ? '#f8fafc' : '#0f172a');
            teamCtx.font = isSelected ? '700 12px Outfit' : '600 12px Outfit';
            teamCtx.textAlign = 'left';
            teamCtx.fillText(agent.name, 15, yCenter + 4);

            const details = agent.details;

            // Draw Breaks (Orange block)
            details.breaks.forEach(b => {
                const startX = getX(b.start);
                const endX = getX(b.end);
                const barWidth = Math.max(2, endX - startX);
                
                const hoverMatch = hoveredElement && hoveredElement.type === 'break' && hoveredElement.data === b;

                teamCtx.fillStyle = colors.break;
                teamCtx.globalAlpha = hoverMatch ? 0.45 : 0.22;
                teamCtx.fillRect(startX, yCenter - 6, barWidth, 12);
                teamCtx.globalAlpha = 1.0;
                
                teamCtx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
                teamCtx.strokeRect(startX, yCenter - 6, barWidth, 12);
            });

            // Draw Active Sessions (Green block)
            details.sessions.forEach(s => {
                const startX = getX(s.start);
                const endX = getX(s.end);
                const barWidth = Math.max(3, endX - startX);

                const hoverMatch = hoveredElement && hoveredElement.type === 'session' && hoveredElement.data === s;

                teamCtx.fillStyle = hoverMatch ? colors.activeHover : colors.active;
                teamCtx.beginPath();
                teamCtx.roundRect(startX, yCenter - 10, barWidth, 20, 4);
                teamCtx.fill();

                teamCtx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)';
                teamCtx.lineWidth = 0.8;
                teamCtx.stroke();
            });
        });
    }

    function drawXAxisGrid(context, width, height, isDark, isJudgment = false) {
        context.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        context.lineWidth = 1;
        context.font = '500 11px Outfit';
        context.fillStyle = '#64748b';
        context.textAlign = 'center';

        const minTime = isJudgment ? judgMinTime : teamMinTime;
        const maxTime = isJudgment ? judgMaxTime : teamMaxTime;

        const startMs = minTime.getTime();
        const endMs = maxTime.getTime();
        const totalHours = (endMs - startMs) / (1000 * 60 * 60);
        
        // Grid interval based on span
        const intervalHours = totalHours > 12 ? 2 : (totalHours > 6 ? 1 : 0.5);
        
        const drawDate = new Date(startMs);
        if (intervalHours === 0.5) {
            drawDate.setMinutes(drawDate.getMinutes() < 30 ? 0 : 30);
        } else {
            drawDate.setMinutes(0);
        }
        drawDate.setSeconds(0);
        drawDate.setMilliseconds(0);
        
        while (drawDate.getTime() <= endMs) {
            if (drawDate.getTime() >= startMs) {
                const xVal = getX(drawDate.getTime(), isJudgment);
                
                context.beginPath();
                context.moveTo(xVal, timelineTopMargin - 10);
                context.lineTo(xVal, height - timelineBottomMargin);
                context.stroke();

                let label = drawDate.getUTCHours().toString().padStart(2, '0') + ':' + 
                            drawDate.getUTCMinutes().toString().padStart(2, '0');
                context.fillText(label, xVal, timelineTopMargin - 15);
            }
            if (intervalHours === 0.5) {
                drawDate.setMinutes(drawDate.getMinutes() + 30);
            } else {
                drawDate.setUTCHours(drawDate.getUTCHours() + intervalHours);
            }
        }
    }

    // 12. SINGLE AGENT JUDGMENT TIMELINE CANVAS RENDERER
    function resizeJudgmentCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = judgTimelineContainer.clientWidth;
        
        // Single Agent workspace has fixed 3 swimlanes height
        const displayHeight = 180;
        
        judgCanvas.width = displayWidth * dpr;
        judgCanvas.height = displayHeight * dpr;
        judgCanvas.style.width = displayWidth + 'px';
        judgCanvas.style.height = displayHeight + 'px';
        
        judgCtx.scale(dpr, dpr);
    }

    function drawJudgmentTimeline() {
        if (!judgmentAgent) return;
        
        const isDark = document.body.classList.contains('dark-mode');
        const width = judgCanvas.width / (window.devicePixelRatio || 1);
        const height = judgCanvas.height / (window.devicePixelRatio || 1);
        
        judgCtx.clearRect(0, 0, width, height);

        // Draw Axis Hour Grids (pass true for isJudgment)
        drawXAxisGrid(judgCtx, width, height, isDark, true);

        // Draw Swimlane Background Bands & Dividers
        const lanes = [
            { label: 'Sessions & Breaks', yStart: 25, height: 45, bgColor: isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' },
            { label: 'GHL Log Actions', yStart: 70, height: 45, bgColor: 'transparent' },
            { label: 'Calls Timeline', yStart: 115, height: 45, bgColor: isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }
        ];

        lanes.forEach(l => {
            // Draw lane background band
            if (l.bgColor !== 'transparent') {
                judgCtx.fillStyle = l.bgColor;
                judgCtx.fillRect(0, l.yStart, width, l.height);
            }

            // Draw divider border
            judgCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
            judgCtx.beginPath();
            judgCtx.moveTo(0, l.yStart + l.height);
            judgCtx.lineTo(width, l.yStart + l.height);
            judgCtx.stroke();

            // Draw Lane Y-Label
            judgCtx.fillStyle = isDark ? '#94a3b8' : '#475569';
            judgCtx.font = '600 11px Outfit';
            judgCtx.textAlign = 'left';
            judgCtx.fillText(l.label, 15, l.yStart + l.height / 2 + 4);
        });

        // ------------------ SWIMLANE 1: Active Work & Breaks ------------------
        const yLane1 = 25 + 45 / 2;
        const details = judgmentAgent.details;

        // Plot Breaks
        details.breaks.forEach(b => {
            const startX = getX(b.start, true);
            const endX = getX(b.end, true);
            const barWidth = Math.max(2, endX - startX);
            
            const hoverMatch = hoveredJudgElement && hoveredJudgElement.type === 'break' && hoveredJudgElement.data === b;
            judgCtx.fillStyle = colors.break;
            judgCtx.globalAlpha = hoverMatch ? 0.45 : 0.22;
            judgCtx.fillRect(startX, yLane1 - 7, barWidth, 14);
            judgCtx.globalAlpha = 1.0;
        });

        // Plot Active Blocks
        details.sessions.forEach(s => {
            const startX = getX(s.start, true);
            const endX = getX(s.end, true);
            const barWidth = Math.max(3, endX - startX);

            const hoverMatch = hoveredJudgElement && hoveredJudgElement.type === 'session' && hoveredJudgElement.data === s;
            judgCtx.fillStyle = hoverMatch ? colors.activeHover : colors.active;
            judgCtx.beginPath();
            judgCtx.roundRect(startX, yLane1 - 11, barWidth, 22, 4);
            judgCtx.fill();
        });

        // ------------------ SWIMLANE 2: Individual GHL Actions (Dots) ------------------
        const yLane2 = 70 + 45 / 2;
        if (details.actions_list) {
            details.actions_list.forEach(act => {
                const actionX = getX(act.timestamp, true);
                
                // Color dots by module
                let dotColor = colors.info; // Default info blue for other modules
                if (act.module === 'NOTE') dotColor = colors.info;
                else if (act.module === 'OPPORTUNITY') dotColor = colors.accent;
                else if (act.module === 'CONTACT') dotColor = colors.active;

                const hoverMatch = hoveredJudgElement && hoveredJudgElement.type === 'action' && hoveredJudgElement.data === act;

                judgCtx.fillStyle = dotColor;
                judgCtx.beginPath();
                judgCtx.arc(actionX, yLane2, hoverMatch ? 7 : 4.5, 0, 2 * Math.PI);
                judgCtx.fill();

                if (hoverMatch) {
                    judgCtx.strokeStyle = 'white';
                    judgCtx.lineWidth = 1.2;
                    judgCtx.stroke();
                }
            });
        }

        // ------------------ SWIMLANE 3: Phone Calls ------------------
        const yLane3 = 115 + 45 / 2;
        if (judgmentAgent.calls) {
            judgmentAgent.calls.forEach(call => {
                const callStartX = getX(call.timestamp, true);
                const durationSecs = parseDurationToSeconds(call.duration);
                const callEndX = getX(new Date(call.timestamp).getTime() + durationSecs * 1000, true);
                
                // Calls have a minimum visual width of 8 pixels so missed calls are visible
                const barWidth = Math.max(8, callEndX - callStartX);

                const isAnswered = call.status === 'Answered';
                const callColor = isAnswered ? colors.active : colors.danger;
                
                const hoverMatch = hoveredJudgElement && hoveredJudgElement.type === 'call' && hoveredJudgElement.data === call;

                judgCtx.fillStyle = callColor;
                judgCtx.globalAlpha = hoverMatch ? 1.0 : 0.75;
                
                // Draw rounded rectangle for calls
                judgCtx.beginPath();
                judgCtx.roundRect(callStartX, yLane3 - 8, barWidth, 16, 3);
                judgCtx.fill();
                
                judgCtx.globalAlpha = 1.0;

                if (hoverMatch) {
                    judgCtx.strokeStyle = 'white';
                    judgCtx.lineWidth = 1;
                    judgCtx.stroke();
                }
            });
        }
    }

    // 13. TEAM TIMELINE INTERACTION
    function handleTeamMouseMove(e) {
        const rect = teamCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const visibleAgents = agentsList.filter(agent => agent.name.toLowerCase().includes(searchQuery));
        
        if (y < timelineTopMargin || y > timelineTopMargin + visibleAgents.length * timelineRowHeight) {
            handleTeamMouseLeave();
            return;
        }

        const idx = Math.floor((y - timelineTopMargin) / timelineRowHeight);
        const agent = visibleAgents[idx];
        if (!agent) {
            handleTeamMouseLeave();
            return;
        }

        const yCenter = timelineTopMargin + idx * timelineRowHeight + timelineRowHeight / 2;
        const details = agent.details;

        let hoveredItem = null;

        // Check active sessions
        for (const s of details.sessions) {
            const startX = getX(s.start);
            const endX = getX(s.end);
            const pad = 3;
            if (x >= startX - pad && x <= endX + pad && Math.abs(y - yCenter) <= 12) {
                hoveredItem = {
                    agent,
                    type: 'session',
                    data: s,
                    x: e.clientX,
                    y: e.clientY
                };
                break;
            }
        }

        // Check breaks
        if (!hoveredItem) {
            for (const b of details.breaks) {
                const startX = getX(b.start);
                const endX = getX(b.end);
                if (x >= startX && x <= endX && Math.abs(y - yCenter) <= 8) {
                    hoveredItem = {
                        agent,
                        type: 'break',
                        data: b,
                        x: e.clientX,
                        y: e.clientY
                    };
                    break;
                }
            }
        }

        if (!hoveredItem) {
            hoveredItem = {
                agent,
                type: 'row',
                data: null,
                x: e.clientX,
                y: e.clientY
            };
        }

        if (hoveredItem.type === 'session' || hoveredItem.type === 'break') {
            teamCanvas.style.cursor = 'pointer';
            tooltip.classList.remove('hidden');
            tooltip.style.left = `${hoveredItem.x + 15}px`;
            tooltip.style.top = `${hoveredItem.y + 15}px`;

            const startStr = formatIsoToTime(hoveredItem.data.start);
            const endStr = formatIsoToTime(hoveredItem.data.end);
            const durationStr = formatSecondsToTime(hoveredItem.data.duration);
            
            if (hoveredItem.type === 'session') {
                tooltip.innerHTML = `
                    <div class="tooltip-title">${hoveredItem.agent.name}</div>
                    <div class="tooltip-row"><span class="tooltip-label">State:</span><span class="tooltip-value" style="color: var(--success)">Active Work</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Time:</span><span class="tooltip-value">${startStr} - ${endStr}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Duration:</span><span class="tooltip-value">${durationStr}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Actions:</span><span class="tooltip-value">${hoveredItem.data.actions_count} operations</span></div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div class="tooltip-title">${hoveredItem.agent.name}</div>
                    <div class="tooltip-row"><span class="tooltip-label">State:</span><span class="tooltip-value" style="color: var(--warning)">Away / Break</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Time:</span><span class="tooltip-value">${startStr} - ${endStr}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Duration:</span><span class="tooltip-value">${durationStr}</span></div>
                `;
            }
        } else {
            teamCanvas.style.cursor = 'pointer';
            tooltip.classList.add('hidden');
        }

        const hoveredChanged = !hoveredElement || 
                               hoveredElement.agent.name !== hoveredItem.agent.name || 
                               hoveredElement.type !== hoveredItem.type || 
                               hoveredElement.data !== hoveredItem.data;

        if (hoveredChanged) {
            hoveredElement = hoveredItem;
            drawTeamTimeline();
        }
    }

    function handleTeamMouseLeave() {
        teamCanvas.style.cursor = 'default';
        tooltip.classList.add('hidden');
        if (hoveredElement) {
            hoveredElement = null;
            drawTeamTimeline();
        }
    }

    function handleTeamClick() {
        if (hoveredElement) {
            selectAgent(hoveredElement.agent);
        }
    }

    // 14. SINGLE AGENT JUDGMENT TIMELINE INTERACTION
    function handleJudgMouseMove(e) {
        if (!judgmentAgent) return;
        
        const rect = judgCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const details = judgmentAgent.details;
        let hoveredItem = null;

        // 1. Check Lane 1 (Sessions & Breaks)
        const yLane1 = 25 + 45 / 2;
        if (y >= 25 && y <= 70) {
            // Check active sessions
            for (const s of details.sessions) {
                const startX = getX(s.start, true);
                const endX = getX(s.end, true);
                if (x >= startX - 3 && x <= endX + 3) {
                    hoveredItem = {
                        type: 'session',
                        data: s,
                        x: e.clientX,
                        y: e.clientY
                    };
                    break;
                }
            }
            
            // Check breaks
            if (!hoveredItem) {
                for (const b of details.breaks) {
                    const startX = getX(b.start, true);
                    const endX = getX(b.end, true);
                    if (x >= startX && x <= endX) {
                        hoveredItem = {
                            type: 'break',
                            data: b,
                            x: e.clientX,
                            y: e.clientY
                        };
                        break;
                    }
                }
            }
        }

        // 2. Check Lane 2 (GHL Actions Dots)
        const yLane2 = 70 + 45 / 2;
        if (!hoveredItem && y >= 70 && y <= 115 && details.actions_list) {
            for (const act of details.actions_list) {
                const actionX = getX(act.timestamp, true);
                const dist = Math.sqrt((x - actionX) * (x - actionX) + (y - yLane2) * (y - yLane2));
                // radius buffer is 8px
                if (dist <= 8) {
                    hoveredItem = {
                        type: 'action',
                        data: act,
                        x: e.clientX,
                        y: e.clientY
                    };
                    break;
                }
            }
        }

        // 3. Check Lane 3 (Phone Calls)
        const yLane3 = 115 + 45 / 2;
        if (!hoveredItem && y >= 115 && y <= 160 && judgmentAgent.calls) {
            for (const call of judgmentAgent.calls) {
                const callStartX = getX(call.timestamp, true);
                const durationSecs = parseDurationToSeconds(call.duration);
                const callEndX = getX(new Date(call.timestamp).getTime() + durationSecs * 1000, true);
                const barWidth = Math.max(8, callEndX - callStartX);

                if (x >= callStartX && x <= callStartX + barWidth && Math.abs(y - yLane3) <= 8) {
                    hoveredItem = {
                        type: 'call',
                        data: call,
                        x: e.clientX,
                        y: e.clientY
                    };
                    break;
                }
            }
        }

        // Render tooltip
        if (hoveredItem) {
            judgCanvas.style.cursor = 'pointer';
            tooltip.classList.remove('hidden');
            tooltip.style.left = `${hoveredItem.x + 15}px`;
            tooltip.style.top = `${hoveredItem.y + 15}px`;

            const startStr = formatIsoToTime(hoveredItem.data.start || hoveredItem.data.timestamp);
            
            if (hoveredItem.type === 'session') {
                const endStr = formatIsoToTime(hoveredItem.data.end);
                const durationStr = formatSecondsToTime(hoveredItem.data.duration);
                tooltip.innerHTML = `
                    <div class="tooltip-title">${judgmentAgent.name}</div>
                    <div class="tooltip-row"><span class="tooltip-label">Type:</span><span class="tooltip-value" style="color: var(--success)">Active Session</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Time:</span><span class="tooltip-value">${startStr} - ${endStr}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Duration:</span><span class="tooltip-value">${durationStr}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">GHL Actions:</span><span class="tooltip-value">${hoveredItem.data.actions_count} ops</span></div>
                `;
            } else if (hoveredItem.type === 'break') {
                const endStr = formatIsoToTime(hoveredItem.data.end);
                const durationStr = formatSecondsToTime(hoveredItem.data.duration);
                tooltip.innerHTML = `
                    <div class="tooltip-title">${judgmentAgent.name}</div>
                    <div class="tooltip-row"><span class="tooltip-label">Type:</span><span class="tooltip-value" style="color: var(--warning)">Away / Break</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Time:</span><span class="tooltip-value">${startStr} - ${endStr}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Duration:</span><span class="tooltip-value">${durationStr}</span></div>
                `;
            } else if (hoveredItem.type === 'action') {
                tooltip.innerHTML = `
                    <div class="tooltip-title">${judgmentAgent.name}</div>
                    <div class="tooltip-row"><span class="tooltip-label">Type:</span><span class="tooltip-value" style="color: var(--info)">GHL Action</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Module:</span><span class="tooltip-value">${hoveredItem.data.module}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Action:</span><span class="tooltip-value">${hoveredItem.data.action}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Time:</span><span class="tooltip-value">${startStr} UTC</span></div>
                `;
            } else if (hoveredItem.type === 'call') {
                const isAnswered = hoveredItem.data.status === 'Answered';
                tooltip.innerHTML = `
                    <div class="tooltip-title">${judgmentAgent.name}</div>
                    <div class="tooltip-row"><span class="tooltip-label">Type:</span><span class="tooltip-value" style="color: ${isAnswered ? 'var(--success)' : 'var(--danger)'}">Phone Call (${hoveredItem.data.direction})</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Contact:</span><span class="tooltip-value">${hoveredItem.data.contact_name || 'Unknown'}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Status:</span><span class="tooltip-value">${hoveredItem.data.status}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Duration:</span><span class="tooltip-value">${hoveredItem.data.duration}</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Time:</span><span class="tooltip-value">${startStr} UTC</span></div>
                `;
            }
        } else {
            judgCanvas.style.cursor = 'default';
            tooltip.classList.add('hidden');
        }

        const hoveredChanged = !hoveredJudgElement || 
                               hoveredJudgElement.type !== (hoveredItem ? hoveredItem.type : null) || 
                               hoveredJudgElement.data !== (hoveredItem ? hoveredItem.data : null);

        if (hoveredChanged) {
            hoveredJudgElement = hoveredItem;
            drawJudgmentTimeline();
        }
    }

    function handleJudgMouseLeave() {
        judgCanvas.style.cursor = 'default';
        tooltip.classList.add('hidden');
        if (hoveredJudgElement) {
            hoveredJudgElement = null;
            drawJudgmentTimeline();
        }
    }

    // 15. Helper Parsing Functions
    function formatSecondsToTime(seconds) {
        const sec = Math.round(seconds);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
    }

    function formatIsoToTime(isoStr) {
        const dateObj = new Date(isoStr);
        return dateObj.getUTCHours().toString().padStart(2, '0') + ':' + 
               dateObj.getUTCMinutes().toString().padStart(2, '0');
    }

    function parseDurationToSeconds(durStr) {
        if (!durStr || durStr === '-') return 0;
        const parts = durStr.split(':');
        if (parts.length === 2) {
            // MM:SS
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        } else if (parts.length === 3) {
            // HH:MM:SS
            return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        }
        return 0;
    }
});
