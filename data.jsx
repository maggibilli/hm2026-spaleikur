/* global window */
// ───────────────────────────────────────────────────────────
// HM 2026 — Supabase gagnalag fyrir spáleik Verkhönnunar
// (engin tilbúin gögn lengur — allt kemur úr gagnagrunni)
// ───────────────────────────────────────────────────────────

// Stigakerfi (speglar hm_score í gagnagrunni)
const SCORING = {
  outcome: 3,      // réttur sigurvegari eða jafntefli
  oneScore: 1,     // rétt markatala annars liðsins (til viðbótar)
  exact: 7,        // nákvæm úrslit
  groupAdvance: 5, // rétt lið áfram úr riðli
  champion: 25,    // réttur heimsmeistari
};

// Supabase-tengill (opinber lykill — öruggt að birta)
const sb = window.supabase.createClient(window.SUPA_URL, window.SUPA_KEY);

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) throw new Error(error.message || "Eitthvað fór úrskeiðis");
  return data;
}

const api = {
  join: (code, name, pin) => rpc("join_game", { p_code: code, p_name: name, p_pin: pin }),
  getMe: (token) => rpc("get_me", { p_token: token }),
  savePrediction: (token, match, h, a) =>
    rpc("save_prediction", { p_token: token, p_match: match, p_home: h, p_away: a }),
  saveGroupPick: (token, grp, picks) =>
    rpc("save_group_pick", { p_token: token, p_grp: grp, p_picks: picks }),
  saveChampion: (token, team) => rpc("save_champion", { p_token: token, p_team: team }),
  leaderboard: () => rpc("leaderboard"),
  // Stjórnun
  adminSetResult: (token, match, h, a, status, minute) =>
    rpc("admin_set_result", { p_token: token, p_match: match, p_home: h, p_away: a, p_status: status, p_minute: minute == null ? null : minute }),
  adminAddPlayer: (token, name, team) =>
    rpc("admin_add_player", { p_token: token, p_name: name, p_team: team || null }),
  adminRemovePlayer: (token, id) => rpc("admin_remove_player", { p_token: token, p_id: id }),
  adminSetCode: (token, code) => rpc("admin_set_code", { p_token: token, p_access: code }),
  adminList: (token) => rpc("admin_list", { p_token: token }),
};

// Hleður liðum + leikjum inn í window.TEAMS / window.GROUPS / window.MATCHES
async function loadStatic() {
  const [teamsRes, matchesRes] = await Promise.all([
    sb.from("teams").select("*"),
    sb.from("matches").select("*").order("dt", { ascending: true }),
  ]);
  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);

  const TEAMS = {};
  const GROUPS = {};
  teamsRes.data.forEach((t) => {
    TEAMS[t.code] = { name: t.name, flag: t.flag, str: t.str, grp: t.grp };
    if (t.grp) (GROUPS[t.grp] = GROUPS[t.grp] || []).push(t.code);
  });
  Object.keys(GROUPS).forEach((g) => GROUPS[g].sort((a, b) => TEAMS[b].str - TEAMS[a].str));
  const GROUPS_SORTED = {};
  Object.keys(GROUPS).sort().forEach((g) => (GROUPS_SORTED[g] = GROUPS[g]));

  const MATCHES = matchesRes.data.map((m) => ({
    id: m.id,
    grp: m.grp,
    stage: m.stage,
    h: m.home_code,
    a: m.away_code,
    dt: m.dt,
    venue: m.venue,
    status: m.status,
    minute: m.minute,
    res: m.status === "finished" || m.status === "live" ? [m.home_score, m.away_score] : undefined,
  }));

  Object.assign(window, { TEAMS, GROUPS: GROUPS_SORTED, MATCHES });
}

Object.assign(window, { SCORING, sb, api, loadStatic });
