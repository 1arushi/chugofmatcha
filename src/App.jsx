import { useState, useEffect, useRef, createContext, useContext } from "react";
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: "white", background: "#7a9e7e", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 16, marginBottom: 8 }}>something went wrong:</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>{this.state.error}</div>
      </div>
    );
    return this.props.children;
  }
}

// Inject Inter font + tight global line-height
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
  * { font-family: 'Inter', sans-serif !important; line-height: 1.2 !important; box-sizing: border-box; }
  .logo-text { font-family: 'Instrument Serif', serif !important; font-style: italic; }
  .tight-stack { line-height: 1 !important; display: block; }
  input::placeholder { color: rgba(255,255,255,0.8); opacity: 1; }
`;
document.head.appendChild(globalStyle);

// ── Palette & shared tokens ──────────────────────────────────────────────────
const THEMES = {
  green: {
    bg: "#7a9e7e", card: "#8fb093", cardLight: "#9cbc9f",
    text: "#f5f0e8", textMuted: "rgba(245,240,232,0.7)", textDark: "#4a6b4d",
    inputBg: "#9cbc9f", border: "rgba(245,240,232,0.25)", pill: "#8fb093", pillActive: "#f5f0e8",
  },
  white: {
    bg: "#f2ede4", card: "#e4ddd2", cardLight: "#d8d0c4",
    text: "#3a3028", textMuted: "rgba(58,48,40,0.6)", textDark: "#f2ede4",
    inputBg: "#e4ddd2", border: "rgba(58,48,40,0.18)", pill: "#e4ddd2", pillActive: "#3a3028",
  },
  black: {
    bg: "#1a1a1a", card: "#2a2a2a", cardLight: "#333333",
    text: "#f5f0e8", textMuted: "rgba(245,240,232,0.55)", textDark: "#1a1a1a",
    inputBg: "#2a2a2a", border: "rgba(245,240,232,0.15)", pill: "#2a2a2a", pillActive: "#f5f0e8",
  },
  pastel: {
    bg: "#7a6b5e", card: "#8a7b6e", cardLight: "#9a8b7e",
    text: "#f0ece8", textMuted: "rgba(240,236,232,0.7)", textDark: "#3a3028",
    inputBg: "#8a7b6e", border: "rgba(240,236,232,0.25)", pill: "#8a7b6e", pillActive: "#f0ece8",
  },
};


// ── Supabase client ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://vqhkjjpesuqdremfafau.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxaGtqanBlc3VxZHJlbWZhZmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDE4NjIsImV4cCI6MjA4ODkxNzg2Mn0.h09Uw3WRSgCf7gPOShqAu37foyKTI8pNihF8SP4Y5gY";

const sb = {
  headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  },
  async get(table, params = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: this.headers });
    return res.json();
  },
  async post(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: this.headers, body: JSON.stringify(body)
    });
    return res.json();
  },
  async delete(table, params) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: "DELETE", headers: this.headers
    });
    return res.ok;
  },
  async patch(table, params, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method: "PATCH", headers: { ...this.headers, "Prefer": "return=representation" }, body: JSON.stringify(body)
    });
    return res.json();
  },
};

// Simple password hash (djb2 — good enough for a personal app)
function hashPassword(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

const ThemeContext = createContext(THEMES.green);
// Keep C as a fallback for components that haven't migrated to context
// All components should use useC() hook instead
function useC() { return useContext(ThemeContext); }
let C = THEMES.green; // legacy fallback

const styles = {
  app: {
    background: C.bg,
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Inter', sans-serif",
  },
  phone: {
    background: C.bg,
    width: 390,
    minHeight: 844,
    borderRadius: 48,
    boxShadow: "0 32px 80px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    transform: "scale(0.82)",
    transformOrigin: "top center",
    marginBottom: "-152px",
  },
  logo: {
    textAlign: "center",
    color: C.textMuted,
    fontSize: 15,
    letterSpacing: "0.12em",
    fontStyle: "italic",
    padding: "52px 0 0",
  },
  screen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0 32px 32px",
  },
};

// ── Reusable components ──────────────────────────────────────────────────────

function Logo({ onBack }) {
  const C = useC();
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "52px 0 16px" }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: "absolute",
            left: 0,
            background: "none",
            border: "none",
            color: C.textMuted,
            fontSize: 22,
            cursor: "pointer",
            padding: "0",
            fontFamily: "'Instrument Serif', serif",
            lineHeight: 1,
          }}
        >
          ‹
        </button>
      )}
      <span className="logo-text" style={{ color: C.textMuted, fontSize: 16, letterSpacing: "0.08em" }}>chugofmatcha</span>
    </div>
  );
}

function Input({ placeholder, type = "text", value, onChange }) {
  const C = useC();
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        background: C.card,
        border: "none",
        borderRadius: 50,
        padding: "14px 22px",
        color: C.text,
        fontSize: 15,
        width: "100%",
        outline: "none",
        boxSizing: "border-box",
        letterSpacing: "0.04em",
        textAlign: "center",
      }}
    />
  );
}

function NextBtn({ onClick, label = "next" }) {
  const C = useC();
  return (
    <button
      onClick={onClick}
      style={{
        background: C.text,
        color: C.textDark,
        border: "none",
        borderRadius: 50,
        padding: "14px 44px",
        fontSize: 15,
        fontFamily: "'Inter', sans-serif",
        cursor: "pointer",
        letterSpacing: "0.04em",
        display: "block",
        margin: "0 auto",
      }}
    >
      {label}
    </button>
  );
}

function GridToggle({ options, selected, onToggle }) {
  const C = useC();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            style={{
              background: active ? C.cardLight : C.card,
              border: active ? `2px solid ${C.text}` : "2px solid transparent",
              borderRadius: 18,
              color: C.text,
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              padding: "44px 12px 16px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.03em",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function PillToggle({ options, selected, onToggle }) {
  const C = useC();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            style={{
              background: active ? C.cardLight : C.pill,
              border: active ? `2px solid ${C.text}` : "2px solid transparent",
              borderRadius: 50,
              color: C.text,
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              padding: "13px 22px",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: "0.03em",
              textAlign: "center",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function StarRating({ label, value, onChange }) {
  const C = useC();
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => onChange(star)}
            style={{ fontSize: 22, cursor: "pointer", color: star <= value ? C.text : `${C.text}30`, transition: "color 0.1s" }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

function Heading({ children }) {
  const C = useC();
  return (
    <div style={{ color: C.text, fontSize: 22, textAlign: "center", margin: "32px 0 20px", letterSpacing: "0.02em" }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, large, smallNumber }) {
  const C = useC();
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 18,
        padding: "16px 12px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: smallNumber ? 70 : 80,
        gap: 4,
      }}
    >
      <div style={{ color: C.textMuted, fontSize: smallNumber ? 22 : large ? 42 : 28, fontWeight: "700", textAlign: "center", lineHeight: 1 }}>{value ?? "—"}</div>
      <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.04em", textAlign: "center" }}>{label}</div>
    </div>
  );
}

// ── Screens ──────────────────────────────────────────────────────────────────

function SignInScreen({ onLogin }) {
  const C = useC();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) { setError("enter a username and password"); return; }
    if (mode === "signup" && !email.trim()) { setError("email is required"); return; }
    setLoading(true); setError("");
    const hash = hashPassword(password);
    try {
      if (mode === "signup") {
        // Check if username taken
        const existing = await sb.get("users", `username=eq.${encodeURIComponent(username.trim())}&select=id`);
        if (existing.length > 0) { setError("username taken, try another"); setLoading(false); return; }
        const now = new Date();
        const joined = `${(now.getMonth()+1).toString().padStart(2,"0")}.${now.getDate().toString().padStart(2,"0")}.${now.getFullYear().toString().slice(2)}`;
        const rows = await sb.post("users", {
          username: username.trim(), password_hash: hash,
          joined_date: joined, avatar: { gender:"female", skin:"#f5c5a3", hair:"#4a2c0a", outfit:"#7a9e7e" },
          theme: "green", ranked_cafes: [],
          email: email.trim() || null
        });
        if (!rows || rows?.code || rows?.error || !Array.isArray(rows) || rows.length === 0) {
          setError("signup failed, try again");
          setLoading(false); return;
        }
        onLogin(rows[0]);
      } else {
        const rows = await sb.get("users", `username=eq.${encodeURIComponent(username.trim())}&select=*`);
        if (rows.length === 0) { setError("no account found, sign up first"); setLoading(false); return; }
        if (rows[0].password_hash !== hash) { setError("wrong password"); setLoading(false); return; }
        onLogin(rows[0]);
      }
    } catch(e) { setError("connection error, try again"); }
    setLoading(false);
  };

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ color: C.text, fontSize: 18, marginBottom: 16, letterSpacing: "0.04em", textAlign: "center" }}>
          {mode === "signin" ? "sign in" : "create account"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8, paddingLeft: 24, paddingRight: 24 }}>
          <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          {mode === "signup" && <Input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          <Input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: C.text, fontSize: 13, textAlign: "center", marginBottom: 12, opacity: 0.8 }}>{error}</div>}
        <div style={{ marginBottom: 20, marginTop: 16 }}>
          <NextBtn label={loading ? "..." : mode === "signin" ? "sign in" : "sign up"} onClick={handleSubmit} />
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setEmail(""); }}
            style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline" }}>
            {mode === "signin" ? "no account? sign up" : "already have one? sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CafeEntryScreen({ onNext, onBack, onSkip, onHomemade, pastCafes = [] }) {
  const C = useC();
  const [cafe, setCafe] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dateISO, setDateISO] = useState(todayISO);

  const formatDisplay = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${m}.${d}.${y.slice(2)}`;
  };

  const suggestions = cafe.trim().length > 0
    ? pastCafes.filter(c => c.toLowerCase().includes(cafe.toLowerCase()))
    : [];

  const selectCafe = (name) => { setCafe(name); setShowSuggestions(false); };

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Heading>what cafe did you visit?</Heading>
        <div style={{ paddingLeft: 24, paddingRight: 24, width: "100%", position: "relative" }}>
          <input
            placeholder=""
            value={cafe}
            onChange={(e) => { setCafe(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            style={{ background: C.card, border: "none", borderRadius: 50, padding: "14px 22px", color: C.text, fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box", letterSpacing: "0.04em", textAlign: "center" }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 24, right: 24, background: C.cardLight, borderRadius: 16, overflow: "hidden", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              {suggestions.map((s) => (
                <div key={s} onClick={() => selectCafe(s)} style={{ padding: "12px 18px", color: C.text, fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${C.border}`, textAlign: "center", letterSpacing: "0.03em" }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.text}15`}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editable date */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, letterSpacing: "0.06em", textAlign: "center", outline: "none", cursor: "pointer", padding: "2px 4px", colorScheme: "dark" }}
          />
        </div>

        {/* Homemade link under date */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={onHomemade} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline", fontFamily: "Inter, sans-serif" }}>homemade →</button>
        </div>
      </div>
      <div style={{ paddingBottom: 40 }}>
        <NextBtn onClick={() => { setShowSuggestions(false); onNext(cafe || "unnamed cafe", dateISO); }} />
        {onSkip && <div style={{ textAlign: "center", marginTop: 16 }}><button onClick={onSkip} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline", fontFamily: "Inter, sans-serif" }}>skip to my cafe →</button></div>}
      </div>
    </div>
  );
}


function SliderTrack({ steps, value, onChange, formatLabel }) {
  const C = useC();
  const trackRef = useRef(null);

  const getNearest = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let nearest = steps[0];
    let minDist = Infinity;
    steps.forEach((s, i) => {
      const sPct = i / (steps.length - 1);
      const dist = Math.abs(sPct - ratio);
      if (dist < minDist) { minDist = dist; nearest = s; }
    });
    return nearest;
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    onChange(getNearest(e.clientX));
    const onMove = (e2) => onChange(getNearest(e2.clientX));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchStart = (e) => {
    onChange(getNearest(e.touches[0].clientX));
    const onMove = (e2) => onChange(getNearest(e2.touches[0].clientX));
    const onEnd = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
  };

  const idx = steps.indexOf(value);
  const pct = idx / (steps.length - 1);

  return (
    <div style={{ paddingLeft: 28, paddingRight: 28, userSelect: "none" }}>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ position: "relative", height: 40, marginBottom: 4, cursor: "pointer" }}
      >
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 2, background: `${C.text}55`, borderRadius: 2,
          transform: "translateY(-50%)",
        }} />
        {steps.map((s, i) => {
          const x = (i / (steps.length - 1)) * 100;
          const isActive = s === value;
          const isWhole = typeof s === "number" && s % 1 === 0;
          return (
            <div key={s} style={{ position: "absolute", left: `${x}%`, top: "50%", transform: "translate(-50%, -50%)" }}>
              <div style={{
                width: isActive ? 0 : isWhole ? 6 : 4,
                height: isActive ? 0 : isWhole ? 6 : 4,
                borderRadius: "50%",
                background: isWhole ? C.textMuted : `${C.text}45`,
                transition: "all 0.15s",
              }} />
            </div>
          );
        })}
        <div style={{
          position: "absolute", left: `${pct * 100}%`, top: "50%",
          transform: "translate(-50%, -50%)",
          width: 18, height: 18, borderRadius: "50%",
          background: C.text, boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transition: "left 0.1s", pointerEvents: "none",
        }} />
      </div>
      <div style={{ position: "relative", height: 18 }}>
        {steps.filter((s, i) => {
          if (steps.length <= 6) return true;
          return typeof s === "number" && s % 1 === 0;
        }).map((s) => {
          const i = steps.indexOf(s);
          const x = (i / (steps.length - 1)) * 100;
          return (
            <div key={s} style={{
              position: "absolute", left: `${x}%`, transform: "translateX(-50%)",
              color: s === value ? C.text : C.textMuted,
              fontSize: 11, cursor: "pointer", transition: "color 0.15s",
              fontWeight: s === value ? "600" : "400",
            }}>
              {formatLabel ? formatLabel(s) : s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChugsSlider({ value, onChange, max = 5 }) {
  const C = useC();
  const steps = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginBottom: 14, letterSpacing: "0.06em" }}>
        # of chugs
      </div>
      <SliderTrack steps={steps} value={value} onChange={onChange} />
    </div>
  );
}

function PriceSlider({ value, onChange }) {
  const C = useC();
  const steps = [];
  for (let v = 6; v <= 10; v += 0.5) steps.push(Math.round(v * 10) / 10);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginBottom: 14, letterSpacing: "0.06em" }}>
        avg price — <span style={{ color: C.text, fontWeight: "600" }}>${value.toFixed(2)}</span>
      </div>
      <SliderTrack steps={steps} value={value} onChange={onChange} formatLabel={(s) => `$${s}`} />
    </div>
  );
}


function DrinkScreen({ onNext, onBack }) {
  const C = useC();
  const [selectedDrinks, setSelectedDrinks] = useState([]);
  const [chugs, setChugs] = useState(1);
  const [notes, setNotes] = useState("");
  const drinks = ["matcha", "hojicha", "tea", "coffee"];

  useEffect(() => {
    if (selectedDrinks.length > 0) setChugs(selectedDrinks.length);
  }, [selectedDrinks]);

  const toggleDrink = (d) =>
    setSelectedDrinks((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Heading>what did you get?</Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {drinks.map((d) => (
            <button
              key={d}
              onClick={() => toggleDrink(d)}
              style={{
                background: selectedDrinks.includes(d) ? C.cardLight : C.card,
                border: selectedDrinks.includes(d) ? `2px solid ${C.text}` : "2px solid transparent",
                borderRadius: 18,
                color: C.text,
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                aspectRatio: "1 / 1",
                width: "100%",
                padding: "0 12px 14px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.03em",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <ChugsSlider value={chugs} onChange={setChugs} max={5} />
        <div style={{ marginTop: 20 }}>
          <div style={{ color: C.text, fontSize: 15, textAlign: "center", marginBottom: 8, letterSpacing: "0.04em" }}>
            modifications/notes
          </div>
          <input
            placeholder=""
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              background: C.card,
              border: "none",
              borderRadius: 50,
              padding: "14px 22px",
              color: "white",
              fontSize: 15,
              width: "100%",
              outline: "none",
              boxSizing: "border-box",
              letterSpacing: "0.04em",
              textAlign: "center",
            }}
          />
        </div>
      </div>
      <div style={{ paddingBottom: 40 }}>
        <NextBtn onClick={() => onNext({ drinks: selectedDrinks, chugs, notes })} />
      </div>
    </div>
  );
}

function CafeVibesScreen({ isNew, onNext, onBack }) {
  const C = useC();
  const [amenities, setAmenities] = useState([]);
  const [studyRating, setStudyRating] = useState(0);
  const [drinkRating, setDrinkRating] = useState(0);
  const [avgPrice, setAvgPrice] = useState(8);

  const toggle = (item) =>
    setAmenities((prev) => prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]);

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Heading>{isNew ? "new cafe! did it have:" : "how were the vibes?"}</Heading>
      <GridToggle
        options={["outlets", "wifi", "bathroom", "vibes"]}
        selected={amenities}
        onToggle={toggle}
      />
      <div style={{ marginTop: 24 }}>
        <StarRating label="study rating" value={studyRating} onChange={setStudyRating} />
        <StarRating label="drink rating" value={drinkRating} onChange={setDrinkRating} />
      </div>
      {isNew && <PriceSlider value={avgPrice} onChange={setAvgPrice} />}
      </div>
      <div style={{ paddingBottom: 40 }}>
        <NextBtn onClick={() => onNext({ amenities, studyRating, drinkRating, avgPrice })} />
      </div>
    </div>
  );
}

function LabelsScreen({ onNext, onBack }) {
  const C = useC();
  const [selected, setSelected] = useState([]);
  const labels = ["desserty", "had food", "good parking", "close to campus", "yap spot", "easy to get table"];

  const toggle = (l) =>
    setSelected((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Heading>other labels:</Heading>
      <PillToggle options={labels} selected={selected} onToggle={toggle} />
      </div>
      <div style={{ paddingBottom: 40 }}>
        <NextBtn onClick={() => onNext(selected)} />
      </div>
    </div>
  );
}

function CafeListBox({ title, preview, fullList, renderRow, empty, footer, onNavigate }) {
  const C = useC();
  const [expanded, setExpanded] = useState(false);
  const list = expanded ? fullList : preview;

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 12, cursor: "pointer" }} onClick={() => onNavigate ? onNavigate() : setExpanded(!expanded)}>
      <div style={{ color: C.text, fontSize: 15, marginBottom: 12, letterSpacing: "0.04em", textAlign: "center" }}>{title}</div>
      {list.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>{empty}</div>
      ) : (
        list.map((cafe, i) => (
          <div key={cafe + i} style={{
            display: "flex", alignItems: "center",
            color: C.text, fontSize: 14,
            padding: "6px 0",
            borderBottom: `1px solid ${C.border}`,
            letterSpacing: "0.02em",
          }}>
            {renderRow(cafe)}
          </div>
        ))
      )}
      <div style={{ color: C.textMuted, fontSize: 11, textAlign: "center", marginTop: 10, letterSpacing: "0.06em" }}>
        {footer}
      </div>
    </div>
  );
}


function BaristaAvatar({ avatar, size = 80 }) {
  const { gender, skin, hair, outfit } = avatar;
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 80 110">
      {/* === FEMALE === */}
      {gender === "female" && <>
        {/* Legs */}
        <rect x="33" y="83" width="6" height="16" rx="3" fill={skin} />
        <rect x="41" y="83" width="6" height="16" rx="3" fill={skin} />
        {/* Shoes */}
        <ellipse cx="36" cy="100" rx="6" ry="3.5" fill="#3a2a1a" />
        <ellipse cx="44" cy="100" rx="6" ry="3.5" fill="#3a2a1a" />
        {/* Skirt - flared short dress */}
        <path d="M31 68 Q28 80 26 88 L54 88 Q52 80 49 68 Z" fill={outfit} />
        {/* Bodice - fitted top */}
        <path d="M33 55 Q40 52 47 55 L49 70 Q40 67 31 70 Z" fill={outfit} />
        {/* Waist accent */}
        <path d="M31 69 Q40 66 49 69" stroke="rgba(245,240,232,0.3)" strokeWidth="1.5" fill="none" />
        {/* Apron */}
        <path d="M35 57 Q40 55 45 57 L46 68 Q40 66 34 68 Z" fill="rgba(245,240,232,0.22)" />
        {/* Arms */}
        <path d="M33 57 Q23 65 24 75" stroke={outfit} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M47 57 Q57 65 56 75" stroke={outfit} strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Hands */}
        <ellipse cx="24" cy="77" rx="3.5" ry="3" fill={skin} />
        <ellipse cx="56" cy="77" rx="3.5" ry="3" fill={skin} />
        {/* Neck */}
        <rect x="37" y="46" width="6" height="9" rx="3" fill={skin} />
        {/* Head */}
        <ellipse cx="40" cy="35" rx="13" ry="14" fill={skin} />
        {/* Medium wavy hair - between bob and short */}
        <path d="M27 33 Q26 20 40 17 Q54 20 53 33 Q55 42 53 52 Q51 56 49 51 Q48 42 48 31 Q44 21 40 21 Q36 21 32 31 Q32 42 31 51 Q29 56 27 52 Q25 42 27 33 Z" fill={hair} />
        <ellipse cx="40" cy="20" rx="13" ry="4.5" fill={hair} />
        <path d="M34 20 Q40 18 46 20" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>}

      {/* === NEUTRAL === */}
      {gender === "neutral" && <>
        {/* Wide-leg pants */}
        <path d="M30 75 Q28 90 26 99 L36 99 Q37 83 40 77 Q43 83 44 99 L54 99 Q52 90 50 75 Z" fill={outfit} />
        {/* Shoes */}
        <ellipse cx="31" cy="100" rx="7" ry="3.5" fill="#3a2a1a" />
        <ellipse cx="49" cy="100" rx="7" ry="3.5" fill="#3a2a1a" />
        {/* Fitted top */}
        <path d="M31 56 Q40 53 49 56 L50 77 L30 77 Z" fill={outfit} />
        {/* Apron */}
        <path d="M34 58 Q40 56 46 58 L47 74 L33 74 Z" fill="rgba(245,240,232,0.2)" />
        {/* Arms */}
        <path d="M31 58 Q21 66 22 76" stroke={outfit} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M49 58 Q59 66 58 76" stroke={outfit} strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Hands */}
        <ellipse cx="22" cy="78" rx="3.5" ry="3" fill={skin} />
        <ellipse cx="58" cy="78" rx="3.5" ry="3" fill={skin} />
        {/* Neck */}
        <rect x="37" y="47" width="6" height="9" rx="3" fill={skin} />
        {/* Head */}
        <ellipse cx="40" cy="35" rx="13" ry="14" fill={skin} />
        {/* Hair - sits flush on head, bob shape */}
        <path d="M27 33 Q26 22 40 20 Q54 22 53 33 Q54 40 53 47 Q51 51 49 47 Q48 39 48 31 Q44 23 40 23 Q36 23 32 31 Q32 39 31 47 Q29 51 27 47 Q26 40 27 33 Z" fill={hair} />
        {/* Hair top - covers crown of head */}
        <ellipse cx="40" cy="22" rx="13" ry="4" fill={hair} />
        {/* Hair shine */}
        <path d="M34 22 Q40 20 46 22" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>}

      {/* === MALE === */}
      {gender === "male" && <>
        {/* Legs */}
        <rect x="30" y="80" width="8" height="18" rx="3" fill={outfit} />
        <rect x="42" y="80" width="8" height="18" rx="3" fill={outfit} />
        {/* Shoes */}
        <ellipse cx="34" cy="100" rx="7" ry="3.5" fill="#3a2a1a" />
        <ellipse cx="46" cy="100" rx="7" ry="3.5" fill="#3a2a1a" />
        {/* Torso */}
        <path d="M30 56 Q40 53 50 56 L46 82 L34 82 Z" fill={outfit} />
        {/* Apron */}
        <path d="M33 58 Q40 56 47 58 L44 79 L36 79 Z" fill="rgba(245,240,232,0.2)" />
        {/* Arms */}
        <path d="M30 58 Q21 66 22 76" stroke={outfit} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M50 58 Q59 66 58 76" stroke={outfit} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* Hands */}
        <ellipse cx="22" cy="78" rx="4" ry="3.5" fill={skin} />
        <ellipse cx="58" cy="78" rx="4" ry="3.5" fill={skin} />
        {/* Neck */}
        <rect x="37" y="47" width="6" height="9" rx="3" fill={skin} />
        {/* Head */}
        <ellipse cx="40" cy="36" rx="13" ry="14" fill={skin} />
        {/* Male hair */}
        <path d="M27 28 Q27 18 40 16 Q53 18 53 28 Q54 24 52 22 Q45 17 40 17 Q35 17 28 22 Q26 24 27 28 Z" fill={hair} />
        <ellipse cx="40" cy="20" rx="13" ry="5" fill={hair} />
        <ellipse cx="28" cy="27" rx="4" ry="5" fill={hair} />
        <ellipse cx="52" cy="27" rx="4" ry="5" fill={hair} />
      </>}

      {/* Eyes */}
      <ellipse cx="34" cy="35" rx="2.5" ry="2.5" fill="#3a2a1a" />
      <ellipse cx="46" cy="35" rx="2.5" ry="2.5" fill="#3a2a1a" />
      <circle cx="35" cy="34" r="0.8" fill="white" />
      <circle cx="47" cy="34" r="0.8" fill="white" />
      {/* Smile */}
      <path d="M35 42 Q40 46 45 42" stroke="#3a2a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="29" cy="40" rx="4" ry="2.5" fill="rgba(255,150,130,0.25)" />
      <ellipse cx="51" cy="40" rx="4" ry="2.5" fill="rgba(255,150,130,0.25)" />
      {/* Collar */}
      <path d="M34 54 L40 57 L46 54" stroke="rgba(245,240,232,0.4)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function AvatarEditor({ avatar, setAvatar, theme, setTheme, username, onClose }) {
  const C = useC();
  const skinTones = ["#fde8d0", "#f5c5a3", "#e8a882", "#d4956a", "#c68642", "#8d5524", "#4a2c0a"];
  const hairColors = ["#f5e6c8", "#c8a96e", "#8B5E3C", "#4a2c0a", "#1a1a1a", "#8b0000", "#6b3a8c"];
  const outfitColors = ["#5b7fa6", "#3d6b4f", "#8c5b7a", "#c47a3a", "#7c5b4a", "#b5614a", "#2c2c4a"];

  const Swatch = ({ color, selected, onSelect }) => (
    <div onClick={onSelect} style={{ width: 28, height: 28, borderRadius: "50%", background: color, cursor: "pointer", border: selected ? "3px solid rgba(245,240,232,0.9)" : "3px solid transparent", boxSizing: "border-box", transition: "border 0.15s" }} />
  );

  const themes = [
    { id: "green", label: "matcha", bg: "#7a9e7e", card: "#8fb093", text: "#f5f0e8" },
    { id: "white", label: "oat", bg: "#f5f0e8", card: "#e8e2d8", text: "#3a3530" },
    { id: "black", label: "espresso", bg: "#1a1a1a", card: "#2a2a2a", text: "#f5f0e8" },
    { id: "pastel", label: "hojicha", bg: "#7a6b5e", card: "#8a7b6e", text: "#f0ece8" },
  ];

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 100, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "52px 28px 0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <span className="logo-text" style={{ color: C.textMuted, fontSize: 16, letterSpacing: "0.08em" }}>chugofmatcha</span>
      </div>

      {/* Name + avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 28px 0" }}>
        <div style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.08em", marginBottom: 16 }}>barista: <span style={{ color: C.text, fontWeight: 600 }}>{username}</span></div>
        <div style={{ position: "relative", height: 80, width: 130 }}>
          <div style={{ position: "absolute", top: -20, left: 0 }}>
            <BaristaAvatar avatar={avatar} size={130} />
          </div>
        </div>
      </div>

      <div style={{ padding: "30px 28px 100px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Gender buttons below avatar */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {["female", "neutral", "male"].map(g => (
            <button key={g} onClick={() => setAvatar(a => ({...a, gender: g}))} style={{ background: avatar.gender === g ? C.text : "transparent", border: `2px solid ${avatar.gender === g ? C.text : C.border}`, borderRadius: 50, color: avatar.gender === g ? C.textDark : C.text, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "8px 18px", cursor: "pointer", transition: "all 0.15s" }}>{g}</button>
          ))}
        </div>

        {/* Skin tone */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>skin tone</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {skinTones.map(c => <Swatch key={c} color={c} selected={avatar.skin === c} onSelect={() => setAvatar(a => ({...a, skin: c}))} />)}
          </div>
        </div>

        {/* Hair color */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>hair color</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {hairColors.map(c => <Swatch key={c} color={c} selected={avatar.hair === c} onSelect={() => setAvatar(a => ({...a, hair: c}))} />)}
          </div>
        </div>

        {/* Outfit color */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>outfit color</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {outfitColors.map(c => <Swatch key={c} color={c} selected={avatar.outfit === c} onSelect={() => setAvatar(a => ({...a, outfit: c}))} />)}
          </div>
        </div>

        {/* Theme */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>app theme</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            {themes.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)} style={{ flex: 1, background: t.bg, border: theme === t.id ? `3px solid ${C.text}` : "3px solid transparent", borderRadius: 12, padding: "10px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxSizing: "border-box" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: t.card, border: `2px solid ${t.text}20` }} />
                <span style={{ color: t.text, fontSize: 10, fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "12px 32px 28px", display: "flex", justifyContent: "center" }}>
        <button onClick={onClose} style={{ background: C.card, border: "none", borderRadius: 50, color: C.text, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "10px 32px", cursor: "pointer", letterSpacing: "0.04em" }}>← back to home</button>
      </div>
    </div>
  );
}

function ProfileScreen({ username, logs, setLogs, rankedCafes = [], setRankedCafes, userId, joinedDate, onLogAnother, appTheme, setAppTheme, avatar, setAvatar, communityStats }) {
  const C = useC();
  const [tab, setTab] = useState("cafe");
  const [listTab, setListTab] = useState("fave cafes");
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [editingCafe, setEditingCafe] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [showAvatar, setShowAvatar] = useState(false);
  const theme = appTheme; const setTheme = setAppTheme;

  const totalChugs = logs.reduce((sum, l) => sum + (l.chugs || 0), 0);
  const caffeineMg = { matcha: 70, hojicha: 15, tea: 50, coffee: 95 };
  const totalCaffeine = logs.reduce((sum, l) => {
    const drinks = l.drinks || [];
    return sum + drinks.reduce((s, d) => s + (caffeineMg[d] || 60), 0);
  }, 0);
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthLogs = logs.filter(l => { const d = new Date(l.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  const spentThisMonth = monthLogs.reduce((sum, l) => l.avgPrice ? sum + l.avgPrice * (l.chugs || 1) : sum, 0);
  const caffeineThisMonth = monthLogs.reduce((sum, l) => sum + (l.drinks || []).reduce((s, d) => s + (caffeineMg[d] || 60), 0), 0);
  const uniqueCafes = [...new Set(logs.map((l) => l.cafe))];
  const cafeCount = (name) => logs.filter((l) => l.cafe === name).length;
  const favCafe = uniqueCafes.sort((a, b) => cafeCount(b) - cafeCount(a))[0];
  const pricedLogs = logs.filter(l => l.avgPrice != null);
  const avgPrice = pricedLogs.length > 0
    ? (pricedLogs.reduce((sum, l) => sum + l.avgPrice, 0) / pricedLogs.length)
    : null;
  const totalSpent = logs.reduce((sum, l) => {
    if (l.avgPrice == null) return sum;
    return sum + (l.avgPrice * (l.chugs || 1));
  }, 0);
  const sortedCafes = [...uniqueCafes].sort((a, b) => cafeCount(b) - cafeCount(a));

  // Monthly drinks chart for 2026
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const currentMonth = thisMonth; // 0-indexed
  const visibleMonths = monthNames.slice(0, currentMonth + 1);
  const monthlyDrinks = visibleMonths.map((_, mi) => {
    return logs.reduce((sum, l) => {
      const d = new Date(l.date);
      if (d.getFullYear() === 2026 && d.getMonth() === mi) return sum + (l.chugs || 0);
      return sum;
    }, 0);
  });
  const maxDrinks = Math.max(...monthlyDrinks, 1);

  // Joined date label
  const joinedLabel = joinedDate ? (typeof joinedDate === "string" ? joinedDate : joinedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase()) : "march 2026";

  return (
    <div style={{ ...styles.screen, background: C.bg, padding: "0 0 0", position: "relative" }}>
      {showAvatar && <AvatarEditor avatar={avatar} setAvatar={setAvatar} theme={theme} setTheme={setTheme} username={username} onClose={() => setShowAvatar(false)} />}
      <div style={{ padding: "0 28px 0", display: tab === "cafe" ? "block" : "none" }}>
        <Logo />
        <div style={{ marginBottom: 20, position: "relative", lineHeight: 1.2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div className="tight-stack" style={{ color: C.text, fontSize: 36, fontWeight: "bold", textAlign: "center" }}>
              {username}'s cafe
            </div>
            <button
            onClick={onLogAnother}
            style={{
              position: "absolute",
              right: 0,
              background: "none",
              border: "none",
              color: C.text,
              fontSize: 28,
              fontWeight: "300",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            +
          </button>
          </div>
          <div className="tight-stack" style={{ color: C.textMuted, fontSize: 11, textAlign: "center", letterSpacing: "0.06em", marginTop: 3 }}>joined {joinedLabel}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <StatCard label="drinks chugged" value={totalChugs} large />
          <StatCard label="cafes" value={uniqueCafes.length} large />
          <StatCard label="caffeine this month" value={caffeineThisMonth > 0 ? caffeineThisMonth + "mg" : "—"} large smallNumber />
          <StatCard label="spent this month" value={spentThisMonth > 0 ? "$" + spentThisMonth.toFixed(2) : "—"} large smallNumber />
        </div>

        {/* Monthly drinks chart */}
        <div style={{ padding: "24px 0 12px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 60, gap: 4 }}>
            {visibleMonths.map((m, i) => {
              const h = monthlyDrinks[i] === 0 ? 4 : Math.max(8, (monthlyDrinks[i] / maxDrinks) * 60);
              return (
                <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: "100%", height: h,
                    background: monthlyDrinks[i] === 0 ? `${C.text}15` : `${C.text}50`,
                    borderRadius: 4,
                    transition: "height 0.3s",
                  }} />
                  <div style={{ color: C.textMuted, fontSize: 9, letterSpacing: "0.04em" }}>{m}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best chugs */}
        <CafeListBox
          title="best chug"
          preview={rankedCafes.slice(0, 1)}
          fullList={rankedCafes}
          renderRow={(cafe) => <span style={{ flex: 1 }}>{cafe}</span>}
          empty="no ranked cafes yet"
          footer={(() => { if (!communityStats || !communityStats.drinkTotals) return ""; const myMatcha = logs.reduce((s,l) => (l.drinks||[]).includes("matcha") ? s+(l.chugs||1) : s, 0); const total = communityStats.drinkTotals.matcha || 0; if (!myMatcha || !total) return ""; const pct = Math.round(myMatcha/total*100); return `you're ${pct}% of matcha on com 🍵`; })()}
          onNavigate={() => { setTab("your lists"); setListTab("fave cafes"); }}
        />

        {/* Avatar centered at bottom */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -5, marginBottom: 4 }}>
          <div onClick={() => setShowAvatar(true)} style={{ cursor: "pointer", marginBottom: -8 }}>
            <BaristaAvatar avatar={avatar} size={165} />
          </div>
          <div style={{ width: 70, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.15)", filter: "blur(4px)", marginTop: -10 }} />
        </div>
      </div>

      {/* Your Lists Tab */}
      {tab === "your lists" && (() => {
        const listDefs = {
          "fave cafes": (() => { const ranked = rankedCafes.filter(c => uniqueCafes.includes(c)); const unranked = uniqueCafes.filter(c => !rankedCafes.includes(c)); return [...ranked, ...unranked]; })(),
          "most visited": sortedCafes,
          "best study": (() => {
            const cafeStudy = {};
            logs.forEach(l => { if (l.studyRating > 0 && (!cafeStudy[l.cafe] || l.studyRating > cafeStudy[l.cafe])) cafeStudy[l.cafe] = l.studyRating; });
            return Object.keys(cafeStudy).sort((a, b) => {
              if (cafeStudy[b] !== cafeStudy[a]) return cafeStudy[b] - cafeStudy[a];
              const ri = rankedCafes.indexOf(a), rj = rankedCafes.indexOf(b);
              if (ri === -1 && rj === -1) return 0;
              if (ri === -1) return 1; if (rj === -1) return -1;
              return ri - rj;
            });
          })(),
        };
        const listTabs = ["fave cafes", "most visited", "best study"];
        const activeList = listDefs[listTab] || [];

        // Build cafe detail from all logs for that cafe
        const getCafeDetail = (cafeName) => {
          const cafeLogs = logs.filter(l => l.cafe === cafeName);
          const visits = cafeLogs.length;
          const bestStudy = Math.max(...cafeLogs.map(l => l.studyRating || 0), 0);
          const bestDrink = Math.max(...cafeLogs.map(l => l.drinkRating || 0), 0);
          const pricedVisits = cafeLogs.filter(l => l.avgPrice != null);
          const avgP = pricedVisits.length > 0 ? (pricedVisits.reduce((s, l) => s + l.avgPrice, 0) / pricedVisits.length) : null;
          const totalSpentCafe = cafeLogs.reduce((s, l) => l.avgPrice ? s + l.avgPrice * (l.chugs || 1) : s, 0);
          const amenities = cafeLogs.flatMap(l => l.amenities || []);
          const hasOutlets = amenities.includes("outlets");
          const hasWifi = amenities.includes("wifi");
          const hasBathroom = amenities.includes("bathroom");
          const allLabels = [...new Set(cafeLogs.flatMap(l => l.labels || []))];
          const allNotes = cafeLogs.map(l => l.notes).filter(n => n && n.trim().length > 0);
          return { visits, bestStudy, bestDrink, avgP, totalSpentCafe, hasOutlets, hasWifi, hasBathroom, allLabels, allNotes };
        };

        if (selectedCafe) {
          const d = getCafeDetail(selectedCafe);
          return (
            <div style={{ padding: "0 28px", flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "52px 0 16px" }}>
                <button onClick={() => { setSelectedCafe(null); setEditingCafe(false); }} style={{ position: "absolute", left: 0, background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", padding: 0, fontFamily: "'Instrument Serif', serif", lineHeight: 1 }}>‹</button>
                <span className="logo-text" style={{ color: C.textMuted, fontSize: 16, letterSpacing: "0.08em" }}>chugofmatcha</span>

              </div>

              {/* Cafe name + visits */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ color: C.text, fontSize: 26, fontWeight: "bold", lineHeight: 1 }}>{selectedCafe}</div>
                  <button onClick={() => { setEditingCafe(!editingCafe); setEditForm({ studyRating: d.bestStudy, drinkRating: d.bestDrink, avgPrice: d.avgP || 8, notes: logs.filter(l => l.cafe === selectedCafe && l.notes).map(l => l.notes).join(", "), labels: [...d.allLabels] }); }} style={{ background: "none", border: "none", color: editingCafe ? C.text : C.textMuted, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>✎</button>
                </div>
                <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3, letterSpacing: "0.04em" }}>visited {d.visits}x</div>
              </div>

              {editingCafe && (
                <div style={{ background: C.card, borderRadius: 18, padding: "18px 20px", marginBottom: 12 }}>
                  <div style={{ color: C.text, fontSize: 14, marginBottom: 14, letterSpacing: "0.04em", textAlign: "center" }}>edit your review</div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>study rating</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                      {[1,2,3,4,5].map(s => <span key={s} onClick={() => setEditForm(f => ({...f, studyRating: s}))} style={{ fontSize: 22, cursor: "pointer", color: s <= (editForm.studyRating||0) ? C.text : `${C.text}30`, transition: "color 0.1s" }}>★</span>)}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>drink rating</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                      {[1,2,3,4,5].map(s => <span key={s} onClick={() => setEditForm(f => ({...f, drinkRating: s}))} style={{ fontSize: 22, cursor: "pointer", color: s <= (editForm.drinkRating||0) ? C.text : `${C.text}30`, transition: "color 0.1s" }}>★</span>)}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>avg price</div>
                    <PriceSlider value={editForm.avgPrice || 8} onChange={v => setEditForm(f => ({...f, avgPrice: v}))} />
                  </div>

                  <div>
                    <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>notes</div>
                    <input value={editForm.notes || ""} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} style={{ background: C.card, border: "none", borderRadius: 50, padding: "12px 18px", color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center" }} />
                  </div>

                  <button onClick={async () => {
                    // Price edit only applies to future logs (add a priceOverride marker on the cafe)
                    // Update ratings/notes/labels on all logs, but only update avgPrice on the latest log
                    const cafeLogs = prev => prev.filter(l => l.cafe === selectedCafe);
                    setLogs(prev => {
                      const sorted = [...prev].sort((a,b) => new Date(b.date) - new Date(a.date));
                      const latestIdx = sorted.findIndex(l => l.cafe === selectedCafe);
                      return prev.map((l, i) => l.cafe !== selectedCafe ? l : {
                        ...l,
                        studyRating: editForm.studyRating ?? l.studyRating,
                        drinkRating: editForm.drinkRating ?? l.drinkRating,
                        avgPrice: l === sorted[latestIdx] ? (editForm.avgPrice ?? l.avgPrice) : l.avgPrice,
                        notes: editForm.notes ?? l.notes,
                        labels: editForm.labels ?? l.labels,
                      });
                    });
                    // Save to Supabase
                    if (userId) {
                      try {
                        await sb.patch("logs", `user_id=eq.${userId}&cafe=eq.${encodeURIComponent(selectedCafe)}`, {
                          study_rating: editForm.studyRating,
                          drink_rating: editForm.drinkRating,
                          avg_price: editForm.avgPrice,
                          notes: editForm.notes,
                        });
                      } catch(e) {}
                    }
                    setEditingCafe(false);
                  }} style={{ background: C.text, color: C.textDark, border: "none", borderRadius: 50, padding: "12px 32px", fontSize: 14, fontFamily: "'Inter', sans-serif", cursor: "pointer", display: "block", margin: "16px auto 0", letterSpacing: "0.04em" }}>save</button>
                </div>
              )}

              {/* Stat boxes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ background: C.card, borderRadius: 18, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ color: C.textMuted, fontSize: 28, fontWeight: "700", lineHeight: 1 }}>{d.visits}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.04em" }}>visits</div>
                </div>
                <div style={{ background: C.card, borderRadius: 18, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ color: C.textMuted, fontSize: 28, fontWeight: "700", lineHeight: 1 }}>{d.avgP != null ? `$${d.avgP.toFixed(2)}` : "—"}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.04em" }}>avg price</div>
                </div>
                <div style={{ background: C.card, borderRadius: 18, padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, gridColumn: "1 / -1" }}>
                  <div style={{ color: C.textMuted, fontSize: 22, fontWeight: "700", lineHeight: 1 }}>{d.totalSpentCafe > 0 ? `$${d.totalSpentCafe.toFixed(2)}` : "—"}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.04em" }}>total spent</div>
                </div>
              </div>

              {/* Ratings box */}
              <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 12 }}>
                {[["study rating", d.bestStudy], ["drink rating", d.bestDrink]].map(([label, rating]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.04em" }}>{label}</span>
                    <span style={{ color: C.text, fontSize: 15, letterSpacing: "0.05em" }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ color: s <= rating ? C.text : `${C.text}30` }}>★</span>
                      ))}
                    </span>
                  </div>
                ))}
                {/* Amenities */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, gap: 8 }}>
                  {[["outlets", d.hasOutlets], ["wifi", d.hasWifi], ["bathroom", d.hasBathroom]].map(([label, has]) => (
                    <div key={label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ color: has ? C.text : `${C.text}40`, fontSize: 12, letterSpacing: "0.04em" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Labels */}
              {(editingCafe ? (editForm.labels||[]) : d.allLabels).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {(editingCafe ? (editForm.labels||[]) : d.allLabels).map(l => (
                    <span key={l} style={{ background: C.card, border: `2px solid ${C.border}`, borderRadius: 50, padding: "7px 16px", color: C.text, fontSize: 12, letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 6 }}>
                      {l}
                      {editingCafe && (
                        <button onClick={() => setEditForm(f => ({ ...f, labels: (f.labels||[]).filter(x => x !== l) }))}
                          style={{ background: "none", border: "none", color: C.textMuted, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {d.allNotes.length > 0 && (
                <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px" }}>
                  <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.04em", marginBottom: 10 }}>notes</div>
                  {d.allNotes.map((note, i) => (
                    <div key={i} style={{ color: C.text, fontSize: 13, padding: "6px 0", borderBottom: i < d.allNotes.length - 1 ? `1px solid ${C.border}` : "none", lineHeight: 1.5 }}>{note}</div>
                  ))}
                </div>
              )}
              {editingCafe && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 8, marginBottom: 8 }}>
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ background: "none", border: "none", color: `${C.text}35`, fontSize: 20, cursor: "pointer", padding: "8px 20px", lineHeight: 1, fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}>
                    🗑
                  </button>
                </div>
              )}
              {confirmDelete && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                  <div style={{ background: C.card, borderRadius: 24, padding: "28px 24px", margin: "0 32px", textAlign: "center" }}>
                    <div style={{ color: C.text, fontSize: 16, marginBottom: 8 }}>delete {selectedCafe}?</div>
                    <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 24 }}>this removes all your logs for this cafe</div>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                      <button onClick={() => setConfirmDelete(false)} style={{ background: "none", border: `2px solid ${C.border}`, borderRadius: 50, padding: "10px 24px", color: C.textMuted, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>cancel</button>
                      <button onClick={async () => {
                        const cafe = selectedCafe;
                        setLogs(prev => prev.filter(l => l.cafe !== cafe));
                        const newRanked = rankedCafes.filter(c => c !== cafe);
                        setRankedCafes(newRanked);
                        setSelectedCafe(null);
                        setEditingCafe(false);
                        setConfirmDelete(false);
                        if (userId) {
                          try {
                            await sb.patch("users", `id=eq.${userId}`, { ranked_cafes: newRanked });
                            await sb.delete("logs", `user_id=eq.${userId}&cafe=eq.${encodeURIComponent(cafe)}`);
                          } catch(e) {}
                        }
                      }} style={{ background: C.text, border: "none", borderRadius: 50, padding: "10px 24px", color: C.textDark, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <div style={{ padding: "0 28px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative" }}>
              <Logo />
              <button onClick={() => setTab("cafe")} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, paddingTop: 52 }}>‹</button>
            </div>
            {/* Tab pills + filter button */}
            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", marginBottom: showFilters ? 12 : 20, marginTop: 4, justifyContent: "center", alignItems: "center" }}>
              {listTabs.map(lt => (
                <button key={lt} onClick={() => setListTab(lt)} style={{ background: listTab === lt ? C.text : "transparent", border: `2px solid ${listTab === lt ? C.text : C.border}`, borderRadius: 50, color: listTab === lt ? C.textDark : C.text, fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "7px 14px", cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.15s" }}>{lt}</button>
              ))}
              <button onClick={() => setShowFilters(f => !f)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: activeFilters.length > 0 ? C.text : C.textMuted, transition: "color 0.15s", flexShrink: 0 }} title="filter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                {activeFilters.length > 0 && <span style={{ fontSize: 10, marginLeft: 3, fontFamily: "'Inter', sans-serif" }}>{activeFilters.length}</span>}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (() => {
              const filterOptions = [
                { id: "outlets", label: "outlets" },
                { id: "wifi", label: "wifi" },
                { id: "bathroom", label: "bathroom" },
                { id: "price-low", label: "under $7" },
                { id: "price-mid", label: "$7–$9" },
                { id: "price-high", label: "over $9" },
                { id: "desserty", label: "desserty" },
                { id: "had food", label: "had food" },
                { id: "good parking", label: "good parking" },
                { id: "close to campus", label: "close to campus" },
                { id: "yap spot", label: "yap spot" },
                { id: "easy to get table", label: "easy to get table" },
              ];
              const toggleFilter = (id) => setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
              return (
                <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {filterOptions.map(f => (
                      <button key={f.id} onClick={() => toggleFilter(f.id)} style={{ background: activeFilters.includes(f.id) ? C.text : "transparent", border: `2px solid ${activeFilters.includes(f.id) ? C.text : C.border}`, borderRadius: 50, color: activeFilters.includes(f.id) ? C.textDark : C.text, fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "6px 12px", cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.15s" }}>{f.label}</button>
                    ))}
                  </div>
                  {activeFilters.length > 0 && (
                    <button onClick={() => setActiveFilters([])} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", marginTop: 10, padding: 0, letterSpacing: "0.04em" }}>clear all</button>
                  )}
                </div>
              );
            })()}

            <div style={{ flex: 1 }}>
              {(() => {
                const filteredList = activeList.filter(cafe => {
                  const cafeLogs = logs.filter(l => l.cafe === cafe);
                  const amenities = cafeLogs.flatMap(l => l.amenities || []);
                  const pricedLogs = cafeLogs.filter(l => l.avgPrice != null);
                  const avgP = pricedLogs.length > 0 ? pricedLogs.reduce((s, l) => s + l.avgPrice, 0) / pricedLogs.length : null;

                  for (const f of activeFilters) {
                    if (f === "outlets" && !amenities.includes("outlets")) return false;
                    if (f === "wifi" && !amenities.includes("wifi")) return false;
                    if (f === "bathroom" && !amenities.includes("bathroom")) return false;
                    if (f === "price-low" && (avgP === null || avgP >= 7)) return false;
                    if (f === "price-mid" && (avgP === null || avgP < 7 || avgP > 9)) return false;
                    if (f === "price-high" && (avgP === null || avgP <= 9)) return false;
                    if (!["outlets","wifi","bathroom","price-low","price-mid","price-high"].includes(f)) {
                      const allLabels = cafeLogs.flatMap(l => l.labels || []);
                      if (!allLabels.includes(f)) return false;
                    }
                  }
                  return true;
                });
                return filteredList.length === 0 ? (
                <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", marginTop: 40 }}>{activeList.length === 0 ? "nothing here yet" : "no cafes match these filters"}</div>
              ) : (
                filteredList.map((cafe, i) => (
                  <div key={cafe + i} onClick={() => setSelectedCafe(cafe)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, color: C.text, cursor: "pointer" }}>
                    <span style={{ color: C.textMuted, fontSize: 13, marginRight: 12, minWidth: 20 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{cafe}</span>
                    {listTab === "best study" ? (
                      <span style={{ color: C.textMuted, fontSize: 13 }}>{"★".repeat(Math.max(...logs.filter(l => l.cafe === cafe && l.studyRating > 0).map(l => l.studyRating), 0))}</span>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 13 }}>{cafeCount(cafe)}</span>
                    )}
                    <span style={{ color: C.textMuted, fontSize: 16, marginLeft: 8 }}>›</span>
                  </div>
                ))
              );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Stats Tab */}
      {tab === "stats" && (() => {
        // uses thisMonth/thisYear from outer ProfileScreen scope

        // Money spent this month
        const monthlySpend = logs.reduce((sum, l) => {
          const d = new Date(l.date);
          if (d.getMonth() === thisMonth && d.getFullYear() === thisYear && l.avgPrice != null)
            return sum + l.avgPrice * (l.chugs || 1);
          return sum;
        }, 0);

        // Cafes visited per month this year
        const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        const visibleMonths = monthNames.slice(0, thisMonth + 1);
        const cafesPerMonth = visibleMonths.map((_, mi) => {
          const monthLogs = logs.filter(l => { const d = new Date(l.date); return d.getFullYear() === thisYear && d.getMonth() === mi; });
          return new Set(monthLogs.map(l => l.cafe)).size;
        });
        const maxCafes = Math.max(...cafesPerMonth, 1);

        // Drink breakdown
        const drinkCounts = { matcha: 0, hojicha: 0, tea: 0, coffee: 0 };
        logs.forEach(l => {
          const drinks = l.drinks || [];
          const chugs = l.chugs || 1;
          drinks.forEach(d => { if (drinkCounts[d] !== undefined) drinkCounts[d] += chugs; });
        });
        const maxDrink = Math.max(...Object.values(drinkCounts), 1);
        const totalDrinks = Object.values(drinkCounts).reduce((a, b) => a + b, 0);

        const Bar = ({ label, value, max, color }) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ color: C.textMuted, fontSize: 12, width: 52, textAlign: "right", letterSpacing: "0.03em", flexShrink: 0 }}>{label}</div>
            <div style={{ flex: 1, background: `${C.text}18`, borderRadius: 4, height: 10, overflow: "hidden" }}>
              <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
            </div>
            <div style={{ color: C.textMuted, fontSize: 12, width: 20, textAlign: "left", flexShrink: 0 }}>{value}</div>
          </div>
        );

        return (
          <div style={{ padding: "0 28px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative" }}>
              <Logo />
              <button onClick={() => setTab("cafe")} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, paddingTop: 52 }}>‹</button>
            </div>

            {/* Stats top row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, background: C.card, borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>total spent</div>
                <div style={{ color: C.text, fontSize: 28, fontWeight: "700", lineHeight: 1 }}>
                  {totalSpent > 0 ? `$${totalSpent.toFixed(2)}` : "—"}
                </div>
              </div>
              <div style={{ flex: 1, background: C.card, borderRadius: 18, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>total caffeine</div>
                <div style={{ color: C.text, fontSize: 28, fontWeight: "700", lineHeight: 1 }}>
                  {totalCaffeine > 0 ? `${totalCaffeine}mg` : "—"}
                </div>
              </div>
            </div>

            {/* Cafes per month */}
            <div style={{ background: C.card, borderRadius: 18, padding: "20px 20px 16px", marginBottom: 12 }}>
              <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 40, textAlign: "center" }}>cafes visited by month</div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 120, gap: 4 }}>
                {visibleMonths.map((m, i) => {
                  const h = cafesPerMonth[i] === 0 ? 4 : Math.max(8, (cafesPerMonth[i] / maxCafes) * 120);
                  return (
                    <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <div style={{ width: "100%", height: h, background: cafesPerMonth[i] === 0 ? `${C.text}18` : `${C.text}80`, borderRadius: 4, transition: "height 0.3s" }} />
                      <div style={{ color: C.textMuted, fontSize: 9, letterSpacing: "0.03em" }}>{m}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drink breakdown donut */}
            <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 14, textAlign: "center" }}>drink breakdown</div>
              {(() => {
                const drinkColors = { matcha: "#6b9e78", hojicha: "#c4845a", tea: "#7a9eb8", coffee: "#8b6b4a" };
                const allDrinks = ["matcha", "hojicha", "tea", "coffee"];
                const activeDrinks = allDrinks.filter(d => drinkCounts[d] > 0);
                const r = 50, cx = 65, cy = 65, stroke = 16;
                const circ = 2 * Math.PI * r;
                let cumulative = 0;
                const slices = activeDrinks.map(drink => {
                  const count = drinkCounts[drink];
                  const pct = totalDrinks > 0 ? count / totalDrinks : 0;
                  const dash = pct * circ;
                  const offset = circ - cumulative * circ;
                  cumulative += pct;
                  return { drink, count, pct, dash, offset };
                });
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <svg width={130} height={130} style={{ flexShrink: 0 }}>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${C.text}18`} strokeWidth={stroke} />
                      {totalDrinks === 0 ? null : slices.map(({ drink, dash, offset }) => (
                        <circle key={drink} cx={cx} cy={cy} r={r} fill="none"
                          stroke={drinkColors[drink]}
                          strokeWidth={stroke}
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeDashoffset={offset}
                          transform={`rotate(-90 ${cx} ${cy})`}
                        />
                      ))}
                      <text x={cx} y={cy - 5} textAnchor="middle" fill={C.text} fontSize="20" fontWeight="700" fontFamily="Inter">{totalDrinks || "—"}</text>
                      <text x={cx} y={cy + 12} textAnchor="middle" fill={C.textMuted} fontSize="9" fontFamily="Inter" letterSpacing="1">total</text>
                    </svg>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                      {allDrinks.map(drink => {
                        const count = drinkCounts[drink] || 0;
                        const pct = totalDrinks > 0 ? Math.round(count / totalDrinks * 100) : 0;
                        return (
                          <div key={drink} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: drinkColors[drink], flexShrink: 0, opacity: count > 0 ? 1 : 0.3 }} />
                            <div style={{ flex: 1, color: count > 0 ? C.text : C.textMuted, fontSize: 12, letterSpacing: "0.03em" }}>{drink}</div>
                            <div style={{ color: C.textMuted, fontSize: 12, minWidth: 32, textAlign: "right" }}>{count > 0 ? `${pct}%` : "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Community stats */}
            {communityStats && communityStats.totalLogs > 0 && (() => {
              const myMatcha = logs.reduce((s, l) => (l.drinks||[]).includes("matcha") ? s + (l.chugs||1) : s, 0);
              const totalMatcha = communityStats.drinkTotals.matcha || 0;
              const matchaPct = totalMatcha > 0 ? Math.round(myMatcha / totalMatcha * 100) : 0;
              // Find fave cafe (most visited by this user) and its global rank
              const myCafes = [...new Set(logs.map(l => l.cafe))];
              const myVisitCount = (c) => logs.filter(l => l.cafe === c).length;
              const favCafe = myCafes.length > 0 ? myCafes.reduce((a,b) => myVisitCount(a) >= myVisitCount(b) ? a : b) : null;
              const globalCafeRanks = Object.entries(communityStats.cafeVisits).sort((a,b) => b[1]-a[1]);
              const favCafeRank = favCafe ? globalCafeRanks.findIndex(([c]) => c === favCafe) + 1 : null;
              return (
                <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 12 }}>

                  {favCafe && favCafeRank > 0 && (
                    <div style={{ color: C.text, fontSize: 14, textAlign: "center", marginBottom: 10, lineHeight: 1.4 }}>
                      you're <span style={{ fontWeight: "700" }}>top #{favCafeRank}</span> at <span style={{ fontWeight: "700" }}>{favCafe}</span>
                    </div>
                  )}
                  {myMatcha > 0 && totalMatcha > 0 && (() => {
                    // percentile: what % of users drink LESS matcha than me
                    const allUserMatcha = communityStats.userMatchaChugs || [];
                    const below = allUserMatcha.filter(n => n < myMatcha).length;
                    const topPct = allUserMatcha.length > 1 ? Math.round((1 - below / allUserMatcha.length) * 100) : matchaPct;
                    return (
                      <div style={{ color: C.text, fontSize: 14, textAlign: "center", marginBottom: 10, lineHeight: 1.4 }}>
                        you are in the top <span style={{ fontWeight: "700" }}>{topPct}%</span> of com chuggers 🍵
                      </div>
                    );
                  })()}
                  <div style={{ color: C.textMuted, fontSize: 11, textAlign: "center" }}>
                    based on {communityStats.totalLogs} logs
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Bottom nav */}
      <div style={{ marginTop: "auto", padding: "0 28px 48px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
          {["cafe", "your lists", "stats"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? C.text : "transparent",
                border: `2px solid ${tab === t ? C.text : C.border}`,
                borderRadius: 50,
                color: tab === t ? C.textDark : C.text,
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                padding: "10px 20px",
                cursor: "pointer",
                letterSpacing: "0.04em",
                transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          ))}
          <div onClick={() => setShowAvatar(true)} style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: C.cardLight,
            border: `2px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            overflow: "hidden",
          }}>
            <BaristaAvatar avatar={avatar} size={36} />
          </div>
        </div>
      </div>
    </div>
  );
}



function HomemadeDrinkScreen({ onNext, onBack }) {
  const C = useC();
  const [selectedDrinks, setSelectedDrinks] = useState([]);
  const [drinkName, setDrinkName] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const drinks = ["matcha", "hojicha", "tea", "coffee"];

  const toggleDrink = (d) =>
    setSelectedDrinks(prev => prev.includes(d) ? [] : [d]);

  const ingredientLabel = () => {
    if (selectedDrinks.includes("matcha") || selectedDrinks.includes("hojicha")) return "powder used";
    if (selectedDrinks.includes("tea")) return "tea flavor";
    if (selectedDrinks.includes("coffee")) return "brand";
    return "ingredient";
  };

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", overflowY: "auto" }}>
        <Heading>what did you make?</Heading>

        {/* Drink name input */}
        <input
          placeholder="name your drink"
          value={drinkName}
          onChange={e => setDrinkName(e.target.value)}
          style={{ background: C.card, border: "none", borderRadius: 50, padding: "12px 20px", color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.04em", marginBottom: 20 }}
        />

        {/* Drink type grid - smaller */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {drinks.map(d => {
            const active = selectedDrinks.includes(d);
            return (
              <button key={d} onClick={() => toggleDrink(d)} style={{
                background: active ? C.cardLight : C.card,
                border: active ? `2px solid ${C.text}` : "2px solid transparent",
                borderRadius: 14, color: C.text, fontSize: 13,
                fontFamily: "'Inter', sans-serif", padding: "18px 12px",
                cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.03em",
              }}>{d}</button>
            );
          })}
        </div>

        {/* Ingredient label - shows after drink selected */}
        {selectedDrinks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>{ingredientLabel()}</div>
            <input
              placeholder=""
              value={ingredient}
              onChange={e => setIngredient(e.target.value)}
              style={{ background: C.card, border: "none", borderRadius: 50, padding: "12px 20px", color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.04em" }}
            />
          </div>
        )}

        {/* modifications/notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.text, fontSize: 14, textAlign: "center", marginBottom: 8, letterSpacing: "0.04em" }}>modifications/notes</div>
          <input
            placeholder=""
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ background: C.card, border: "none", borderRadius: 50, padding: "12px 20px", color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.04em" }}
          />
        </div>

        {/* Star rating */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8, letterSpacing: "0.06em" }}>rate your drink</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} onClick={() => setRating(s)} style={{ fontSize: 26, cursor: "pointer", color: s <= rating ? C.text : `${C.text}30`, transition: "color 0.1s" }}>★</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ paddingBottom: 40, paddingLeft: 28, paddingRight: 28 }}>
        <NextBtn onClick={() => onNext({ drinks: selectedDrinks, drinkName: drinkName || "homemade", ingredient, notes, rating, isHomemade: true, chugs: 1 })} />
      </div>
    </div>
  );
}

function RankingScreen({ newCafe, rankedCafes, onDone, onBack }) {
  const C = useC();
  // We do head-to-head: newCafe vs each existing ranked cafe one at a time
  // If newCafe wins, it moves up; if it loses, it stays below that cafe
  // We binary-search style: compare against middle of remaining range
  const [position, setPosition] = useState({ lo: 0, hi: rankedCafes.length });
  const [insertIdx, setInsertIdx] = useState(null);

  const lo = position.lo;
  const hi = position.hi;
  const mid = Math.floor((lo + hi) / 2);

  // If lo === hi, we found the insertion point
  useEffect(() => {
    if (lo === hi) {
      setInsertIdx(lo);
    }
  }, [lo, hi]);

  if (insertIdx !== null) {
    // Auto-insert and proceed
    const newRanked = [...rankedCafes];
    newRanked.splice(insertIdx, 0, newCafe);
    onDone(newRanked);
    return null;
  }

  // No existing cafes to compare against
  if (rankedCafes.length === 0) {
    onDone([newCafe]);
    return null;
  }

  const opponent = rankedCafes[mid];

  const choose = (winner) => {
    if (winner === "new") {
      // newCafe beats mid, so it belongs in upper half (lo..mid)
      setPosition({ lo, hi: mid });
    } else {
      // opponent wins, newCafe belongs in lower half (mid+1..hi)
      setPosition({ lo: mid + 1, hi });
    }
  };

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Heading>which do you prefer?</Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "new", name: newCafe },
            { key: "old", name: opponent },
          ].map(({ key, name }) => (
            <button
              key={key}
              onClick={() => choose(key)}
              style={{
                background: C.card,
                border: "2px solid transparent",
                borderRadius: 18,
                color: C.text,
                fontSize: 15,
                fontFamily: "'Inter', sans-serif",
                aspectRatio: "1 / 1",
                width: "100%",
                padding: "0 12px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.03em",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.cardLight}
              onMouseLeave={e => e.currentTarget.style.background = C.card}
            >
              {name}
            </button>
          ))}
        </div>
        <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginTop: 16, letterSpacing: "0.04em" }}>
          ranking your cafes...
        </div>
        <div style={{ marginTop: 20 }}>
          <NextBtn label="skip" onClick={() => onDone(rankedCafes)} />
        </div>
      </div>
    </div>
  );
}

// ── App shell / flow ─────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("signin");
  const [appTheme, setAppTheme] = useState(() => { try { return localStorage.getItem("com_theme") || "green"; } catch(e) { return "green"; } });
  const [avatar, setAvatar] = useState({ gender: "female", skin: "#f5c5a3", hair: "#4a2c0a", outfit: "#7a9e7e" });
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [logs, setLogs] = useState([]);
  const [currentLog, setCurrentLog] = useState({});
  const [isNewCafe, setIsNewCafe] = useState(false);
  const isNewCafeRef = React.useRef(false);
  const [isHomemade, setIsHomemade] = useState(false);
  const [rankedCafes, setRankedCafes] = useState([]);
  const [joinedDate, setJoinedDate] = useState(new Date());
  const [fromProfile, setFromProfile] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);

  // Load community stats for percentile comparisons
  const loadCommunityStats = async () => {
    try {
      const allLogs = await sb.get("logs", "select=drinks,chugs,avg_price,cafe,user_id");
      if (!allLogs || allLogs.error) return;
      const drinkTotals = { matcha: 0, hojicha: 0, tea: 0, coffee: 0 };
      const cafeVisits = {};
      const perUserMatcha = {};
      allLogs.forEach(l => {
        (l.drinks || []).forEach(d => { if (drinkTotals[d] !== undefined) drinkTotals[d] += (l.chugs || 1); });
        if (l.cafe) cafeVisits[l.cafe] = (cafeVisits[l.cafe] || 0) + 1;
        if (l.user_id && (l.drinks||[]).includes("matcha")) {
          perUserMatcha[l.user_id] = (perUserMatcha[l.user_id] || 0) + (l.chugs || 1);
        }
      });
      const userMatchaChugs = Object.values(perUserMatcha);
      setCommunityStats({ drinkTotals, cafeVisits, totalLogs: allLogs.length, userMatchaChugs });
    } catch(e) {}
  };

  const handleLogin = async (userRow) => {
    setUserId(userRow.id);
    setUsername(userRow.username);
    setRankedCafes(userRow.ranked_cafes || []);
    const t = userRow.theme || "green";
    setAppTheme(t);
    try { localStorage.setItem("com_theme", t); } catch(e) {}
    setAvatar(userRow.avatar || { gender: "female", skin: "#f5c5a3", hair: "#4a2c0a", outfit: "#7a9e7e" });
    if (userRow.joined_date) setJoinedDate(userRow.joined_date);
    // Load user's logs
    try {
      const userLogs = await sb.get("logs", `user_id=eq.${userRow.id}&select=*&order=created_at.asc`);
      if (userLogs && !userLogs.error) {
        setLogs(userLogs.map(l => ({
          cafe: l.cafe, date: l.date, drinks: l.drinks || [],
          chugs: l.chugs, notes: l.notes, amenities: l.amenities || [],
          studyRating: l.study_rating, drinkRating: l.drink_rating,
          avgPrice: l.avg_price, labels: l.labels || []
        })));
      }
    } catch(e) {}
    await loadCommunityStats();
    setScreen("cafe-entry");
  };

  const handleCafeEntry = (cafe, dateISO) => {
    const knownCafes = logs.map((l) => l.cafe);
    const newCafe = !knownCafes.includes(cafe);
    setIsNewCafe(newCafe);
    isNewCafeRef.current = newCafe;
    setCurrentLog({ cafe, date: dateISO || new Date().toISOString().slice(0, 10) });
    setScreen("drink");
  };

  const handleDrink = (drinkData) => {
    setCurrentLog((prev) => ({ ...prev, ...drinkData }));
    if (isNewCafeRef.current) {
      setScreen("vibes");
    } else {
      // Returning visit — skip vibes & labels, carry over last known price
      const lastLog = [...logs].reverse().find(l => l.cafe === currentLog.cafe);
      const avgPrice = lastLog?.avgPrice ?? null;
      const finalLog = { ...currentLog, ...drinkData, avgPrice };
      setLogs((prev) => [...prev, finalLog]);
      setCurrentLog(finalLog);
      // Save to Supabase
      if (userId) {
        sb.post("logs", {
          user_id: userId, username,
          cafe: finalLog.cafe, date: finalLog.date,
          drinks: finalLog.drinks, chugs: finalLog.chugs,
          notes: finalLog.notes, avg_price: finalLog.avgPrice,
          amenities: finalLog.amenities, study_rating: finalLog.studyRating,
          drink_rating: finalLog.drinkRating, labels: finalLog.labels
        }).catch(() => {});
      }
      // Only rank if not already ranked
      const alreadyRanked = rankedCafes.includes(currentLog.cafe);
      if (alreadyRanked) {
        setCurrentLog({});
        setScreen("profile");
      } else {
        setScreen("ranking");
      }
    }
  };

  const handleVibes = (vibeData) => {
    setCurrentLog((prev) => ({ ...prev, ...vibeData }));
    setScreen("labels");
  };

  const handleLabels = (labels) => {
    const finalLog = { ...currentLog, labels };
    setLogs((prev) => [...prev, finalLog]);
    setCurrentLog(finalLog);
    // Save to Supabase
    if (userId) {
      sb.post("logs", {
        user_id: userId, username,
        cafe: finalLog.cafe, date: finalLog.date,
        drinks: finalLog.drinks, chugs: finalLog.chugs,
        notes: finalLog.notes, avg_price: finalLog.avgPrice,
        amenities: finalLog.amenities, study_rating: finalLog.studyRating,
        drink_rating: finalLog.drinkRating, labels: finalLog.labels
      }).catch(() => {});
    }
    setScreen("ranking");
  };

  const handleRankingDone = (newRanked) => {
    setRankedCafes(newRanked);
    setCurrentLog({});
    setScreen("profile");
    if (userId) {
      try { sb.patch("users", `id=eq.${userId}`, { ranked_cafes: newRanked }).catch(() => {}); } catch(e) {}
    }
  };

  // Save avatar + theme changes to Supabase
  const handleHomemadeDone = (drinkData) => {
    const dateISO = new Date().toISOString().slice(0, 10);
    const log = { cafe: "homemade", date: dateISO, ...drinkData };
    setLogs(prev => [...prev, log]);
    setCurrentLog(log);
    if (userId) {
      sb.post("logs", {
        user_id: userId, username,
        cafe: "homemade", date: dateISO,
        drinks: drinkData.drinks, chugs: 1,
        notes: drinkData.notes, avg_price: null,
        labels: [], study_rating: null,
        drink_rating: drinkData.rating,
        drink_name: drinkData.drinkName,
        ingredient: drinkData.ingredient,
      }).catch(() => {});
    }
    // Always rank new homemade drink against previously ranked homemade drinks
    setScreen("ranking-homemade");
  };

  const handleSetAvatar = (val) => {
    setAvatar(val);
    if (userId) sb.patch("users", `id=eq.${userId}`, { avatar: val }).catch(() => {});
  };

  const handleSetTheme = (val) => {
    setAppTheme(val);
    try { localStorage.setItem("com_theme", val); } catch(e) {}
    if (userId) sb.patch("users", `id=eq.${userId}`, { theme: val }).catch(() => {});
  };

  const currentTheme = THEMES[appTheme] || THEMES.green;
  C = currentTheme; // keep legacy C in sync

  return (
    <ErrorBoundary>
    <ThemeContext.Provider value={currentTheme}>
    <div style={{ ...styles.app, background: currentTheme.bg }}>
      <div style={{ ...styles.phone, background: currentTheme.bg }}>
        {screen === "signin" && <SignInScreen onLogin={handleLogin} />}
        {screen === "cafe-entry" && <CafeEntryScreen onNext={handleCafeEntry} onBack={fromProfile ? () => { setFromProfile(false); setScreen("profile"); } : () => setScreen("signin")} onSkip={() => setScreen("profile")} onHomemade={() => setScreen("homemade")} pastCafes={[...new Set(logs.map(l => l.cafe).filter(c => c !== "homemade"))]} />}
        {screen === "drink" && <DrinkScreen onNext={handleDrink} onBack={() => setScreen("cafe-entry")} />}
        {screen === "homemade" && <HomemadeDrinkScreen onNext={handleHomemadeDone} onBack={() => setScreen("cafe-entry")} />}
        {screen === "vibes" && <CafeVibesScreen isNew={isNewCafe} onNext={handleVibes} onBack={() => setScreen("drink")} />}
        {screen === "labels" && <LabelsScreen onNext={handleLabels} onBack={() => setScreen(isNewCafe ? "vibes" : "drink")} />}
        {screen === "ranking" && (
          <RankingScreen
            newCafe={currentLog.cafe || "unnamed cafe"}
            rankedCafes={rankedCafes}
            onDone={handleRankingDone}
            onBack={() => setScreen("labels")}
          />
        )}
        {screen === "ranking-homemade" && (() => {
          // Build ranked list of homemade drink names only
          const homemadeNames = [...new Set(logs.filter(l => l.isHomemade && l.drinkName).map(l => l.drinkName))];
          const rankedHomemade = rankedCafes.filter(c => homemadeNames.includes(c) && c !== (currentLog.drinkName || "homemade"));
          return (
            <RankingScreen
              newCafe={currentLog.drinkName || "homemade"}
              rankedCafes={rankedHomemade}
              onDone={(newRanked) => {
                // Merge: keep cafe rankings, replace homemade rankings
                const cafeRanks = rankedCafes.filter(c => !homemadeNames.includes(c));
                const merged = [...cafeRanks, ...newRanked];
                setRankedCafes(merged);
                setCurrentLog({});
                setScreen("profile");
                if (userId) sb.patch("users", `id=eq.${userId}`, { ranked_cafes: merged }).catch(() => {});
              }}
              onBack={() => setScreen("homemade")}
            />
          );
        })()}
        {screen === "profile" && (
          <>
            <ProfileScreen username={username} logs={logs} setLogs={setLogs} rankedCafes={rankedCafes} setRankedCafes={setRankedCafes} userId={userId} joinedDate={joinedDate} onLogAnother={() => { setFromProfile(true); setScreen("cafe-entry"); }} appTheme={appTheme} setAppTheme={handleSetTheme} avatar={avatar} setAvatar={handleSetAvatar} communityStats={communityStats} />
          </>
        )}
      </div>
    </div>
    </ThemeContext.Provider>
    </ErrorBoundary>
  );
}
