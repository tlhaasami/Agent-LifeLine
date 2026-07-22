import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "src/data/unresolved_queries.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    let queries = [];
    try {
      queries = JSON.parse(content);
    } catch (e) {
      queries = [];
    }
    return NextResponse.json(queries);
  } catch (error) {
    console.error("GET unresolved queries error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { query, timestamp } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "src/data/unresolved_queries.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: true, message: "File does not exist" });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    let queries = [];
    try {
      queries = JSON.parse(content);
    } catch (e) {
      queries = [];
    }

    // Filter out the resolved item
    const updated = queries.filter(q => {
      if (timestamp) {
        return !(q.query === query && q.timestamp === timestamp);
      }
      return q.query !== query;
    });

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");

    // Commit and push changes to GitHub repository in background
    exec('git add src/data/unresolved_queries.json && git commit -m "chore: resolve user AI query" && git push', (err) => {
      if (err) {
        console.warn("[Git Auto-Push] Failed to push resolved queries to GitHub:", err.message);
      } else {
        console.log("[Git Auto-Push] Successfully pushed resolved queries to GitHub.");
      }
    });

    return NextResponse.json({ success: true, queries: updated });
  } catch (error) {
    console.error("DELETE unresolved query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
