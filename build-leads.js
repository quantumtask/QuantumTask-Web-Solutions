/**
 * build-leads.js
 * Build a lead list (name, address, phone, website, has_website) using Google Places API (Legacy endpoints).
 *
 * Requirements:
 * - Node 18+ (fetch built-in)
 * - GOOGLE_PLACES_API_KEY env var
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY="YOUR_KEY" node build-leads.js
 *
 * Notes:
 * - This uses official APIs (not scraping).
 * - Results are limited by Places API pagination (20 per page) and quotas.
 */

import fs from "node:fs";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("Missing GOOGLE_PLACES_API_KEY env var.");
  process.exit(1);
}

// === EDIT THESE ===
const CITY_BIAS = {
  // Johannesburg CBD (example). Change to your target area.
  lat: -26.2041,
  lng: 28.0473,
};
const RADIUS_METERS = 25000; // 25km bias; adjust
const QUERIES = [
  "plumber",
  "electrician",
  "air conditioning",
  "tow truck",
  "car wash",
  "cleaning service",
  "dentist",
  "hair salon",
];
// ==================

const OUTFILE = "leads.csv";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

async function httpGetJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function textSearch(query, pageToken = null) {
  const base = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  base.searchParams.set("query", `${query} near me`);
  base.searchParams.set("location", `${CITY_BIAS.lat},${CITY_BIAS.lng}`);
  base.searchParams.set("radius", String(RADIUS_METERS));
  base.searchParams.set("key", API_KEY);

  if (pageToken) base.searchParams.set("pagetoken", pageToken);

  return httpGetJson(base.toString());
}

async function placeDetails(placeId) {
  const base = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  base.searchParams.set("place_id", placeId);
  // Fields we care about
  base.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,website,business_status,url"
  );
  base.searchParams.set("key", API_KEY);

  return httpGetJson(base.toString());
}

async function run() {
  const stream = fs.createWriteStream(OUTFILE, { encoding: "utf8" });
  stream.write(
    ["query", "name", "address", "phone", "website", "has_website", "google_maps_url"].join(",") + "\n"
  );

  const seenPlaceIds = new Set();

  for (const q of QUERIES) {
    let pageToken = null;
    let page = 1;

    do {
      if (pageToken) {
        // Google requires a short wait before a next_page_token becomes valid
        await sleep(2000);
      }

      const search = await textSearch(q, pageToken);
      const results = search.results || [];
      pageToken = search.next_page_token || null;

      for (const r of results) {
        if (!r.place_id || seenPlaceIds.has(r.place_id)) continue;
        seenPlaceIds.add(r.place_id);

        let details;
        try {
          details = await placeDetails(r.place_id);
        } catch (e) {
          continue;
        }

        const d = details.result || {};
        const website = d.website || "";
        const hasWebsite = Boolean(website);

        const row = [
          q,
          d.name || "",
          d.formatted_address || "",
          d.formatted_phone_number || "",
          website,
          hasWebsite ? "true" : "false",
          d.url || "",
        ]
          .map(csvEscape)
          .join(",");

        stream.write(row + "\n");
      }

      page += 1;
      // Safety limit per query to avoid accidental huge pulls
      if (page > 5) break;

    } while (pageToken);
  }

  stream.end();
  console.log(`Done. Wrote ${OUTFILE}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
