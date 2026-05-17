import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";
import { t, type Lang } from "./i18n";

export const STRIPE_MONTHLY_URL = "https://buy.stripe.com/eVqfZa04h8hzcHR6278Zq01";
export const STRIPE_YEARLY_URL = "https://buy.stripe.com/fZu9AMcR369razJ2PV8Zq02";

const SAGE = "#2D5A16";
const SAGE_LIGHT = "#EBF4E3";
const SAGE_MID = "#B5D98F";
const CREAM = "#FAFAF6";
const BORDER = "#EEEAE2";
const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_SANS = "'DM Sans', system-ui, sans-serif";

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

const fontsLink = document.createElement("link");
fontsLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap";
fontsLink.rel = "stylesheet";
document.head.appendChild(fontsLink);

// ---- LANG TOGGLE ----
function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: `0.5px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
      {(["fr", "en"] as Lang[]).map((l) => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: "4px 10px", border: "none", background: lang === l ? "#1a1a18" : "#fff", color: lang === l ? "#fff" : "#888", fontSize: 11, fontWeight: lang === l ? 500 : 400, cursor: "pointer", fontFamily: FONT_SANS, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
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
    setLoading(true);
    setError(null);
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
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 380, padding: "1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: "#1a1a18", fontWeight: 400 }}>{mode === "login" ? T.loginTitle : T.signupTitle}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: `0.5px solid ${BORDER}`, background: CREAM, cursor: "pointer", fontSize: 16, color: "#888" }}>×</button>
        </div>
        {message ? (
          <div style={{ padding: "1rem", background: SAGE_LIGHT, borderRadius: 10, fontSize: 13, color: SAGE, textAlign: "center", fontFamily: FONT_SANS }}>{message}</div>
        ) : (
          <>
            <button onClick={handleGoogle} style={{ width: "100%", height: 42, borderRadius: 10, border: `0.5px solid ${BORDER}`, background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14, color: "#1a1a18", fontFamily: FONT_SANS }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {T.continueGoogle}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 0.5, background: BORDER }} />
              <span style={{ fontSize: 11, color: "#bbb", fontFamily: FONT_SANS }}>ou</span>
              <div style={{ flex: 1, height: 0.5, background: BORDER }} />
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T.emailPlaceholder} type="email" style={{ width: "100%", height: 42, padding: "0 14px", borderRadius: 10, border: `0.5px solid ${BORDER}`, fontSize: 13, marginBottom: 8, background: CREAM, outline: "none", boxSizing: "border-box" as const, fontFamily: FONT_SANS }} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T.passwordPlaceholder} type="password" style={{ width: "100%", height: 42, padding: "0 14px", borderRadius: 10, border: `0.5px solid ${BORDER}`, fontSize: 13, marginBottom: 12, background: CREAM, outline: "none", boxSizing: "border-box" as const, fontFamily: FONT_SANS }} onKeyDown={(e) => e.key === "Enter" && handleEmail()} />
            {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, fontFamily: FONT_SANS }}>{error}</div>}
            <button onClick={handleEmail} disabled={loading} style={{ width: "100%", height: 42, borderRadius: 10, border: "none", background: "#1a1a18", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 12, opacity: loading ? 0.7 : 1, fontFamily: FONT_SANS }}>
              {loading ? "…" : mode === "login" ? T.loginBtn : T.signupBtn}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: "#888", fontFamily: FONT_SANS }}>
              {mode === "login" ? T.noAccount : T.hasAccount}{" "}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }} style={{ color: SAGE, cursor: "pointer", fontWeight: 500 }}>
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
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#1a1a18", padding: "2rem 1.5rem 1.5rem", position: "relative" as const }}>
          <button onClick={onClose} style={{ position: "absolute" as const, top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <div style={{ fontSize: 10, color: SAGE_MID, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 500, fontFamily: FONT_SANS }}>{T.premiumTag}</div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 400, color: "#fff", marginBottom: 4, fontStyle: "italic" }}>{T.premiumTitle}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: FONT_SANS }}>{T.premiumSub}</div>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            {T.premiumFeatures.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: SAGE_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a18", fontFamily: FONT_SANS }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#888", fontFamily: FONT_SANS }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
            <div style={{ border: `0.5px solid ${BORDER}`, borderRadius: 14, padding: "1.25rem", textAlign: "center" as const }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#bbb", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: FONT_SANS }}>{T.monthly}</div>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 28, color: "#1a1a18", marginBottom: 2, fontWeight: 400 }}>4.99€</div>
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 14, fontFamily: FONT_SANS }}>{T.perMonth}</div>
              <button onClick={() => subscribe("monthly")} style={{ width: "100%", height: 38, borderRadius: 8, border: "0.5px solid #1a1a18", background: "#fff", color: "#1a1a18", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>{T.choose}</button>
            </div>
            <div style={{ border: "1.5px solid #1a1a18", borderRadius: 14, padding: "1.25rem", textAlign: "center" as const, position: "relative" as const }}>
              <div style={{ position: "absolute" as const, top: -10, left: "50%", transform: "translateX(-50%)", background: "#1a1a18", color: "#fff", fontSize: 9, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" as const, fontFamily: FONT_SANS }}>{T.save33}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#888", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: FONT_SANS }}>{T.yearly}</div>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 28, color: "#1a1a18", marginBottom: 2, fontWeight: 400 }}>39.99€</div>
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 14, fontFamily: FONT_SANS }}>{T.perYear}</div>
              <button onClick={() => subscribe("yearly")} style={{ width: "100%", height: 38, borderRadius: 8, border: "none", background: "#1a1a18", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>{T.choose}</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" as const, fontFamily: FONT_SANS }}>{T.stripeNote}</div>
        </div>
      </div>
    </div>
  );
}

// ---- LIMIT BANNER ----
function LimitBanner({ type, onUpgrade, lang }: { type: "searches" | "favs"; onUpgrade: () => void; lang: Lang }) {
  const T = t[lang];
  return (
    <div style={{ background: SAGE_LIGHT, border: `0.5px solid ${SAGE_MID}`, borderRadius: 10, padding: "0.875rem 1rem", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#27500A", fontFamily: FONT_SANS }}>{type === "searches" ? T.limitSearches : T.limitFavs}</div>
      <button onClick={onUpgrade} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: SAGE, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: FONT_SANS }}>{T.limitBtn}</button>
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
    <div style={{ textAlign: "center", padding: "2rem", color: "#bbb", fontSize: 13, fontFamily: FONT_SANS }}>{T.emptyShoppingList}</div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: "#1a1a18", fontWeight: 400, marginBottom: 2 }}>{T.shoppingList}</div>
          <div style={{ fontSize: 11, color: "#bbb", fontFamily: FONT_SANS }}>{T.articles(allIngredients.length)} · {T.done(done.length)}</div>
        </div>
        {done.length > 0 && <button onClick={() => setChecked({})} style={{ fontSize: 11, color: "#bbb", background: "none", border: "none", cursor: "pointer", fontFamily: FONT_SANS }}>{T.uncheckAll}</button>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 3, background: BORDER, borderRadius: 999, overflow: "hidden", marginBottom: 5 }}>
          <div style={{ height: "100%", width: `${allIngredients.length ? (done.length / allIngredients.length) * 100 : 0}%`, background: SAGE, borderRadius: 999, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#bbb", fontFamily: FONT_SANS }}>
          <span>{done.length} / {allIngredients.length}</span>
          <span>{allIngredients.length ? Math.round((done.length / allIngredients.length) * 100) : 0}%</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {unchecked.map((ing, i) => (
          <div key={i} onClick={() => toggle(ing)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#fff", borderRadius: 10, border: `0.5px solid ${BORDER}`, cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `0.5px solid #D4CFC4`, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#1a1a18", fontFamily: FONT_SANS }}>{ing}</span>
          </div>
        ))}
        {done.map((ing, i) => (
          <div key={i} onClick={() => toggle(ing)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#fff", borderRadius: 10, border: `0.5px solid ${BORDER}`, cursor: "pointer", opacity: 0.4 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `0.5px solid ${SAGE}`, background: SAGE, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 10 }}>✓</span>
            </div>
            <span style={{ fontSize: 13, color: "#1a1a18", textDecoration: "line-through", fontFamily: FONT_SANS }}>{ing}</span>
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
    setTimerDisplay(`${mins}:00`);
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

  const diffColors: Record<string, string> = { "Facile": SAGE, "Easy": SAGE, "Moyen": "#BA7517", "Medium": "#BA7517", "Difficile": "#dc2626", "Hard": "#dc2626" };
  const mealLabels = { matin: T.morning, midi: T.noon, soir: T.evening };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 150, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "relative" as const }}>
          <img src={recipe.image || getUnsplashUrl(recipe.titre)} alt={recipe.titre} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x500/?food,cooking`; }} />
          <button onClick={onClose} style={{ position: "absolute" as const, top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: 10, color: SAGE, letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: 6, fontWeight: 500, fontFamily: FONT_SANS }}>{T.recipe}</div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 22, color: "#1a1a18", marginBottom: 10, fontWeight: 400, lineHeight: 1.2 }}>{recipe.titre}</div>
          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "#888", fontFamily: FONT_SANS }}>⏱ {recipe.temps}</span>
            <span style={{ fontSize: 12, color: diffColors[recipe.difficulte] || "#888", fontWeight: 500, fontFamily: FONT_SANS }}>● {recipe.difficulte}</span>
            {recipe.calories && <span style={{ fontSize: 12, color: "#888", fontFamily: FONT_SANS }}>🔥 {recipe.calories}</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "0.75rem 1rem", background: CREAM, borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: "#888", flex: 1, fontFamily: FONT_SANS }}>{T.persons}</span>
            <div style={{ display: "flex", alignItems: "center", border: `0.5px solid ${BORDER}`, borderRadius: 999, overflow: "hidden" }}>
              <button onClick={() => setPersonnes(Math.max(1, personnes - 1))} style={{ width: 28, height: 28, border: "none", background: "#fff", cursor: "pointer", fontSize: 14, fontFamily: FONT_SANS }}>−</button>
              <span style={{ minWidth: 24, textAlign: "center", fontSize: 13, fontWeight: 500, color: SAGE, fontFamily: FONT_SANS }}>{personnes}</span>
              <button onClick={() => setPersonnes(Math.min(12, personnes + 1))} style={{ width: 28, height: 28, border: "none", background: "#fff", cursor: "pointer", fontSize: 14, fontFamily: FONT_SANS }}>+</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#bbb", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 8, fontFamily: FONT_SANS }}>{T.ingredients}</div>
              {scaledIngredients.map((ing, i) => (
                <div key={i} style={{ fontSize: 13, color: "#1a1a18", padding: "4px 0", borderBottom: `0.5px solid ${BORDER}`, display: "flex", gap: 6, fontFamily: FONT_SANS }}>
                  <span style={{ color: SAGE, flexShrink: 0 }}>·</span>{ing}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#bbb", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 8, fontFamily: FONT_SANS }}>{T.preparation}</div>
              {recipe.etapes.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: SAGE_LIGHT, color: SAGE, fontSize: 9, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontFamily: FONT_SANS }}>{i + 1}</div>
                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5, fontFamily: FONT_SANS }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: planOpen ? 12 : 0 }}>
            <button onClick={toggleFav} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `0.5px solid ${fav ? SAGE : BORDER}`, background: fav ? SAGE_LIGHT : "#fff", color: fav ? SAGE : "#888", fontSize: 12, cursor: "pointer", fontFamily: FONT_SANS }}>
              {fav ? T.saveFav : T.addFav}
            </button>
            <button onClick={share} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `0.5px solid ${BORDER}`, background: "#fff", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: FONT_SANS }}>
              {copied ? T.copied : T.share}
            </button>
            <button onClick={() => setPlanOpen(!planOpen)} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `0.5px solid ${BORDER}`, background: "#fff", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: FONT_SANS }}>
              {T.planify}
            </button>
            <button onClick={startTimer} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `0.5px solid ${timerActive ? SAGE : BORDER}`, background: timerActive ? SAGE : "#fff", color: timerActive ? "#fff" : "#888", fontSize: 12, cursor: "pointer", marginLeft: "auto", fontFamily: FONT_SANS }}>
              {timerActive ? `⏹ ${timerDisplay}` : `▶ ${parseInt(recipe.temps) || 20} min`}
            </button>
          </div>

          {planOpen && (
            <div style={{ padding: "1rem", background: CREAM, borderRadius: 10, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a18", marginBottom: 10, fontFamily: FONT_SANS }}>{T.addToPlan}</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 8 }}>
                {DAYS.map((d) => (
                  <button key={d} onClick={() => setSelectedDay(d)} style={{ padding: "3px 10px", borderRadius: 999, border: `0.5px solid ${selectedDay === d ? SAGE : BORDER}`, fontSize: 11, color: selectedDay === d ? SAGE : "#888", background: selectedDay === d ? SAGE_LIGHT : "#fff", cursor: "pointer", fontFamily: FONT_SANS }}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {MEALS.map((m) => (
                  <button key={m} onClick={() => setSelectedMeal(m)} style={{ flex: 1, height: 32, borderRadius: 8, border: `0.5px solid ${selectedMeal === m ? SAGE : BORDER}`, fontSize: 11, color: selectedMeal === m ? SAGE : "#888", background: selectedMeal === m ? SAGE_LIGHT : "#fff", cursor: "pointer", fontFamily: FONT_SANS }}>
                    {mealLabels[m]}
                  </button>
                ))}
              </div>
              <button onClick={savePlan} style={{ width: "100%", height: 36, borderRadius: 8, border: "none", background: planSaved ? SAGE : "#1a1a18", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>
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
function RecipeCard({ recipe, index, onOpen }: { recipe: Recipe; index: number; onOpen: (r: Recipe) => void }) {
  const diffColors: Record<string, string> = { "Facile": SAGE, "Easy": SAGE, "Moyen": "#BA7517", "Medium": "#BA7517", "Difficile": "#dc2626", "Hard": "#dc2626" };
  return (
    <div onClick={() => onOpen(recipe)} style={{ background: "#fff", borderRadius: 14, border: `0.5px solid ${BORDER}`, overflow: "hidden", display: "flex", cursor: "pointer", height: 96 }}>
      <img src={recipe.image || getUnsplashUrl(recipe.titre)} alt={recipe.titre} style={{ width: 96, height: 96, objectFit: "cover", flexShrink: 0, display: "block", background: "#F0EDE5" }} onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x500/?food,cooking`; }} />
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: "#bbb", letterSpacing: "0.5px", fontFamily: FONT_SANS, marginBottom: 3 }}>0{index + 1}</div>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 13, color: "#1a1a18", lineHeight: 1.35, fontWeight: 400 }}>{recipe.titre}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#bbb", fontFamily: FONT_SANS }}>⏱ {recipe.temps}</span>
          <span style={{ fontSize: 10, color: "#bbb", fontFamily: FONT_SANS }}>🔥 {recipe.calories}</span>
          <span style={{ fontSize: 10, color: diffColors[recipe.difficulte] || "#888", fontWeight: 500, fontFamily: FONT_SANS }}>{recipe.difficulte}</span>
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
    setMealLoading(true);
    setMealRecipe(null);
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
    setSelectedSlot(null);
    setMealRecipe(null);
  };

  const filledCount = DAYS_FR.reduce((acc, day) => acc + MEALS.filter((m) => plan[day]?.[m] !== null).length, 0);

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 12, border: `0.5px solid ${BORDER}`, padding: "1rem", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: filledCount > 0 ? 10 : 0 }}>
          <div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: "#1a1a18", fontWeight: 400, marginBottom: 2 }}>{T.weekPlanning}</div>
            <div style={{ fontSize: 12, color: "#bbb", fontFamily: FONT_SANS }}>{filledCount === 0 ? T.noMeals : T.mealsCount(filledCount)}</div>
          </div>
          {filledCount > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              {premium && (
                <button onClick={() => setShowShopping(!showShopping)} style={{ padding: "5px 12px", borderRadius: 8, border: `0.5px solid ${SAGE_MID}`, background: SAGE_LIGHT, color: SAGE, fontSize: 11, cursor: "pointer", fontFamily: FONT_SANS, fontWeight: 500 }}>
                  🛒 {showShopping ? T.hide : T.courses}
                </button>
              )}
              <button onClick={clearPlan} style={{ padding: "5px 12px", borderRadius: 8, border: "0.5px solid #fee2e2", background: "#fff8f6", color: "#dc2626", fontSize: 11, cursor: "pointer", fontFamily: FONT_SANS }}>{T.clear}</button>
            </div>
          )}
        </div>
        {filledCount > 0 && (
          <div style={{ height: 3, background: BORDER, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(filledCount / 21) * 100}%`, background: SAGE, borderRadius: 999 }} />
          </div>
        )}
      </div>

      {showShopping && premium && (
        <div style={{ background: "#fff", borderRadius: 12, border: `0.5px solid ${BORDER}`, padding: "1rem", marginBottom: 12 }}>
          <ShoppingList plan={plan} lang={lang} />
        </div>
      )}

      {!premium && filledCount > 0 && (
        <div style={{ padding: "0.875rem 1rem", background: SAGE_LIGHT, borderRadius: 10, fontSize: 12, color: "#27500A", textAlign: "center", marginBottom: 12, fontFamily: FONT_SANS }}>{T.shoppingPremium}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DAYS_FR.map((dayFr, di) => {
          const dayLabel = lang === "en" ? DAYS_EN[di] : dayFr;
          return (
            <div key={dayFr} style={{ background: "#fff", borderRadius: 12, border: `0.5px solid ${BORDER}`, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: `0.5px solid ${BORDER}`, fontSize: 12, fontWeight: 500, color: "#1a1a18", fontFamily: FONT_SANS }}>{dayLabel}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                {MEALS.map((meal, i) => {
                  const slot = plan[dayFr]?.[meal];
                  return (
                    <div key={meal} style={{ padding: "0.75rem 0.875rem", borderRight: i < 2 ? `0.5px solid ${BORDER}` : "none", minHeight: 72 }}>
                      <div style={{ fontSize: 9, fontWeight: 500, color: "#bbb", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 5, fontFamily: FONT_SANS }}>{mealLabels[meal]}</div>
                      {slot ? (
                        <div>
                          <div onClick={() => setOpenRecipe(slot.recipe)} style={{ fontFamily: FONT_SERIF, fontSize: 12, color: "#1a1a18", fontWeight: 400, lineHeight: 1.3, cursor: "pointer", marginBottom: 4 }}>{slot.recipe.titre}</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 10, color: "#bbb", fontFamily: FONT_SANS }}>⏱ {slot.recipe.temps}</span>
                            <button onClick={() => removeSlot(dayFr, meal)} style={{ fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => { setSelectedSlot({ day: dayFr, meal }); setMealRecipe(null); }} style={{ fontSize: 11, color: SAGE, cursor: "pointer", fontWeight: 500, fontFamily: FONT_SANS }}>{T.suggest}</div>
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
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => { setSelectedSlot(null); setMealRecipe(null); }}>
          <div style={{ background: CREAM, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#fff", padding: "1rem 1.25rem", borderBottom: `0.5px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky" as const, top: 0 }}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: "#1a1a18", fontWeight: 400 }}>{mealRecipe ? mealRecipe.titre : T.suggestionIA}</div>
              <button onClick={() => { setSelectedSlot(null); setMealRecipe(null); }} style={{ width: 30, height: 30, borderRadius: "50%", border: `0.5px solid ${BORDER}`, background: "#fff", cursor: "pointer", fontSize: 16, color: "#888" }}>×</button>
            </div>
            <div style={{ padding: "1rem 1.25rem" }}>
              {!mealRecipe && !mealLoading && (
                <button onClick={() => generateSuggestion(selectedSlot.day, selectedSlot.meal)} style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: "#1a1a18", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>{T.suggestRecipe}</button>
              )}
              {mealLoading && <div style={{ textAlign: "center", padding: "2rem", color: "#bbb", fontSize: 13, fontFamily: FONT_SANS }}>{T.preparing}</div>}
              {mealRecipe && !mealLoading && (
                <>
                  <div style={{ background: "#fff", borderRadius: 12, border: `0.5px solid ${BORDER}`, padding: "1rem", marginBottom: 10 }}>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: 16, color: "#1a1a18", marginBottom: 6, fontWeight: 400 }}>{mealRecipe.titre}</div>
                    <div style={{ fontSize: 12, color: "#888", fontFamily: FONT_SANS }}>⏱ {mealRecipe.temps} · {mealRecipe.difficulte} · {mealRecipe.calories}</div>
                  </div>
                  {!plan[selectedSlot.day]?.[selectedSlot.meal] && (
                    <button onClick={addToPlan} style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: SAGE, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>{T.addToPlanning}</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {openRecipe && (
        <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} plan={plan} setPlan={setPlan} onFavLimited={() => {}} user={user} lang={lang} />
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
      <div style={{ background: "#fff", borderBottom: `0.5px solid ${BORDER}`, padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: "#1a1a18", fontWeight: 400 }}>Petit<span style={{ color: SAGE, fontStyle: "italic" }}>Chef</span></div>
        <button onClick={onBack} style={{ fontSize: 12, color: SAGE, background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: FONT_SANS }}>{T.discover}</button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem" }}>
        <div style={{ fontSize: 12, color: "#bbb", marginBottom: 12, fontFamily: FONT_SANS }}>{T.sharedRecipe}</div>
        <RecipeModal recipe={recipe} onClose={onBack} plan={_plan} setPlan={_setPlan} onFavLimited={() => {}} user={null} lang={lang} />
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
      u.searches += 1;
      saveUsage(u);
      setUsage({ ...u });
    }
    setLoading(true);
    setError(null);
    setRecipes([]);
    setTab("recettes");
    setSearched(true);
    setLimitType(null);

    const filtersStr = activeFilters.length ? T.aiFilters(activeFilters) : "";
    const prompt = T.aiPrompt(q, filtersStr);

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Error ${res.status}`); }
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      addHistory(q);
      setRecipes(parsed.recettes);
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
      {openRecipe && <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} plan={plan} setPlan={setPlan} onFavLimited={() => setLimitType("favs")} user={user} lang={lang} />}

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: `0.5px solid ${BORDER}`, padding: "12px 1.25rem 10px", position: "sticky" as const, top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showInstall ? 10 : 0 }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 20, color: "#1a1a18", fontWeight: 400 }}>
            Petit<span style={{ color: SAGE, fontStyle: "italic" }}>Chef</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LangToggle lang={lang} setLang={changeLang} />
            {!premium && <span style={{ fontSize: 10, color: "#bbb", fontFamily: FONT_SANS }}>{T.searchesLeft(Number(searchesLeft))}</span>}
            {premium && <span style={{ fontSize: 10, fontWeight: 500, color: SAGE, background: SAGE_LIGHT, padding: "3px 8px", borderRadius: 999, border: `0.5px solid ${SAGE_MID}`, fontFamily: FONT_SANS }}>{T.premium}</span>}
            {!premium && <button onClick={() => setShowPremium(true)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#1a1a18", color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>{T.premium}</button>}
            {user ? (
              <div style={{ position: "relative" as const }}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 30, height: 30, borderRadius: "50%", border: `0.5px solid ${BORDER}`, background: SAGE_LIGHT, color: SAGE, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: FONT_SANS }}>
                  {user.email?.[0].toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div style={{ position: "absolute" as const, right: 0, top: 36, background: "#fff", border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: "6px", minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", zIndex: 100 }}>
                    <div style={{ fontSize: 10, color: "#bbb", padding: "4px 8px", marginBottom: 2, fontFamily: FONT_SANS }}>{user.email}</div>
                    <button onClick={signOut} style={{ width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: "#dc2626", fontSize: 12, cursor: "pointer", textAlign: "left" as const, fontFamily: FONT_SANS }}>{T.logout}</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ padding: "5px 12px", borderRadius: 8, border: `0.5px solid ${BORDER}`, background: "#fff", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: FONT_SANS }}>{T.login}</button>
            )}
          </div>
        </div>

        {showInstall && (
          <button onClick={installApp} style={{ width: "100%", height: 36, borderRadius: 10, border: `0.5px solid ${SAGE_MID}`, background: SAGE_LIGHT, color: SAGE, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT_SANS }}>
            <span>⬇</span> {T.install}
          </button>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: "#fff", padding: "24px 1.25rem 20px", borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 10, color: SAGE, letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_SANS }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: SAGE }} />{T.aiTag}
          </div>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 400, color: "#1a1a18", marginBottom: 6, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
            {T.heroTitle} <em style={{ color: SAGE }}>{T.heroTitleItalic}</em>{T.heroTitleEnd}
          </h1>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 18, lineHeight: 1.6, fontFamily: FONT_SANS }}>{T.heroSub}</p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 12px", borderRadius: 10, border: `0.5px solid ${BORDER}`, background: CREAM }}>
              <span style={{ color: "#bbb", fontSize: 14 }}>🔍</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder={T.searchPlaceholder} style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "#1a1a18", outline: "none", fontFamily: FONT_SANS }} />
            </div>
            <button onClick={() => generate()} disabled={loading} style={{ height: 42, padding: "0 18px", borderRadius: 10, border: "none", background: loading ? "#888" : "#1a1a18", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: FONT_SANS }}>
              {loading ? "…" : T.findBtn}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
            {T.filters.map((f) => (
              <button key={f} onClick={() => toggleFilter(f)} style={{ padding: "4px 12px", borderRadius: 999, border: `0.5px solid ${activeFilters.includes(f) ? SAGE : BORDER}`, fontSize: 11, color: activeFilters.includes(f) ? SAGE : "#888", background: activeFilters.includes(f) ? SAGE_LIGHT : "#fff", cursor: "pointer", fontFamily: FONT_SANS, fontWeight: activeFilters.includes(f) ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#bbb", fontFamily: FONT_SANS }}>{T.suggestions}</span>
            {T.suggestions_list.map((s) => (
              <span key={s} onClick={() => { setQuery(s); generate(s); }} style={{ fontSize: 11, color: "#888", cursor: "pointer", padding: "3px 10px", borderRadius: 999, background: CREAM, border: `0.5px solid ${BORDER}`, fontFamily: FONT_SANS }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 1.25rem" }}>
        <div style={{ display: "flex", borderBottom: `0.5px solid ${BORDER}`, marginBottom: 16 }}>
          {[
            { id: "recettes", label: T.recipes },
            { id: "planning", label: filledCount > 0 ? `${T.planning} (${filledCount})` : T.planning },
            { id: "favoris", label: T.favorites },
            { id: "historique", label: T.history },
          ].map((tab_item) => (
            <button key={tab_item.id} onClick={() => setTab(tab_item.id)} style={{ flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: tab === tab_item.id ? 500 : 400, color: tab === tab_item.id ? "#1a1a18" : "#bbb", background: "none", border: "none", borderBottom: `1.5px solid ${tab === tab_item.id ? "#1a1a18" : "transparent"}`, marginBottom: -1, cursor: "pointer", fontFamily: FONT_SANS }}>
              {tab_item.label}
            </button>
          ))}
        </div>

        {tab === "recettes" && (
          <>
            {limitType && <LimitBanner type={limitType} onUpgrade={() => setShowPremium(true)} lang={lang} />}
            {loading && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: "#888", fontWeight: 400, fontStyle: "italic" }}>{T.cookingMsg}</div>
              </div>
            )}
            {error && <div style={{ background: "#fff8f6", border: "0.5px solid #fbd5c5", borderRadius: 10, padding: "0.875rem 1rem", fontSize: 12, color: "#c2410c", marginBottom: 14, fontFamily: FONT_SANS }}>{error}</div>}
            {!loading && !searched && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 22, color: "#1a1a18", fontWeight: 400, fontStyle: "italic", marginBottom: 8 }}>{T.welcome}</div>
                <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6, marginBottom: 16, fontFamily: FONT_SANS }}>{T.welcomeSub}</div>
                {!premium && (
                  <div style={{ display: "inline-block", padding: "8px 16px", background: SAGE_LIGHT, borderRadius: 10, fontSize: 12, color: "#27500A", fontFamily: FONT_SANS }}>
                    {T.freeSearches(Number(searchesLeft))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recipes.map((r, i) => <RecipeCard key={i} recipe={r} index={i} onOpen={setOpenRecipe} lang={lang} />)}
            </div>
          </>
        )}

        {tab === "planning" && <MealPlanner plan={plan} setPlan={setPlan} premium={premium} user={user} lang={lang} />}

        {tab === "favoris" && (
          <div>
            {favorites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: "#888", fontWeight: 400, fontStyle: "italic", marginBottom: 6 }}>{T.noFavorites}</div>
                <div style={{ fontSize: 12, color: "#bbb", fontFamily: FONT_SANS }}>{T.noFavoritesSub}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {favorites.map((r, i) => <RecipeCard key={i} recipe={r} index={i} onOpen={setOpenRecipe} lang={lang} />)}
              </div>
            )}
          </div>
        )}

        {tab === "historique" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#bbb", fontSize: 13, fontFamily: FONT_SANS }}>{T.noHistory}</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, border: `0.5px solid ${BORDER}`, overflow: "hidden" }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.q); generate(h.q); }} style={{ padding: "0.875rem 1rem", borderBottom: i < history.length - 1 ? `0.5px solid ${BORDER}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontFamily: FONT_SERIF, fontSize: 14, color: "#1a1a18", fontWeight: 400 }}>{h.q}</span>
                    <span style={{ fontSize: 11, color: "#bbb", fontFamily: FONT_SANS }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "2rem 1rem", borderTop: `0.5px solid ${BORDER}`, marginTop: "1rem" }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 13, color: "#bbb" }}>Petit<em style={{ color: SAGE }}>Chef</em> · {T.footer}</span>
      </div>
    </div>
  );
}