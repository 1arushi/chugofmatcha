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
    text: "#3a2a1a", textMuted: "rgba(58,42,26,0.6)", textDark: "#f2ede4",
    inputBg: "#e4ddd2", border: "rgba(58,42,26,0.18)", pill: "#e4ddd2", pillActive: "#3a2a1a",
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
    <div style={{ padding: "52px 28px 16px" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
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
  const [baristaName, setBaristaName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetFlow, setResetFlow] = useState(null); // null | "email" | "code" | "password"
  const [resetEmail, setResetEmail] = useState("");
  const [resetCodeInput, setResetCodeInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetUserId, setResetUserId] = useState(null);

  const exitReset = () => {
    setResetFlow(null);
    setResetEmail("");
    setResetCodeInput("");
    setNewPassword("");
    setResetUserId(null);
    setError("");
  };

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
          joined_date: joined, avatar: { gender:"female", skin:"#f5c5a3", hair:"#4a2c0a", outfit:"#8b6b4a", apron:"#6b4a2a", pockets:"#4a2c0a" },
          theme: "green", ranked_cafes: [],
          email: email.trim() || null,
          barista_name: baristaName.trim() || username.trim(),
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

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) { setError("enter your email"); return; }
    setLoading(true); setError("");
    try {
      const rows = await sb.get("users", `email=eq.${encodeURIComponent(resetEmail.trim())}&select=id`);
      if (!Array.isArray(rows) || rows.length === 0) {
        setError("no account with that email");
        setLoading(false);
        return;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const patched = await sb.patch("users", `id=eq.${rows[0].id}`, { reset_code: String(code) });
      if (patched && typeof patched === "object" && !Array.isArray(patched) && (patched.code || patched.error)) {
        setError(patched.message || patched.hint || "could not save reset code");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim(), code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "could not send email");
        setLoading(false);
        return;
      }
      setResetFlow("code");
    } catch (e) {
      setError("connection error, try again");
    }
    setLoading(false);
  };

  const handleVerifyResetCode = async () => {
    if (!/^\d{6}$/.test(resetCodeInput.trim())) { setError("enter the 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const rows = await sb.get("users", `email=eq.${encodeURIComponent(resetEmail.trim())}&select=id,reset_code`);
      if (!Array.isArray(rows) || rows.length === 0) {
        setError("session expired — start over");
        setLoading(false);
        return;
      }
      if (String(rows[0].reset_code ?? "") !== resetCodeInput.trim()) {
        setError("code doesn't match");
        setLoading(false);
        return;
      }
      setResetUserId(rows[0].id);
      setResetFlow("password");
    } catch (e) {
      setError("connection error, try again");
    }
    setLoading(false);
  };

  const handleSetNewPassword = async () => {
    if (!newPassword.trim()) { setError("enter a new password"); return; }
    if (!resetUserId) { setError("session expired"); return; }
    setLoading(true); setError("");
    try {
      const hash = hashPassword(newPassword);
      const patched = await sb.patch("users", `id=eq.${resetUserId}`, { password_hash: hash, reset_code: null });
      if (patched && typeof patched === "object" && !Array.isArray(patched) && (patched.code || patched.error)) {
        setError(patched.message || "could not update password");
        setLoading(false);
        return;
      }
      exitReset();
      setMode("signin");
      setPassword("");
      setUsername("");
      setError("password updated — you can sign in");
    } catch (e) {
      setError("connection error, try again");
    }
    setLoading(false);
  };

  if (resetFlow === "email") {
    return (
      <div style={{ ...styles.screen, background: C.bg }}>
        <Logo onBack={exitReset} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: C.text, fontSize: 18, marginBottom: 16, letterSpacing: "0.04em", textAlign: "center" }}>
            reset password
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8, paddingLeft: 24, paddingRight: 24 }}>
            <Input placeholder="email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          </div>
          {error && <div style={{ color: C.text, fontSize: 13, textAlign: "center", marginBottom: 12, opacity: 0.8 }}>{error}</div>}
          <div style={{ marginBottom: 20, marginTop: 16 }}>
            <NextBtn label={loading ? "..." : "send code"} onClick={handleSendResetEmail} />
          </div>
        </div>
      </div>
    );
  }

  if (resetFlow === "code") {
    return (
      <div style={{ ...styles.screen, background: C.bg }}>
        <Logo onBack={() => { setResetFlow("email"); setResetCodeInput(""); setError(""); }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: C.text, fontSize: 18, marginBottom: 16, letterSpacing: "0.04em", textAlign: "center" }}>
            enter code
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8, paddingLeft: 24, paddingRight: 24 }}>
            <Input placeholder="6-digit code" value={resetCodeInput} onChange={(e) => setResetCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </div>
          {error && <div style={{ color: C.text, fontSize: 13, textAlign: "center", marginBottom: 12, opacity: 0.8 }}>{error}</div>}
          <div style={{ marginBottom: 20, marginTop: 16 }}>
            <NextBtn label={loading ? "..." : "continue"} onClick={handleVerifyResetCode} />
          </div>
        </div>
      </div>
    );
  }

  if (resetFlow === "password") {
    return (
      <div style={{ ...styles.screen, background: C.bg }}>
        <Logo onBack={() => { setResetFlow("code"); setNewPassword(""); setError(""); }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: C.text, fontSize: 18, marginBottom: 16, letterSpacing: "0.04em", textAlign: "center" }}>
            new password
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8, paddingLeft: 24, paddingRight: 24 }}>
            <Input placeholder="new password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {error && <div style={{ color: C.text, fontSize: 13, textAlign: "center", marginBottom: 12, opacity: 0.8 }}>{error}</div>}
          <div style={{ marginBottom: 20, marginTop: 16 }}>
            <NextBtn label={loading ? "..." : "save password"} onClick={handleSetNewPassword} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ color: C.text, fontSize: 18, marginBottom: 16, letterSpacing: "0.04em", textAlign: "center" }}>
          {mode === "signin" ? "sign in" : "create account"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8, paddingLeft: 24, paddingRight: 24 }}>
          <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          {mode === "signup" && <Input placeholder="barista name" value={baristaName} onChange={(e) => setBaristaName(e.target.value)} />}
          {mode === "signup" && <Input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          <Input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: C.text, fontSize: 13, textAlign: "center", marginBottom: 12, opacity: 0.8 }}>{error}</div>}
        <div style={{ marginBottom: 20, marginTop: 16 }}>
          <NextBtn label={loading ? "..." : mode === "signin" ? "sign in" : "sign up"} onClick={handleSubmit} />
        </div>
        {mode === "signin" && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => { setError(""); setResetEmail(""); setResetFlow("email"); }}
              style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline", opacity: 0.5 }}
            >
              forgot password?
            </button>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setEmail(""); setBaristaName(""); }}
            style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline" }}>
            {mode === "signin" ? "no account? sign up" : "already have one? sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CafeEntryScreen({ onNext, onBack, onSkip, onHomemade, sharedCafes = [], onAddCafe, defaultLocation = "", onSaveDefaultLocation }) {
  const C = useC();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [dateISO, setDateISO] = useState(todayISO);
  const [location, setLocation] = useState(defaultLocation);
  const [editingLocation, setEditingLocation] = useState(!defaultLocation);
  React.useEffect(() => { setLocation(defaultLocation); setEditingLocation(!defaultLocation); }, [defaultLocation]);

  const suggestions = query.trim().length > 0
    ? sharedCafes.filter(c => {
        const namePart = c.includes(" · ") ? c.split(" · ")[0] : c;
        return namePart.toLowerCase().includes(query.toLowerCase()) || c.toLowerCase().includes(query.toLowerCase());
      })
    : [];

  const noMatch = query.trim().length > 1 && suggestions.length === 0;

  const selectCafe = (entry) => {
    if (entry.includes(" · ")) {
      const [cafeName, loc] = entry.split(" · ");
      setSelected(cafeName.trim());
      setQuery(cafeName.trim());
      setLocation(loc.trim());
    } else {
      setSelected(entry.toLowerCase());
      setQuery(entry.toLowerCase());
    }
    setShowSuggestions(false);
    setAddingNew(false);
  };

  const handleAddNew = () => {
    const name = query.trim().toLowerCase();
    if (!name) return;
    selectCafe(name);
  };

  return (
    <div style={{ ...styles.screen, background: C.bg }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Heading>what cafe did you visit?</Heading>
        <div style={{ paddingLeft: 24, paddingRight: 24, width: "100%", position: "relative" }}>
          <input
            placeholder=""
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(""); setShowSuggestions(true); setAddingNew(false); }}
            onFocus={() => setShowSuggestions(true)}
            style={{ background: C.card, border: selected ? `2px solid ${C.text}` : "none", borderRadius: 50, padding: "14px 22px", color: C.text, fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box", letterSpacing: "0.04em", textAlign: "center" }}
          />
          {showSuggestions && (suggestions.length > 0 || noMatch) && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 24, right: 24, background: C.cardLight, borderRadius: 16, overflow: "hidden", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              {suggestions.map((s) => {
                const hasloc = s.includes(" · ");
                const cafePart = hasloc ? s.split(" · ")[0] : s;
                const locPart = hasloc ? s.split(" · ")[1] : null;
                return (
                  <div key={s} onClick={() => selectCafe(s)} style={{ padding: "12px 18px", color: C.text, fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${C.border}`, textAlign: "center", letterSpacing: "0.03em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.text}15`}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span>{cafePart}</span>
                    {locPart && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: C.textMuted, fontSize: 11 }}>
                        <svg width="8" height="10" viewBox="0 0 13 16" fill="none"><path d="M6.5 0C4.01 0 2 2.01 2 4.5c0 3.375 4.5 9 4.5 9s4.5-5.625 4.5-9C11 2.01 8.99 0 6.5 0zm0 6.125A1.625 1.625 0 1 1 6.5 2.875a1.625 1.625 0 0 1 0 3.25z" fill="currentColor"/></svg>
                        {locPart}
                      </span>
                    )}
                  </div>
                );
              })}
              {noMatch && (
                <div onClick={handleAddNew} style={{ padding: "12px 18px", color: C.textMuted, fontSize: 14, cursor: "pointer", textAlign: "center", letterSpacing: "0.03em" }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.text}15`}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  + add "{query.trim()}" to com
                </div>
              )}
            </div>
          )}
        </div>

        {/* Location row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
          <button onClick={() => setEditingLocation(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: C.textMuted, opacity: 0.7 }}>
            <svg width="11" height="14" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 0C4.01 0 2 2.01 2 4.5c0 3.375 4.5 9 4.5 9s4.5-5.625 4.5-9C11 2.01 8.99 0 6.5 0zm0 6.125A1.625 1.625 0 1 1 6.5 2.875a1.625 1.625 0 0 1 0 3.25z" fill="currentColor"/>
            </svg>
            {!editingLocation && <span style={{ fontSize: 13, letterSpacing: "0.04em" }}>{location || "set location"}</span>}
          </button>
          {editingLocation && (
            <input
              autoFocus
              value={location}
              onChange={e => setLocation(e.target.value.toLowerCase())}
              onBlur={() => { setEditingLocation(false); if (location && onSaveDefaultLocation) onSaveDefaultLocation(location); }}
              onKeyDown={e => { if (e.key === "Enter") { setEditingLocation(false); if (location && onSaveDefaultLocation) onSaveDefaultLocation(location); } }}
              placeholder="your city"
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, letterSpacing: "0.04em", textAlign: "center", outline: "none", padding: "2px 4px", width: "120px" }}
            />
          )}
        </div>

        {/* Date row */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            style={{ background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, letterSpacing: "0.06em", textAlign: "center", outline: "none", cursor: "pointer", padding: "2px 4px", colorScheme: C.bg === "#f5f0e8" ? "light" : "dark" }}
          />
        </div>

        {/* Homemade link under date */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={onHomemade} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline", fontFamily: "Inter, sans-serif" }}>homemade →</button>
        </div>
      </div>
      <div style={{ paddingBottom: 40 }}>
        <NextBtn onClick={async () => {
          setShowSuggestions(false);
          const cafeName = (selected || query || "unnamed cafe").toLowerCase();
          const entry = location ? `${cafeName} · ${location.trim().toLowerCase()}` : cafeName;
          if (!sharedCafes.includes(entry) && onAddCafe) await onAddCafe(entry);
          onNext(cafeName, dateISO, location);
        }} />
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 28px" }}>
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
                padding: "12px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.03em",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
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
  const { gender, skin, hair, outfit, apron, pockets } = avatar;
  const canvasRef = React.useRef(null);

  const suffix = gender === 'male' ? '-male' : gender === 'neutral' ? '-neutral' : '-female';
  const LAYERS = {
    apron:   `/avatar/apron${suffix}.png`,
    hair:    `/avatar/hair${suffix}.png`,
    outline: `/avatar/outline${suffix}.png`,
    details: `/avatar/pockets${suffix}.png`,
    shirt:   `/avatar/shirt${suffix}.png`,
    skin:    `/avatar/skin${suffix}.png`,
  };

  // Base color in each layer to replace
  const BASE = {
    outline: [245, 190, 144], // #F5BE90 -> user skin
    hair:    [107, 74, 50],   // #6B4A32 -> user hair
    details: [84, 53, 33],   // dark brown -> darker outfit tint
    apron:   [111, 70, 42],  // brown -> user outfit
    shirt:   [145, 109, 84], // #916D54 -> lighter outfit tint
    skin:    [245, 190, 144], // #F5BE90 -> user skin
  };

  const hexToRgb = (hex) => [
    parseInt(hex.slice(1,3),16),
    parseInt(hex.slice(3,5),16),
    parseInt(hex.slice(5,7),16),
  ];

  const lighten = ([r,g,b], f) => [
    Math.min(255, Math.round(r + (255-r)*f)),
    Math.min(255, Math.round(g + (255-g)*f)),
    Math.min(255, Math.round(b + (255-b)*f)),
  ];

  const darken = ([r,g,b], f) => [
    Math.max(0, Math.round(r * (1-f))),
    Math.max(0, Math.round(g * (1-f))),
    Math.max(0, Math.round(b * (1-f))),
  ];

  const recolor = (data, baseRgb, targetRgb, threshold=60) => {
    const [br,bg,bb] = baseRgb;
    const [tr,tg,tb] = targetRgb;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] < 10) continue;
      // Skip dark pixels (outlines) - don't recolor anything too dark
      if (data[i] + data[i+1] + data[i+2] < 80) continue;
      const dr = Math.abs(data[i]-br);
      const dg = Math.abs(data[i+1]-bg);
      const db = Math.abs(data[i+2]-bb);
      if (dr+dg+db < threshold) {
        data[i] = tr; data[i+1] = tg; data[i+2] = tb;
      }
    }
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const skinRgb    = hexToRgb(skin);
    const hairRgb    = hexToRgb(hair);
    const shirtRgb   = hexToRgb(outfit);
    const apronRgb   = hexToRgb(apron || outfit);
    const detailsRgb = hexToRgb(pockets || outfit);

    const layerOrder = ["apron", "shirt", "details", "skin", "hair", "outline"];
    const colorMap = {
      outline: skinRgb,
      hair:    hairRgb,
      details: detailsRgb,
      apron:   apronRgb,
      shirt:   shirtRgb,
      skin:    skinRgb,
    };

    const images = {};
    let layersLoaded = 0;

    const composite = () => {
      if (layersLoaded !== layerOrder.length) return;
      const ref = images["outline"];
      const cw = ref.naturalWidth;
      const ch = ref.naturalHeight;
      canvas.width = cw;
      canvas.height = ch;
      ctx.clearRect(0, 0, cw, ch);

      layerOrder.forEach(name => {
        const img = images[name];
        const offscreen = document.createElement("canvas");
        offscreen.width = cw;
        offscreen.height = ch;
        const octx = offscreen.getContext("2d");
        octx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, cw, ch);
        const sample = octx.getImageData(cw / 6, ch / 2, 1, 1).data;
        console.log(name, sample[0], sample[1], sample[2]);

        const target = colorMap[name];
        if (target && BASE[name]) {
          const imageData = octx.getImageData(0, 0, cw, ch);
          recolor(imageData.data, BASE[name], target);
          octx.putImageData(imageData, 0, 0);
        }
        ctx.drawImage(offscreen, 0, 0);
      });
    };

    layerOrder.forEach(name => {
      const img = new window.Image();
      img.onload = () => {
        images[name] = img;
        layersLoaded++;
        composite();
      };
      img.src = LAYERS[name];
    });
  }, [skin, hair, outfit, apron, pockets, gender]);

  return (
    <div style={{ width: size, height: size * 2.2, overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ height: "100%", width: "auto", display: "block", imageRendering: "auto" }} />
    </div>
  );
}

const DEFAULT_AVATAR = { gender: "female", skin: "#f5c5a3", hair: "#4a2c0a", outfit: "#8b6b4a", apron: "#6b4a2a", pockets: "#4a2c0a" };

function mergeUserAvatar(row) {
  if (!row?.avatar || typeof row.avatar !== "object") return { ...DEFAULT_AVATAR };
  return { ...DEFAULT_AVATAR, ...row.avatar };
}

function FriendsScreen({ userId, friends, onClose, onViewFriend, onFriendsChanged }) {
  const C = useC();
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  const loadPending = React.useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await sb.get("friends", `receiver_id=eq.${userId}&status=eq.pending&select=id,requester_id`);
      if (!rows || rows.error || !Array.isArray(rows) || rows.length === 0) {
        setPending([]);
        return;
      }
      const ids = [...new Set(rows.map(r => r.requester_id).filter(Boolean))];
      const users = await sb.get("users", `id=in.(${ids.join(",")})&select=id,username,barista_name`);
      const umap = {};
      if (Array.isArray(users)) users.forEach(u => { umap[u.id] = u; });
      setPending(rows.map(r => ({ ...r, requester: umap[r.requester_id] })));
    } catch (e) {
      setPending([]);
    }
  }, [userId]);

  React.useEffect(() => { loadPending(); }, [loadPending]);

  const runSearch = async () => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    setSearching(true);
    try {
      const pattern = `%${q}%`;
      const rows = await sb.get("users", `username=ilike.${encodeURIComponent(pattern)}&select=id,username,barista_name&limit=20`);
      const friendIds = new Set((friends || []).map(f => f.id));
      if (!rows || rows.error || !Array.isArray(rows)) {
        setSearchHits([]);
      } else {
        setSearchHits(rows.filter(u => u.id !== userId && !friendIds.has(u.id)));
      }
    } catch (e) {
      setSearchHits([]);
    }
    setSearching(false);
  };

  const sendRequest = async (receiverId) => {
    if (!userId || receiverId === userId) return;
    setBusy(true);
    try {
      await sb.post("friends", { requester_id: userId, receiver_id: receiverId, status: "pending" });
      setSearchHits(h => h.filter(u => u.id !== receiverId));
    } catch (e) {}
    setBusy(false);
  };

  const acceptRequest = async (row) => {
    setBusy(true);
    try {
      const out = await sb.patch("friends", `id=eq.${row.id}`, { status: "accepted" });
      if (out && typeof out === "object" && !Array.isArray(out) && (out.code || out.error)) {
        return;
      }
      await loadPending();
      onFriendsChanged?.();
    } catch (e) {}
    setBusy(false);
  };

  const declineRequest = async (row) => {
    setBusy(true);
    try {
      await sb.delete("friends", `id=eq.${row.id}`);
      await loadPending();
    } catch (e) {}
    setBusy(false);
  };

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 20 }}>
        <Logo onBack={onClose} />
        <div style={{ padding: "0 28px 50px" }}>
          <div style={{ color: C.text, fontSize: 18, marginBottom: 16, letterSpacing: "0.04em", textAlign: "center" }}>
            friends
          </div>
          <div style={{ maxWidth: 300, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 44px", gap: 10, alignItems: "center" }}>
              <input
                placeholder="search by username"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                style={{
                  width: "100%",
                  minWidth: 0,
                  background: C.card,
                  borderRadius: 50,
                  padding: "14px 22px",
                  color: C.text,
                  fontSize: 15,
                  border: "none",
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: "0.04em",
                  textAlign: "center",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={searching}
                aria-label="Search"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: C.text,
                  border: "none",
                  cursor: searching ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  opacity: searching ? 0.6 : 1,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.textDark }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          {searchHits.length > 0 && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12, textAlign: "center" }}>results</div>
              {searchHits.map(u => (
                <div key={u.id} style={{ background: C.card, borderRadius: 18, padding: "14px 18px", marginBottom: 8, textAlign: "center" }}>
                  <div style={{ color: C.text, fontSize: 14, marginBottom: 10 }}>{u.barista_name || u.username}</div>
                  <button type="button" onClick={() => sendRequest(u.id)} disabled={busy} style={{ background: C.text, color: C.textDark, border: "none", borderRadius: 50, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "8px 20px", cursor: "pointer" }}>add</button>
                </div>
              ))}
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12, textAlign: "center" }}>requests</div>
              {pending.map(row => (
                <div key={row.id} style={{ background: C.card, borderRadius: 18, padding: "14px 18px", marginBottom: 8, textAlign: "center" }}>
                  <div style={{ color: C.text, fontSize: 14, marginBottom: 10 }}>{row.requester?.barista_name || row.requester?.username || "someone"}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => acceptRequest(row)} disabled={busy} style={{ background: C.text, color: C.textDark, border: "none", borderRadius: 50, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "8px 18px", cursor: "pointer" }}>accept</button>
                    <button type="button" onClick={() => declineRequest(row)} disabled={busy} style={{ background: "transparent", color: C.textMuted, border: `2px solid ${C.border}`, borderRadius: 50, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "8px 18px", cursor: "pointer" }}>decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12, textAlign: "left" }}>your friends</div>
            {(friends || []).length === 0 ? (
              <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>no friends yet</div>
            ) : (
              (friends || []).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onViewFriend(f.id)}
                  style={{ display: "block", width: "100%", textAlign: "center", background: C.card, border: "none", borderRadius: 18, padding: "14px 18px", marginBottom: 8, color: C.text, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                >
                  {f.barista_name || f.username}
                </button>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function FriendCafeScreen({ friendId, onBack, myAvatar, myBaristaName }) {
  const [friendUser, setFriendUser] = useState(null);
  const [friendLogs, setFriendLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const parentC = useC();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const urows = await sb.get("users", `id=eq.${friendId}&select=id,username,barista_name,avatar,theme,ranked_cafes,joined_date`);
        const lrows = await sb.get("logs", `user_id=eq.${friendId}&select=*&order=created_at.asc`);
        if (cancelled) return;
        const u = Array.isArray(urows) && urows[0] ? urows[0] : null;
        setFriendUser(u);
        if (lrows && Array.isArray(lrows) && !lrows.error) {
          setFriendLogs(lrows.map(l => ({
            cafe: l.cafe, date: l.date, drinks: l.drinks || [],
            chugs: l.chugs, notes: l.notes, amenities: l.amenities || [],
            studyRating: l.study_rating, drinkRating: l.drink_rating,
            avgPrice: l.avg_price, labels: l.labels || [],
            ingredient: l.ingredient || null,
            isHomemade: l.is_homemade || !!l.ingredient || false,
            location: l.location || "",
          })));
        } else setFriendLogs([]);
      } catch (e) {
        setFriendUser(null);
        setFriendLogs([]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [friendId]);

  if (loading) {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: parentC.bg, zIndex: 101, display: "flex", flexDirection: "column" }}>
        <Logo onBack={onBack} />
        <div style={{ color: parentC.textMuted, textAlign: "center", marginTop: 40, fontSize: 14 }}>loading…</div>
      </div>
    );
  }

  if (!friendUser) {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: parentC.bg, zIndex: 101, display: "flex", flexDirection: "column" }}>
        <Logo onBack={onBack} />
        <div style={{ color: parentC.textMuted, textAlign: "center", marginTop: 40, fontSize: 14 }}>user not found</div>
      </div>
    );
  }

  const th = THEMES[friendUser.theme] || THEMES.green;
  const displayName = friendUser.barista_name || friendUser.username;
  const joinedLabel = friendUser.joined_date
    ? (typeof friendUser.joined_date === "string" ? friendUser.joined_date : new Date(friendUser.joined_date).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase())
    : "";
  const totalChugs = friendLogs.reduce((s, l) => s + (l.chugs || 0), 0);
  const friendAvatar = mergeUserAvatar(friendUser);

  return (
    <ThemeContext.Provider value={th}>
      <FriendCafeInner
        displayName={displayName}
        joinedLabel={joinedLabel}
        totalChugs={totalChugs}
        friendAvatar={friendAvatar}
        myAvatar={myAvatar}
        myBaristaName={myBaristaName}
        onBack={onBack}
      />
    </ThemeContext.Provider>
  );
}

function FriendCafeInner({ displayName, joinedLabel, totalChugs, friendAvatar, myAvatar, myBaristaName, onBack }) {
  const C = useC();
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 101, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Logo onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 24px" }}>
        <div style={{ marginBottom: 16, marginTop: 8, textAlign: "center" }}>
          <div className="tight-stack" style={{ color: C.text, fontSize: 32, fontWeight: "bold", letterSpacing: "0.02em" }}>{displayName}&apos;s cafe</div>
          {joinedLabel ? <div className="tight-stack" style={{ color: C.textMuted, fontSize: 11, marginTop: 6, letterSpacing: "0.06em" }}>joined {joinedLabel}</div> : null}
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>{totalChugs} chugs logged</div>
        </div>
      </div>
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "12px 24px 28px", display: "flex", justifyContent: "space-around", alignItems: "flex-end", gap: 12, background: C.bg }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.06em" }}>you</span>
          <BaristaAvatar avatar={myAvatar} size={56} />
          <span style={{ color: C.text, fontSize: 11, maxWidth: 100, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>{myBaristaName}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.06em" }}>friend</span>
          <BaristaAvatar avatar={friendAvatar} size={56} />
          <span style={{ color: C.text, fontSize: 11, maxWidth: 100, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
        </div>
      </div>
    </div>
  );
}

function AvatarEditor({ avatar, setAvatar, theme, setTheme, baristaName, onClose }) {
  const C = useC();
  const skinTones = ["#fde8d0", "#f5c5a3", "#e8a882", "#d4956a", "#c68642", "#8d5524", "#4a2c0a"];
  const hairColors = ["#f5e6c8", "#c8a96e", "#8B5E3C", "#4a2c0a", "#1a1a1a", "#8b0000", "#6b3a8c"];
  const apronColors = ["#513826", "#153421", "#153352", "#994029", "#321552", "#9b3c7d", "#000000"];
  const pocketColors = ["#6b4a32", "#3d6b4f", "#325170", "#b4614b", "#5f3c86", "#c671ae", "#646464"];
  const shirtColors = ["#916d54", "#6fa885", "#5a7fa5", "#cb816e", "#9e7cc4", "#dd9aca", "#a4a4a4"];

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
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: C.bg, zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 20 }}>
        {/* Header */}
        <div style={{ padding: "52px 28px 0", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span className="logo-text" style={{ color: C.textMuted, fontSize: 16, letterSpacing: "0.08em" }}>chugofmatcha</span>
        </div>

        {/* Name + avatar + gender */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 28px 0" }}>
          <div style={{ color: C.textMuted, fontSize: 13, letterSpacing: "0.08em", marginBottom: 8 }}>barista: <span style={{ color: C.text, fontWeight: 600 }}>{baristaName}</span></div>
          <BaristaAvatar avatar={avatar} size={80} />
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
            {["female", "neutral", "male"].map(g => (
              <button key={g} onClick={() => setAvatar(a => ({...a, gender: g}))} style={{ background: avatar.gender === g ? C.text : "transparent", border: `2px solid ${avatar.gender === g ? C.text : C.border}`, borderRadius: 50, color: avatar.gender === g ? C.textDark : C.text, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "8px 18px", cursor: "pointer", transition: "all 0.15s" }}>{g}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "30px 28px 50px", display: "flex", flexDirection: "column", gap: 12 }}>
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

        {/* Shirt / pants color */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>shirt & pants</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {shirtColors.map(c => <Swatch key={c} color={c} selected={avatar.outfit === c} onSelect={() => setAvatar(a => ({...a, outfit: c}))} />)}
          </div>
        </div>

        {/* Apron color */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>apron</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {apronColors.map(c => <Swatch key={c} color={c} selected={(avatar.apron || avatar.outfit) === c} onSelect={() => setAvatar(a => ({...a, apron: c}))} />)}
          </div>
        </div>

        {/* Pockets / details color */}
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 18px" }}>
          <div style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.06em", marginBottom: 12 }}>pockets & details</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {pocketColors.map(c => <Swatch key={c} color={c} selected={(avatar.pockets || avatar.outfit) === c} onSelect={() => setAvatar(a => ({...a, pockets: c}))} />)}
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
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink: 0, background: C.bg, borderTop: `1px solid ${C.border}`, padding: "12px 32px 28px", display: "flex", justifyContent: "center" }}>
        <button onClick={onClose} style={{ background: C.card, border: "none", borderRadius: 50, color: C.text, fontSize: 13, fontFamily: "'Inter', sans-serif", padding: "10px 32px", cursor: "pointer", letterSpacing: "0.04em" }}>← back to home</button>
      </div>
    </div>
  );
}

function ProfileScreen({ username, baristaName, logs, setLogs, rankedCafes = [], setRankedCafes, userId, joinedDate, onLogAnother, onOpenFriends = () => {}, appTheme, setAppTheme, avatar, setAvatar, communityStats }) {
  const C = useC();
  const [tab, setTab] = useState("cafe");
  const [listTab, setListTab] = useState("fave cafes");
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [selectedHomemade, setSelectedHomemade] = useState(null);
  const [editingCafe, setEditingCafe] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [showAvatar, setShowAvatar] = useState(false);
  const [cafeSearch, setCafeSearch] = useState("");
  const [cafeSearchResult, setCafeSearchResult] = useState(null);
  const [cafeSearchOpen, setCafeSearchOpen] = useState(false);
  const [spendingGoal, setSpendingGoal] = useState(() => { try { return parseFloat(localStorage.getItem("com_spending_goal")) || 0; } catch(e) { return 0; } });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
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
      {showAvatar && <AvatarEditor avatar={avatar} setAvatar={setAvatar} theme={theme} setTheme={setTheme} baristaName={baristaName} onClose={() => setShowAvatar(false)} />}
      <div style={{ padding: "0 28px 0", display: tab === "cafe" ? "block" : "none" }}>
        <Logo />
        <div style={{ marginBottom: 20, position: "relative", lineHeight: 1.2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div className="tight-stack" style={{ color: C.text, fontSize: 36, fontWeight: "bold", textAlign: "center" }}>
              {baristaName}'s cafe
            </div>
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}>
              <button
                type="button"
                onClick={onOpenFriends}
                aria-label="friends"
                style={{
                  background: C.card,
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: C.text,
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
            </div>
            <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>
              <button
                type="button"
                onClick={onLogAnother}
                style={{
                  background: C.card,
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: C.text,
                  fontSize: 22,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                +
              </button>
            </div>
          </div>
          <div className="tight-stack" style={{ color: C.textMuted, fontSize: 11, textAlign: "center", letterSpacing: "0.06em", marginTop: 3 }}>joined {joinedLabel}</div>
        </div>

        {/* Cafe search */}
        <div style={{ marginBottom: 16, position: "relative" }}>
          <input
            placeholder="search any cafe..."
            value={cafeSearch}
            onChange={e => { setCafeSearch(e.target.value); setCafeSearchResult(null); setCafeSearchOpen(e.target.value.trim().length > 0); }}
            onFocus={() => cafeSearch.trim().length > 0 && setCafeSearchOpen(true)}
            style={{ background: C.card, border: "none", borderRadius: 50, padding: "12px 20px", color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.04em" }}
          />
          {cafeSearchOpen && (() => {
            const allCafeNames = communityStats ? Object.keys(communityStats.cafeVisits) : [...new Set(logs.map(l => l.cafe))];
            const matches = allCafeNames.filter(c => c.toLowerCase().includes(cafeSearch.toLowerCase())).slice(0, 6);
            if (matches.length === 0) return null;
            return (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.cardLight, borderRadius: 16, overflow: "hidden", zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                {matches.map(cafeName => (
                  <div key={cafeName} onClick={async () => {
                    setCafeSearchOpen(false);
                    setCafeSearch(cafeName);
                    try {
                      const cafeLogs = await sb.get("logs", `cafe=eq.${encodeURIComponent(cafeName)}&select=amenities,study_rating,drink_rating,avg_price,drinks,username`);
                      if (!cafeLogs || cafeLogs.error) return;
                      const hasOutlets = cafeLogs.some(l => (l.amenities||[]).includes("outlets"));
                      const hasWifi = cafeLogs.some(l => (l.amenities||[]).includes("wifi"));
                      const hasBathroom = cafeLogs.some(l => (l.amenities||[]).includes("bathroom"));
                      const studyRatings = cafeLogs.map(l => l.study_rating).filter(Boolean);
                      const drinkRatings = cafeLogs.map(l => l.drink_rating).filter(Boolean);
                      const prices = cafeLogs.map(l => l.avg_price).filter(Boolean);
                      const avgStudy = studyRatings.length > 0 ? studyRatings.reduce((a,b)=>a+b,0)/studyRatings.length : null;
                      const avgDrink = drinkRatings.length > 0 ? drinkRatings.reduce((a,b)=>a+b,0)/drinkRatings.length : null;
                      const avgPrice = prices.length > 0 ? prices.reduce((a,b)=>a+b,0)/prices.length : null;
                      const visitors = [...new Set(cafeLogs.map(l => l.username).filter(Boolean))].length;
                      setCafeSearchResult({ name: cafeName, hasOutlets, hasWifi, hasBathroom, avgStudy, avgDrink, avgPrice, visitors, totalLogs: cafeLogs.length });
                    } catch(e) {}
                  }} style={{ padding: "12px 18px", color: C.text, fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${C.border}`, textAlign: "center", letterSpacing: "0.03em" }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.text}15`}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {cafeName}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {cafeSearchResult && (
          <div style={{ background: C.card, borderRadius: 20, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{cafeSearchResult.name}</div>
              <button onClick={() => { setCafeSearchResult(null); setCafeSearch(""); }} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {[["outlets", cafeSearchResult.hasOutlets], ["wifi", cafeSearchResult.hasWifi], ["bathroom", cafeSearchResult.hasBathroom]].map(([label, has]) => (
                <span key={label} style={{ background: has ? `${C.text}20` : "transparent", border: `2px solid ${has ? C.text : C.border}`, borderRadius: 50, padding: "5px 14px", color: has ? C.text : C.textMuted, fontSize: 12, letterSpacing: "0.03em" }}>
                  {has ? "✓" : "✗"} {label}
                </span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div style={{ background: C.cardLight, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ color: C.text, fontSize: 18, fontWeight: "700" }}>{cafeSearchResult.avgDrink ? cafeSearchResult.avgDrink.toFixed(1) + "★" : "—"}</div>
                <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.04em", marginTop: 3 }}>drink</div>
              </div>
              <div style={{ background: C.cardLight, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ color: C.text, fontSize: 18, fontWeight: "700" }}>{cafeSearchResult.avgStudy ? cafeSearchResult.avgStudy.toFixed(1) + "★" : "—"}</div>
                <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.04em", marginTop: 3 }}>study</div>
              </div>
              <div style={{ background: C.cardLight, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ color: C.text, fontSize: 18, fontWeight: "700" }}>{cafeSearchResult.avgPrice ? "$" + cafeSearchResult.avgPrice.toFixed(2) : "—"}</div>
                <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.04em", marginTop: 3 }}>avg price</div>
              </div>
            </div>
            <div style={{ color: C.textMuted, fontSize: 11, textAlign: "center", letterSpacing: "0.04em" }}>
              {cafeSearchResult.visitors} {cafeSearchResult.visitors === 1 ? "visitor" : "visitors"} · {cafeSearchResult.totalLogs} {cafeSearchResult.totalLogs === 1 ? "log" : "logs"} on com
            </div>
          </div>
        )}

        {/* Top stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <StatCard label="drinks chugged" value={totalChugs} large />
          <StatCard label="cafes" value={uniqueCafes.length} large />
        </div>

        {/* Money tracker */}
        <div style={{ background: C.card, borderRadius: 20, padding: "14px 16px", marginBottom: 12 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 12 }}>
            <span style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em" }}>money spent this month</span>
            <button onClick={() => { setEditingGoal(true); setGoalInput(spendingGoal > 0 ? String(spendingGoal) : ""); }} style={{ position: "absolute", right: 0, background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", padding: 0 }}>✎</button>
          </div>

          {editingGoal ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", padding: "4px 0" }}>
              <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.04em" }}>monthly goal ($)</div>
              <input
                autoFocus
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { const g = parseFloat(goalInput) || 0; setSpendingGoal(g); try { localStorage.setItem("com_spending_goal", g); } catch(e2) {} setEditingGoal(false); } }}
                style={{ background: C.cardLight, border: "none", borderRadius: 50, padding: "8px 14px", color: C.text, fontSize: 14, textAlign: "center", outline: "none", width: "140px", boxSizing: "border-box" }}
              />
              <button onClick={() => { const g = parseFloat(goalInput) || 0; setSpendingGoal(g); try { localStorage.setItem("com_spending_goal", g); } catch(e2) {} setEditingGoal(false); }} style={{ background: C.text, border: "none", borderRadius: 50, padding: "7px 20px", color: C.textDark, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>set goal</button>
            </div>
          ) : (() => {
            const spent = spentThisMonth;
            const goal = spendingGoal;
            const pct = goal > 0 ? Math.min(spent / goal, 1) : 0;
            const over = goal > 0 && spent > goal;
            const r = 30; const circ = 2 * Math.PI * r;
            const dash = pct * circ;
            const color = over ? "#e07070" : C.text;
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                {/* Donut */}
                <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }}>
                  <svg width="84" height="84" viewBox="0 0 84 84">
                    <circle cx="42" cy="42" r={r} fill="none" stroke={`${C.text}15`} strokeWidth="9" />
                    <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="9"
                      strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                      transform="rotate(-90 42 42)" style={{ transition: "stroke-dasharray 0.5s" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ color: over ? "#e07070" : C.text, fontSize: 10, fontWeight: "700", textAlign: "center", lineHeight: 1.3 }}>
                      {goal > 0 ? `${Math.round(pct * 100)}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* Right side values */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                  <div style={{ color: over ? "#e07070" : C.text, fontSize: 26, fontWeight: "700", lineHeight: 1 }}>${spent.toFixed(2)}</div>
                  {goal > 0 && <div style={{ color: C.textMuted, fontSize: 13, fontWeight: 700 }}>/ ${goal.toFixed(0)} goal</div>}
                  {goal > 0 && <div style={{ color: over ? "#e07070" : C.textMuted, fontSize: 11, letterSpacing: "0.03em" }}>{over ? `$${(spent-goal).toFixed(2)} over` : `$${(goal-spent).toFixed(2)} left`}</div>}
                  {goal === 0 && <div onClick={() => { setEditingGoal(true); setGoalInput(""); }} style={{ color: C.textMuted, fontSize: 11, cursor: "pointer", textDecoration: "underline", letterSpacing: "0.04em" }}>set a goal</div>}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Best chugs */}
        <CafeListBox
          title="best chug"
          preview={rankedCafes.slice(0, 1)}
          fullList={rankedCafes}
          renderRow={(cafe) => <span style={{ flex: 1 }}>{cafe}</span>}
          empty="no ranked cafes yet"
          footer={(() => { if (!communityStats || !communityStats.drinkTotals) return ""; const dt = communityStats.drinkTotals; const totalAll = Object.values(dt).reduce((a, b) => a + b, 0); const myAll = logs.reduce((s, l) => { const ch = l.chugs || 1; return s + (l.drinks || []).reduce((t, d) => t + (Object.prototype.hasOwnProperty.call(dt, d) ? ch : 0), 0); }, 0); if (!myAll || !totalAll) return ""; const pct = Math.round((myAll / totalAll) * 100); return `you are ${pct}% of all drinks chugged on com 🍵`; })()}
          onNavigate={() => { setTab("your lists"); setListTab("fave cafes"); }}
        />

        {/* Avatar centered at bottom */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 12 }}>
          <div onClick={() => setShowAvatar(true)} style={{ cursor: "pointer", marginBottom: -8 }}>
            <BaristaAvatar avatar={avatar} size={70} />
          </div>
          <div style={{ width: 70, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.15)", filter: "blur(4px)", marginTop: -10 }} />
        </div>
      </div>

      {/* Your Lists Tab */}
      {tab === "your lists" && (() => {
        // Separate homemade from cafe logs
        const homemadeLogs = logs.filter(l => l.isHomemade);
        const homemadeNames = [...new Set(homemadeLogs.map(l => l.cafe).filter(Boolean))];
        const rankedHomemade = rankedCafes.filter(c => homemadeNames.includes(c));
        const unrankedHomemade = homemadeNames.filter(c => !rankedCafes.includes(c));
        const sortedHomemade = [...rankedHomemade, ...unrankedHomemade];

        const cafeLogs2 = logs.filter(l => !l.isHomemade && l.cafe !== "homemade");
        const uniqueCafesOnly = [...new Set(cafeLogs2.map(l => l.cafe))];
        const cafeCountOnly = (name) => cafeLogs2.filter(l => l.cafe === name).length;
        const sortedCafesOnly = [...uniqueCafesOnly].sort((a, b) => cafeCountOnly(b) - cafeCountOnly(a));

        const listDefs = {
          "fave cafes": (() => { const ranked = rankedCafes.filter(c => uniqueCafesOnly.includes(c)); const unranked = uniqueCafesOnly.filter(c => !rankedCafes.includes(c)); return [...ranked, ...unranked]; })(),
          "most visited": sortedCafesOnly,
          "best study": (() => {
            const cafeStudy = {};
            cafeLogs2.forEach(l => { if (l.studyRating > 0 && (!cafeStudy[l.cafe] || l.studyRating > cafeStudy[l.cafe])) cafeStudy[l.cafe] = l.studyRating; });
            return Object.keys(cafeStudy).sort((a, b) => {
              if (cafeStudy[b] !== cafeStudy[a]) return cafeStudy[b] - cafeStudy[a];
              const ri = rankedCafes.indexOf(a), rj = rankedCafes.indexOf(b);
              if (ri === -1 && rj === -1) return 0;
              if (ri === -1) return 1; if (rj === -1) return -1;
              return ri - rj;
            });
          })(),
          "homemade": sortedHomemade,
        };
        const listTabs = ["fave cafes", "most visited", "homemade"];
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
          const locations = [...new Set(cafeLogs.map(l => l.location).filter(Boolean))];
          return { visits, bestStudy, bestDrink, avgP, totalSpentCafe, hasOutlets, hasWifi, hasBathroom, allLabels, allNotes, locations };
        };

        if (selectedHomemade) {
          const dLogs = logs.filter(l => l.isHomemade && l.cafe === selectedHomemade);
          const latest = dLogs.sort((a,b) => new Date(b.date) - new Date(a.date))[0] || {};
          const bestRating = Math.max(...dLogs.map(l => l.drinkRating || l.rating || 0), 0);
          const allNotes = [...new Set(dLogs.map(l => l.notes).filter(Boolean))];
          const drinkType = latest.drinks?.[0] || "";
          const ingredient = latest.ingredient || "";
          const ingredientLabel = drinkType === "matcha" || drinkType === "hojicha" ? "powder used" : drinkType === "tea" ? "tea flavor" : drinkType === "coffee" ? "brand" : "ingredient";
          return (
            <div style={{ ...styles.screen, background: C.bg, padding: "0 28px", overflowY: "auto" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "52px 0 24px" }}>
                <button onClick={() => { setSelectedHomemade(null); setEditingCafe(false); }} style={{ position: "absolute", left: 0, background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", padding: 0, fontFamily: "'Instrument Serif', serif", lineHeight: 1 }}>‹</button>
                <div style={{ color: C.text, fontSize: 22, fontWeight: "bold" }}>{selectedHomemade}</div>
                <button onClick={() => { setEditingCafe(!editingCafe); setEditForm({ ingredient, notes: allNotes.join(", "), rating: bestRating }); }} style={{ position: "absolute", right: 0, background: "none", border: "none", color: editingCafe ? C.text : C.textMuted, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>✎</button>
              </div>

              {editingCafe && (
                <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 14 }}>
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>{ingredientLabel}</div>
                  <input value={editForm.ingredient || ""} onChange={e => setEditForm(f => ({...f, ingredient: e.target.value}))}
                    style={{ background: C.cardLight, border: "none", borderRadius: 50, padding: "10px 16px", color: C.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", marginBottom: 12 }} />
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>notes</div>
                  <input value={editForm.notes || ""} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))}
                    style={{ background: C.cardLight, border: "none", borderRadius: 50, padding: "10px 16px", color: C.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", marginBottom: 12 }} />
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 8, textAlign: "center" }}>rating</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} onClick={() => setEditForm(f => ({...f, rating: s}))} style={{ fontSize: 22, cursor: "pointer", color: s <= (editForm.rating||0) ? C.text : `${C.text}30` }}>★</span>
                    ))}
                  </div>
                  <button onClick={async () => {
                    setLogs(prev => prev.map(l => l.isHomemade && l.cafe === selectedHomemade ? { ...l, ingredient: editForm.ingredient, notes: editForm.notes, drinkRating: editForm.rating } : l));
                    if (userId) await sb.patch("logs", `user_id=eq.${userId}&cafe=eq.${encodeURIComponent(selectedHomemade)}`, { ingredient: editForm.ingredient, notes: editForm.notes, drink_rating: editForm.rating }).catch(() => {});
                    setEditingCafe(false);
                  }} style={{ background: C.text, border: "none", borderRadius: 50, padding: "10px 24px", color: C.textDark, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif", width: "100%" }}>save</button>
                </div>
              )}

              {/* Rating */}
              {bestRating > 0 && (
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  {"★".repeat(bestRating).split("").map((s,i) => (
                    <span key={i} style={{ fontSize: 24, color: C.text }}>{s}</span>
                  ))}
                </div>
              )}

              {/* Drink type pill */}
              {drinkType && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ background: C.card, border: `2px solid ${C.border}`, borderRadius: 50, padding: "6px 18px", color: C.text, fontSize: 12, letterSpacing: "0.03em" }}>{drinkType}</span>
                </div>
              )}

              {/* Ingredient */}
              {ingredient && (
                <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 14 }}>
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>{ingredientLabel}</div>
                  <div style={{ color: C.text, fontSize: 15 }}>{ingredient}</div>
                </div>
              )}

              {/* Notes */}
              {allNotes.length > 0 && (
                <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 14 }}>
                  <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em", marginBottom: 6 }}>notes</div>
                  {allNotes.map((n, i) => (
                    <div key={i} style={{ color: C.text, fontSize: 14, marginBottom: i < allNotes.length - 1 ? 6 : 0 }}>{n}</div>
                  ))}
                </div>
              )}

              {/* Times made */}
              <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 14, textAlign: "center" }}>
                <div style={{ color: C.textMuted, fontSize: 28, fontWeight: "700", lineHeight: 1 }}>{dLogs.length}</div>
                <div style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.04em", marginTop: 4 }}>times made</div>
              </div>
            </div>
          );
        }

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
                {d.locations.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                    <svg width="9" height="11" viewBox="0 0 13 16" fill="none"><path d="M6.5 0C4.01 0 2 2.01 2 4.5c0 3.375 4.5 9 4.5 9s4.5-5.625 4.5-9C11 2.01 8.99 0 6.5 0zm0 6.125A1.625 1.625 0 1 1 6.5 2.875a1.625 1.625 0 0 1 0 3.25z" fill="currentColor"/></svg>
                    <span style={{ color: C.textMuted, fontSize: 12, letterSpacing: "0.04em" }}>{d.locations.join(", ")}</span>
                  </div>
                )}
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
              // Build location options from all logs
              const allLocations = [...new Set(cafeLogs2.filter(l => l.location).map(l => l.location))];
              const filterOptions = [
                { id: "best-study", label: "best study" },
                ...allLocations.map(loc => ({ id: `loc:${loc}`, label: `📍 ${loc}` })),
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
                filteredList.map((cafe, i) => {
                  if (listTab === "homemade") {
                    const drinkLog = homemadeLogs.filter(l => l.cafe === cafe);
                    const bestRating = Math.max(...drinkLog.map(l => l.drinkRating || l.rating || 0), 0);
                    const drinkType = drinkLog[0]?.drinks?.[0] || "";
                    const ingredient = drinkLog[0]?.ingredient || "";
                    return (
                      <div key={cafe + i} onClick={() => setSelectedHomemade(cafe)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, color: C.text, cursor: "pointer" }}>
                        <span style={{ color: C.textMuted, fontSize: 13, marginRight: 12, minWidth: 20 }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 14 }}>
                          {cafe}
                          {ingredient ? <span style={{ color: C.textMuted, fontSize: 11, marginLeft: 6 }}>· {ingredient}</span> : null}
                        </span>
                        {bestRating > 0 && <span style={{ color: C.textMuted, fontSize: 12 }}>{"★".repeat(bestRating)}</span>}
                        <span style={{ color: C.textMuted, fontSize: 16, marginLeft: 8 }}>›</span>
                      </div>
                    );
                  }
                  return (
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
                  );
                })
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
              const myTotalChugs = logs.reduce((s, l) => s + (l.chugs || 1), 0);
              const myCafes = [...new Set(logs.map(l => l.cafe).filter(Boolean))];
              const myVisitCounts = myCafes.map(c => ({ cafe: c, count: logs.filter(l => l.cafe === c && !l.isHomemade).length }));
              const favCafe = myVisitCounts.sort((a, b) => b.count - a.count)[0]?.cafe;
              console.log('favCafe', favCafe, 'myVisitCounts', myVisitCounts);
              const globalCafeRanks = Object.entries(communityStats.cafeVisits).sort((a,b) => b[1]-a[1]);
              console.log('globalCafeRanks', globalCafeRanks.slice(0, 5));
              const favCafeRank = favCafe ? globalCafeRanks.findIndex(([c]) => c === favCafe) + 1 : null;
              return (
                <div style={{ background: C.card, borderRadius: 18, padding: "16px 20px", marginBottom: 12 }}>

                  {favCafe && favCafeRank > 0 && (
                    <div style={{ color: C.text, fontSize: 14, textAlign: "center", marginBottom: 10, lineHeight: 1.4 }}>
                      you're <span style={{ fontWeight: "700" }}>top #{favCafeRank}</span> at <span style={{ fontWeight: "700" }}>{favCafe}</span>
                    </div>
                  )}
                  {myTotalChugs > 0 && (communityStats.userChugTotals || []).length > 0 && (() => {
                    const myTotalChugs = logs.reduce((s, l) => s + (l.chugs || 1), 0);
                    const allUserChugs = communityStats.userChugTotals || [];
                    const below = allUserChugs.filter(n => n < myTotalChugs).length;
                    const topPct = Math.min(100, allUserChugs.length > 1 ? Math.round((1 - below / allUserChugs.length) * 100) : 100);
                    return (
                      <div style={{ color: C.text, fontSize: 14, textAlign: "center", marginBottom: 10, lineHeight: 1.4 }}>
                        {`you are in the top ${topPct}% of com chuggers 🍵`}
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
            <div style={{ width: 36, height: 36, overflow: "hidden", display: "flex", justifyContent: "center" }}>
              <div style={{ marginTop: -4 }}>
                <BaristaAvatar avatar={avatar} size={35} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function HomemadeDrinkScreen({ onNext, onBack, allHomemadeLogs = [] }) {
  const C = useC();
  const [selectedDrinks, setSelectedDrinks] = useState([]);
  const [drinkName, setDrinkName] = useState("");
  const [ingredient, setIngredient] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const drinks = ["matcha", "hojicha", "tea", "coffee"];

  // Build unique past drink names
  const pastNames = [...new Set(allHomemadeLogs.map(l => l.cafe).filter(Boolean))];

  const suggestions = drinkName.trim().length > 0
    ? pastNames.filter(n => n.toLowerCase().includes(drinkName.toLowerCase()))
    : [];

  const autofill = (name) => {
    const match = allHomemadeLogs.find(l => l.cafe === name);
    if (match) {
      setSelectedDrinks(match.drinks || []);
      setIngredient(match.ingredient || "");
      setNotes(match.notes || "");
      setRating(match.drinkRating || 0);
    }
    setDrinkName(name);
    setShowSuggestions(false);
  };

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

        {/* Drink name input with autocomplete */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            placeholder="name your drink"
            value={drinkName}
            onChange={e => { setDrinkName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            style={{ background: C.card, border: "none", borderRadius: 50, padding: "12px 20px", color: C.text, fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: "0.04em" }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.cardLight, borderRadius: 16, overflow: "hidden", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              {suggestions.map(name => (
                <div key={name} onClick={() => autofill(name)} style={{ padding: "12px 18px", color: C.text, fontSize: 14, cursor: "pointer", borderBottom: `1px solid ${C.border}`, textAlign: "center", letterSpacing: "0.03em" }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.text}15`}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

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
        <NextBtn onClick={() => onNext({ drinks: selectedDrinks, drinkName: drinkName || "homemade", ingredient, notes, rating })} />
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
                fontSize: 18,
                fontFamily: "'Inter', sans-serif",
                aspectRatio: "1 / 1",
                width: "100%",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.03em",
                textAlign: "center",
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
  const [avatar, setAvatar] = useState({ gender: "female", skin: "#f5c5a3", hair: "#4a2c0a", outfit: "#8b6b4a", apron: "#6b4a2a", pockets: "#4a2c0a" });
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [baristaName, setBaristaName] = useState("");
  const [logs, setLogs] = useState([]);
  const [currentLog, setCurrentLog] = useState({});
  const [isNewCafe, setIsNewCafe] = useState(false);
  const isNewCafeRef = React.useRef(false);
  const [isHomemade, setIsHomemade] = useState(false);
  const [rankedCafes, setRankedCafes] = useState([]);
  const [defaultLocation, setDefaultLocation] = useState("");
  const [joinedDate, setJoinedDate] = useState(new Date());
  const [fromProfile, setFromProfile] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);
  const [sharedCafes, setSharedCafes] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const [friendViewId, setFriendViewId] = useState(null);

  const loadFriends = async (uid) => {
    if (!uid) return;
    try {
      const rows = await sb.get("friends", `or=(requester_id.eq.${uid},receiver_id.eq.${uid})&status=eq.accepted&select=*`);
      if (!rows || rows.error || !Array.isArray(rows) || rows.length === 0) {
        setFriends([]);
        return;
      }
      const otherIds = [...new Set(rows.map(r => (r.requester_id === uid ? r.receiver_id : r.requester_id)).filter(Boolean))];
      if (otherIds.length === 0) {
        setFriends([]);
        return;
      }
      const users = await sb.get("users", `id=in.(${otherIds.join(",")})&select=id,username,barista_name,avatar,theme,ranked_cafes,joined_date`);
      setFriends(Array.isArray(users) ? users : []);
    } catch (e) {
      setFriends([]);
    }
  };

  const loadSharedCafes = async () => {
    try {
      const rows = await sb.get("cafes", "select=name&order=name.asc");
      if (rows && !rows.error) setSharedCafes(rows.map(r => r.name));
    } catch(e) {}
  };

  // Load community stats for percentile comparisons
  const loadCommunityStats = async () => {
    try {
      const allLogs = await sb.get("logs", "select=drinks,chugs,avg_price,cafe,user_id");
      if (!allLogs || allLogs.error) return;
      const drinkTotals = { matcha: 0, hojicha: 0, tea: 0, coffee: 0 };
      const cafeVisits = {};
      const perUserMatcha = {};
      const perUserChugs = {};
      allLogs.forEach(l => {
        (l.drinks || []).forEach(d => { if (drinkTotals[d] !== undefined) drinkTotals[d] += (l.chugs || 1); });
        if (l.cafe) cafeVisits[l.cafe] = (cafeVisits[l.cafe] || 0) + 1;
        if (l.user_id && (l.drinks||[]).includes("matcha")) {
          perUserMatcha[l.user_id] = (perUserMatcha[l.user_id] || 0) + (l.chugs || 1);
        }
        if (l.user_id) perUserChugs[l.user_id] = (perUserChugs[l.user_id] || 0) + (l.chugs || 1);
      });
      const userMatchaChugs = Object.values(perUserMatcha);
      const userChugTotals = Object.values(perUserChugs);
      console.log('userMatchaChugs', userMatchaChugs);
      console.log('perUserChugs', perUserChugs);
      setCommunityStats({ drinkTotals, cafeVisits, totalLogs: allLogs.length, userMatchaChugs, userChugTotals });
    } catch(e) {}
  };

  const handleLogin = async (userRow) => {
    setUserId(userRow.id);
    setUsername(userRow.username);
    setBaristaName(userRow.barista_name || userRow.username);
    setRankedCafes(userRow.ranked_cafes || []);
    const t = userRow.theme || "green";
    setAppTheme(t);
    try { localStorage.setItem("com_theme", t); } catch(e) {}
    setAvatar({ gender: "female", skin: "#f5c5a3", hair: "#4a2c0a", outfit: "#8b6b4a", apron: "#6b4a2a", pockets: "#4a2c0a", ...userRow.avatar });
    if (userRow.joined_date) setJoinedDate(userRow.joined_date);
    if (userRow.default_location) setDefaultLocation(userRow.default_location);
    // Load user's logs
    try {
      const userLogs = await sb.get("logs", `user_id=eq.${userRow.id}&select=*&order=created_at.asc`);
      if (userLogs && !userLogs.error) {
        setLogs(userLogs.map(l => ({
          cafe: l.cafe, date: l.date, drinks: l.drinks || [],
          chugs: l.chugs, notes: l.notes, amenities: l.amenities || [],
          studyRating: l.study_rating, drinkRating: l.drink_rating,
          avgPrice: l.avg_price, labels: l.labels || [],
          ingredient: l.ingredient || null,
          isHomemade: l.is_homemade || !!l.ingredient || false,
          location: l.location || "",
        })));
      }
    } catch(e) {}
    await loadCommunityStats();
    await loadSharedCafes();
    await loadFriends(userRow.id);
    setScreen("cafe-entry");
  };

  const handleCafeEntry = (cafe, dateISO, location = "") => {
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
    const cafeName = drinkData.drinkName || "homemade";
    const log = { cafe: cafeName, date: dateISO, drinks: drinkData.drinks, chugs: 1,
      notes: drinkData.notes, ingredient: drinkData.ingredient,
      drinkRating: drinkData.rating, isHomemade: true, labels: [], amenities: [] };
    setLogs(prev => [...prev, log]);
    setCurrentLog(log);
    if (userId) {
      sb.post("logs", {
        user_id: userId, username,
        cafe: cafeName, date: dateISO,
        drinks: drinkData.drinks, chugs: 1,
        notes: drinkData.notes, avg_price: null,
        labels: [], study_rating: null,
        drink_rating: drinkData.rating,
        ingredient: drinkData.ingredient,
        is_homemade: true,
      }).catch(() => {});
    }
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
        {screen === "cafe-entry" && <CafeEntryScreen onNext={handleCafeEntry} onBack={fromProfile ? () => { setFromProfile(false); setScreen("profile"); } : () => setScreen("signin")} onSkip={() => setScreen("profile")} onHomemade={() => setScreen("homemade")} sharedCafes={sharedCafes} defaultLocation={defaultLocation} onSaveDefaultLocation={(loc) => { setDefaultLocation(loc); if (userId) sb.patch("users", `id=eq.${userId}`, { default_location: loc }).catch(() => {}); }} onAddCafe={async (name) => { const n = name.toLowerCase(); setSharedCafes(prev => [...new Set([...prev, n])].sort()); try { await sb.post("cafes", { name: n }); } catch(e) {} }} />}
        {screen === "drink" && <DrinkScreen onNext={handleDrink} onBack={() => setScreen("cafe-entry")} />}
        {screen === "homemade" && <HomemadeDrinkScreen onNext={handleHomemadeDone} onBack={() => setScreen("cafe-entry")} allHomemadeLogs={logs.filter(l => l.isHomemade)} />}
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
          const homemadeNames = [...new Set(logs.filter(l => l.isHomemade).map(l => l.cafe))];
          const rankedHomemade = rankedCafes.filter(c => homemadeNames.includes(c) && c !== currentLog.cafe);
          return (
            <RankingScreen
              newCafe={currentLog.cafe || "homemade"}
              rankedCafes={rankedHomemade}
              onDone={(newRanked) => {
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
            <ProfileScreen username={username} baristaName={baristaName} logs={logs} setLogs={setLogs} rankedCafes={rankedCafes} setRankedCafes={setRankedCafes} userId={userId} joinedDate={joinedDate} onLogAnother={() => { setFromProfile(true); setScreen("cafe-entry"); }} onOpenFriends={() => setShowFriends(true)} appTheme={appTheme} setAppTheme={handleSetTheme} avatar={avatar} setAvatar={handleSetAvatar} communityStats={communityStats} />
          </>
        )}
        {showFriends && userId && (
          <FriendsScreen
            userId={userId}
            friends={friends}
            onClose={() => setShowFriends(false)}
            onViewFriend={(id) => { setFriendViewId(id); setShowFriends(false); }}
            onFriendsChanged={() => loadFriends(userId)}
          />
        )}
        {friendViewId && (
          <FriendCafeScreen
            friendId={friendViewId}
            onBack={() => { setFriendViewId(null); setShowFriends(true); }}
            myAvatar={avatar}
            myBaristaName={baristaName}
          />
        )}
      </div>
    </div>
    </ThemeContext.Provider>
    </ErrorBoundary>
  );
}
