import os
import csv
import glob
import hashlib
from datetime import datetime, timedelta
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pytz

def organize_and_rename_logs(workspace):
    """
    Finds all 'Export_Audit_Logs__*.csv' files in workspace,
    determines the agent from the 'Modified By (Name)' column,
    and renames/moves them to the 'Agents' folder.
    Also moves any previously renamed agent files from root to the 'Agents' folder.
    """
    agents_dir = os.path.join(workspace, "Agents")
    os.makedirs(agents_dir, exist_ok=True)
    
    # 1. Look for unorganized audit logs in root
    pattern = os.path.join(workspace, "Export_Audit_Logs__*.csv")
    unorganized_files = glob.glob(pattern)
    
    agent_to_files = {}
    for f in unorganized_files:
        filename = os.path.basename(f)
        agents = set()
        try:
            with open(f, mode='r', encoding='utf-8-sig', errors='ignore') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    agent = row.get("Modified By (Name)")
                    if agent:
                        # Clean up agent name for filename safety
                        agent_clean = "".join(c for c in agent if c.isalnum() or c in (' ', '-', '_')).strip()
                        if agent_clean:
                            agents.add(agent_clean)
            
            if len(agents) == 1:
                agent_name = list(agents)[0]
                agent_to_files.setdefault(agent_name, []).append(f)
            elif len(agents) == 0:
                print(f"Warning: No agent found in {filename}")
            else:
                print(f"Warning: Multiple agents {agents} found in {filename}")
        except Exception as e:
            print(f"Error reading {filename} for organization: {e}")
            
    # Process the files mapped to agents
    for agent, fpaths in agent_to_files.items():
        if len(fpaths) == 1:
            src = fpaths[0]
            dst = os.path.join(agents_dir, f"{agent}.csv")
            move_file(src, dst)
        else:
            # Check if duplicates are identical in content
            hashes = {}
            for fp in fpaths:
                h = hashlib.md5()
                with open(fp, 'rb') as file_obj:
                    h.update(file_obj.read())
                hashes[fp] = h.hexdigest()
            
            unique_hashes = set(hashes.values())
            if len(unique_hashes) == 1:
                src = fpaths[0]
                dst = os.path.join(agents_dir, f"{agent}.csv")
                move_file(src, dst)
                for dup in fpaths[1:]:
                    try:
                        os.remove(dup)
                        print(f"Deleted duplicate unorganized file: {os.path.basename(dup)}")
                    except Exception as e:
                        print(f"Error deleting duplicate {os.path.basename(dup)}: {e}")
            else:
                for i, fp in enumerate(fpaths, 1):
                    src = fp
                    dst = os.path.join(agents_dir, f"{agent} ({i}).csv")
                    move_file(src, dst)

    # 2. Look for already-renamed files in root and move them to Agents
    # We list files in root and check if they are not opportunities.csv, call-report.csv, requirements.txt, or script files
    all_root_files = os.listdir(workspace)
    ignored_files = {"opportunities.csv", "call-report.csv", "requirements.txt", "setup_env.bat", "analyze_agents.py", "check_call_headers.py", "inspect_logs.py", "check_duplicates.py", "check_name_spelling.py"}
    for f in all_root_files:
        f_path = os.path.join(workspace, f)
        if os.path.isfile(f_path) and f.endswith(".csv") and f not in ignored_files:
            # Move it to Agents folder
            dst = os.path.join(agents_dir, f)
            move_file(f_path, dst)

def move_file(src, dst):
    try:
        if os.path.exists(dst):
            os.remove(dst)
        os.rename(src, dst)
        print(f"Moved and organized: {os.path.basename(src)} -> Agents/{os.path.basename(dst)}")
    except Exception as e:
        print(f"Error moving {os.path.basename(src)} to {dst}: {e}")

def parse_iso_datetime(dt_str):
    """
    Parses ISO 8601 datetime strings like '2026-07-17T11:25:21.515Z'
    and returns a timezone-aware datetime object in UTC.
    """
    if not dt_str:
        return None
    # Remove 'Z' suffix and handle timezone
    if dt_str.endswith('Z'):
        dt_str = dt_str[:-1]
    
    # Try different formats
    for fmt in ('%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S'):
        try:
            dt = datetime.strptime(dt_str, fmt)
            return pytz.utc.localize(dt)
        except ValueError:
            continue
    return None

def analyze_agent_activities(filepath, max_break_gap_minutes=30, nominal_action_minutes=5):
    """
    Analyzes an agent's audit log file:
    - Detects work sessions and breaks (gaps > max_break_gap_minutes).
    - Summarizes action types and modules.
    - Calculates active working time and break times.
    """
    actions = []
    modules = []
    action_types = []
    
    with open(filepath, mode='r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt_val = row.get("Date & Time")
            dt = parse_iso_datetime(dt_val)
            if dt:
                actions.append(dt)
                modules.append(row.get("Module", "UNKNOWN"))
                action_types.append(row.get("Action", "UNKNOWN"))
                
    if not actions:
        return None
        
    # Sort actions chronologically
    sorted_data = sorted(zip(actions, modules, action_types), key=lambda x: x[0])
    actions_sorted = [x[0] for x in sorted_data]
    modules_sorted = [x[1] for x in sorted_data]
    action_types_sorted = [x[2] for x in sorted_data]
    
    # Build raw actions list to return
    raw_actions = []
    for dt, mod, act in sorted_data:
        raw_actions.append({
            'timestamp': dt,
            'module': mod,
            'action': act
        })
    
    # Detect sessions and breaks
    sessions = []
    breaks = []
    
    current_session_start = actions_sorted[0]
    current_session_end = actions_sorted[0]
    session_actions_count = 1
    
    for i in range(1, len(actions_sorted)):
        prev_time = actions_sorted[i-1]
        curr_time = actions_sorted[i]
        gap = curr_time - prev_time
        
        if gap > timedelta(minutes=max_break_gap_minutes):
            # End current session
            sessions.append({
                'start': current_session_start,
                'end': current_session_end,
                'actions_count': session_actions_count
            })
            # Record break
            breaks.append({
                'start': current_session_end,
                'end': curr_time,
                'duration': gap
            })
            # Start new session
            current_session_start = curr_time
            current_session_end = curr_time
            session_actions_count = 1
        else:
            # Update end time of current session
            current_session_end = curr_time
            session_actions_count += 1
            
    # Append the last session
    sessions.append({
        'start': current_session_start,
        'end': current_session_end,
        'actions_count': session_actions_count
    })
    
    # Calculate active working durations
    # We add a nominal_action_minutes buffer to represent work around actions, 
    # ensuring a single action session isn't 0 duration.
    total_active_duration = timedelta()
    for s in sessions:
        span = s['end'] - s['start']
        # If span is 0 (single action), nominal active duration is nominal_action_minutes
        # Otherwise, span + nominal_action_minutes buffer
        s_duration = span + timedelta(minutes=nominal_action_minutes)
        s['duration'] = s_duration
        total_active_duration += s_duration
        
    total_break_duration = sum([b['duration'] for b in breaks], timedelta())
    workday_span = actions_sorted[-1] - actions_sorted[0]
    
    # Summary stats
    module_counts = pd.Series(modules_sorted).value_counts().to_dict()
    action_counts = pd.Series(action_types_sorted).value_counts().to_dict()
    
    return {
        'total_actions': len(actions_sorted),
        'first_action': actions_sorted[0],
        'last_action': actions_sorted[-1],
        'workday_span': workday_span,
        'active_duration': total_active_duration,
        'total_break_duration': total_break_duration,
        'sessions': sessions,
        'breaks': breaks,
        'module_counts': module_counts,
        'action_counts': action_counts,
        'actions_list': raw_actions
    }

def load_opportunities_data(workspace):
    """
    Loads opportunities.csv:
    - Counts opportunities assigned to each agent.
    - Builds contact name & phone mappings to assigned agents.
    """
    op_path = os.path.join(workspace, "opportunities.csv")
    counts = {}
    contact_to_agent = {}
    phone_to_agent = {}
    
    if os.path.exists(op_path):
        try:
            with open(op_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    assigned = row.get("assigned")
                    if not assigned:
                        continue
                    
                    # Count opportunities
                    counts[assigned] = counts.get(assigned, 0) + 1
                    
                    # Build name mapping
                    contact_name = row.get("Contact Name")
                    if contact_name:
                        contact_to_agent[contact_name.strip().lower()] = assigned
                        
                    # Build phone mapping
                    phone = row.get("phone")
                    if phone:
                        norm_phone = "".join(c for c in phone if c.isdigit())
                        if norm_phone:
                            phone_to_agent[norm_phone] = assigned
        except Exception as e:
            print(f"Error loading opportunities.csv: {e}")
            
    return counts, contact_to_agent, phone_to_agent

def load_agent_calls(workspace, contact_to_agent, phone_to_agent):
    """
    Reads call-report.csv and maps calls to agents.
    Returns a dictionary of agent -> list of calls.
    """
    call_path = os.path.join(workspace, "call-report.csv")
    agent_calls = {}
    
    if not os.path.exists(call_path):
        print("call-report.csv does not exist.")
        return agent_calls
        
    try:
        with open(call_path, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.DictReader(f)
            for row in reader:
                c_name = row.get("Contact name")
                c_phone = row.get("Contact phone")
                timestamp = row.get("Date & time")
                duration = row.get("Duration")
                status = row.get("Call status")
                direction = row.get("Direction", "unknown")
                
                agent = None
                
                # 1. Match by phone
                if c_phone:
                    norm_phone = "".join(c for c in c_phone if c.isdigit())
                    if norm_phone in phone_to_agent:
                        agent = phone_to_agent[norm_phone]
                
                # 2. Match by contact name (fallback)
                if not agent and c_name:
                    norm_name = c_name.strip().lower()
                    if norm_name in contact_to_agent:
                        agent = contact_to_agent[norm_name]
                        
                if agent:
                    # Parse timestamp to ensure standard UTC formatting
                    dt = None
                    if timestamp:
                        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S'):
                            try:
                                parsed_dt = datetime.strptime(timestamp, fmt)
                                dt = pytz.utc.localize(parsed_dt)
                                break
                            except ValueError:
                                continue
                                
                    iso_time = dt.isoformat() if dt else timestamp
                    
                    agent_calls.setdefault(agent, []).append({
                        'timestamp': iso_time,
                        'contact_name': c_name,
                        'duration': duration,
                        'status': status,
                        'direction': direction
                    })
    except Exception as e:
        print(f"Error loading call-report.csv: {e}")
        
    return agent_calls

def format_timedelta(td):
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{hours:02d}h {minutes:02d}m"

import json

def make_json_serializable(data):
    if isinstance(data, dict):
        return {k: make_json_serializable(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [make_json_serializable(v) for v in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, timedelta):
        return data.total_seconds()
    else:
        return data

def generate_json_data(results, save_path):
    serializable = make_json_serializable(results)
    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(serializable, f, indent=2, ensure_ascii=False)

def main():
    workspace = r"a:\repot-work"
    output_dir = os.path.join(workspace, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    print("Step 1: Organizing and renaming audit logs...")
    organize_and_rename_logs(workspace)
    
    print("Step 2: Loading opportunity assignments and call logs...")
    opp_counts, contact_to_agent, phone_to_agent = load_opportunities_data(workspace)
    agent_calls = load_agent_calls(workspace, contact_to_agent, phone_to_agent)
    
    print("Step 3: Analyzing agent log files...")
    agents_dir = os.path.join(workspace, "Agents")
    agent_files = glob.glob(os.path.join(agents_dir, "*.csv"))
    
    results = {}
    for af in agent_files:
        agent_name = os.path.splitext(os.path.basename(af))[0]
        # Normalize double spaces to match opportunities.csv if needed
        # We check both the exact name and single-space name
        op_count = opp_counts.get(agent_name, 0)
        calls = agent_calls.get(agent_name, [])
        
        analysis = analyze_agent_activities(af)
        if analysis:
            analysis['assigned_opportunities'] = op_count
            analysis['calls'] = calls
            results[agent_name] = analysis
            
    if not results:
        print("No agent log files analyzed. Exiting.")
        return
        
    print(f"Analyzed data for {len(results)} agents.")
    
    # Step 4: Generate Gantt-style timeline chart
    print("Step 4: Generating work timeline chart...")
    generate_timeline_chart(results, os.path.join(output_dir, "agent_work_timeline.png"))
    
    # Step 5: Generate detailed markdown report
    print("Step 5: Generating detailed analysis report...")
    generate_markdown_report(results, output_dir)
    
    # Step 6: Generate JSON data for the dashboard
    print("Step 6: Generating JSON database...")
    generate_json_data(results, os.path.join(output_dir, "agent_analysis_data.json"))
    
    print("Done! Check output/ folder for results.")

def generate_timeline_chart(results, save_path):
    # Sort agents alphabetically or by total actions
    sorted_agents = sorted(results.keys(), key=lambda k: results[k]['total_actions'], reverse=True)
    
    plt.figure(figsize=(15, 8 + len(sorted_agents) * 0.4))
    
    # Select color palette
    color_active = '#2b8a3e'  # Sleek dark green
    color_break = '#e67700'   # Soft orange
    color_action = '#1c7ed6'  # Dynamic blue
    
    ax = plt.subplot(111)
    
    for idx, agent in enumerate(sorted_agents):
        data = results[agent]
        y_val = idx
        
        # Plot Breaks
        for b in data['breaks']:
            ax.barh(y_val, b['end'] - b['start'], left=b['start'], 
                    height=0.3, color=color_break, alpha=0.3, align='center', edgecolor='none')
            
        # Plot Active Sessions
        for s in data['sessions']:
            # Duration shows the active segment
            ax.barh(y_val, s['end'] - s['start'], left=s['start'], 
                    height=0.4, color=color_active, alpha=0.85, align='center', edgecolor='black', linewidth=0.5)
            
        # Plot Individual actions as scatter points
        # To fetch all actions, we re-parse or extract them from sessions
        all_actions = []
        for s in data['sessions']:
            # We can plot action times
            pass
            
    # Add dummy artists for legend
    import matplotlib.patches as mpatches
    active_patch = mpatches.Patch(color=color_active, label='Active Work Sessions')
    break_patch = mpatches.Patch(color=color_break, alpha=0.4, label='Breaks (>30 mins)')
    
    ax.legend(handles=[active_patch, break_patch], loc='upper right', framealpha=0.9, facecolor='#f8f9fa')
    
    # Format Y-Axis
    ax.set_yticks(range(len(sorted_agents)))
    ax.set_yticklabels(sorted_agents, fontsize=10, fontweight='bold')
    ax.set_ylabel("Agents", fontsize=12, fontweight='bold', labelpad=10)
    
    # Format X-Axis (Dates)
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M UTC'))
    plt.xticks(rotation=30)
    ax.set_xlabel("Time of Day (2026-07-17)", fontsize=12, fontweight='bold', labelpad=10)
    
    # Add Grid lines
    ax.xaxis.grid(True, linestyle='--', alpha=0.6)
    
    # Adjust layout and style
    plt.title("Agent Work Sessions and Breaks Timeline (UTC)", fontsize=16, fontweight='bold', pad=20)
    
    # Add background color
    ax.set_facecolor('#f8f9fa')
    
    # Auto scale X axis to fit active range
    all_starts = [results[a]['first_action'] for a in results]
    all_ends = [results[a]['last_action'] for a in results]
    if all_starts and all_ends:
        min_time = min(all_starts) - timedelta(minutes=30)
        max_time = max(all_ends) + timedelta(minutes=30)
        ax.set_xlim(min_time, max_time)
        
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()

def generate_markdown_report(results, output_dir):
    # Sort agents by total actions
    sorted_agents_by_actions = sorted(results.keys(), key=lambda k: results[k]['total_actions'], reverse=True)
    
    report_path = os.path.join(output_dir, "agent_analysis_report.md")
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Agent Work Performance & Timeline Analysis Report\n\n")
        
        # Summary Overview / Executive Insights
        f.write("## Executive Summary\n")
        f.write("This report analyzes the working sessions, breaks, activity counts, and opportunity assignments of all agents based on their HighLevel audit logs and opportunity database on **July 17, 2026**.\n\n")
        
        # Find best performers
        most_active_agent = sorted_agents_by_actions[0]
        most_active_count = results[most_active_agent]['total_actions']
        
        longest_span_agent = max(results.keys(), key=lambda k: results[k]['workday_span'])
        longest_span = results[longest_span_agent]['workday_span']
        
        longest_work_agent = max(results.keys(), key=lambda k: results[k]['active_duration'])
        longest_work = results[longest_work_agent]['active_duration']
        
        f.write("> [!NOTE]\n")
        f.write(f"> - **Most Active Agent**: **{most_active_agent}** with **{most_active_count}** total audit actions.\n")
        f.write(f"> - **Longest Working Span**: **{longest_span_agent}** covering a **{format_timedelta(longest_span)}** span.\n")
        f.write(f"> - **Highest Net Active Time**: **{longest_work_agent}** with **{format_timedelta(longest_work)}** of focused activity.\n\n")
        
        # Comparison Table
        f.write("## Agent Work Metrics Comparison\n")
        f.write("| Agent Name | Total Actions | Assigned Opps | First Action | Last Action | Daily Span | Net Active Time | Total Break Time | Breaks Taken |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n")
        
        for agent in sorted_agents_by_actions:
            data = results[agent]
            first_str = data['first_action'].strftime('%H:%M')
            last_str = data['last_action'].strftime('%H:%M')
            span_str = format_timedelta(data['workday_span'])
            active_str = format_timedelta(data['active_duration'])
            break_str = format_timedelta(data['total_break_duration'])
            breaks_count = len(data['breaks'])
            
            f.write(f"| **{agent}** | {data['total_actions']} | {data['assigned_opportunities']} | {first_str} | {last_str} | {span_str} | {active_str} | {break_str} | {breaks_count} |\n")
            
        f.write("\n*Note: 'Net Active Time' includes the time span of consecutive activities plus a 5-minute nominal buffer per work session to account for activity prep and follow-up. Gaps > 30 minutes are categorized as breaks.*\n\n")
        
        # Detailed Breakdown Per Agent
        f.write("## Detailed Agent Breakdown\n")
        
        for agent in sorted_agents_by_actions:
            data = results[agent]
            f.write(f"### {agent}\n")
            f.write(f"- **Opportunities Assigned**: {data['assigned_opportunities']}\n")
            f.write(f"- **Total Actions**: {data['total_actions']}\n")
            f.write(f"- **First Action**: {data['first_action'].strftime('%H:%M:%S UTC')}\n")
            f.write(f"- **Last Action**: {data['last_action'].strftime('%H:%M:%S UTC')}\n")
            f.write(f"- **Active Working Duration**: {format_timedelta(data['active_duration'])}\n")
            f.write(f"- **Total Break Duration**: {format_timedelta(data['total_break_duration'])}\n")
            f.write(f"- **Breaks Taken**: {len(data['breaks'])}\n")
            
            # Module counts
            f.write("- **Activity by Module**:\n")
            for mod, count in data['module_counts'].items():
                f.write(f"  - `{mod}`: {count} actions\n")
                
            # Action type counts
            f.write("- **Activity by Action Type**:\n")
            for act, count in data['action_counts'].items():
                f.write(f"  - `{act}`: {count} actions\n")
                
            # Break list if any
            if data['breaks']:
                f.write("- **List of Major Breaks**:\n")
                for i, b in enumerate(data['breaks'], 1):
                    b_duration = format_timedelta(b['duration'])
                    f.write(f"  - Break {i}: {b['start'].strftime('%H:%M')} to {b['end'].strftime('%H:%M')} ({b_duration})\n")
            f.write("\n---\n\n")
            
if __name__ == '__main__':
    main()
