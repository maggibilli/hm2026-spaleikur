/* global window, React, api, team, Icon, SecHead, fmtDay, fmtTime, MATCHES */

// ───────────────────────── Ein leikjaröð (úrslit) ─────────────────────────
function ResultRow({ m, token, onSaved }) {
  const { useState } = React;
  const h = team(m.h), a = team(m.a);
  const [hs, setHs] = useState(m.res ? m.res[0] : "");
  const [as, setAs] = useState(m.res ? m.res[1] : "");
  const [status, setStatus] = useState(m.status);
  const [minute, setMinute] = useState(m.minute || "");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  const save = async () => {
    setBusy(true); setOk(false);
    try {
      await api.adminSetResult(token, m.id,
        status === "upcoming" ? null : (hs === "" ? 0 : +hs),
        status === "upcoming" ? null : (as === "" ? 0 : +as),
        status, status === "live" ? (minute === "" ? null : +minute) : null);
      setOk(true);
      await onSaved();
      setTimeout(() => setOk(false), 1500);
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  return (
    <div className={"adm-match status-" + status}>
      <div className="adm-when">{fmtDay(m.dt)} · {fmtTime(m.dt)} <span className="adm-grp">{m.grp}</span></div>
      <div className="adm-teams">
        <span className="adm-team">{h.flag} <b>{m.h}</b></span>
        <input className="adm-score" type="number" min="0" value={hs} disabled={status === "upcoming"}
          onChange={(e) => setHs(e.target.value)} />
        <span className="adm-colon">:</span>
        <input className="adm-score" type="number" min="0" value={as} disabled={status === "upcoming"}
          onChange={(e) => setAs(e.target.value)} />
        <span className="adm-team right"><b>{m.a}</b> {a.flag}</span>
      </div>
      <div className="adm-controls">
        <select className="adm-sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="upcoming">Framundan</option>
          <option value="live">Í gangi</option>
          <option value="finished">Lokið</option>
        </select>
        {status === "live" && (
          <input className="adm-min" type="number" min="0" max="120" placeholder="mín" value={minute}
            onChange={(e) => setMinute(e.target.value)} />
        )}
        <button className={"btn btn-primary adm-save" + (ok ? " ok" : "")} onClick={save} disabled={busy}>
          {ok ? <Icon name="check" style={{ width: 14, height: 14 }} /> : busy ? "…" : "Vista"}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Ein leikmannaröð (breyta/eyða) ─────────────────────────
function PlayerRow({ p, token, onChanged }) {
  const { useState } = React;
  const [name, setName] = useState(p.name);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== p.name && name.trim().length > 0;
  const d = new Date(p.created_at);

  const act = async (fn) => { setBusy(true); try { await fn(); await onChanged(); } catch (e) { alert(e.message); } setBusy(false); };
  const save = () => act(() => api.adminRename(token, p.id, name.trim()));
  const toggleAdmin = () => act(() => api.adminSetAdmin(token, p.id, !p.is_admin));
  const remove = () => { if (!confirm(`Eyða leikmanninum „${p.name}“? ${p.preds} spár tapast og þetta er óafturkræft.`)) return; act(() => api.adminRemovePlayer(token, p.id)); };

  return (
    <div className="adm-urow">
      <div className="adm-uleft">
        <input className="adm-input adm-uname" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        <div className="adm-umeta">
          {p.preds} spár · skráð {d.getUTCDate()}.{d.getUTCMonth() + 1}.
          {p.is_admin && <span className="pill accent" style={{ marginLeft: 8 }}>Stjórnandi</span>}
          {!p.claimed && <span className="pill" style={{ marginLeft: 6 }}>óskráð</span>}
          {p.preds === 0 && p.claimed && <span className="pill" style={{ marginLeft: 6, color: "var(--gold)" }}>engar spár</span>}
        </div>
      </div>
      <div className="adm-uactions">
        {dirty && <button className="btn btn-primary adm-mini" onClick={save} disabled={busy}>Vista nafn</button>}
        <button className="btn btn-ghost adm-mini" onClick={toggleAdmin} disabled={busy}>{p.is_admin ? "Taka af admin" : "Gera admin"}</button>
        <button className="btn btn-ghost adm-mini adm-del" onClick={remove} disabled={busy}>Eyða</button>
      </div>
    </div>
  );
}

// ───────────────────────── Stjórnendaskjár ─────────────────────────
function AdminScreen({ session, onChange }) {
  const { useState, useEffect } = React;
  const [tab, setTab] = useState("results");
  const [filt, setFilt] = useState("all");
  const [info, setInfo] = useState(null); // { access_code, players }
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [codeDraft, setCodeDraft] = useState("");
  const [msg, setMsg] = useState(null);

  const loadInfo = () => api.adminList(session.token).then((d) => { setInfo(d); setCodeDraft(d.access_code); });
  useEffect(() => { loadInfo(); }, []);

  const matches = MATCHES.filter((m) => filt === "all" ? true : m.status === filt);

  const addPlayer = async () => {
    if (!newName.trim()) return;
    try { await api.adminAddPlayer(session.token, newName.trim(), newTeam || null); setNewName(""); setNewTeam(""); loadInfo(); }
    catch (e) { alert(e.message); }
  };
  const removePlayer = async (p) => {
    if (!confirm(`Fjarlægja ${p.name}? Spár viðkomandi tapast.`)) return;
    try { await api.adminRemovePlayer(session.token, p.id); loadInfo(); onChange(); }
    catch (e) { alert(e.message); }
  };
  const saveCode = async () => {
    try { await api.adminSetCode(session.token, codeDraft.trim()); setMsg("Aðgangskóði uppfærður"); setTimeout(() => setMsg(null), 1800); loadInfo(); }
    catch (e) { alert(e.message); }
  };

  const tabs = [
    { id: "results", label: "Úrslit" },
    { id: "players", label: "Starfsmenn" },
    { id: "settings", label: "Stillingar" },
  ];
  const filts = [
    { id: "all", label: "Allir" },
    { id: "upcoming", label: "Framundan" },
    { id: "live", label: "Í gangi" },
    { id: "finished", label: "Lokið" },
  ];

  return (
    <div className="anim-in">
      <SecHead title="Stjórnun" sub="Skráðu úrslit, bættu við starfsfólki og stýrðu leiknum." />

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} className={t.id === tab ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "results" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {filts.map((f) => (
              <button key={f.id} className={"pill" + (filt === f.id ? " accent" : "")} style={{ cursor: "pointer" }} onClick={() => setFilt(f.id)}>{f.label}</button>
            ))}
          </div>
          <div className="adm-list">
            {matches.map((m) => <ResultRow key={m.id} m={m} token={session.token} onSaved={async () => { await onChange(); }} />)}
          </div>
        </div>
      )}

      {tab === "players" && (
        <div>
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Bæta við starfsmanni</div>
            <div className="adm-addrow">
              <input className="adm-input" placeholder="Nafn" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="adm-input" placeholder="Deild (valfrjálst)" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
              <button className="btn btn-primary" onClick={addPlayer}>Bæta við</button>
            </div>
            <div className="login-foot" style={{ marginTop: 10 }}>
              Starfsmaður sem þú bætir við velur svo nafnið sitt + slær inn aðgangskóðann til að taka þátt.
            </div>
          </div>

          <div className="login-foot" style={{ textAlign: "left", margin: "0 0 10px" }}>
            {info ? `${info.players.length} leikmenn` : ""} · raðað eftir nafni svo tvískráningar séu saman. Leikmaður með „engar spár“ er oftast tvískráning.
          </div>
          <div className="card adm-ulist">
            {info && info.players.length === 0 && <div className="empty" style={{ border: "none" }}>Engir skráðir enn.</div>}
            {info && info.players.map((p) => (
              <PlayerRow key={p.id} p={p} token={session.token} onChanged={loadInfo} />
            ))}
          </div>
        </div>
      )}

      {tab === "settings" && info && (
        <div className="card" style={{ padding: 20, maxWidth: 460 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Aðgangskóði fyrirtækisins</div>
          <p className="login-sub" style={{ textAlign: "left", margin: "0 0 14px" }}>
            Deildu þessum kóða með starfsfólki. Þau nota hann til að skrá sig inn.
          </p>
          <div className="adm-addrow">
            <input className="adm-input" value={codeDraft} onChange={(e) => setCodeDraft(e.target.value)} autoCapitalize="characters" />
            <button className="btn btn-primary" onClick={saveCode}>Vista kóða</button>
          </div>
          {msg && <div className="login-foot" style={{ color: "var(--accent)", marginTop: 10 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AdminScreen, ResultRow });
