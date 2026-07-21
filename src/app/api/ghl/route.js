import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { endpoint, token, params } = await req.json();

    const authToken = token || process.env.GHL_TOKEN || process.env.NEXT_PUBLIC_GHL_TOKEN;
    
    if (!endpoint || !authToken) {
      return NextResponse.json({ error: "Missing GHL API endpoint or authorization token" }, { status: 400 });
    }

    const finalParams = { ...(params || {}) };
    const locationId = finalParams.locationId || process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
    if (locationId) {
      finalParams.locationId = locationId;
    }

    // Build the request URL
    const url = new URL(`https://services.leadconnectorhq.com${endpoint}`);
    Object.keys(finalParams).forEach((key) => {
      if (finalParams[key] !== undefined && finalParams[key] !== null) {
        url.searchParams.append(key, String(finalParams[key]));
      }
    });

    const headers = {
      "Authorization": `Bearer ${authToken}`,
      "Version": "2021-04-15", // Standard GHL API Version header
      "Accept": "application/json",
      "Content-Type": "application/json"
    };

    const response = await fetch(url.toString(), {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `GHL API Error (${response.status}): ${errText || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GHL Proxy Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
