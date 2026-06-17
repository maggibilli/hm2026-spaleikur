// HM 2026 — sjálfvirk úrslitauppfærsla (keyrt af GitHub Actions á 30 mín fresti).
// Sækir lokaúrslit af Wikipedia (wikitext) og uppfærir Supabase gegnum REST.
// Engar npm-pakkar — notar innbyggt fetch (Node 20).

const SUPABASE_URL = "https://ahtmbbbazbqvxxjkvsma.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodG1iYmJhemJxdnh4amt2c21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzQ2OTksImV4cCI6MjA5NzExMDY5OX0.s7q5i6tkNt9Kmb70gBm7ewByFDxNjnUIaap_gqs9uA0";
const BOT = process.env.SUPABASE_BOT_TOKEN;
if (!BOT) { console.error("Vantar SUPABASE_BOT_TOKEN"); process.exit(1); }

const norm = (s) => (s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]/g, "");

// Auka-samheiti fyrir liðanöfn sem Wikipedia skrifar öðruvísi en en_name í grunni
const ALIASES = {
  CZE: ["czechia", "czechrepublic"],
  KOR: ["southkorea", "korearepublic"],
  IRN: ["iran", "iriran"],
  CIV: ["ivorycoast", "cotedivoire"],
  COD: ["drcongo", "democraticrepublicofthecongo", "congodr"],
  USA: ["unitedstates", "usa", "unitedstatesofamerica"],
  CPV: ["capeverde", "caboverde"],
  TUR: ["turkey", "turkiye"],
  RSA: ["southafrica"],
  KSA: ["saudiarabia"],
};

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`rpc ${fn} -> ${res.status} ${await res.text()}`);
}

function aliasesFor(code, enName) {
  return [norm(enName), ...(ALIASES[code] || [])].filter(Boolean);
}

// Sækir wikitext fyrir riðil og les Football box sniðmát
async function fetchGroupBoxes(letter) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_Group_${letter}&prop=wikitext&format=json&formatversion=2&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": "HM2026-Spaleikur/1.0 (Verkhonnun)" } });
  if (!res.ok) throw new Error(`wiki ${letter} -> ${res.status}`);
  const data = await res.json();
  const wt = data?.parse?.wikitext || "";
  const chunks = wt.split(/\{\{\s*Football box/i).slice(1);
  const boxes = [];
  for (const c of chunks) {
    const f = (name) => {
      const m = c.match(new RegExp("\\|\\s*" + name + "\\s*=\\s*([^\\n|}]*)", "i"));
      return m ? m[1].trim() : "";
    };
    const team1 = f("team1"), team2 = f("team2"), score = f("score");
    const nums = (score.match(/\d+/g) || []).map(Number);
    if (team1 && team2 && nums.length >= 2) boxes.push({ team1, team2, hs: nums[0], as: nums[1] });
  }
  return boxes;
}

function matchCode(rawName, groupTeams) {
  const rn = norm(rawName);
  for (const t of groupTeams) {
    for (const a of t.aliases) {
      if (a && (rn.includes(a) || a.includes(rn))) return t.code;
    }
  }
  return null;
}

(async () => {
  const teams = await sb("teams?select=code,en_name");
  const aliasByCode = {};
  for (const t of teams) aliasByCode[t.code] = aliasesFor(t.code, t.en_name);

  // aðeins leikir sem eru ekki búnir og hófust fyrir a.m.k. 95 mín
  const pending = await sb("matches?select=id,grp,home_code,away_code,status,dt&status=neq.finished");
  const now = Date.now();
  const ripe = pending.filter((m) => now - new Date(m.dt).getTime() > 95 * 60 * 1000);
  if (ripe.length === 0) { console.log("engin ný úrslit (engir leikir tilbúnir)"); return; }

  const groups = [...new Set(ripe.map((m) => m.grp))];
  let updated = 0;
  for (const g of groups) {
    const groupTeamCodes = [...new Set(pending.filter((m) => m.grp === g).flatMap((m) => [m.home_code, m.away_code]))];
    const groupTeams = groupTeamCodes.map((code) => ({ code, aliases: aliasByCode[code] || [norm(code)] }));
    let boxes;
    try { boxes = await fetchGroupBoxes(g); } catch (e) { console.log(`Riðill ${g}: gat ekki sótt (${e.message})`); continue; }
    for (const m of ripe.filter((x) => x.grp === g)) {
      const box = boxes.find((b) => matchCode(b.team1, groupTeams) === m.home_code && matchCode(b.team2, groupTeams) === m.away_code);
      if (!box) continue;
      try {
        await rpc("admin_set_result", { p_token: BOT, p_match: m.id, p_home: box.hs, p_away: box.as, p_status: "finished", p_minute: null });
        console.log(`✓ ${m.grp}: ${m.home_code} ${box.hs}-${box.as} ${m.away_code} (id ${m.id})`);
        updated++;
      } catch (e) { console.log(`✗ id ${m.id}: ${e.message}`); }
    }
  }
  console.log(updated ? `Uppfærði ${updated} úrslit.` : "engin ný úrslit fundin.");
})().catch((e) => { console.error(e); process.exit(1); });
