import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export const STRIPE_MONTHLY_URL = "https://buy.stripe.com/eVqfZa04h8hzcHR6278Zq01";
export const STRIPE_YEARLY_URL = "https://buy.stripe.com/fZu9AMcR369razJ2PV8Zq02";

const SAGE = "#3B6D11";
const SAGE_LIGHT = "#F0F7EB";
const SAGE_MID = "#C0DD97";
const CREAM = "#FAFAF7";

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
type MealPlan = {
  [day: string]: { matin: MealSlot; midi: MealSlot; soir: MealSlot };
};

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = ["matin", "midi", "soir"] as const;
const MEAL_LABELS: Record<string, string> = { matin: "Matin", midi: "Midi", soir: "Soir" };
const SUGGESTIONS = ["Poulet", "Pâtes", "Protéines", "Poisson", "Végétarien", "Rapide"];
const FILTERS = ["Végétarien", "Sans gluten", "Rapide", "Léger"];

const emptyPlan = (): MealPlan =>
  Object.fromEntries(DAYS.map((d) => [d, { matin: null, midi: null, soir: null }]));

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
  const encoded = encodeURIComponent(query.split(" ").slice(0, 3).join(" "));
  return `https://source.unsplash.com/800x500/?food,${encoded}`;
}

function encodeRecipe(recipe: Recipe): string {
  return btoa(encodeURIComponent(JSON.stringify(recipe)));
}

function decodeRecipe(str: string): Recipe | null {
  try { return JSON.parse(decodeURIComponent(atob(str))); } catch { return null; }
}

// ---- AUTH MODAL ----
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const handleEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Vérifie ton email pour confirmer ton compte !");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onSuccess(data.user);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 380, padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "0.5px solid var(--color-border-tertiary)", background: "#fafafa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--color-text-secondary)" }}>×</button>
        </div>

        {message ? (
          <div style={{ padding: "1rem", background: SAGE_LIGHT, borderRadius: 10, fontSize: 13, color: SAGE, textAlign: "center" }}>{message}</div>
        ) : (
          <>
            <button onClick={handleGoogle} style={{ width: "100%", height: 42, borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, color: "var(--color-text-primary)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuer avec Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 0.5, background: "var(--color-border-tertiary)" }} />
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>ou</span>
              <div style={{ flex: 1, height: 0.5, background: "var(--color-border-tertiary)" }} />
            </div>

            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", height: 42, padding: "0 14px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, marginBottom: 8, background: CREAM, outline: "none", boxSizing: "border-box" as const }} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" type="password" style={{ width: "100%", height: 42, padding: "0 14px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, marginBottom: 12, background: CREAM, outline: "none", boxSizing: "border-box" as const }} onKeyDown={(e) => e.key === "Enter" && handleEmail()} />

            {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{error}</div>}

            <button onClick={handleEmail} disabled={loading} style={{ width: "100%", height: 42, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>

            <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>
              {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }} style={{ color: SAGE, cursor: "pointer", fontWeight: 500 }}>
                {mode === "login" ? "S'inscrire" : "Se connecter"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- PREMIUM PAGE ----
function PremiumPage({ onClose }: { onClose: () => void }) {
  const subscribe = (plan: "monthly" | "yearly") => {
    window.location.href = plan === "yearly" ? STRIPE_YEARLY_URL : STRIPE_MONTHLY_URL;
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#1a1a1a", padding: "2rem 1.5rem 1.5rem", position: "relative" as const }}>
          <button onClick={onClose} style={{ position: "absolute" as const, top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <div style={{ fontSize: 11, color: SAGE_MID, letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8, fontWeight: 500 }}>PetitChef Premium</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#fff", marginBottom: 4, letterSpacing: "-0.3px" }}>Cuisine sans limites</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Tout ce dont tu as besoin pour bien manger</div>
        </div>

        <div style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            {[
              { icon: "🔍", title: "Recherches illimitées", desc: "Sans limite quotidienne" },
              { icon: "♥", title: "Favoris illimités", desc: "Sauvegarde toutes tes recettes" },
              { icon: "🛒", title: "Liste de courses", desc: "Générée depuis ton planning" },
              { icon: "📅", title: "Planning complet", desc: "7 jours × 3 repas" },
              { icon: "⎘", title: "Partage de recettes", desc: "Lien unique par recette" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: SAGE_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.25rem" }}>
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "1.25rem", textAlign: "center" as const }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8 }}>Mensuel</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>4.99€</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 14 }}>par mois</div>
              <button onClick={() => subscribe("monthly")} style={{ width: "100%", height: 38, borderRadius: 8, border: "0.5px solid #1a1a1a", background: "#fff", color: "#1a1a1a", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Choisir</button>
            </div>
            <div style={{ border: "1.5px solid #1a1a1a", borderRadius: 14, padding: "1.25rem", textAlign: "center" as const, position: "relative" as const }}>
              <div style={{ position: "absolute" as const, top: -10, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", fontSize: 10, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" as const }}>Économisez 33%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8 }}>Annuel</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>39.99€</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 14 }}>par an · 3.33€/mois</div>
              <button onClick={() => subscribe("yearly")} style={{ width: "100%", height: 38, borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Choisir</button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" as const }}>
            Paiement sécurisé par Stripe · Annulable à tout moment
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- LIMIT BANNER ----
function LimitBanner({ type, onUpgrade }: { type: "searches" | "favs"; onUpgrade: () => void }) {
  return (
    <div style={{ background: SAGE_LIGHT, border: `0.5px solid ${SAGE_MID}`, borderRadius: 10, padding: "0.875rem 1rem", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 13, color: "#27500A" }}>
        {type === "searches" ? "3 recherches gratuites utilisées aujourd'hui." : "1 favori gratuit utilisé aujourd'hui."} Passe Premium pour continuer.
      </div>
      <button onClick={onUpgrade} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: SAGE, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const }}>Premium →</button>
    </div>
  );
}

// ---- SHOPPING LIST ----
function ShoppingList({ plan }: { plan: MealPlan }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allIngredients: string[] = [];
  DAYS.forEach((day) => MEALS.forEach((meal) => {
    const slot = plan[day]?.[meal];
    if (slot) slot.recipe.ingredients.forEach((ing) => { if (!allIngredients.includes(ing)) allIngredients.push(ing); });
  }));
  const toggle = (ing: string) => setChecked((prev) => ({ ...prev, [ing]: !prev[ing] }));
  const unchecked = allIngredients.filter((i) => !checked[i]);
  const done = allIngredients.filter((i) => checked[i]);

  if (allIngredients.length === 0) return (
    <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: 13 }}>
      Ajoute des recettes au planning pour générer ta liste
    </div>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1rem", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Liste de courses</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{unchecked.length} restant · {done.length} fait</div>
        </div>
        <div style={{ height: 4, width: 80, background: "var(--color-border-tertiary)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${allIngredients.length ? (done.length / allIngredients.length) * 100 : 0}%`, background: SAGE, borderRadius: 999 }} />
        </div>
      </div>
      {unchecked.map((ing, i) => (
        <div key={i} onClick={() => toggle(ing)} style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: "0.5px solid var(--color-border-secondary)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{ing}</span>
        </div>
      ))}
      {done.map((ing, i) => (
        <div key={i} onClick={() => toggle(ing)} style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)", opacity: 0.4 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `0.5px solid ${SAGE}`, background: SAGE, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 10 }}>✓</span>
          </div>
          <span style={{ fontSize: 13, color: "var(--color-text-primary)", textDecoration: "line-through" }}>{ing}</span>
        </div>
      ))}
    </div>
  );
}

// ---- RECIPE DETAIL MODAL ----
function RecipeModal({ recipe, onClose, plan, setPlan, onFavLimited, user }: {
  recipe: Recipe; onClose: () => void;
  plan: MealPlan; setPlan: (p: MealPlan) => void;
  onFavLimited: () => void; user: User | null;
}) {
  const basePersonnes = recipe.personnes || 2;
  const [personnes, setPersonnes] = useState(basePersonnes);
  const [fav, setFav] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState("");
  const [intervalId, setIntervalId] = useState<any>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Lundi");
  const [selectedMeal, setSelectedMeal] = useState<"matin" | "midi" | "soir">("midi");
  const [planSaved, setPlanSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const scaledIngredients = recipe.ingredients.map((ing) => scaleIngredient(ing, basePersonnes, personnes));

  const toggleFav = async () => {
    if (!isPremiumLocal()) {
      const usage = getUsage();
      if (usage.favs >= 1) { onFavLimited(); return; }
      usage.favs += 1;
      saveUsage(usage);
    }
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    if (fav) {
      const idx = favs.findIndex((f) => f.titre === recipe.titre);
      if (idx > -1) favs.splice(idx, 1);
    } else {
      favs.unshift({ ...recipe, personnes });
      if (user) {
        const { data } = await supabase.from("favorites").select("id").eq("user_id", user.id).limit(1);
        if (!data?.length) await supabase.from("favorites").insert({ user_id: user.id, recipe: { ...recipe, personnes } });
      }
    }
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
      if (left <= 0) { clearInterval(iv); setTimerActive(false); setTimerDisplay("Terminé !"); }
    }, 500);
    setIntervalId(iv);
    setTimerDisplay(`${parseInt(recipe.temps) || 20}:00`);
  };

  const savePlan = () => {
    const newPlan = { ...plan };
    newPlan[selectedDay] = { ...newPlan[selectedDay], [selectedMeal]: { recipe } };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
    setPlanSaved(true);
    setTimeout(() => { setPlanSaved(false); setPlanOpen(false); }, 1200);
  };

  const share = () => {
    const encoded = encodeRecipe(recipe);
    const url = `${window.location.origin}?recette=${encoded}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const diffColors: Record<string, string> = { "Facile": SAGE, "Moyen": "#BA7517", "Difficile": "#dc2626" };

  useEffect(() => {
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    setFav(favs.some((f) => f.titre === recipe.titre));
  }, []);

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>

        {/* Image */}
        <div style={{ position: "relative" as const }}>
          <img src={recipe.image || getUnsplashUrl(recipe.titre)} alt={recipe.titre} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x500/?food`; }} />
          <button onClick={onClose} style={{ position: "absolute" as const, top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: 11, color: SAGE, letterSpacing: "0.8px", textTransform: "uppercase" as const, marginBottom: 4, fontWeight: 500 }}>Recette</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 10, letterSpacing: "-0.3px" }}>{recipe.titre}</div>

          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>⏱ {recipe.temps}</span>
            <span style={{ fontSize: 12, color: diffColors[recipe.difficulte] || "var(--color-text-secondary)", fontWeight: 500 }}>● {recipe.difficulte}</span>
            {recipe.calories && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>🔥 {recipe.calories}</span>}
          </div>

          {/* Serving selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "0.75rem 1rem", background: CREAM, borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1 }}>Personnes</span>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "0.5px solid var(--color-border-secondary)", borderRadius: 999, overflow: "hidden" }}>
              <button onClick={() => setPersonnes(Math.max(1, personnes - 1))} style={{ width: 28, height: 28, border: "none", background: "#fff", cursor: "pointer", fontSize: 14, color: "var(--color-text-primary)" }}>−</button>
              <span style={{ minWidth: 24, textAlign: "center", fontSize: 13, fontWeight: 500, color: SAGE }}>{personnes}</span>
              <button onClick={() => setPersonnes(Math.min(12, personnes + 1))} style={{ width: 28, height: 28, border: "none", background: "#fff", cursor: "pointer", fontSize: 14, color: "var(--color-text-primary)" }}>+</button>
            </div>
          </div>

          {/* Content grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Ingrédients</div>
              {scaledIngredients.map((ing, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--color-text-primary)", padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 6 }}>
                  <span style={{ color: SAGE, flexShrink: 0 }}>·</span>{ing}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 8 }}>Préparation</div>
              {recipe.etapes.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: SAGE_LIGHT, color: SAGE, fontSize: 10, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button onClick={toggleFav} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: `0.5px solid ${fav ? SAGE : "var(--color-border-tertiary)"}`, background: fav ? SAGE_LIGHT : "#fff", color: fav ? SAGE : "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              {fav ? "♥ Sauvegardé" : "♡ Favoris"}
            </button>
            <button onClick={share} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "#fff", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>
              {copied ? "✓ Copié" : "⎘ Partager"}
            </button>
            <button onClick={() => setPlanOpen(!planOpen)} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "#fff", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>
              📅 Planifier
            </button>
            <button onClick={startTimer} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: `0.5px solid ${timerActive ? SAGE : "var(--color-border-tertiary)"}`, background: timerActive ? SAGE : "#fff", color: timerActive ? "#fff" : "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>
              {timerActive ? `⏹ ${timerDisplay}` : `▶ ${parseInt(recipe.temps) || 20} min`}
            </button>
          </div>

          {/* Plan selector */}
          {planOpen && (
            <div style={{ marginTop: 12, padding: "1rem", background: CREAM, borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 10 }}>Ajouter au planning</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 8 }}>
                {DAYS.map((d) => (
                  <button key={d} onClick={() => setSelectedDay(d)} style={{ padding: "3px 10px", borderRadius: 999, border: `0.5px solid ${selectedDay === d ? SAGE : "var(--color-border-tertiary)"}`, fontSize: 11, color: selectedDay === d ? SAGE : "var(--color-text-secondary)", background: selectedDay === d ? SAGE_LIGHT : "#fff", cursor: "pointer", fontWeight: selectedDay === d ? 500 : 400 }}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                {MEALS.map((m) => (
                  <button key={m} onClick={() => setSelectedMeal(m)} style={{ flex: 1, height: 32, borderRadius: 8, border: `0.5px solid ${selectedMeal === m ? SAGE : "var(--color-border-tertiary)"}`, fontSize: 11, color: selectedMeal === m ? SAGE : "var(--color-text-secondary)", background: selectedMeal === m ? SAGE_LIGHT : "#fff", cursor: "pointer", fontWeight: selectedMeal === m ? 500 : 400 }}>
                    {MEAL_LABELS[m]}
                  </button>
                ))}
              </div>
              <button onClick={savePlan} style={{ width: "100%", height: 36, borderRadius: 8, border: "none", background: planSaved ? SAGE : "#1a1a1a", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                {planSaved ? "✓ Ajouté !" : "Confirmer"}
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
  const diffColors: Record<string, string> = { "Facile": SAGE, "Moyen": "#BA7517", "Difficile": "#dc2626" };
  const imgUrl = recipe.image || getUnsplashUrl(recipe.titre);

  return (
    <div onClick={() => onOpen(recipe)} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden", cursor: "pointer" }}>
      <img src={imgUrl} alt={recipe.titre} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x500/?food`; }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: "0.5px" }}>0{index + 1}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 8, lineHeight: 1.35 }}>{recipe.titre}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>⏱ {recipe.temps}</span>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>🔥 {recipe.calories}</span>
          <span style={{ fontSize: 11, color: diffColors[recipe.difficulte] || "var(--color-text-secondary)", fontWeight: 500 }}>{recipe.difficulte}</span>
        </div>
      </div>
    </div>
  );
}

// ---- MEAL PLANNER ----
function MealPlanner({ plan, setPlan, premium, user }: { plan: MealPlan; setPlan: (p: MealPlan) => void; premium: boolean; user: User | null }) {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; meal: typeof MEALS[number] } | null>(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealRecipe, setMealRecipe] = useState<Recipe | null>(null);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  const removeSlot = (day: string, meal: typeof MEALS[number]) => {
    const newPlan = { ...plan };
    newPlan[day] = { ...newPlan[day], [meal]: null };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
  };

  const clearPlan = () => { const f = emptyPlan(); setPlan(f); localStorage.setItem("plan", JSON.stringify(f)); };

  const generateSuggestion = async (day: string, meal: string) => {
    setMealLoading(true);
    setMealRecipe(null);
    const prompt = `Tu es un chef cuisinier français. Génère une recette ${meal === "matin" ? "légère pour le matin" : meal === "midi" ? "copieuse pour le déjeuner" : "légère pour le dîner"} pour ${day}. UNIQUEMENT JSON valide sans backticks. Format : {"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}`;
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

  const filledCount = DAYS.reduce((acc, day) => acc + MEALS.filter((m) => plan[day]?.[m] !== null).length, 0);

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "1rem", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: filledCount > 0 ? 10 : 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>Planning de la semaine</div>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{filledCount === 0 ? "Ajoute des recettes depuis la recherche" : `${filledCount} / 21 repas planifiés`}</div>
          </div>
          {filledCount > 0 && <button onClick={clearPlan} style={{ padding: "5px 12px", borderRadius: 8, border: "0.5px solid #fee2e2", background: "#fff8f6", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>Vider</button>}
        </div>
        {filledCount > 0 && (
          <div style={{ height: 3, background: "var(--color-border-tertiary)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(filledCount / 21) * 100}%`, background: SAGE, borderRadius: 999 }} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DAYS.map((day) => (
          <div key={day} style={{ background: "#fff", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{day}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {MEALS.map((meal, i) => {
                const slot = plan[day]?.[meal];
                return (
                  <div key={meal} style={{ padding: "0.75rem 0.875rem", borderRight: i < 2 ? "0.5px solid var(--color-border-tertiary)" : "none", minHeight: 72 }}>
                    <div style={{ fontSize: 9, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 5 }}>{MEAL_LABELS[meal]}</div>
                    {slot ? (
                      <div>
                        <div onClick={() => setOpenRecipe(slot.recipe)} style={{ fontSize: 12, color: "var(--color-text-primary)", fontWeight: 500, lineHeight: 1.3, cursor: "pointer", marginBottom: 4 }}>{slot.recipe.titre}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>⏱ {slot.recipe.temps}</span>
                          <button onClick={() => removeSlot(day, meal)} style={{ fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => { setSelectedSlot({ day, meal }); setMealRecipe(null); }} style={{ fontSize: 11, color: SAGE, cursor: "pointer", fontWeight: 500 }}>+ Suggérer</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {premium && filledCount > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.8px", marginBottom: 10 }}>Liste de courses</div>
          <ShoppingList plan={plan} />
        </div>
      )}

      {!premium && (
        <div style={{ marginTop: 12, padding: "0.875rem 1rem", background: SAGE_LIGHT, borderRadius: 10, fontSize: 12, color: "#27500A", textAlign: "center" }}>
          🛒 La liste de courses est disponible en Premium
        </div>
      )}

      {/* Suggestion modal */}
      {selectedSlot && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => { setSelectedSlot(null); setMealRecipe(null); }}>
          <div style={{ background: "#f9f7f4", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#fff", padding: "1rem 1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky" as const, top: 0, zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 11, color: SAGE, textTransform: "uppercase" as const, letterSpacing: "0.8px", fontWeight: 500, marginBottom: 2 }}>{selectedSlot.day} — {MEAL_LABELS[selectedSlot.meal]}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>{mealRecipe ? mealRecipe.titre : "Suggestion IA"}</div>
              </div>
              <button onClick={() => { setSelectedSlot(null); setMealRecipe(null); }} style={{ width: 30, height: 30, borderRadius: "50%", border: "0.5px solid var(--color-border-tertiary)", background: "#fff", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)" }}>×</button>
            </div>
            <div style={{ padding: "1rem 1.25rem" }}>
              {!mealRecipe && !mealLoading && (
                <button onClick={() => generateSuggestion(selectedSlot.day, selectedSlot.meal)} style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                  Suggérer une recette →
                </button>
              )}
              {mealLoading && <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)", fontSize: 13 }}>🍳 Préparation…</div>}
              {mealRecipe && !mealLoading && (
                <>
                  <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", padding: "1rem", marginBottom: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>{mealRecipe.titre}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>⏱ {mealRecipe.temps} · {mealRecipe.difficulte} · {mealRecipe.calories}</div>
                  </div>
                  {!plan[selectedSlot.day]?.[selectedSlot.meal] && (
                    <button onClick={addToPlan} style={{ width: "100%", height: 44, borderRadius: 10, border: "none", background: SAGE, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                      ✓ Ajouter au planning
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {openRecipe && (
        <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} plan={plan} setPlan={setPlan} onFavLimited={() => {}} user={user} />
      )}
    </div>
  );
}

// ---- SHARED RECIPE VIEW ----
function SharedRecipeView({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const emptyPlanRef = useRef(emptyPlan());
  const [_plan, _setPlan] = useState(emptyPlanRef.current);
  return (
    <div style={{ minHeight: "100vh", background: CREAM }}>
      <div style={{ background: "#fff", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>Petit<span style={{ color: SAGE }}>Chef</span></div>
        <button onClick={onBack} style={{ fontSize: 12, color: SAGE, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>← Découvrir</button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem" }}>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 12 }}>Une recette partagée via PetitChef</div>
        <RecipeModal recipe={recipe} onClose={onBack} plan={_plan} setPlan={_setPlan} onFavLimited={() => {}} user={null} />
      </div>
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
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
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session?.user) setUser(data.session.user); });
    supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); });

    const params = new URLSearchParams(window.location.search);
    const recette = params.get("recette");
    if (recette) { const d = decodeRecipe(recette); if (d) setSharedRecipe(d); }
    const success = params.get("success");
    if (success) { localStorage.setItem("premium", JSON.stringify({ active: true })); setPremium(true); window.history.replaceState({}, "", "/"); }

    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); });
  }, []);

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("favs") || "[]"));
    setHistory(JSON.parse(localStorage.getItem("hist") || "[]"));
  }, [tab]);

  const toggleFilter = (f: string) => setActiveFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const addHistory = (q: string) => {
    const h = JSON.parse(localStorage.getItem("hist") || "[]").filter((x: any) => x.q !== q);
    h.unshift({ q, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) });
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

    const filters = activeFilters.length ? ` Contraintes : ${activeFilters.join(", ")}.` : "";
    const prompt = `Tu es un chef cuisinier français. L'utilisateur veut cuisiner avec : "${q}".${filters} Génère exactement 3 recettes pour 2 personnes. UNIQUEMENT JSON valide sans texte avant/après ni backticks. Format : {"recettes":[{"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["200g de poulet","1 citron"],"etapes":["Étape 1","Étape 2","Étape 3"]},{"titre":"...","temps":"...","difficulte":"Moyen","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]},{"titre":"...","temps":"...","difficulte":"Difficile","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}]}`;

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Erreur ${res.status}`); }
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

  if (sharedRecipe) return <SharedRecipeView recipe={sharedRecipe} onBack={() => { setSharedRecipe(null); window.history.replaceState({}, "", "/"); }} />;

  const filledCount = DAYS.reduce((acc, day) => acc + MEALS.filter((m) => plan[day]?.[m] !== null).length, 0);
  const searchesLeft = isPremiumLocal() ? "∞" : Math.max(0, 3 - usage.searches);

  return (
    <div style={{ minHeight: "100vh", background: CREAM, fontFamily: "var(--font-sans)" }}>
      {showPremium && <PremiumPage onClose={() => setShowPremium(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={(u) => { setUser(u); setShowAuth(false); }} />}
      {openRecipe && <RecipeModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} plan={plan} setPlan={setPlan} onFavLimited={() => setLimitType("favs")} user={user} />}

      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky" as const, top: 0, zIndex: 50 }}>
        <div style={{ fontSize: 17, fontWeight: 500, color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
          Petit<span style={{ color: SAGE }}>Chef</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!premium && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{searchesLeft} restante{Number(searchesLeft) !== 1 ? "s" : ""}</span>}
          {premium && <span style={{ fontSize: 11, fontWeight: 500, color: SAGE, background: SAGE_LIGHT, padding: "3px 8px", borderRadius: 999, border: `0.5px solid ${SAGE_MID}` }}>Premium</span>}
          {!premium && (
            <button onClick={() => setShowPremium(true)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Premium</button>
          )}
          {user ? (
            <div style={{ position: "relative" as const }}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ width: 32, height: 32, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: SAGE_LIGHT, color: SAGE, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                {user.email?.[0].toUpperCase()}
              </button>
              {userMenuOpen && (
                <div style={{ position: "absolute" as const, right: 0, top: 38, background: "#fff", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "6px", minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", zIndex: 100 }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", padding: "4px 8px", marginBottom: 2 }}>{user.email}</div>
                  <button onClick={signOut} style={{ width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: "#dc2626", fontSize: 12, cursor: "pointer", textAlign: "left" as const }}>Se déconnecter</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{ padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "#fff", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>Connexion</button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "#fff", padding: "24px 1.25rem 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 10, color: SAGE, letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: 10, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: SAGE }} />
            IA culinaire
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            Qu'est-ce qu'on cuisine aujourd'hui ?
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 18, lineHeight: 1.6 }}>
            Entre un ingrédient ou un type — PetitChef génère 3 recettes personnalisées.
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 12px", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)", background: CREAM }}>
              <span style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>🔍</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder="poulet, riz, citron…" style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
            </div>
            <button onClick={() => generate()} disabled={loading} style={{ height: 42, padding: "0 18px", borderRadius: 10, border: "none", background: loading ? "#888" : "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              {loading ? "…" : "Trouver"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 10 }}>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => toggleFilter(f)} style={{ padding: "4px 12px", borderRadius: 999, border: `0.5px solid ${activeFilters.includes(f) ? SAGE : "var(--color-border-tertiary)"}`, fontSize: 11, color: activeFilters.includes(f) ? SAGE : "var(--color-text-secondary)", background: activeFilters.includes(f) ? SAGE_LIGHT : "#fff", cursor: "pointer", fontWeight: activeFilters.includes(f) ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Suggestions :</span>
            {SUGGESTIONS.map((s) => (
              <span key={s} onClick={() => { setQuery(s); generate(s); }} style={{ fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer", padding: "3px 10px", borderRadius: 999, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Install banner */}
      {showInstall && (
        <div style={{ margin: "12px 1.25rem 0", padding: "10px 14px", borderRadius: 10, border: `0.5px solid ${SAGE_MID}`, background: SAGE_LIGHT, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#27500A", lineHeight: 1.4 }}>Installe PetitChef sur ton écran d'accueil</div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={installApp} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: SAGE, color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>Installer</button>
            <button onClick={() => setShowInstall(false)} style={{ padding: "5px 8px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "#fff", color: "var(--color-text-tertiary)", fontSize: 11, cursor: "pointer" }}>×</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 1.25rem" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16 }}>
          {[
            { id: "recettes", label: "Recettes" },
            { id: "planning", label: filledCount > 0 ? `Planning (${filledCount})` : "Planning" },
            { id: "favoris", label: "Favoris" },
            { id: "historique", label: "Historique" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-tertiary)", background: "none", border: "none", borderBottom: `1.5px solid ${tab === t.id ? "#1a1a1a" : "transparent"}`, marginBottom: -1, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Recettes */}
        {tab === "recettes" && (
          <>
            {limitType && <LimitBanner type={limitType} onUpgrade={() => setShowPremium(true)} />}
            {loading && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🍳</div>
                <div style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500 }}>Préparation des recettes…</div>
              </div>
            )}
            {error && (
              <div style={{ background: "#fff8f6", border: "0.5px solid #fbd5c5", borderRadius: 10, padding: "0.875rem 1rem", fontSize: 12, color: "#c2410c", marginBottom: 14 }}>
                {error}
              </div>
            )}
            {!loading && !searched && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>👨‍🍳</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>Bienvenue sur PetitChef</div>
                <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", lineHeight: 1.6, marginBottom: 16 }}>Entre un ingrédient ci-dessus pour commencer</div>
                {!premium && (
                  <div style={{ display: "inline-block", padding: "8px 16px", background: SAGE_LIGHT, borderRadius: 10, fontSize: 12, color: "#27500A" }}>
                    {searchesLeft} recherche{Number(searchesLeft) !== 1 ? "s" : ""} gratuite{Number(searchesLeft) !== 1 ? "s" : ""} aujourd'hui
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {recipes.map((r, i) => <RecipeCard key={i} recipe={r} index={i} onOpen={setOpenRecipe} />)}
            </div>
          </>
        )}

        {tab === "planning" && <MealPlanner plan={plan} setPlan={setPlan} premium={premium} user={user} />}

        {tab === "favoris" && (
          <div>
            {favorites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>♥</div>
                <div style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500 }}>Aucun favori pour l'instant</div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4 }}>Appuie sur ♡ dans une recette pour sauvegarder</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {favorites.map((r, i) => <RecipeCard key={i} recipe={r} index={i} onOpen={setOpenRecipe} />)}
              </div>
            )}
          </div>
        )}

        {tab === "historique" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-text-tertiary)", fontSize: 13 }}>Aucune recherche récente.</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.q); generate(h.q); }} style={{ padding: "0.875rem 1rem", borderBottom: i < history.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{h.q}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "2rem 1rem", borderTop: "0.5px solid var(--color-border-tertiary)", marginTop: "1rem" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Petit<span style={{ color: SAGE }}>Chef</span> · Cuisine intelligente propulsée par IA</span>
      </div>
    </div>
  );
}