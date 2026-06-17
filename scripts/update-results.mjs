// HM 2026 — sjálfvirk úrslitauppfærsla (keyrt af GitHub Actions á 30 mín fresti).
// Sækir lokaúrslit af Wikipedia (wikitext) og uppfærir Supabase gegnum REST.
// Engir npm-pakkar — notar innbyggt fetch (Node 20).
//
// Wikipedia geymir leikina sem:
//   |team1={{#invoke:flag|fb-rt|MEX}}
//   |score={{score link|...|2–0}}
//   |team2={{#invoke:flag|fb|RSA}}
// þ.e. FIFA-kóðar liggja beint fyrir — engin nafnapörun þarf.

const SUPABASE_URL = "https://ahtmbbbazbqvxxjkvsma.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodG1iYmJhemJxdnh4amt2c21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzQ2OTksImV4cCI6MjA5NzExMDY5OX0.s7q5i6tkNt9Kmb70gBm7ewByFDxNjnUIaap_gqs9uA0";
const BOT = process.env.SUPABASE_BOT_TOKEN;
if (!BOT) { console.error("Vantar SUPABASE_BOT_TOKEN"); process.exit(1); }

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

// Sækir wikitext riðils og les leiki sem hafa lokaúrslit (FIFA-kóðar + skor)
async function fetchGroupResults(letter) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_Group_${letter}&prop=wikitext&format=json&formatversion=2&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": "HM2026-Spaleikur/1.0 (Verkhonnun)" } });
  if (!res.ok) throw new Error(`wiki ${letter} -> ${res.status}`);
  const wt = (await res.json())?.parse?.wikitext || "";
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

(async () => {
  const pending = await sb("matches?select=id,grp,home_code,away_code,dt&status=neq.finished");
  const now = Date.now();
  const ripe = pending.filter((m) => now - new Date(m.dt).getTime() > 95 * 60 * 1000);
  if (ripe.length === 0) { console.log("engin ný úrslit (engir leikir tilbúnir)"); return; }

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
  console.log(updated ? `Uppfærði ${updated} úrslit.` : "engin ný úrslit fundin.");
})().catch((e) => { console.error(e); process.exit(1); });
