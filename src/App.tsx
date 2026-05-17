import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";
import { t, type Lang } from "./i18n";

export const STRIPE_MONTHLY_URL = "https://buy.stripe.com/eVqfZa04h8hzcHR6278Zq01";
export const STRIPE_YEARLY_URL = "https://buy.stripe.com/fZu9AMcR369razJ2PV8Zq02";

const RED = "#E63E1C";
const RED_DARK = "#A02B10";
const GREEN = "#2D7A1F";
const GREEN_LIGHT = "#E8F5E3";
const CREAM = "#FFF8F0";
const CREAM_DARK = "#F5E6D3";
const BORDER = "#E8D5B7";
const BROWN = "#6B4C2A";
const DARK = "#1A0F00";

const FONT_SERIF = "'Fraunces', 'Georgia', serif";
const FONT_SANS = "'DM Sans', system-ui, sans-serif";

const loadFonts = () => {
  if (document.getElementById("petitchef-fonts")) return;
  const link = document.createElement("link");
  link.id = "petitchef-fonts";
  link.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,700&family=DM+Sans:wght@400;500;600&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};
loadFonts();

type Recipe = {
  titre: string;
  temps: string;
  difficulte: string;
  calories: string;
  ingredients: string[];
  etapes: string[];
  personnes?: number;
  image?: string;
};

type MealSlot = { recipe: Recipe } | null;
type MealPlan = { [day: string]: { matin: MealSlot; midi: MealSlot; soir: MealSlot } };

const DAYS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["matin", "midi", "soir"] as const;

const emptyPlan = (): MealPlan =>
  Object.fromEntries(DAYS_FR.map((d) => [d, { matin: null, midi: null, soir: null }]));

const TODAY = new Date().toISOString().split("T")[0];

function getUsage() {
  try {
    const raw = localStorage.getItem("usage");
    const data = raw ? JSON.parse(raw) : {};
    if (data.date !== TODAY) return { date: TODAY, searches: 0, favs: 0 };
    return data;
  } catch { return { date: TODAY, searches: 0, favs: 0 }; }
}

function saveUsage(data: any) { localStorage.setItem("usage", JSON.stringify(data)); }

function isPremiumLocal(): boolean {
  try { return JSON.parse(localStorage.getItem("premium") || "{}").active === true; } catch { return false; }
}

function scaleIngredient(ingredient: string, from: number, to: number): string {
  if (from === to) return ingredient;
  const ratio = to / from;
  return ingredient.replace(/(\d+(?:[.,]\d+)?)/g, (_m, num) => {
    const original = parseFloat(num.replace(",", "."));
    const scaled = original * ratio;
    return `${scaled < 10 ? Math.round(scaled * 10) / 10 : Math.round(scaled)}`;
  });
}

function getUnsplashUrl(query: string): string {
  return `https://source.unsplash.com/800x500/?food,${encodeURIComponent(query.split(" ").slice(0, 3).join(" "))}`;
}

function encodeRecipe(recipe: Recipe): string { return btoa(encodeURIComponent(JSON.stringify(recipe))); }
function decodeRecipe(str: string): Recipe | null {
  try { return JSON.parse(decodeURIComponent(atob(str))); } catch { return null; }
}

// ---- STYLES ----
const S = {
  btnRed: {
    background: RED, color: CREAM, border: "none",
    borderRadius: 24, fontFamily: FONT_SANS, fontWeight: 600,
    cursor: "pointer", boxShadow: `0 4px 0 ${RED_DARK}`,
  } as React.CSSProperties,
  btnOutline: {
    background: "transparent", color: DARK, border: `2px solid ${DARK}`,
    borderRadius: 24, fontFamily: FONT_SANS, fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  btnGreen: {
    background: GREEN, color: CREAM, border: "none",
    borderRadius: 24, fontFamily: FONT_SANS, fontWeight: 600,
    cursor: "pointer", boxShadow: `0 3px 0 #1F5A14`,
  } as React.CSSProperties,
  card: {
    background: "#fff", borderRadius: 20,
    border: `2px solid ${BORDER}`,
    boxShadow: `0 4px 0 ${BORDER}`,
  } as React.CSSProperties,
  input: {
    background: CREAM_DARK, border: `2px solid ${BORDER}`,
    borderRadius: 24, fontFamily: FONT_SANS, fontSize: 14,
    color: DARK, outline: "none",
  } as React.CSSProperties,
};

// ---- LANG TOGGLE ----
function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display: "flex", border: `2px solid ${DARK}`, borderRadius: 20, overflow: "hidden" }}>
      {(["fr", "en"] as Lang[]).map((l) => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: "4px 10px", border: "none", background: lang === l ? DARK : "transparent", color: lang === l ? CREAM : BROWN, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
          {l}
        </button>
      ))}
    </div>
  );
}

// ---- AUTH MODAL ----
function AuthModal({ onClose, onSuccess, lang }: { onClose: () => void; onSuccess: (user: User) => void; lang: Lang }) {
  const T = t[lang];
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const handleEmail = async () => {
    setLoading(true); setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(T.confirmEmail);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onSuccess(data.user);
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(26,15,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }} onClick={onClose}>
      <div style={{ ...S.card, width: "100%", maxWidth: 380, padding: "1.75rem" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 22, color: DARK, fontWeight: 700 }}>{mode === "login" ? T.loginTitle : T.signupTitle}</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${BORDER}`, background: CREAM, cursor: "pointer", fontSize: 16, color: BROWN }}>×</button>
        </div>
        {message ? (
          <div style={{ padding: "1rem", background: GREEN_LIGHT, borderRadius: 12, fontSize: 13, color: GREEN, textAlign: "center", fontFamily: FONT_SANS }}>{message}</div>
        ) : (
          <>
            <button onClick={handleGoogle} style={{ width: "100%", height: 44, ...S.btnOutline, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {T.continueGoogle}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 11, color: BROWN, fontFamily: FONT_SANS }}>ou</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T.emailPlaceholder} type="email" style={{ ...S.input, width: "100%", height: 44, padding: "0 16px", marginBottom: 8, boxSizing: "border-box" as const }} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T.passwordPlaceholder} type="password" style={{ ...S.input, width: "100%", height: 44, padding: "0 16px", marginBottom: 12, boxSizing: "border-box" as const }} onKeyDown={(e) => e.key === "Enter" && handleEmail()} />
            {error && <div style={{ fontSize: 12, color: RED, marginBottom: 10, fontFamily: FONT_SANS }}>{error}</div>}
            <button onClick={handleEmail} disabled={loading} style={{ ...S.btnRed, width: "100%", height: 44, fontSize: 14, marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? "…" : mode === "login" ? T.loginBtn : T.signupBtn}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: BROWN, fontFamily: FONT_SANS }}>
              {mode === "login" ? T.noAccount : T.hasAccount}{" "}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }} style={{ color: RED, cursor: "pointer", fontWeight: 600 }}>
                {mode === "login" ? T.signup : T.loginLink}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- PREMIUM PAGE ----
function PremiumPage({ onClose, lang }: { onClose: () => void; lang: Lang }) {
  const T = t[lang];
  const subscribe = (plan: "monthly" | "yearly") => {
    window.location.href = plan === "yearly" ? STRIPE_YEARLY_URL : STRIPE_MONTHLY_URL;
  };
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(26,15,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: CREAM, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: RED, padding: "2rem 1.5rem 1.5rem", position: "relative" as const, borderRadius: "24px 24px 0 0" }}>
          <button onClick={onClose} style={{ position: "absolute" as const, top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,248,240,0.2)", color: CREAM, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <div style={{ fontSize: 11, color: "rgba(255,248,240,0.7)", letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 600, fontFamily: FONT_SANS }}>{T.premiumTag}</div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 700, color: CREAM, marginBottom: 4, fontStyle: "italic" }}>{T.premiumTitle}</div>
          <div style={{ fontSize: 14, color: "rgba(255,248,240,0.75)", fontFamily: FONT_SANS }}>{T.premiumSub}</div>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            {T.premiumFeatures.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: CREAM_DARK, border: `2px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: DARK, fontFamily: FONT_SANS }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" }}>
            <div style={{ ...S.card, padding: "1.25rem", textAlign: "center" as const }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: BROWN, letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: FONT_SANS }}>{T.monthly}</div>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 30, color: DARK, marginBottom: 2, fontWeight: 700 }}>4.99€</div>
              <div style={{ fontSize: 11, color: BROWN, marginBottom: 16, fontFamily: FONT_SANS }}>{T.perMonth}</div>
              <button onClick={() => subscribe("monthly")} style={{ ...S.btnOutline, width: "100%", height: 40, fontSize: 13 }}>{T.choose}</button>
            </div>
            <div style={{ ...S.card, padding: "1.25rem", textAlign: "center" as const, position: "relative" as const, border: `2px solid ${RED}`, boxShadow: `0 4px 0 ${RED_DARK}` }}>
              <div style={{ position: "absolute" as const, top: -12, left: "50%", transform: "translateX(-50%)", background: RED, color: CREAM, fontSize: 10, fontWeight: 600, padding: "3px 12px", borderRadius: 20, whiteSpace: "nowrap" as const, fontFamily: FONT_SANS, boxShadow: `0 2px 0 ${RED_DARK}` }}>{T.save33}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: RED, letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: FONT_SANS }}>{T.yearly}</div>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 30, color: DARK, marginBottom: 2, fontWeight: 700 }}>39.99€</div>
              <div style={{ fontSize: 11, color: BROWN, marginBottom: 16, fontFamily: FONT_SANS }}>{T.perYear}</div>
              <button onClick={() => subscribe("yearly")} style={{ ...S.btnRed, width: "100%", height: 40, fontSize: 13 }}>{T.choose}</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: BROWN, textAlign: "center" as const, fontFamily: FONT_SANS }}>{T.stripeNote}</div>
        </div>
      </div>
    </div>
  );
}

// ---- LIMIT BANNER ----
function LimitBanner({ type, onUpgrade, lang }: { type: "searches" | "favs"; onUpgrade: () => void; lang: Lang }) {
  const T = t[lang];
  return (
    <div style={{ background: "#FFF3D6", border: `2px solid #F5A623`, borderRadius: 14, padding: "0.875rem 1rem", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#7A4A00", fontFamily: FONT_SANS }}>{type === "searches" ? T.limitSearches : T.limitFavs}</div>
      <button onClick={onUpgrade} style={{ ...S.btnRed, padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap" as const }}>{T.limitBtn}</button>
    </div>
  );
}

// ---- SHOPPING LIST ----
function ShoppingList({ plan, lang }: { plan: MealPlan; lang: Lang }) {
  const T = t[lang];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allIngredients: string[] = [];
  DAYS_FR.forEach((day) => MEALS.forEach((meal) => {
    const slot = plan[day]?.[meal];
    if (slot) slot.recipe.ingredients.forEach((ing) => { if (!allIngredients.includes(ing)) allIngredients.push(ing); });
  }));
  const toggle = (ing: string) => setChecked((prev) => ({ ...prev, [ing]: !prev[ing] }));
  const unchecked = allIngredients.filter((i) => !checked[i]);
  const done = allIngredients.filter((i) => checked[i]);

  if (allIngredients.length === 0) return (
    <div style={{ textAlign: "center", padding: "2rem", color: BROWN, fontSize: 13, fontFamily: FONT_SANS }}>{T.emptyShoppingList}</div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: DARK, fontWeight: 700, marginBottom: 2 }}>{T.shoppingList}</div>
          <div style={{ fontSize: 11, color: BROWN, fontFamily: FONT_SANS }}>{T.articles(allIngredients.length)} · {T.done(done.length)}</div>
        </div>
        {done.length > 0 && <button onClick={() => setChecked({})} style={{ fontSize: 11, color: BROWN, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_SANS }}>{T.uncheckAll}</button>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ height: 6, background: CREAM_DARK, borderRadius: 999, overflow: "hidden", marginBottom: 5, border: `1px solid ${BORDER}` }}>
          <div style={{ height: "100%", width: `${allIngredients.length ? (done.length / allIngredients.length) * 100 : 0}%`, background: RED, borderRadius: 999, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: BROWN, fontFamily: FONT_SANS }}>
          <span>{done.length} / {allIngredients.length}</span>
          <span>{allIngredients.length ? Math.round((done.length / allIngredients.length) * 100) : 0}%</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {unchecked.map((ing, i) => (
          <div key={i} onClick={() => toggle(ing)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 14, border: `2px solid ${BORDER}`, cursor: "pointer", boxShadow: `0 2px 0 ${BORDER}` }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${BORDER}`, background: CREAM, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: DARK, fontFamily: FONT_SANS }}>{ing}</span>
          </div>
        ))}
        {done.map((ing, i) => (
          <div key={i} onClick={() => toggle(ing)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 14, border: `2px solid ${BORDER}`, cursor: "pointer", opacity: 0.5, boxShadow: `0 2px 0 ${BORDER}` }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${RED}`, background: RED, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: CREAM, fontSize: 11 }}>✓</span>
            </div>
            <span style={{ fontSize: 13, color: DARK, textDecoration: "line-through", fontFamily: FONT_SANS }}>{ing}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- RECIPE MODAL ----
function RecipeModal({ recipe, onClose, plan, setPlan, onFavLimited, lang }: {
  recipe: Recipe; onClose: () => void; plan: MealPlan; setPlan: (p: MealPlan) => void;
  onFavLimited: () => void; user?: User | null; lang: Lang;
}) {
  const T = t[lang];
  const DAYS = lang === "en" ? DAYS_EN : DAYS_FR;
  const basePersonnes = recipe.personnes || 2;
  const [personnes, setPersonnes] = useState(basePersonnes);
  const [fav, setFav] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState("");
  const [intervalId, setIntervalId] = useState<any>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedMeal, setSelectedMeal] = useState<"matin" | "midi" | "soir">("midi");
  const [planSaved, setPlanSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const scaledIngredients = recipe.ingredients.map((ing) => scaleIngredient(ing, basePersonnes, personnes));

  useEffect(() => {
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    setFav(favs.some((f) => f.titre === recipe.titre));
  }, []);

  const toggleFav = () => {
    if (!isPremiumLocal()) {
      const usage = getUsage();
      if (usage.favs >= 1) { onFavLimited(); return; }
      usage.favs += 1;
      saveUsage(usage);
    }
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    if (fav) { const idx = favs.findIndex((f) => f.titre === recipe.titre); if (idx > -1) favs.splice(idx, 1); }
    else favs.unshift({ ...recipe, personnes });
    localStorage.setItem("favs", JSON.stringify(favs));
    setFav(!fav);
  };

  const startTimer = () => {
    if (timerActive) { clearInterval(intervalId); setTimerActive(false); setTimerDisplay(""); return; }
    const mins = parseInt(recipe.temps) || 20;
    const end = Date.now() + mins * 60000;
    setTimerActive(true);
    const iv = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      setTimerDisplay(`${m}:${s < 10 ? "0" : ""}${s}`);
      if (left <= 0) { clearInterval(iv); setTimerActive(false); setTimerDisplay(lang === "en" ? "Done!" : "Terminé !"); }
    }, 500);
    setIntervalId(iv);
    setTimerDisplay(`${parseInt(recipe.temps) || 20}:00`);
  };

  const savePlan = () => {
    const dayKey = DAYS_FR[DAYS.indexOf(selectedDay)] || selectedDay;
    const newPlan = { ...plan };
    newPlan[dayKey] = { ...newPlan[dayKey], [selectedMeal]: { recipe } };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
    setPlanSaved(true);
    setTimeout(() => { setPlanSaved(false); setPlanOpen(false); }, 1200);
  };

  const share = () => {
    const url = `${window.location.origin}?recette=${encodeRecipe(recipe)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const diffColors: Record<string, string> = { "Facile": GREEN, "Easy": GREEN, "Moyen": "#B8660A", "Medium": "#B8660A", "Difficile": RED, "Hard": RED };
  const mealLabels = { matin: T.morning, midi: T.noon, soir: T.evening };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(26,15,0,0.6)", zIndex: 150, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: CREAM, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "relative" as const }}>
          <img src={recipe.image || getUnsplashUrl(recipe.titre)} alt={recipe.titre} style={{ width: "100%", height: 220, objectFit: "cover", display: "block", borderRadius: "24px 24px 0 0" }} onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x500/?food,cooking`; }} />
          <button onClick={onClose} style={{ position: "absolute" as const, top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", border: `2px solid ${CREAM}`, background: "rgba(26,15,0,0.4)", color: CREAM, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: 10, color: RED, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 600, fontFamily: FONT_SANS }}>{T.recipe}</div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 24, color: DARK, marginBottom: 10, fontWeight: 700, lineHeight: 1.2, fontStyle: "italic" }}>{recipe.titre}</div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS, background: CREAM_DARK, padding: "4px 12px", borderRadius: 20, border: `1px solid ${BORDER}` }}>⏱ {recipe.temps}</span>
            <span style={{ fontSize: 12, color: diffColors[recipe.difficulte] || BROWN, fontWeight: 600, fontFamily: FONT_SANS, background: CREAM_DARK, padding: "4px 12px", borderRadius: 20, border: `1px solid ${BORDER}` }}>● {recipe.difficulte}</span>
            {recipe.calories && <span style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS, background: CREAM_DARK, padding: "4px 12px", borderRadius: 20, border: `1px solid ${BORDER}` }}>🔥 {recipe.calories}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "0.75rem 1rem", background: CREAM_DARK, borderRadius: 16, border: `2px solid ${BORDER}` }}>
            <span style={{ fontSize: 13, color: BROWN, flex: 1, fontFamily: FONT_SANS }}>{T.persons}</span>
            <div style={{ display: "flex", alignItems: "center", border: `2px solid ${BORDER}`, borderRadius: 20, overflow: "hidden", background: "#fff" }}>
              <button onClick={() => setPersonnes(Math.max(1, personnes - 1))} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: DARK, fontFamily: FONT_SANS }}>−</button>
              <span style={{ minWidth: 28, textAlign: "center", fontSize: 14, fontWeight: 600, color: RED, fontFamily: FONT_SANS }}>{personnes}</span>
              <button onClick={() => setPersonnes(Math.min(12, personnes + 1))} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: DARK, fontFamily: FONT_SANS }}>+</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: BROWN, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 10, fontFamily: FONT_SANS }}>{T.ingredients}</div>
              {scaledIngredients.map((ing, i) => (
                <div key={i} style={{ fontSize: 13, color: DARK, padding: "5px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, fontFamily: FONT_SANS }}>
                  <span style={{ color: RED, flexShrink: 0 }}>·</span>{ing}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: BROWN, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 10, fontFamily: FONT_SANS }}>{T.preparation}</div>
              {recipe.etapes.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: RED, color: CREAM, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontFamily: FONT_SANS }}>{i + 1}</div>
                  <div style={{ fontSize: 12, color: BROWN, lineHeight: 1.5, fontFamily: FONT_SANS }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: planOpen ? 12 : 0 }}>
            <button onClick={toggleFav} style={{ height: 38, padding: "0 16px", borderRadius: 20, border: `2px solid ${fav ? RED : BORDER}`, background: fav ? "#FFE8E3" : "#fff", color: fav ? RED : BROWN, fontSize: 13, cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 500 }}>
              {fav ? T.saveFav : T.addFav}
            </button>
            <button onClick={share} style={{ height: 38, padding: "0 16px", borderRadius: 20, border: `2px solid ${BORDER}`, background: "#fff", color: BROWN, fontSize: 13, cursor: "pointer", fontFamily: FONT_SANS }}>
              {copied ? T.copied : T.share}
            </button>
            <button onClick={() => setPlanOpen(!planOpen)} style={{ height: 38, padding: "0 16px", borderRadius: 20, border: `2px solid ${BORDER}`, background: "#fff", color: BROWN, fontSize: 13, cursor: "pointer", fontFamily: FONT_SANS }}>
              {T.planify}
            </button>
            <button onClick={startTimer} style={{ height: 38, padding: "0 16px", borderRadius: 20, border: `2px solid ${timerActive ? RED : BORDER}`, background: timerActive ? RED : "#fff", color: timerActive ? CREAM : BROWN, fontSize: 13, cursor: "pointer", marginLeft: "auto", fontFamily: FONT_SANS, boxShadow: timerActive ? `0 3px 0 ${RED_DARK}` : "none" }}>
              {timerActive ? `⏹ ${timerDisplay}` : `▶ ${parseInt(recipe.temps) || 20} min`}
            </button>
          </div>

          {planOpen && (
            <div style={{ padding: "1rem", background: CREAM_DARK, borderRadius: 16, marginTop: 12, border: `2px solid ${BORDER}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10, fontFamily: FONT_SANS }}>{T.addToPlan}</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 8 }}>
                {DAYS.map((d) => (
                  <button key={d} onClick={() => setSelectedDay(d)} style={{ padding: "4px 12px", borderRadius: 20, border: `2px solid ${selectedDay === d ? RED : BORDER}`, fontSize: 11, color: selectedDay === d ? RED : BROWN, background: selectedDay === d ? "#FFE8E3" : "#fff", cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 500 }}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {MEALS.map((m) => (
                  <button key={m} onClick={() => setSelectedMeal(m)} style={{ flex: 1, height: 34, borderRadius: 20, border: `2px solid ${selectedMeal === m ? RED : BORDER}`, fontSize: 12, color: selectedMeal === m ? RED : BROWN, background: selectedMeal === m ? "#FFE8E3" : "#fff", cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 500 }}>
                    {mealLabels[m]}
                  </button>
                ))}
              </div>
              <button onClick={savePlan} style={{ ...S.btnRed, width: "100%", height: 38, fontSize: 13, background: planSaved ? GREEN : RED, boxShadow: planSaved ? "0 3px 0 #1F5A14" : `0 3px 0 ${RED_DARK}` }}>
                {planSaved ? T.confirmed : T.confirm}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- RECIPE CARD ----
function RecipeCard({ recipe, index, onOpen }: { recipe: Recipe; index: number; onOpen: (r: Recipe) => void; lang?: Lang }) {
  const diffColors: Record<string, string> = { "Facile": GREEN, "Easy": GREEN, "Moyen": "#B8660A", "Medium": "#B8660A", "Difficile": RED, "Hard": RED };
  const diffBg: Record<string, string> = { "Facile": GREEN_LIGHT, "Easy": GREEN_LIGHT, "Moyen": "#FFF3D6", "Medium": "#FFF3D6", "Difficile": "#FFE8E3", "Hard": "#FFE8E3" };
  const imgEmoji = ["🍗", "🍝", "🥗"];
  const imgBg = [["#FFE8E3"], ["#FFF9E3"], [GREEN_LIGHT]];

  return (
    <div onClick={() => onOpen(recipe)} style={{ ...S.card, overflow: "hidden", display: "flex", cursor: "pointer", height: 100 }}>
      <div style={{ width: 100, height: 100, flexShrink: 0, position: "relative" as const, overflow: "hidden" }}>
        <img src={recipe.image || getUnsplashUrl(recipe.titre)} alt={recipe.titre} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.style.background = imgBg[index % 3][0];
            parent.style.fontSize = "36px";
            parent.style.display = "flex";
            parent.style.alignItems = "center";
            parent.style.justifyContent = "center";
            parent.innerHTML = imgEmoji[index % 3];
          }
        }} />
        <div style={{ position: "absolute" as const, top: 6, left: 6, background: RED, color: CREAM, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: FONT_SANS, boxShadow: `0 2px 0 ${RED_DARK}` }}>
          {index + 1}
        </div>
      </div>
      <div style={{ padding: "10px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: `2px solid ${BORDER}` }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 14, color: DARK, lineHeight: 1.35, fontWeight: 600, fontStyle: "italic" }}>{recipe.titre}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
          <span style={{ fontSize: 11, color: BROWN, fontFamily: FONT_SANS }}>⏱ {recipe.temps}</span>
          <span style={{ fontSize: 11, color: BROWN, fontFamily: FONT_SANS }}>🔥 {recipe.calories}</span>
          <span style={{ fontSize: 10, color: diffColors[recipe.difficulte] || BROWN, fontWeight: 600, fontFamily: FONT_SANS, background: diffBg[recipe.difficulte] || CREAM_DARK, padding: "2px 8px", borderRadius: 10 }}>{recipe.difficulte}</span>
        </div>
      </div>
    </div>
  );
}

// ---- MEAL PLANNER ----
function MealPlanner({ plan, setPlan, premium, lang }: { plan: MealPlan; setPlan: (p: MealPlan) => void; premium: boolean; user?: User | null; lang: Lang }) {
  const T = t[lang];
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; meal: typeof MEALS[number] } | null>(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealRecipe, setMealRecipe] = useState<Recipe | null>(null);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const mealLabels = { matin: T.morning, midi: T.noon, soir: T.evening };

  const removeSlot = (dayFr: string, meal: typeof MEALS[number]) => {
    const newPlan = { ...plan };
    newPlan[dayFr] = { ...newPlan[dayFr], [meal]: null };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
  };

  const clearPlan = () => { const f = emptyPlan(); setPlan(f); localStorage.setItem("plan", JSON.stringify(f)); };

  const generateSuggestion = async (dayFr: string, meal: string) => {
    setMealLoading(true); setMealRecipe(null);
    const prompt = T.aiSuggestPrompt(dayFr, meal);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      setMealRecipe(JSON.parse(data.text.replace(/```json|```/g, "").trim()));
    } catch (_e) { setMealRecipe(null); }
    setMealLoading(false);
  };

  const addToPlan = () => {
    if (!selectedSlot || !mealRecipe) return;
    const newPlan = { ...plan };
    newPlan[selectedSlot.day] = { ...newPlan[selectedSlot.day], [selectedSlot.meal]: { recipe: mealRecipe } };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
    setSelectedSlot(null); setMealRecipe(null);
  };

  const filledCount = DAYS_FR.reduce((acc, day) => acc + MEALS.filter((m) => plan[day]?.[m] !== null).length, 0);

  return (
    <div>
      <div style={{ ...S.card, padding: "1rem", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: filledCount > 0 ? 10 : 0 }}>
          <div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: DARK, fontWeight: 700, marginBottom: 2, fontStyle: "italic" }}>{T.weekPlanning}</div>
            <div style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS }}>{filledCount === 0 ? T.noMeals : T.mealsCount(filledCount)}</div>
          </div>
          {filledCount > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              {premium && (
                <button onClick={() => setShowShopping(!showShopping)} style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid ${GREEN}`, background: showShopping ? GREEN : GREEN_LIGHT, color: showShopping ? CREAM : GREEN, fontSize: 11, cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 600 }}>
                  🛒 {showShopping ? T.hide : T.courses}
                </button>
              )}
              <button onClick={clearPlan} style={{ padding: "5px 12px", borderRadius: 20, border: "2px solid #F5C0C0", background: "#FFF0F0", color: "#C0392B", fontSize: 11, cursor: "pointer", fontFamily: FONT_SANS }}>{T.clear}</button>
            </div>
          )}
        </div>
        {filledCount > 0 && (
          <div style={{ height: 6, background: CREAM_DARK, borderRadius: 999, overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <div style={{ height: "100%", width: `${(filledCount / 21) * 100}%`, background: RED, borderRadius: 999, transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      {showShopping && premium && (
        <div style={{ ...S.card, padding: "1rem", marginBottom: 12 }}>
          <ShoppingList plan={plan} lang={lang} />
        </div>
      )}

      {!premium && filledCount > 0 && (
        <div style={{ padding: "0.875rem 1rem", background: "#FFE8E3", borderRadius: 14, fontSize: 12, color: RED_DARK, textAlign: "center", marginBottom: 12, fontFamily: FONT_SANS, border: `2px solid #F5C0B0` }}>
          {T.shoppingPremium}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DAYS_FR.map((dayFr, di) => {
          const dayLabel = lang === "en" ? DAYS_EN[di] : dayFr;
          return (
            <div key={dayFr} style={{ ...S.card, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: `2px solid ${BORDER}`, fontSize: 13, fontWeight: 600, color: DARK, fontFamily: FONT_SANS, background: CREAM_DARK }}>{dayLabel}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                {MEALS.map((meal, i) => {
                  const slot = plan[dayFr]?.[meal];
                  return (
                    <div key={meal} style={{ padding: "0.75rem 0.875rem", borderRight: i < 2 ? `2px solid ${BORDER}` : "none", minHeight: 72 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: RED, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 5, fontFamily: FONT_SANS }}>{mealLabels[meal]}</div>
                      {slot ? (
                        <div>
                          <div onClick={() => setOpenRecipe(slot.recipe)} style={{ fontFamily: FONT_SERIF, fontSize: 12, color: DARK, fontWeight: 600, lineHeight: 1.3, cursor: "pointer", marginBottom: 4, fontStyle: "italic" }}>{slot.recipe.titre}</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 10, color: BROWN, fontFamily: FONT_SANS }}>⏱ {slot.recipe.temps}</span>
                            <button onClick={() => removeSlot(dayFr, meal)} style={{ fontSize: 10, color: RED, background: "none", border: "none", cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => { setSelectedSlot({ day: dayFr, meal }); setMealRecipe(null); }} style={{ fontSize: 11, color: RED, cursor: "pointer", fontWeight: 600, fontFamily: FONT_SANS }}>{T.suggest}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSlot && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(26,15,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => { setSelectedSlot(null); setMealRecipe(null); }}>
          <div style={{ background: CREAM, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#fff", padding: "1rem 1.25rem", borderBottom: `2px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: DARK, fontWeight: 700, fontStyle: "italic" }}>{mealRecipe ? mealRecipe.titre : T.suggestionIA}</div>
              <button onClick={() => { setSelectedSlot(null); setMealRecipe(null); }} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${BORDER}`, background: CREAM, cursor: "pointer", fontSize: 16, color: BROWN }}>×</button>
            </div>
            <div style={{ padding: "1rem 1.25rem" }}>
              {!mealRecipe && !mealLoading && (
                <button onClick={() => generateSuggestion(selectedSlot.day, selectedSlot.meal)} style={{ ...S.btnRed, width: "100%", height: 46, fontSize: 14 }}>{T.suggestRecipe}</button>
              )}
              {mealLoading && <div style={{ textAlign: "center", padding: "2rem", color: BROWN, fontSize: 13, fontFamily: FONT_SANS }}>{T.preparing}</div>}
              {mealRecipe && !mealLoading && (
                <>
                  <div style={{ ...S.card, padding: "1rem", marginBottom: 10 }}>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: DARK, marginBottom: 6, fontWeight: 700, fontStyle: "italic" }}>{mealRecipe.titre}</div>
                    <div style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS }}>⏱ {mealRecipe.temps} · {mealRecipe.difficulte} · {mealRecipe.calories}</div>
                  </div>
                  {!plan[selectedSlot.day]?.[selectedSlot.meal] && (
                    <button onClick={addToPlan} style={{ ...S.btnGreen, width: "100%", height: 46, fontSize: 14 }}>{T.addToPlanning}</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {openRecipe && (
        <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} plan={plan} setPlan={setPlan} onFavLimited={() => {}} lang={lang} />
      )}
    </div>
  );
}

// ---- SHARED RECIPE VIEW ----
function SharedRecipeView({ recipe, onBack, lang }: { recipe: Recipe; onBack: () => void; lang: Lang }) {
  const T = t[lang];
  const planRef = useRef(emptyPlan());
  const [_plan, _setPlan] = useState(planRef.current);
  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      <div style={{ background: RED, padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, borderBottom: `3px solid ${RED_DARK}` }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: CREAM, fontWeight: 700 }}>PetitChef</div>
        <button onClick={onBack} style={{ fontSize: 12, color: CREAM, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FONT_SANS }}>{T.discover}</button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem" }}>
        <div style={{ fontSize: 12, color: BROWN, marginBottom: 12, fontFamily: FONT_SANS }}>{T.sharedRecipe}</div>
        <RecipeModal recipe={recipe} onClose={onBack} plan={_plan} setPlan={_setPlan} onFavLimited={() => {}} lang={lang} />
      </div>
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "fr");
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [tab, setTab] = useState("recettes");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<{ q: string; time: string }[]>([]);
  const [searched, setSearched] = useState(false);
  const [plan, setPlan] = useState<MealPlan>(() => {
    try { return JSON.parse(localStorage.getItem("plan") || "null") || emptyPlan(); } catch { return emptyPlan(); }
  });
  const [showPremium, setShowPremium] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [premium, setPremium] = useState(isPremiumLocal());
  const [limitType, setLimitType] = useState<"searches" | "favs" | null>(null);
  const [usage, setUsage] = useState(getUsage());
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [sharedRecipe, setSharedRecipe] = useState<Recipe | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const T = t[lang];

  const changeLang = (l: Lang) => { setLang(l); localStorage.setItem("lang", l); setActiveFilters([]); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session?.user) setUser(data.session.user); });
    supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); });
    const params = new URLSearchParams(window.location.search);
    const recette = params.get("recette");
    if (recette) { const d = decodeRecipe(recette); if (d) setSharedRecipe(d); }
    if (params.get("success")) { localStorage.setItem("premium", JSON.stringify({ active: true })); setPremium(true); window.history.replaceState({}, "", "/"); }
    window.addEventListener("beforeinstallprompt", (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); });
  }, []);

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("favs") || "[]"));
    setHistory(JSON.parse(localStorage.getItem("hist") || "[]"));
  }, [tab]);

  const toggleFilter = (f: string) => setActiveFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const addHistory = (q: string) => {
    const h = JSON.parse(localStorage.getItem("hist") || "[]").filter((x: any) => x.q !== q);
    h.unshift({ q, time: new Date().toLocaleTimeString(lang === "en" ? "en-GB" : "fr-FR", { hour: "2-digit", minute: "2-digit" }) });
    if (h.length > 20) h.pop();
    localStorage.setItem("hist", JSON.stringify(h));
  };

  const generate = async (q = query) => {
    if (!q.trim()) return;
    if (!isPremiumLocal()) {
      const u = getUsage();
      if (u.searches >= 3) { setLimitType("searches"); return; }
      u.searches += 1; saveUsage(u); setUsage({ ...u });
    }
    setLoading(true); setError(null); setRecipes([]); setTab("recettes"); setSearched(true); setLimitType(null);
    const filtersStr = activeFilters.length ? T.aiFilters(activeFilters) : "";
    const prompt = T.aiPrompt(q, filtersStr);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Error ${res.status}`); }
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      addHistory(q); setRecipes(parsed.recettes);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const installApp = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === "accepted") setShowInstall(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setUserMenuOpen(false); };

  if (sharedRecipe) return <SharedRecipeView recipe={sharedRecipe} onBack={() => { setSharedRecipe(null); window.history.replaceState({}, "", "/"); }} lang={lang} />;

  const filledCount = DAYS_FR.reduce((acc, day) => acc + MEALS.filter((m) => plan[day]?.[m] !== null).length, 0);
  const searchesLeft = isPremiumLocal() ? "∞" : Math.max(0, 3 - usage.searches);

  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      {showPremium && <PremiumPage onClose={() => setShowPremium(false)} lang={lang} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={(u) => { setUser(u); setShowAuth(false); }} lang={lang} />}
      {openRecipe && <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} plan={plan} setPlan={setPlan} onFavLimited={() => setLimitType("favs")} lang={lang} />}

      {/* Navbar */}
      <div style={{ background: RED, borderBottom: `3px solid ${RED_DARK}`, padding: "12px 1.25rem 10px", position: "sticky" as const, top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showInstall ? 10 : 0 }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 22, color: CREAM, fontWeight: 700, fontStyle: "italic", textShadow: `1px 1px 0 ${RED_DARK}` }}>
            PetitChef
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LangToggle lang={lang} setLang={changeLang} />
            {!premium && <span style={{ fontSize: 10, color: "rgba(255,248,240,0.7)", fontFamily: FONT_SANS }}>{T.searchesLeft(Number(searchesLeft))}</span>}
            {premium && <span style={{ fontSize: 10, fontWeight: 600, color: RED, background: CREAM, padding: "3px 10px", borderRadius: 20, fontFamily: FONT_SANS }}>★ Premium</span>}
            {!premium && <button onClick={() => setShowPremium(true)} style={{ ...S.btnRed, padding: "5px 12px", fontSize: 11, background: CREAM, color: RED, boxShadow: `0 2px 0 ${RED_DARK}` }}>{T.premium}</button>}
            {user ? (
              <div style={{ position: "relative" as const }}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid rgba(255,248,240,0.4)`, background: "rgba(255,248,240,0.2)", color: CREAM, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_SANS }}>
                  {user.email?.[0].toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div style={{ position: "absolute" as const, right: 0, top: 36, background: "#fff", border: `2px solid ${BORDER}`, borderRadius: 14, padding: "6px", minWidth: 160, boxShadow: `0 4px 0 ${BORDER}`, zIndex: 100 }}>
                    <div style={{ fontSize: 10, color: BROWN, padding: "4px 8px", marginBottom: 2, fontFamily: FONT_SANS }}>{user.email}</div>
                    <button onClick={signOut} style={{ width: "100%", padding: "7px 8px", borderRadius: 10, border: "none", background: "transparent", color: RED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, fontFamily: FONT_SANS, fontWeight: 600 }}>{T.logout}</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid rgba(255,248,240,0.5)`, background: "transparent", color: CREAM, fontSize: 11, cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 500 }}>{T.login}</button>
            )}
          </div>
        </div>
        {showInstall && (
          <button onClick={installApp} style={{ ...S.btnGreen, width: "100%", height: 36, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span>⬇</span> {T.install}
          </button>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: CREAM_DARK, padding: "24px 1.25rem 20px", borderBottom: `3px solid ${BORDER}`, position: "relative" as const, overflow: "hidden" }}>
        <div style={{ position: "absolute" as const, top: -40, right: -40, width: 140, height: 140, background: RED, borderRadius: "50%", opacity: 0.06 }} />
        <div style={{ position: "absolute" as const, bottom: -30, left: -20, width: 100, height: 100, background: "#F5A623", borderRadius: "50%", opacity: 0.08 }} />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative" as const }}>
          <div style={{ fontSize: 10, color: RED, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_SANS }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: RED }} />{T.aiTag}
          </div>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 700, color: DARK, marginBottom: 6, lineHeight: 1.15, fontStyle: "italic" }}>
            {T.heroTitle} <span style={{ color: RED }}>{T.heroTitleItalic}</span>{T.heroTitleEnd}
          </h1>
          <p style={{ fontSize: 14, color: BROWN, marginBottom: 18, lineHeight: 1.6, fontFamily: FONT_SANS }}>{T.heroSub}</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 16px", borderRadius: 24, border: `2px solid ${BORDER}`, background: "#fff", boxShadow: `0 3px 0 ${BORDER}` }}>
              <span style={{ color: BORDER, fontSize: 16 }}>🔍</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder={T.searchPlaceholder} style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: DARK, outline: "none", fontFamily: FONT_SANS }} />
            </div>
            <button onClick={() => generate()} disabled={loading} style={{ ...S.btnRed, height: 46, padding: "0 22px", fontSize: 14, opacity: loading ? 0.7 : 1 }}>
              {loading ? "…" : T.findBtn}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
            {T.filters.map((f) => (
              <button key={f} onClick={() => toggleFilter(f)} style={{ padding: "5px 14px", borderRadius: 20, border: `2px solid ${activeFilters.includes(f) ? RED : BORDER}`, fontSize: 12, color: activeFilters.includes(f) ? RED : BROWN, background: activeFilters.includes(f) ? "#FFE8E3" : "#fff", cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 500, boxShadow: activeFilters.includes(f) ? `0 2px 0 ${RED_DARK}` : `0 2px 0 ${BORDER}` }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS }}>{T.suggestions}</span>
            {T.suggestions_list.map((s) => (
              <span key={s} onClick={() => { setQuery(s); generate(s); }} style={{ fontSize: 12, color: BROWN, cursor: "pointer", padding: "4px 12px", borderRadius: 20, background: "#fff", border: `2px solid ${BORDER}`, fontFamily: FONT_SANS, fontWeight: 500, boxShadow: `0 2px 0 ${BORDER}` }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 1.25rem" }}>
        <div style={{ display: "flex", borderBottom: `3px solid ${BORDER}`, marginBottom: 16 }}>
          {[
            { id: "recettes", label: T.recipes },
            { id: "planning", label: filledCount > 0 ? `${T.planning} (${filledCount})` : T.planning },
            { id: "favoris", label: T.favorites },
            { id: "historique", label: T.history },
          ].map((tab_item) => (
            <button key={tab_item.id} onClick={() => setTab(tab_item.id)} style={{ flex: 1, padding: "10px 4px", fontSize: 12, fontWeight: tab === tab_item.id ? 700 : 400, color: tab === tab_item.id ? RED : BROWN, background: "none", border: "none", borderBottom: `3px solid ${tab === tab_item.id ? RED : "transparent"}`, marginBottom: -3, cursor: "pointer", fontFamily: FONT_SANS }}>
              {tab_item.label}
            </button>
          ))}
        </div>

        {tab === "recettes" && (
          <>
            {limitType && <LimitBanner type={limitType} onUpgrade={() => setShowPremium(true)} lang={lang} />}
            {loading && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: RED, fontWeight: 700, fontStyle: "italic" }}>{T.cookingMsg}</div>
              </div>
            )}
            {error && <div style={{ background: "#FFE8E3", border: `2px solid #F5C0B0`, borderRadius: 14, padding: "0.875rem 1rem", fontSize: 13, color: RED_DARK, marginBottom: 14, fontFamily: FONT_SANS }}>{error}</div>}
            {!loading && !searched && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>👨‍🍳</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 24, color: DARK, fontWeight: 700, fontStyle: "italic", marginBottom: 8 }}>{T.welcome}</div>
                <div style={{ fontSize: 14, color: BROWN, lineHeight: 1.6, marginBottom: 16, fontFamily: FONT_SANS }}>{T.welcomeSub}</div>
                {!premium && (
                  <div style={{ display: "inline-block", padding: "8px 18px", background: "#FFE8E3", borderRadius: 20, fontSize: 12, color: RED_DARK, fontFamily: FONT_SANS, border: `2px solid #F5C0B0`, boxShadow: `0 3px 0 #F5C0B0` }}>
                    {T.freeSearches(Number(searchesLeft))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recipes.map((r, i) => <RecipeCard key={i} recipe={r} index={i} onOpen={setOpenRecipe} />)}
            </div>
          </>
        )}

        {tab === "planning" && <MealPlanner plan={plan} setPlan={setPlan} premium={premium} lang={lang} />}

        {tab === "favoris" && (
          <div>
            {favorites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>♥</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: DARK, fontWeight: 700, fontStyle: "italic", marginBottom: 6 }}>{T.noFavorites}</div>
                <div style={{ fontSize: 13, color: BROWN, fontFamily: FONT_SANS }}>{T.noFavoritesSub}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {favorites.map((r, i) => <RecipeCard key={i} recipe={r} index={i} onOpen={setOpenRecipe} />)}
              </div>
            )}
          </div>
        )}

        {tab === "historique" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: BROWN, fontSize: 13, fontFamily: FONT_SANS }}>{T.noHistory}</div>
            ) : (
              <div style={{ ...S.card, overflow: "hidden" }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.q); generate(h.q); }} style={{ padding: "0.875rem 1rem", borderBottom: i < history.length - 1 ? `2px solid ${BORDER}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontFamily: FONT_SERIF, fontSize: 14, color: DARK, fontWeight: 600, fontStyle: "italic" }}>{h.q}</span>
                    <span style={{ fontSize: 11, color: BROWN, fontFamily: FONT_SANS }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "2rem 1rem", borderTop: `3px solid ${BORDER}`, marginTop: "1rem", background: CREAM_DARK }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: RED, fontWeight: 700, fontStyle: "italic", marginBottom: 4 }}>PetitChef</div>
        <span style={{ fontSize: 12, color: BROWN, fontFamily: FONT_SANS }}>{T.footer}</span>
      </div>
    </div>
  );
}