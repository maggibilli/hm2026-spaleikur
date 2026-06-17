/* global window, React, team, Icon, Avatar, scorePts, MATCHES, GROUPS, COWORKERS, fmtDay, fmtWd, fmtWeekday, fmtTime, SecHead, MatchCard */

// ───────────────────────── Badges ─────────────────────────
function badgeDefs(stats) {
  return [
    { id: "first", t: "Fyrsta spáin", d: "Settir inn fyrstu spána þína", ico: "bolt", on: stats.predicted > 0 },
    { id: "exact", t: "Nákvæmnismaður", d: "Hittir á nákvæm úrslit", ico: "target", on: stats.exact > 0 },
    { id: "collector", t: "Stigasafnari", d: "Náðir 25+ stigum", ico: "star", on: stats.points >= 25 },
    { id: "groups", t: "Riðlaspekúlant", d: "Spáðir fyrir alla 12 riðla", ico: "users", on: stats.groupsDone >= 12 },
    { id: "champ", t: "Meistaraspá", d: "Valdir heimsmeistara", ico: "trophy", on: stats.hasChampion },
    { id: "top5", t: "Á verðlaunapalli", d: "Komist í topp 5", ico: "medal", on: stats.rank <= 5 },
    { id: "streak", t: "Heitur á því", d: "3 réttar spár í röð", ico: "fire", on: stats.streak >= 3 },
    { id: "perfect", t: "Spámaður vikunnar", d: "Flest stig í umferð", ico: "check", on: false },
  ];
}

function Badges({ stats }) {
  const defs = badgeDefs(stats);
  return (
    <div className="badges-grid">
      {defs.map((b) => (
        <div key={b.id} className={"card badge-card " + (b.on ? "earned" : "locked")}>
          <div className="badge-ico" style={{ color: b.on ? "var(--accent)" : "var(--muted)" }}>
            <Icon name={b.ico} />
          </div>
          <div className="bt">{b.t}</div>
          <div className="bd">{b.d}</div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Mini leaderboard row ─────────────────────────
function LbRow({ rank, name, sub, init, pts, me, trend }) {
  return (
    <div className={"lb-row" + (me ? " me" : "")}>
      <div className={"lb-rank" + (rank <= 3 ? " top" : "")}>{rank}</div>
      <Avatar init={init} me={me} size={40} />
      <div className="lb-name">
        <div className="nm">{name}</div>
        <div className="sub">
          {sub}
          {trend != null && trend !== 0 && (
            <span className={trend > 0 ? "trend-up" : "trend-down"} style={{ marginLeft: 8 }}>
              {trend > 0 ? "▲" : "▼"}{Math.abs(trend)}
            </span>
          )}
        </div>
      </div>
      <div className="lb-pts"><div className="p">{pts}</div><div className="l">stig</div></div>
    </div>
  );
}

// ───────────────────────── Home ─────────────────────────
function HomeScreen({ stats, standings, setRoute }) {
  const live = MATCHES.find((m) => m.status === "live");
  const upcoming = MATCHES.filter(isOpen);
  const need = upcoming.filter((m) => !stats.preds[m.id]).slice(0, 3);
  const top = standings.slice(0, 5);
  const meStanding = standings.find((s) => s.me);

  return (
    <div className="anim-in">
      {/* Hero */}
      <div className="hero">
        <div className="h-row">
          <div>
            <div className="eyebrow">Þín staða</div>
            <div className="rank-big"><span className="hash">#</span>{stats.rank}<span style={{ fontSize: "0.4em", color: "var(--muted)" }}> / {stats.total}</span></div>
            <div style={{ color: "var(--text-dim)", fontWeight: 600, marginTop: 4 }}>
              {stats.points} stig · {stats.toLead > 0 ? `${stats.toLead} stig í toppsætið` : "Þú leiðir!"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => setRoute("predict")}>
              <Icon name="target" style={{ width: 16, height: 16 }} /> Spá fyrir {upcoming.length} leiki
            </button>
            <button className="btn btn-ghost" onClick={() => setRoute("leaderboard")}>Stigatafla</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="card stat"><div className="stat-label">Stig samtals</div><div className="stat-num accent">{stats.points}</div><div className="stat-foot"><span className={stats.trend >= 0 ? "trend-up" : "trend-down"}><Icon name={stats.trend >= 0 ? "arrowUp" : "arrowDown"} style={{ width: 12, height: 12 }} /></span>{Math.abs(stats.trend)} í síðustu umferð</div></div>
        <div className="card stat"><div className="stat-label">Hittni</div><div className="stat-num">{stats.accuracy}%</div><div className="stat-foot">{stats.hits} af {stats.scored} spám</div></div>
        <div className="card stat"><div className="stat-label">Spár settar</div><div className="stat-num">{stats.predicted}</div><div className="stat-foot">af {MATCHES.length} leikjum</div></div>
        <div className="card stat"><div className="stat-label">Nákvæm úrslit</div><div className="stat-num">{stats.exact}</div><div className="stat-foot">{stats.exact > 0 ? "7 stig hvert!" : "engin enn"}</div></div>
      </div>

      <div className="grid-2" style={{ marginTop: 30 }}>
        <div className="col-gap">
          {/* Live */}
          {live && (
            <div>
              <SecHead title="Í gangi núna" sub={`Riðill ${live.grp} · ${live.minute}′`} />
              <MatchCard m={live} pred={stats.preds[live.id]} />
            </div>
          )}
          {/* Need predictions */}
          <div>
            <div className="sec-head">
              <div><h2>Næstu leikir</h2><div className="sub">Settu inn spá áður en flautað er til leiks</div></div>
              <button className="pill accent" onClick={() => setRoute("predict")} style={{ cursor: "pointer" }}>Allir leikir →</button>
            </div>
            <div className="col-gap">
              {need.length ? need.map((m) => <MatchCard key={m.id} m={m} pred={stats.preds[m.id]} onClick={() => setRoute("predict")} />)
                : <div className="card empty">Þú hefur spáð fyrir alla komandi leiki. Flott!</div>}
            </div>
          </div>
        </div>

        <div className="col-gap">
          {/* Mini leaderboard */}
          <div>
            <SecHead title="Toppurinn" />
            <div className="card lb">
              {top.map((s) => <LbRow key={s.id} rank={s.rank} name={s.name} sub={s.team} init={s.init} pts={s.pts} me={s.me} trend={s.trend} />)}
              {meStanding && meStanding.rank > 5 && (
                <>
                  <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 18, padding: "2px 0" }}>···</div>
                  <LbRow rank={meStanding.rank} name={meStanding.name} sub={meStanding.team} init={meStanding.init} pts={meStanding.pts} me trend={meStanding.trend} />
                </>
              )}
            </div>
          </div>
          {/* Badges */}
          <div>
            <SecHead title="Verðlaun" />
            <Badges stats={stats} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Leaderboard ─────────────────────────
function LeaderboardScreen({ standings }) {
  const [filt, setFilt] = React.useState("Allir");
  const teams = ["Allir", ...Array.from(new Set(standings.map((s) => s.team)))];
  const list = filt === "Allir" ? standings : standings.filter((s) => s.team === filt);
  const podium = standings.slice(0, 3);
  const order = [1, 0, 2]; // 2., 1., 3.

  return (
    <div className="anim-in">
      <SecHead title="Stigatafla" sub={`${standings.length} keppa um HM-bikarinn í ár`} />

      {/* Podium */}
      <div className="podium" style={{ marginBottom: 24 }}>
        {order.map((idx, col) => {
          const s = podium[idx];
          if (!s) return <div key={col} />;
          const place = idx + 1;
          const barH = place === 1 ? 80 : place === 2 ? 58 : 42;
          return (
            <div key={s.id} className={"podium-col p" + place + (s.me ? " is-me" : "")}>
              <div className="medal">{place}</div>
              <Avatar init={s.init} me={s.me} size={place === 1 ? 56 : 46} />
              <div className="nm">{s.name}</div>
              <div className="pts">{s.pts}</div>
              <div className="podium-bar" style={{ height: barH }}></div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {teams.map((t) => (
          <button key={t} className={"pill" + (filt === t ? " accent" : "")} style={{ cursor: "pointer" }} onClick={() => setFilt(t)}>{t}</button>
        ))}
      </div>

      <div className="card lb">
        {list.map((s) => <LbRow key={s.id} rank={s.rank} name={s.name} sub={s.team + (s.hit != null ? ` · ${s.hit} hittir` : "")} init={s.init} pts={s.pts} me={s.me} trend={s.trend} />)}
      </div>
    </div>
  );
}

// ───────────────────────── Mín spá ─────────────────────────
function MineScreen({ stats, groupPicks, champion, setRoute }) {
  const finished = MATCHES.filter((m) => m.status === "finished");
  const upcoming = MATCHES.filter(isOpen);
  const groupsDone = Object.values(groupPicks).filter((x) => x && x.length === 2).length;

  return (
    <div className="anim-in">
      <SecHead title="Mín spá" sub="Yfirlit yfir allar þínar spár og stig" />

      <div className="stat-grid" style={{ marginBottom: 8 }}>
        <div className="card stat"><div className="stat-label">Stig úr leikjum</div><div className="stat-num accent">{stats.matchPoints}</div></div>
        <div className="card stat"><div className="stat-label">Riðlaspár</div><div className="stat-num">{groupsDone}<span style={{ fontSize: "0.45em", color: "var(--muted)" }}> /12</span></div></div>
        <div className="card stat"><div className="stat-label">Meistaraspá</div><div className="stat-num" style={{ fontSize: 30, marginTop: 12 }}>{champion ? team(champion).flag + " " + team(champion).name : "—"}</div></div>
        <div className="card stat"><div className="stat-label">Nákvæm úrslit</div><div className="stat-num">{stats.exact}</div></div>
      </div>

      <SecHead title="Leiknir leikir" sub="Hvernig spárnar þínar komu út" />
      {finished.length ? (
        <div className="row-cards">
          {finished.map((m) => <MatchCard key={m.id} m={m} pred={stats.preds[m.id]} />)}
        </div>
      ) : <div className="card empty">Engir leikir búnir enn.</div>}

      <SecHead title="Komandi spár" sub="Þú getur breytt þangað til flautað er til leiks" action={<button className="pill accent" style={{ cursor: "pointer" }} onClick={() => setRoute("predict")}>Breyta →</button>} />
      <div className="row-cards">
        {upcoming.map((m) => <MatchCard key={m.id} m={m} pred={stats.preds[m.id]} onClick={() => setRoute("predict")} />)}
      </div>
    </div>
  );
}

// ───────────────────────── Dagskrá ─────────────────────────
function ScheduleScreen({ preds, setRoute }) {
  const byDay = {};
  [...MATCHES].sort((a, b) => a.dt.localeCompare(b.dt)).forEach((m) => {
    const k = m.dt.slice(0, 10);
    (byDay[k] = byDay[k] || []).push(m);
  });
  return (
    <div className="anim-in">
      <SecHead title="Dagskrá" sub="Riðlakeppni HM 2026 · Bandaríkin, Kanada & Mexíkó" />
      {Object.keys(byDay).sort().map((day) => {
        const ms = byDay[day];
        return (
          <div key={day} style={{ marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "6px 0 12px" }}>
              <span className="display" style={{ fontSize: 26 }}>{fmtDay(ms[0].dt)}</span>
              <span className="eyebrow">{fmtWeekday(ms[0].dt)}</span>
            </div>
            <div className="row-cards">
              {ms.map((m) => <MatchCard key={m.id} m={m} pred={preds[m.id]} onClick={m.status === "upcoming" && !m.tbd ? () => setRoute("predict") : undefined} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── Hvernig virkar þetta? ─────────────────────────
function HelpScreen({ setRoute }) {
  const Step = ({ n, title, children }) => (
    <div className="help-step">
      <div className="help-num">{n}</div>
      <div>
        <div className="help-st">{title}</div>
        <div className="help-sd">{children}</div>
      </div>
    </div>
  );
  return (
    <div className="anim-in">
      <SecHead title="Hvernig virkar þetta?" sub="Allt sem þú þarft að vita á einni mínútu." />

      <div className="card" style={{ padding: "22px 22px 8px", marginBottom: 18 }}>
        <Step n="1" title="Skráðu þig inn">
          Sláðu inn <strong>aðgangskóða</strong> fyrirtækisins, veldu <strong>nafn</strong> og <strong>PIN</strong>.
          Notaðu sama nafn + PIN til að skrá þig inn á fleiri tækjum (síma, tölvu).
        </Step>
        <Step n="2" title="Spáðu fyrir leikina">
          Farðu í <strong>Spá</strong> og veldu markatölu fyrir hvern leik. Þú getur breytt spánni
          þangað til flautað er til leiks — þá <strong>læsist</strong> hún.
        </Step>
        <Step n="3" title="Spáðu fyrir riðla og meistara">
          Veldu hvaða <strong>tvö lið</strong> komast áfram úr hverjum riðli og hver verður
          <strong> heimsmeistari</strong> HM 2026.
        </Step>
        <Step n="4" title="Safnaðu stigum">
          Stigin reiknast sjálfkrafa um leið og úrslit berast. Fylgstu með sætinu þínu á
          <strong> Stigatöflu</strong>.
        </Step>
      </div>

      <SecHead title="Stigagjöf" />
      <div className="card" style={{ padding: "8px 22px" }}>
        <div className="scoring-list">
          <div className="sr"><span className="d">Réttur úrslit (sigurvegari eða jafntefli)</span><span className="v">3</span></div>
          <div className="sr"><span className="d">… og rétt markatala annars liðsins</span><span className="v">+1</span></div>
          <div className="sr"><span className="d">Nákvæm úrslit (bæði mörkin rétt)</span><span className="v">7</span></div>
          <div className="sr"><span className="d">Rétt lið áfram úr riðli (hvert)</span><span className="v">5</span></div>
          <div className="sr"><span className="d">Réttur heimsmeistari</span><span className="v">25</span></div>
        </div>
      </div>
      <p className="login-foot" style={{ textAlign: "left", marginTop: 12 }}>
        Dæmi: úrslit verða 2–1. Spáðir þú 2–1 færðu <strong>7 stig</strong>. Spáðir þú 3–1 (réttur
        sigurvegari + rétt mark annars liðs) færðu <strong>4 stig</strong>. Spáðir þú 1–0 (réttur
        sigurvegari) færðu <strong>3 stig</strong>.
      </p>

      <div style={{ marginTop: 18 }}>
        <button className="btn btn-primary" onClick={() => setRoute("predict")}>
          <Icon name="target" style={{ width: 16, height: 16 }} /> Byrja að spá
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Badges, HomeScreen, LeaderboardScreen, MineScreen, ScheduleScreen, HelpScreen });
