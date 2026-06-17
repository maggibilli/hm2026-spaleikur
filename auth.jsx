/* global window, React, api, Logo, Icon */

// ───────────────────────── Hleðsluskjár ─────────────────────────
function Splash({ text }) {
  return (
    <div className="splash">
      <div className="splash-inner">
        <Logo h={30} />
        <div className="splash-spin" />
        <div className="splash-text">{text || "Hleð leiknum…"}</div>
      </div>
    </div>
  );
}

// ───────────────────────── Innskráning ─────────────────────────
function LoginScreen({ onAuthed }) {
  const { useState } = React;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!code.trim()) return setErr("Sláðu inn aðgangskóða");
    if (!name.trim()) return setErr("Sláðu inn nafnið þitt");
    setBusy(true);
    try {
      const s = await api.join(code.trim(), name.trim(), null);
      onAuthed(s);
    } catch (e2) {
      setErr(e2.message || "Innskráning mistókst");
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap anim-in">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-logo"><Logo h={30} /></div>
        <div className="eyebrow" style={{ textAlign: "center" }}>Spáleikur · HM 2026</div>
        <h1 className="display login-title">Spáðu með<br />samstarfsfólkinu</h1>
        <p className="login-sub">
          Sláðu inn aðgangskóða fyrirtækisins og veldu nafnið þitt til að taka þátt.
        </p>

        <label className="fld">
          <span>Aðgangskóði</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="t.d. VERK2026"
            autoCapitalize="characters" autoComplete="off" />
        </label>

        <label className="fld">
          <span>Nafn</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fullt nafn" autoComplete="name" />
        </label>

        {err && <div className="login-err"><Icon name="bolt" style={{ width: 14, height: 14 }} /> {err}</div>}

        <button className="btn btn-primary login-btn" disabled={busy} type="submit">
          {busy ? "Augnablik…" : <>Taka þátt <Icon name="target" style={{ width: 16, height: 16 }} /></>}
        </button>

        <div className="login-foot">
          Nafnið þitt geymist á þessu tæki svo þú þarft ekki að skrá þig inn aftur.
        </div>
      </form>
    </div>
  );
}

Object.assign(window, { Splash, LoginScreen });
