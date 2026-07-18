import os
import glob
import re
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, timedelta
import pytz

def normalize_phone(phone):
    if pd.isna(phone):
        return ""
    return re.sub(r'\D', '', str(phone))

def to_bst(dt_val):
    if pd.isna(dt_val):
        return None
    try:
        if isinstance(dt_val, str):
            # Strip Z if present
            if dt_val.endswith('Z'):
                dt_val = dt_val[:-1]
            dt = datetime.fromisoformat(dt_val)
        else:
            dt = dt_val
        
        # Localize as UTC if naive
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)
        # Convert to BST (Europe/London)
        return dt.astimezone(pytz.timezone('Europe/London'))
    except Exception:
        return None

def is_july_17_bst(dt):
    if dt is None:
        return False
    return dt.year == 2026 and dt.month == 7 and dt.day == 17

def parse_duration_to_seconds(dur_str):
    if pd.isna(dur_str) or dur_str == "-":
        return 0
    parts = str(dur_str).split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace = script_dir
    
    # 1. Locate CSV Files
    opp_path = glob.glob(os.path.join(workspace, "opportunities.csv"))
    call_path = glob.glob(os.path.join(workspace, "call-report.csv"))
    
    new_leads_path = glob.glob(os.path.join(workspace, "raw_data", "New Leads-*.csv")) or glob.glob(os.path.join(workspace, "New Leads-*.csv"))
    booked_path = glob.glob(os.path.join(workspace, "raw_data", "Booked Leads-*.csv")) or glob.glob(os.path.join(workspace, "raw_data", "Booked Leads -*.csv")) or glob.glob(os.path.join(workspace, "Booked Leads-*.csv"))
    appt_path = glob.glob(os.path.join(workspace, "raw_data", "Appointment Booked Leads-*.csv")) or glob.glob(os.path.join(workspace, "Appointment Booked Leads-*.csv"))
    closed_path = glob.glob(os.path.join(workspace, "raw_data", "Closed Leads-*.csv")) or glob.glob(os.path.join(workspace, "Closed Leads-*.csv"))
    
    opps_file = opp_path[0] if opp_path else None
    calls_file = call_path[0] if call_path else None
    new_leads_file = new_leads_path[0] if new_leads_path else None
    booked_file = booked_path[0] if booked_path else None
    appt_file = appt_path[0] if appt_path else None
    closed_file = closed_path[0] if closed_path else None

    # Load Databases
    opp_counts = {}
    contact_to_agent = {}
    phone_to_agent = {}
    
    if opps_file and os.path.exists(opps_file):
        df_opps = pd.read_csv(opps_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df_opps.iterrows():
            assigned = row.get("assigned")
            if pd.isna(assigned):
                continue
            opp_counts[assigned] = opp_counts.get(assigned, 0) + 1
            
            c_name = row.get("Contact Name")
            if not pd.isna(c_name):
                contact_to_agent[str(c_name).strip().lower()] = assigned
            
            c_phone = row.get("phone")
            if not pd.isna(c_phone):
                norm_p = normalize_phone(c_phone)
                if norm_p:
                    phone_to_agent[norm_p] = assigned

    def find_agent(phone, name):
        if phone:
            norm_p = normalize_phone(phone)
            if norm_p in phone_to_agent:
                return phone_to_agent[norm_p]
        if name:
            norm_n = str(name).strip().lower()
            if norm_n in contact_to_agent:
                return contact_to_agent[norm_n]
        return None

    # Lead segmentations
    agent_segmentations = {}
    def init_seg(agent):
        if agent not in agent_segmentations:
            agent_segmentations[agent] = {
                'new': 0, 'booked': 0, 'appt': 0, 'closed': 0,
                'new_today': 0, 'booked_today': 0, 'appt_today': 0
            }

    if new_leads_file and os.path.exists(new_leads_file):
        df = pd.read_csv(new_leads_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df.iterrows():
            agent = row.get("Assigned user") or find_agent(row.get("Phone number"), row.get("Opportunity name"))
            if not agent: continue
            init_seg(agent)
            agent_segmentations[agent]['new'] += 1
            bst_created = to_bst(row.get("Created on"))
            if is_july_17_bst(bst_created):
                agent_segmentations[agent]['new_today'] += 1

    if booked_file and os.path.exists(booked_file):
        df = pd.read_csv(booked_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df.iterrows():
            agent = row.get("Assigned user") or find_agent(row.get("Phone number"), row.get("Opportunity name"))
            if not agent: continue
            init_seg(agent)
            agent_segmentations[agent]['booked'] += 1
            bst_created = to_bst(row.get("Created on"))
            if is_july_17_bst(bst_created):
                agent_segmentations[agent]['booked_today'] += 1

    if appt_file and os.path.exists(appt_file):
        df = pd.read_csv(appt_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df.iterrows():
            agent = row.get("Assigned user") or find_agent(row.get("Phone number"), row.get("Opportunity name"))
            if not agent: continue
            init_seg(agent)
            agent_segmentations[agent]['appt'] += 1
            bst_created = to_bst(row.get("Created on"))
            if is_july_17_bst(bst_created):
                agent_segmentations[agent]['appt_today'] += 1

    if closed_file and os.path.exists(closed_file):
        df = pd.read_csv(closed_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df.iterrows():
            agent = row.get("Assigned user") or find_agent(row.get("Phone number"), row.get("Opportunity name"))
            if not agent: continue
            init_seg(agent)
            agent_segmentations[agent]['closed'] += 1

    # Call logs
    agent_calls = {}
    bst_calls = []
    if calls_file and os.path.exists(calls_file):
        df = pd.read_csv(calls_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df.iterrows():
            c_name = row.get("Contact name")
            c_phone = row.get("Contact phone")
            timestamp = row.get("Date & time")
            duration = row.get("Duration")
            status = row.get("Call status")
            direction = row.get("Direction", "unknown")
            
            bst_time = to_bst(timestamp)
            if not bst_time: continue
            
            agent = find_agent(c_phone, c_name)
            if agent:
                call_data = {
                    'time': bst_time,
                    'direction': direction,
                    'status': status,
                    'duration': duration
                }
                agent_calls.setdefault(agent, []).append(call_data)
                if is_july_17_bst(bst_time):
                    bst_calls.append((agent, bst_time, direction, status, duration))

    # GHL agent logs
    agent_activities = {}
    bst_updates = []
    agent_logs_paths = glob.glob(os.path.join(workspace, "Agents", "*.csv"))
    
    for log_path in agent_logs_paths:
        agent_name = os.path.splitext(os.path.basename(log_path))[0]
        df = pd.read_csv(log_path, encoding='utf-8-sig', errors='ignore')
        for _, row in df.iterrows():
            raw_agent = row.get("Modified By (Name)")
            dt_val = row.get("Date & Time")
            module = row.get("Module")
            action = row.get("Action")
            details = row.get("Details", "")
            
            bst_time = to_bst(dt_val)
            if not bst_time: continue
            
            agent_clean = re.sub(r'[^a-zA-Z0-9 \-_]', '', str(raw_agent)).strip()
            if not agent_clean: continue
            
            activity = {
                'time': bst_time,
                'module': module or "UNKNOWN",
                'action': action or "UNKNOWN",
                'details': str(details)
            }
            agent_activities.setdefault(agent_clean, []).append(activity)
            if is_july_17_bst(bst_time):
                bst_updates.append((agent_clean, bst_time, module, action, details))

    # Margin amount
    agent_margins = {}
    if opps_file and os.path.exists(opps_file):
        df_opps = pd.read_csv(opps_file, encoding='utf-8-sig', errors='ignore')
        for _, row in df_opps.iterrows():
            assigned = row.get("assigned")
            if pd.isna(assigned): continue
            bst_margin_date = to_bst(row.get("Margin Added Date"))
            if is_july_17_bst(bst_margin_date):
                val = float(row.get("Margin Amount") or row.get("Lead Value") or 0)
                agent_margins[assigned] = agent_margins.get(assigned, 0) + val

    # Render Scatter timeline chart using Matplotlib
    # We sort agents by total updates
    sorted_agents = sorted(agent_activities.keys(), key=lambda k: len(agent_activities[k]), reverse=True)
    
    plt.figure(figsize=(12, 6 + len(sorted_agents) * 0.35))
    ax = plt.subplot(111)
    
    min_chart_time = datetime(2026, 7, 17, 9, 0, 0, tzinfo=pytz.timezone('Europe/London'))
    max_chart_time = datetime(2026, 7, 17, 20, 0, 0, tzinfo=pytz.timezone('Europe/London'))
    
    for idx, agent in enumerate(sorted_agents):
        y_val = idx
        
        # Plot GHL Updates
        up_times = [up[1] for up in bst_updates if up[0] == agent and min_chart_time <= up[1] <= max_chart_time]
        if up_times:
            ax.scatter(up_times, [y_val]*len(up_times), color='#4f46e5', marker='o', s=35, label='GHL Updates' if idx == 0 else "")
            
        # Plot Calls
        call_times = [cl[1] for cl in bst_calls if cl[0] == agent and min_chart_time <= cl[1] <= max_chart_time]
        if call_times:
            ax.scatter(call_times, [y_val]*len(call_times), color='#db8324', marker='^', s=45, label='Call Events' if idx == 0 else "")
            
    # Chart styling
    ax.legend(loc='upper right', framealpha=0.9)
    ax.set_yticks(range(len(sorted_agents)))
    ax.set_yticklabels(sorted_agents, fontsize=9, fontweight='bold')
    ax.set_xlim(min_chart_time, max_chart_time)
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=1))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M BST'))
    plt.xticks(rotation=15)
    
    ax.xaxis.grid(True, linestyle='--', alpha=0.5)
    plt.title("Visual Scatter Workday Timeline (July 17, 2026 BST)", fontsize=14, fontweight='bold', pad=15)
    plt.tight_layout()
    
    chart_out_dir = os.path.join(workspace, "output")
    os.makedirs(chart_out_dir, exist_ok=True)
    chart_img_path = os.path.join(chart_out_dir, "executive_timeline.png")
    plt.savefig(chart_img_path, dpi=300)
    plt.close()

    # Build Tables data
    table1_rows = []
    table2_rows = []
    table3_rows = []

    for agent in sorted_agents:
        activities = agent_activities.get(agent, [])
        seg = agent_segmentations.get(agent, {'new': 0, 'booked': 0, 'appt': 0, 'closed': 0, 'new_today': 0, 'booked_today': 0, 'appt_today': 0})
        
        # Calculate interested, contacted stage changes and notes updates on July 17 BST
        stage_interested = 0
        stage_contacted = 0
        notes_count = 0
        
        for act in activities:
            if is_july_17_bst(act['time']):
                if act['module'] == "NOTE":
                    notes_count += 1
                if act['module'] == "OPPORTUNITY":
                    if '"pipelineStageName":"Interested"' in act['details']:
                        stage_interested += 1
                    if '"pipelineStageName":"Contacted"' in act['details']:
                        stage_contacted += 1
                        
        opps_count = opp_counts.get(agent, 0)
        eligible_base = opps_count - seg['closed'] - seg['appt']
        general_conv = (seg['booked'] / eligible_base * 100) if eligible_base > 0 else 0.0
        
        table1_rows.append({
            'agent': agent, 'new': seg['new'], 'appt': seg['appt'], 'closed': seg['closed'], 'booked': seg['booked'],
            'margin': agent_margins.get(agent, 0), 'interested': stage_interested, 'contacted': stage_contacted,
            'notes': notes_count, 'conv': general_conv
        })

        # Table 2 today sprint
        converted_today = seg['booked_today'] + seg['appt_today']
        today_conv = (converted_today / seg['new_today'] * 100) if seg['new_today'] > 0 else 0.0
        table2_rows.append({
            'agent': agent, 'new_today': seg['new_today'], 'converted_today': converted_today, 'conv_rate': today_conv
        })

        # Table 3 call metrics on July 17 BST
        calls_today = [c for c in agent_calls.get(agent, []) if is_july_17_bst(c['time'])]
        
        out_count = 0
        out_attended = 0
        out_missed = 0
        out_seconds = 0

        in_count = 0
        in_attended = 0
        in_missed = 0
        in_seconds = 0
        
        for c in calls_today:
            sec = parse_duration_to_seconds(c['duration'])
            answered = c['status'] == "Answered"
            if c['direction'] == "outbound":
                out_count += 1
                if answered:
                    out_attended += 1
                    out_seconds += sec
                else:
                    out_missed += 1
            else:
                in_count += 1
                if answered:
                    in_attended += 1
                    in_seconds += sec
                else:
                    in_missed += 1
                    
        table3_rows.append({
            'agent': agent,
            'out_count': out_count, 'out_att': out_attended, 'out_miss': out_missed,
            'out_mins': out_seconds / 60, 'out_avg': (out_seconds / out_attended / 60) if out_attended > 0 else 0.0,
            'in_count': in_count, 'in_att': in_attended, 'in_miss': in_missed,
            'in_mins': in_seconds / 60, 'in_avg': (in_seconds / in_attended / 60) if in_attended > 0 else 0.0
        })

    # Compile HTML report
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Executive Operations Report - July 17, 2026</title>
<style>
    @page {{
        size: A4 landscape;
        margin: 1.5cm;
    }}
    body {{
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #2d3748;
        line-height: 1.4;
        font-size: 10pt;
    }}
    h1, h2, h3 {{
        color: #1a365d;
        margin-top: 0;
    }}
    .header-table {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1cm;
    }}
    .header-table td {{
        padding: 0;
        vertical-align: middle;
    }}
    .title-area h1 {{
        margin: 0;
        font-size: 24pt;
        font-weight: 800;
        letter-spacing: -1px;
    }}
    .title-area p {{
        margin: 5px 0 0 0;
        color: #718096;
        font-size: 10pt;
    }}
    .glossary-box {{
        background: #f8fafc;
        border-left: 4px solid #1a365d;
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 4px;
    }}
    .glossary-box h3 {{
        font-size: 11pt;
        margin-bottom: 8px;
    }}
    .glossary-box ul {{
        margin: 0;
        padding-left: 20px;
        font-size: 9pt;
        color: #4a5568;
    }}
    .glossary-box li {{
        margin-bottom: 4px;
    }}
    table.data-table {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 25px;
        page-break-inside: avoid;
    }}
    table.data-table th {{
        background-color: #1a365d;
        color: white;
        text-align: left;
        padding: 8px 10px;
        font-size: 9pt;
        font-weight: 600;
    }}
    table.data-table td {{
        padding: 7px 10px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 9pt;
    }}
    table.data-table tr:nth-child(even) td {{
        background-color: #f8fafc;
    }}
    .page-break {{
        page-break-before: always;
    }}
    .chart-container {{
        text-align: center;
        margin: 1.5cm 0;
        page-break-inside: avoid;
    }}
    .chart-container img {{
        max-width: 100%;
        height: auto;
    }}
</style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td class="title-area">
                <h1>Executive Operations Report</h1>
                <p>Date: July 17, 2026 | Timezone BST Standard</p>
            </td>
        </tr>
    </table>

    <div class="glossary-box">
        <h3>Glossary & Formulas</h3>
        <ul>
            <li><strong>Eligible Interacted Base:</strong> Total Opportunity Leads - Closed Leads - Appointment Booked Leads. Reflects the active pipeline base.</li>
            <li><strong>General Conversion Rate:</strong> (Booked Leads &divide; Eligible Interacted Base) &times; 100.</li>
            <li><strong>Today's Conversion Rate:</strong> (July 17 Converted (Booked/Appt Booked) &divide; July 17 Created New Leads) &times; 100.</li>
            <li><strong>Interested &amp; Contacted:</strong> Counts pipeline stage advancement updates recorded in GHL audit log details.</li>
        </ul>
    </div>

    <h2>Table 1: Main Agent Conversion &amp; Lead Metrics</h2>
    <table class="data-table">
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
    """
    
    for r in table1_rows:
        html_content += f"""
            <tr>
                <td><strong>{r['agent']}</strong></td>
                <td>{r['new']}</td>
                <td>{r['appt']}</td>
                <td>{r['closed']}</td>
                <td>{r['booked']}</td>
                <td>${r['margin']:.2f}</td>
                <td>{r['interested']}</td>
                <td>{r['contacted']}</td>
                <td>{r['notes']}</td>
                <td><strong>{r['conv']:.1f}%</strong></td>
            </tr>
        """
        
    html_content += """
        </tbody>
    </table>

    <div class="page-break"></div>

    <h2>Table 2: Today's (July 17) New Leads Conversion Sprints</h2>
    <table class="data-table">
        <thead>
            <tr>
                <th>Agent</th>
                <th>Today's New Leads</th>
                <th>Today's Converted (Booked/Appt Booked)</th>
                <th>Today's Conversion Rate (%)</th>
            </tr>
        </thead>
        <tbody>
    """
    
    for r in table2_rows:
        html_content += f"""
            <tr>
                <td><strong>{r['agent']}</strong></td>
                <td>{r['new_today']}</td>
                <td>{r['converted_today']}</td>
                <td><strong>{r['conv_rate']:.1f}%</strong></td>
            </tr>
        """
        
    html_content += """
        </tbody>
    </table>

    <h2>Table 3: Granular Inbound vs. Outbound Call Metrics</h2>
    <table class="data-table">
        <thead>
            <tr>
                <th rowspan="2">Agent</th>
                <th colspan="5" style="text-align:center; background-color:#2c5282;">Outbound Calls</th>
                <th colspan="5" style="text-align:center; background-color:#2f855a;">Inbound Calls</th>
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
    """
    
    for r in table3_rows:
        html_content += f"""
            <tr>
                <td><strong>{r['agent']}</strong></td>
                <td>{r['out_count']}</td>
                <td>{r['out_att']}</td>
                <td>{r['out_miss']}</td>
                <td>{r['out_mins']:.1f}</td>
                <td>{r['out_avg']:.1f}</td>
                <td>{r['in_count']}</td>
                <td>{r['in_att']}</td>
                <td>{r['in_miss']}</td>
                <td>{r['in_mins']:.1f}</td>
                <td>{r['in_avg']:.1f}</td>
            </tr>
        """
        
    html_content += f"""
        </tbody>
    </table>

    <div class="page-break"></div>

    <h2>Visual scatter Workday Timeline</h2>
    <div class="chart-container">
        <img src="executive_timeline.png" alt="Executive scatter timeline chart">
    </div>

</body>
</html>
"""
    
    html_report_path = os.path.join(chart_out_dir, "agent_executive_report.html")
    with open(html_report_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"Generated HTML report: {html_report_path}")
    print(f"Generated chart image: {chart_img_path}")

    # Compile to PDF using WeasyPrint if available
    try:
        from weasyprint import HTML
        pdf_path = os.path.join(chart_out_dir, "agent_executive_report.pdf")
        HTML(html_report_path).write_pdf(pdf_path)
        print(f"Successfully generated PDF report using WeasyPrint: {pdf_path}")
    except ImportError:
        print("WeasyPrint is not installed in the python environment. HTML output has been generated, which can be printed as A4 Landscape PDF from your browser.")

if __name__ == "__main__":
    main()
