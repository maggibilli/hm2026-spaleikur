/* global window, React, ReactDOM, api, loadStatic, MATCHES, scorePts,
   Sidebar, MobileTop, BottomNav, HomeScreen, PredictScreen, LeaderboardScreen, MineScreen, ScheduleScreen, AdminScreen,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, Icon, Splash, LoginScreen */
const { useState, useEffect, useMemo } = React;

const LS_TOKEN = "hm26_token";

// ── Litahjálp fyrir tweaks ──
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function inkFor(hex) { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? "#04140C" : "#ffffff"; }
function glowFor(hex) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},0.35)`; }

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#00FF80",
  "theme": "Völlur",
  "predictStyle": "Hnappar"
}/*EDITMODE-END*/;

const THEME_MAP = { "Völlur": "", "Nótt": "ink", "Leikvangur": "stadium" };
const PRED_MAP = { "Hnappar": "stepper", "Smella": "tap", "Sleði": "slider" };

// ───────────────────────── Megin-app (innskráð) ─────────────────────────
function App({ session, onLogout }) {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("home");
  const [preds, setPreds] = useState(session.preds || {});
  const [groupPicks, setGroupPicks] = useState(session.groupPicks || {});
  const [champion, setChampionState] = useState(session.champion || null);
  const [others, setOthers] = useState([]);
  const [dataVer, setDataVer] = useState(0);
  const [toast, setToast] = useState(null);

  const refreshMe = () => api.getMe(session.token).then((me) => {
    setPreds(me.preds || {}); setGroupPicks(me.groupPicks || {}); setChampionState(me.champion || null);
  }).catch(() => {});
  const refreshBoard = () => api.leaderboard().then((list) => setOthers(list || [])).catch(() => {});
  const refreshMatches = () => loadStatic().then(() => setDataVer((v) => v + 1)).catch(() => {});

  useEffect(() => { refreshMe(); refreshBoard(); }, []);

  // Beita litum + þema
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", t.accent);
    r.style.setProperty("--accent-ink", inkFor(t.accent));
    r.style.setProperty("--accent-glow", glowFor(t.accent));
    const th = THEME_MAP[t.theme] || "";
    if (th) r.setAttribute("data-theme", th); else r.removeAttribute("data-theme");
  }, [t.accent, t.theme]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const setPred = (id, val) => {
    const cv = [val[0] == null ? 0 : val[0], val[1] == null ? 0 : val[1]];
    setPreds((s) => ({ ...s, [id]: cv }));
    api.savePrediction(session.token, id, cv[0], cv[1])
      .then(() => setToast("Spá vistuð"))
      .catch((e) => setToast(e.message));
  };
  const setGroupPick = (g, picks) => {
    setGroupPicks((s) => ({ ...s, [g]: picks }));
    api.saveGroupPick(session.token, g, picks).catch((e) => setToast(e.message));
  };
  const setChampion = (c) => {
    setChampionState(c);
    api.saveChampion(session.token, c).then(() => { if (c) setToast("Meistaraspá vistuð"); }).catch((e) => setToast(e.message));
  };

  // ── Útreiknuð stig & staða ──
  const stats = useMemo(() => {
    const finished = MATCHES.filter((m) => m.status === "finished").sort((a, b) => a.dt.localeCompare(b.dt));
    let matchPoints = 0, hits = 0, scored = 0, exact = 0;
    finished.forEach((m) => {
      const p = preds[m.id];
      if (!p) return;
      scored++;
      const sp = scorePts(p, m.res);
      matchPoints += sp.pts;
      if (sp.pts > 0) hits++;
      if (sp.kind === "exact") exact++;
    });
    let streak = 0;
    for (let i = finished.length - 1; i >= 0; i--) {
      const p = preds[finished[i].id];
      if (p && scorePts(p, finished[i].res).pts > 0) streak++; else break;
    }
    let trend = 0;
    finished.slice(-2).forEach((m) => { const p = preds[m.id]; if (p) trend += scorePts(p, m.res).pts; });

    const points = matchPoints;
    const predicted = Object.keys(preds).length;
    const groupsDone = Object.values(groupPicks).filter((x) => x && x.length === 2).length;
    const accuracy = scored ? Math.round((hits / scored) * 100) : 0;

    const merged = [
      ...others.filter((o) => o.id !== session.id && o.name !== "Urslitabot").map((c) => ({
        id: c.id, name: c.name, team: c.team || "—", init: c.init, pts: c.pts, trend: c.trend, hit: c.hit,
      })),
      { id: session.id, name: session.name, team: session.team || "—", init: session.init || "ÉG", pts: points, trend, hit: hits, me: true },
    ].sort((a, b) => b.pts - a.pts);
    merged.forEach((s, i) => { s.rank = i + 1; });
    const me = merged.find((s) => s.me);
    const toLead = merged[0].pts - points;

    return {
      preds, points, matchPoints, predicted, groupsDone, accuracy,
      hits, scored, exact, streak, trend, rank: me.rank, total: merged.length, toLead,
      hasChampion: !!champion, standings: merged,
    };
  }, [preds, groupPicks, champion, others, session, dataVer]);

  const pendingCount = MATCHES.filter((m) => m.status === "upcoming" && !preds[m.id]).length;

  const screen = {
    home: <HomeScreen stats={stats} standings={stats.standings} setRoute={setRoute} />,
    predict: <PredictScreen preds={preds} setPred={setPred} groupPicks={groupPicks}
      setGroupPick={setGroupPick} champion={champion} setChampion={setChampion}
      variant={PRED_MAP[t.predictStyle]} />,
    leaderboard: <LeaderboardScreen standings={stats.standings} />,
    mine: <MineScreen stats={stats} groupPicks={groupPicks} champion={champion} setRoute={setRoute} />,
    schedule: <ScheduleScreen preds={preds} setRoute={setRoute} />,
    admin: <AdminScreen session={session} onChange={async () => { await refreshMatches(); await refreshBoard(); }} />,
  }[route];

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} pendingCount={pendingCount}
        session={session} myRank={stats.rank} total={stats.total} onLogout={onLogout} />
      <div className="main-col">
        <MobileTop session={session} onLogout={onLogout} />
        <main className="main-wrap">{screen}</main>
      </div>
      <BottomNav route={route} setRoute={setRoute} pendingCount={pendingCount} isAdmin={session.is_admin} />

      {toast && <div className="toast pop"><Icon name="check" style={{ width: 16, height: 16 }} /> {toast}</div>}

      <TweaksPanel>
        <TweakSection label="Útlit" />
        <TweakColor label="Aðallitur" value={t.accent}
          options={["#00FF80", "#36C2FF", "#FF3DAE", "#FFB020"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Þema" value={t.theme} options={["Völlur", "Nótt", "Leikvangur"]}
          onChange={(v) => setTweak("theme", v)} />
        <TweakSection label="Spá-innsláttur" />
        <TweakRadio label="Stíll" value={t.predictStyle} options={["Hnappar", "Smella", "Sleði"]}
          onChange={(v) => setTweak("predictStyle", v)} />
      </TweaksPanel>
    </div>
  );
}

// ───────────────────────── Rót: innskráning / hleðsla ─────────────────────────
function Root() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN);
    if (!token) { setBooting(false); return; }
    api.getMe(token)
      .then((me) => setSession({ token, ...me }))
      .catch(() => localStorage.removeItem(LS_TOKEN))
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <Splash />;
  if (!session) return <LoginScreen onAuthed={(s) => { localStorage.setItem(LS_TOKEN, s.token); setSession(s); }} />;
  return <App session={session} onLogout={() => { localStorage.removeItem(LS_TOKEN); setSession(null); }} />;
}

function LoadError({ msg }) {
  return (
    <div className="splash"><div className="splash-inner">
      <div className="display" style={{ fontSize: 28 }}>Úps</div>
      <div className="splash-text">Tókst ekki að hlaða gögnum.<br />{msg}</div>
      <button className="btn btn-primary" onClick={() => location.reload()}>Reyna aftur</button>
    </div></div>
  );
}

const reactRoot = ReactDOM.createRoot(document.getElementById("root"));
loadStatic().then(() => reactRoot.render(<Root />)).catch((err) => reactRoot.render(<LoadError msg={err.message} />));
