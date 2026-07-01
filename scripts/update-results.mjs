// HM 2026 — sjálfvirk úrslitauppfærsla (keyrt af GitHub Actions á 30 mín fresti).
// Sækir lið + lokaúrslit af Wikipedia (wikitext) og uppfærir Supabase gegnum REST.
// Engir npm-pakkar — notar innbyggt fetch (Node 20).
//
// RIÐLAR: Wikipedia geymir leikina sem
//   |team1={{#invoke:flag|fb-rt|MEX}} |score={{score link|...|2–0}} |team2={{#invoke:flag|fb|RSA}}
//   þ.e. FIFA-kóðar liggja beint fyrir — engin nafnapörun þarf.
//
// ÚTSLÁTTUR: Wikipedia setur liðin í útsláttartréð jafnóðum og þau ráðast. Hver leikur er
//   í kafla með stöðugu kennimerki (R32-1..16, R16-1..8, QF1..4, SF1..2, 3rd, Final) sem
//   inniheldur football box með team1/team2 (FIFA-kóðar) og skori (eða "Match NN" óspilað).
//   Við pörum kennimerki -> leik í okkar grunni (KO_MAP, krossstaðfest við FIFA-leikjanúmer
//   + völl/dagsetningu). Liðin eru sett um leið og þau þekkjast (svo hægt sé að spá), og
//   úrslit þegar skor birtist.

const SUPABASE_URL = "https://ahtmbbbazbqvxxjkvsma.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodG1iYmJhemJxdnh4amt2c21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzQ2OTksImV4cCI6MjA5NzExMDY5OX0.s7q5i6tkNt9Kmb70gBm7ewByFDxNjnUIaap_gqs9uA0";
const BOT = process.env.SUPABASE_BOT_TOKEN;

const RIPE_MS = 95 * 60 * 1000; // leikur "tilbúinn" 95 mín eftir að flautað er til leiks

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`rpc ${fn} -> ${res.status} ${await res.text()}`);
}

async function fetchWikitext(page) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": "HM2026-Spaleikur/1.0 (Verkhonnun)" } });
  if (!res.ok) throw new Error(`wiki ${page} -> ${res.status}`);
  return (await res.json())?.parse?.wikitext || "";
}

// ─────────────────────────── Riðlakeppni ───────────────────────────
async function fetchGroupResults(letter) {
  const wt = await fetchWikitext(`2026 FIFA World Cup Group ${letter}`);
  const results = {};
  for (const b of wt.split(/\|\s*team1\s*=/i).slice(1)) {
    const t1 = b.match(/^\s*\{\{#invoke:flag\|[a-z-]+\|([A-Za-z]{3})/i);
    const t2 = b.match(/\|\s*team2\s*=\s*\{\{#invoke:flag\|[a-z-]+\|([A-Za-z]{3})/i);
    const sc = b.match(/\|\s*score\s*=\s*\{\{score link\|[^}|]*\|\s*(\d+)\s*[–—-]\s*(\d+)/i);
    if (t1 && t2 && sc) {
      results[`${t1[1].toUpperCase()}-${t2[1].toUpperCase()}`] = [Number(sc[1]), Number(sc[2])];
    }
  }
  return results;
}

async function updateGroups(ripe, now) {
  let updated = 0;
  for (const g of [...new Set(ripe.map((m) => m.grp))]) {
    let results;
    try { results = await fetchGroupResults(g); }
    catch (e) { console.log(`Riðill ${g}: gat ekki sótt (${e.message})`); continue; }
    for (const m of ripe.filter((x) => x.grp === g)) {
      const sc = results[`${m.home_code}-${m.away_code}`];
      if (!sc) continue;
      try {
        await rpc("admin_set_result", { p_token: BOT, p_match: m.id, p_home: sc[0], p_away: sc[1], p_status: "finished", p_minute: null });
        console.log(`✓ ${m.grp}: ${m.home_code} ${sc[0]}-${sc[1]} ${m.away_code} (id ${m.id})`);
        updated++;
      } catch (e) { console.log(`✗ id ${m.id}: ${e.message}`); }
    }
  }
  return updated;
}

// ─────────────────────────── Útsláttarkeppni ───────────────────────────
// Kennimerki Wikipedia-kafla -> leikur í okkar grunni. Krossstaðfest við FIFA-leikjanúmer
// (R32-1 = leikur 73 ... Final = leikur 104) og völl/dagsetningu hvers leiks.
const KO_MAP = {
  "R32-1": 145, "R32-2": 147, "R32-3": 146, "R32-4": 148,
  "R32-5": 149, "R32-6": 150, "R32-7": 151, "R32-8": 152,
  "R32-9": 153, "R32-10": 154, "R32-11": 155, "R32-12": 156,
  "R32-13": 157, "R32-14": 158, "R32-15": 159, "R32-16": 160,
  "R16-1": 161, "R16-2": 162, "R16-3": 163, "R16-4": 164,
  "R16-5": 165, "R16-6": 166, "R16-7": 167, "R16-8": 168,
  "QF1": 169, "QF2": 170, "QF3": 171, "QF4": 172,
  "SF1": 173, "SF2": 174, "3rd": 175, "Final": 176,
};

const KO_PAGES = [
  "2026 FIFA World Cup round of 32",   // R32-1..16
  "2026 FIFA World Cup knockout stage", // R16-1..8, QF1..4, SF1..2, 3rd
  "2026 FIFA World Cup final",          // Final
];

// Les football box hvers kafla: team1/team2 (FIFA-kóðar, null ef enn óráðið) + skor (null óspilað)
function parseKnockoutSections(wt, into) {
  const re = /<section begin="([^"]+)"\s*\/>([\s\S]*?)<section end="\1"\s*\/>/g;
  let m;
  while ((m = re.exec(wt))) {
    const label = m[1];
    if (!(label in KO_MAP)) continue;
    const body = m[2];
    // Liðin: lesin beint af team1=/team2= línum (óráðin lið hafa engan 3-stafa kóða)
    const t1 = body.match(/\|\s*team1\s*=[^\n]*?#invoke:flag\|[a-z-]+\|([A-Za-z]{3})/i);
    const t2 = body.match(/\|\s*team2\s*=[^\n]*?#invoke:flag\|[a-z-]+\|([A-Za-z]{3})/i);
    // Skor: score link sýnir "Match NN" óspilað, en "2–1" þegar lokið
    const sc = body.match(/\|\s*score\s*=\s*\{\{score link\|[^}|]*\|\s*(\d+)\s*[–—-]\s*(\d+)/i);
    // Vítakeppni (ef jafnt eftir framlengingu): |penaltyscore=4–3  (heima–úti)
    const pen = body.match(/\|\s*penaltyscore\s*=\s*(\d+)\s*[–—-]\s*(\d+)/i);
    into[label] = {
      home: t1 ? t1[1].toUpperCase() : null,
      away: t2 ? t2[1].toUpperCase() : null,
      score: sc ? [Number(sc[1]), Number(sc[2])] : null,
      pens: pen ? [Number(pen[1]), Number(pen[2])] : null,
    };
  }
}

async function updateKnockout(koMatches, now) {
  const data = {};
  for (const page of KO_PAGES) {
    try { parseKnockoutSections(await fetchWikitext(page), data); }
    catch (e) { console.log(`Útsláttur — síða '${page}': gat ekki sótt (${e.message})`); }
  }
  const byId = {};
  for (const [label, id] of Object.entries(KO_MAP)) byId[id] = label;

  let teamsSet = 0, resultsSet = 0;
  for (const m of koMatches) {
    const label = byId[m.id];
    const d = label && data[label];
    if (!d) continue;

    // 1) Setja liðin um leið og bæði þekkjast (svo hægt sé að spá) — aðeins ef breyting
    if (d.home && d.away && (d.home !== m.home_code || d.away !== m.away_code)) {
      try {
        await rpc("admin_set_teams", { p_token: BOT, p_match: m.id, p_home: d.home, p_away: d.away });
        console.log(`⚽ ${label}: lið sett ${d.home}–${d.away} (id ${m.id})`);
        teamsSet++;
        m.home_code = d.home; m.away_code = d.away;
      } catch (e) { console.log(`✗ lið id ${m.id}: ${e.message}`); }
    }

    // 2) Skrá úrslit þegar skor liggur fyrir, liðin þekkt og leikur tilbúinn
    const ripe = now - new Date(m.dt).getTime() > RIPE_MS;
    if (d.score && m.home_code && m.away_code && ripe) {
      try {
        await rpc("admin_set_result", {
          p_token: BOT, p_match: m.id, p_home: d.score[0], p_away: d.score[1],
          p_status: "finished", p_minute: null,
          p_pen_home: d.pens ? d.pens[0] : null, p_pen_away: d.pens ? d.pens[1] : null,
        });
        const pen = d.pens ? ` (víti ${d.pens[0]}-${d.pens[1]})` : "";
        console.log(`✓ ${label}: ${m.home_code} ${d.score[0]}-${d.score[1]} ${m.away_code}${pen} (id ${m.id})`);
        resultsSet++;
      } catch (e) { console.log(`✗ úrslit id ${m.id}: ${e.message}`); }
    }
  }
  return { teamsSet, resultsSet };
}

// ─────────────────────────── Keyrsla ───────────────────────────
async function main() {
  if (!BOT) { console.error("Vantar SUPABASE_BOT_TOKEN"); process.exit(1); }
  const pending = await sb("matches?select=id,grp,stage,home_code,away_code,dt,status&status=neq.finished");
  const now = Date.now();

  // Riðlaleikir tilbúnir til úrslitaskráningar
  const ripeGroup = pending.filter((m) => m.grp && now - new Date(m.dt).getTime() > RIPE_MS);
  const groupUpdated = ripeGroup.length ? await updateGroups(ripeGroup, now) : 0;

  // Útsláttarleikir (lið + úrslit)
  const ko = pending.filter((m) => m.stage && m.stage !== "group");
  const koRes = ko.length ? await updateKnockout(ko, now) : { teamsSet: 0, resultsSet: 0 };

  const parts = [];
  if (groupUpdated) parts.push(`${groupUpdated} riðlaúrslit`);
  if (koRes.teamsSet) parts.push(`${koRes.teamsSet} útsláttar-liðapörun`);
  if (koRes.resultsSet) parts.push(`${koRes.resultsSet} útsláttarúrslit`);
  console.log(parts.length ? `Uppfærði: ${parts.join(", ")}.` : "Engar nýjar uppfærslur.");
}

export { parseKnockoutSections, fetchGroupResults, KO_MAP, KO_PAGES };

// Keyra aðeins þegar skráin er ræst beint (ekki við import í prófunum)
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
