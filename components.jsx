/* global window, React, TEAMS, GROUPS, MATCHES, SCORING */

// ───────────────────────── Hjálparföll ─────────────────────────
const team = (code) => (window.TEAMS && window.TEAMS[code]) || { name: code, flag: "🏳️", str: 50 };

const ISL_MONTHS = ["jan", "feb", "mar", "apr", "maí", "jún", "júl", "ágú", "sep", "okt", "nóv", "des"];
const ISL_WD = ["sun", "mán", "þri", "mið", "fim", "fös", "lau"];
const ISL_WD_FULL = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];

function parseDt(iso) { return new Date(iso.replace(" ", "T")); }
function fmtDay(iso) { const d = parseDt(iso); return `${d.getDate()}. ${ISL_MONTHS[d.getMonth()]}`; }
function fmtWd(iso) { const d = parseDt(iso); return ISL_WD[d.getDay()]; }
function fmtWeekday(iso) { const d = parseDt(iso); return ISL_WD_FULL[d.getDay()]; }
function fmtTime(iso) {
  const d = parseDt(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Stigaútreikningur fyrir einn leik
function scorePts(pred, res) {
  if (!pred || !res || pred[0] == null || pred[1] == null) return { pts: 0, kind: "none" };
  const ph = +pred[0], pa = +pred[1], rh = +res[0], ra = +res[1];
  if (ph === rh && pa === ra) return { pts: SCORING.exact, kind: "exact" };
  const sign = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
  const outcomeOk = sign(ph, pa) === sign(rh, ra);
  if (outcomeOk) {
    const oneOk = ph === rh || pa === ra;
    return { pts: SCORING.outcome + (oneOk ? SCORING.oneScore : 0), kind: oneOk ? "close" : "outcome" };
  }
  return { pts: 0, kind: "miss" };
}

// ───────────────────────── Icon ─────────────────────────
const ICONS = {
  home: "M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10",
  target: "M12 3v3M12 18v3M3 12h3M18 12h3 M12 12 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M12 12 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0V4Z M7 6H4v1a3 3 0 0 0 3 3 M17 6h3v1a3 3 0 0 1-3 3 M9 14h6 M10 14v3M14 14v3 M8 20h8",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  calendar: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12Z M4 9.5h16 M8 4v3 M16 4v3",
  medal: "M12 8 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M8.5 4 7 2h10l-1.5 2 M9 11l-2 9 5-3 5 3-2-9",
  fire: "M12 3c0 4-5 5-5 9a5 5 0 0 0 10 0c0-2-1-3-2-4 0 2-1 3-2 3 1-3-1-5-1-8Z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5Z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  bolt: "M13 3 5 13h6l-1 8 8-10h-6l1-8Z",
  users: "M16 17v-1.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V17 M9.5 8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M21 17v-1.5a3 3 0 0 0-2.2-2.9 M15 2.7a3 3 0 0 1 0 5.8",
  clock: "M12 12 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M12 7v5l3 2",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M5 12l7 7 7-7",
  help: "M12 12 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M9.6 9.3a2.6 2.6 0 0 1 4.3 1.6c-.3 1.4-2.3 1.6-2.3 3.1 M12 16.6h.01",
};
function Icon({ name, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={ICONS[name] || ""} />
    </svg>
  );
}

// ───────────────────────── Avatar ─────────────────────────
function Avatar({ init, size = 40, me }) {
  return (
    <div className={"avatar" + (me ? " me" : "")}
      style={{ width: size, height: size, fontSize: size * 0.33 }}>
      {init}
    </div>
  );
}

// ───────────────────────── Logo ─────────────────────────
function Logo({ h = 22 }) {
  return <img src="assets/verkhonnun-logo.png" alt="Verkhönnun" style={{ height: h, width: "auto", display: "block" }} />;
}

// ───────────────────────── Nav config ─────────────────────────
const NAV = [
  { id: "home", label: "Yfirlit", icon: "home" },
  { id: "predict", label: "Spá", icon: "target" },
  { id: "leaderboard", label: "Stigatafla", icon: "trophy" },
  { id: "mine", label: "Mín spá", icon: "list" },
  { id: "schedule", label: "Dagskrá", icon: "calendar" },
  { id: "rules", label: "Reglur", icon: "help" },
];

const ADMIN_NAV = { id: "admin", label: "Stjórnun", icon: "users" };

function Sidebar({ route, setRoute, pendingCount, session, myRank, total, onLogout }) {
  const items = session && session.is_admin ? [...NAV, ADMIN_NAV] : NAV;
  return (
    <aside className="sidebar">
      <div className="side-logo"><Logo h={22} /></div>
      <div className="side-tag">Spáleikur · HM 2026</div>
      <nav className="side-nav">
        {items.map((n) => (
          <button key={n.id} className={"nav-item" + (route === n.id ? " active" : "")}
            onClick={() => setRoute(n.id)}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.id === "predict" && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="me-chip">
          <Avatar init={(session && session.init) || "ÉG"} me size={38} />
          <div className="meta">
            <div className="nm">{(session && session.name) || "Þú"}</div>
            <div className="sub">{myRank ? `Sæti #${myRank} af ${total}` : (session && session.team) || ""}</div>
          </div>
          {onLogout && <button className="logout-btn" onClick={onLogout} title="Skrá út">Út</button>}
        </div>
      </div>
    </aside>
  );
}

function MobileTop({ session, onLogout }) {
  return (
    <header className="topbar">
      <Logo h={20} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="pill accent"><Icon name="trophy" style={{ width: 14, height: 14 }} /> HM 2026</div>
        {onLogout && <button className="logout-btn" onClick={onLogout} title="Skrá út">Út</button>}
      </div>
    </header>
  );
}

function BottomNav({ route, setRoute, pendingCount, isAdmin }) {
  const items = isAdmin ? [...NAV, ADMIN_NAV] : NAV;
  return (
    <nav className="bottom-nav">
      {items.map((n) => (
        <button key={n.id} className={"bn-item" + (route === n.id ? " active" : "")}
          onClick={() => setRoute(n.id)}>
          <div style={{ position: "relative" }}>
            <Icon name={n.icon} />
            {n.id === "predict" && pendingCount > 0 && (
              <span style={{ position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 99, background: "var(--accent)", color: "var(--accent-ink)", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center" }}>{pendingCount}</span>
            )}
          </div>
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ───────────────────────── Section header ─────────────────────────
function SecHead({ title, sub, action }) {
  return (
    <div className="sec-head">
      <div>
        <h2>{title}</h2>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// ───────────────────────── Match card (skoðun) ─────────────────────────
function MatchCard({ m, pred, onClick }) {
  const h = team(m.h), a = team(m.a);
  const finished = m.status === "finished";
  const live = m.status === "live";
  const sp = finished && pred ? scorePts(pred, m.res) : null;
  return (
    <div className="card match anim-in" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="match-top">
        <span className="match-grp">Riðill {m.grp}</span>
        {live && <span className="pill live"><span className="live-dot"></span> Í gangi · {m.minute}′</span>}
        {finished && <span className="pill">Lokið</span>}
        {m.status === "upcoming" && <span className="pill"><Icon name="clock" style={{ width: 13, height: 13 }} /> {fmtDay(m.dt)} · {fmtTime(m.dt)}</span>}
      </div>
      <div className="match-body">
        <div className="team-side">
          <span className="flag">{h.flag}</span>
          <div className="team-nm">{h.name}<div className="code">{m.h}</div></div>
        </div>
        <div className="vs-box">
          {finished || live ? (
            <div className="sc">{m.res[0]}<span className="x">·</span>{m.res[1]}</div>
          ) : (
            <div className="sc" style={{ color: "var(--muted)" }}>–<span className="x">·</span>–</div>
          )}
        </div>
        <div className="team-side right">
          <span className="flag">{a.flag}</span>
          <div className="team-nm">{a.name}<div className="code">{m.a}</div></div>
        </div>
      </div>
      <div className="match-foot">
        <span>{m.venue}</span>
        {pred ? (
          finished && sp ? (
            <span className={"pts-tag " + (sp.kind === "exact" ? "exact" : sp.pts > 0 ? "hit" : "miss")}>
              {sp.kind === "exact" ? "Nákvæmt!" : sp.pts > 0 ? `+${sp.pts} stig` : "0 stig"} · spáðir {pred[0]}–{pred[1]}
            </span>
          ) : (
            <span className="pill accent">Spá: {pred[0]}–{pred[1]}</span>
          )
        ) : (
          m.status === "upcoming" && <span className="pill" style={{ color: "var(--accent)" }}>Spá vantar →</span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  team, fmtDay, fmtWd, fmtWeekday, fmtTime, parseDt, scorePts,  Icon, Avatar, Logo, NAV, Sidebar, MobileTop, BottomNav, SecHead, MatchCard,
});
