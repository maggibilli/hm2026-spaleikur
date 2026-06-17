/* global window, React, team, Icon, scorePts, MATCHES, GROUPS, TEAMS, fmtDay, fmtTime, SecHead */
const { useState } = React;

// ───────────────────────── Score predictor ─────────────────────────
function Predictor({ value, onChange, variant = "stepper", hCode, aCode }) {
  const h = team(hCode), a = team(aCode);
  const v = value || [null, null];
  const set = (i, n) => {
    const nv = [...v];
    nv[i] = Math.max(0, Math.min(20, n));
    onChange(nv);
  };

  const NumSide = ({ i }) => {
    const code = i === 0 ? hCode : aCode, t = i === 0 ? h : a;
    const cur = v[i];
    if (variant === "tap") {
      return (
        <div className="pred-side">
          <span className="flag">{t.flag}</span>
          <div className="nm">{code}</div>
          <button className={"tap-num" + (cur != null ? " set" : "")}
            onClick={() => set(i, cur == null ? 1 : cur >= 9 ? 0 : cur + 1)}
            title="Smelltu til að hækka">
            {cur == null ? 0 : cur}
          </button>
        </div>
      );
    }
    if (variant === "slider") {
      return (
        <div className="pred-side range-side">
          <span className="flag">{t.flag}</span>
          <div className="nm">{code}</div>
          <div className={"pred-num" + (cur != null ? " set" : "")}>{cur == null ? 0 : cur}</div>
          <input type="range" className="score-range" min="0" max="7" value={cur == null ? 0 : cur}
            onChange={(e) => set(i, +e.target.value)} />
        </div>
      );
    }
    // stepper
    return (
      <div className="pred-side">
        <span className="flag">{t.flag}</span>
        <div className="nm">{code}</div>
        <div className="stepper">
          <button className="step-btn" onClick={() => set(i, (cur || 0) - 1)} aria-label="Minnka">−</button>
          <div className={"pred-num" + (cur != null ? " set" : "")}>{cur == null ? 0 : cur}</div>
          <button className="step-btn" onClick={() => set(i, (cur == null ? 0 : cur) + 1)} aria-label="Hækka">+</button>
        </div>
      </div>
    );
  };

  return (
    <div className="predictor">
      <NumSide i={0} />
      <div className="pred-mid">:</div>
      <NumSide i={1} />
    </div>
  );
}

// ───────────────────────── Predict screen ─────────────────────────
function PredictScreen({ preds, setPred, groupPicks, setGroupPick, champion, setChampion, variant, toast }) {
  const [tab, setTab] = useState("matches");
  const upcoming = MATCHES.filter((m) => m.status === "upcoming" && !m.tbd);

  const tabs = [
    { id: "matches", label: "Leikir", n: upcoming.filter((m) => !preds[m.id]).length },
    { id: "groups", label: "Riðlar", n: 12 - Object.values(groupPicks).filter((x) => x && x.length === 2).length },
    { id: "champion", label: "Meistari", n: champion ? 0 : 1 },
  ];

  return (
    <div className="anim-in">
      <SecHead title="Settu inn spá" sub="Spáin læsist við upphaf hvers leiks. Stig fyrir réttan sigurvegara, markatölu og nákvæm úrslit." />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} className={t.id === tab ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab(t.id)}>
            {t.label}{t.n > 0 && <span style={{ marginLeft: 2, opacity: .8 }}>· {t.n}</span>}
          </button>
        ))}
      </div>

      {tab === "matches" && (
        <div className="row-cards">
          {upcoming.map((m) => {
            const h = team(m.h), a = team(m.a);
            const done = !!preds[m.id];
            return (
              <div key={m.id} className="card anim-in" style={{ padding: "18px 18px 16px" }}>
                <div className="match-top" style={{ marginBottom: 14 }}>
                  <span className="match-grp">{m.round}</span>
                  <span className="pill"><Icon name="clock" style={{ width: 13, height: 13 }} /> {fmtDay(m.dt)} · {fmtTime(m.dt)}</span>
                </div>
                <Predictor value={preds[m.id]} onChange={(nv) => setPred(m.id, nv)} variant={variant} hCode={m.h} aCode={m.a} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  <span>{m.venue}</span>
                  {done ? <span className="pts-tag hit"><Icon name="check" style={{ width: 13, height: 13 }} /> Vistað</span>
                        : <span style={{ color: "var(--text-dim)" }}>Veldu markatölu</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "groups" && (
        <div className="groups-grid">
          {Object.keys(GROUPS).map((g) => {
            const picks = groupPicks[g] || [];
            return (
              <div key={g} className="card gt anim-in">
                <div className="gt-head">
                  <span className="badge-grp">{g}</span>
                  <span className="t">Hverjir komast áfram?</span>
                </div>
                {GROUPS[g].map((code, i) => {
                  const t = team(code);
                  const on = picks.includes(code);
                  return (
                    <div key={code} className={"gt-row" + (on ? " qual" : "")} style={{ cursor: "pointer" }}
                      onClick={() => {
                        let np = picks.includes(code) ? picks.filter((c) => c !== code) : [...picks, code];
                        if (np.length > 2) np = np.slice(1);
                        setGroupPick(g, np);
                      }}>
                      <span className="pos">{i + 1}</span>
                      <span className="fl">{t.flag}</span>
                      <span className="tn">{t.name}</span>
                      <span className={"pk" + (on ? " on" : "")}>{on ? <Icon name="check" style={{ width: 14, height: 14 }} /> : ""}</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, padding: "8px 4px 2px" }}>
                  {picks.length}/2 valin · 5 stig fyrir hvert rétt
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "champion" && (
        <div>
          <div className="card hero" style={{ marginBottom: 18 }}>
            <div className="eyebrow">Stóra spáin</div>
            <div className="display" style={{ fontSize: "clamp(26px,4vw,40px)", margin: "8px 0 4px" }}>Hver lyftir bikarnum?</div>
            <div className="sub" style={{ color: "var(--text-dim)", fontWeight: 600 }}>
              {champion ? <span>Þú spáir: <strong style={{ color: "var(--accent)" }}>{team(champion).flag} {team(champion).name}</strong> · 25 stig ef rétt</span>
                        : "Veldu heimsmeistara HM 2026 — 25 stig í húfi."}
            </div>
          </div>
          <div className="groups-grid">
            {Object.values(GROUPS).flat()
              .sort((a, b) => team(b).str - team(a).str)
              .slice(0, 16)
              .map((code) => {
                const t = team(code), on = champion === code;
                return (
                  <button key={code} className="card" onClick={() => setChampion(on ? null : code)}
                    style={{ padding: "16px", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                             borderColor: on ? "var(--accent)" : "var(--line)",
                             background: on ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : undefined }}>
                    <span className="flag" style={{ fontSize: 30 }}>{t.flag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>Styrkur {t.str}</div>
                    </div>
                    {on && <Icon name="check" style={{ width: 20, height: 20, color: "var(--accent)" }} />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Predictor, PredictScreen });
