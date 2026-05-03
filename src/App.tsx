import { useState, useEffect } from "react";
 
const STRIPE_PK = "pk_live_51SKOJo2dHVNeNnOnhnFxHcigUeKeCL4yciJR5sfgIbMUnKfHXobVRYFzjbDhulEviCl3Uv9ObfHE8bOMOnCzzNYW00ceJSWubU";
 
type Recipe = {
  titre: string;
  temps: string;
  difficulte: string;
  calories: string;
  ingredients: string[];
  etapes: string[];
  personnes?: number;
};
 
type MealSlot = { recipe: Recipe } | null;
 
type MealPlan = {
  [day: string]: { matin: MealSlot; midi: MealSlot; soir: MealSlot };
};
 
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MEALS = ["matin", "midi", "soir"] as const;
const MEAL_LABELS: Record<string, string> = { matin: "🌅 Matin", midi: "☀️ Midi", soir: "🌙 Soir" };
const SUGGESTIONS = ["Poulet", "Pâtes", "Protéines", "Poisson", "Végétarien", "Rapide"];
const FILTERS = ["Végétarien", "Sans gluten", "Rapide", "Léger"];
 
const emptyPlan = (): MealPlan =>
  Object.fromEntries(DAYS.map((d) => [d, { matin: null, midi: null, soir: null }]));
 
// ---- USAGE LIMITS ----
const TODAY = new Date().toISOString().split("T")[0];
 
function getUsage() {
  try {
    const raw = localStorage.getItem("usage");
    const data = raw ? JSON.parse(raw) : {};
    if (data.date !== TODAY) return { date: TODAY, searches: 0, favs: 0 };
    return data;
  } catch { return { date: TODAY, searches: 0, favs: 0 }; }
}
 
function saveUsage(data: any) {
  localStorage.setItem("usage", JSON.stringify(data));
}
 
function isPremium(): boolean {
  try {
    const data = JSON.parse(localStorage.getItem("premium") || "{}");
    return data.active === true;
  } catch { return false; }
}
 
function setPremiumActive(email: string) {
  localStorage.setItem("premium", JSON.stringify({ active: true, email }));
}
 
// ---- HELPERS ----
function scaleIngredient(ingredient: string, from: number, to: number): string {
  if (from === to) return ingredient;
  const ratio = to / from;
  return ingredient.replace(/(\d+(?:[.,]\d+)?)/g, (_match, num) => {
    const original = parseFloat(num.replace(",", "."));
    const scaled = original * ratio;
    const rounded = scaled < 10 ? Math.round(scaled * 10) / 10 : Math.round(scaled);
    return `${rounded}`;
  });
}
 
function encodeRecipe(recipe: Recipe): string {
  return btoa(encodeURIComponent(JSON.stringify(recipe)));
}
 
function decodeRecipe(str: string): Recipe | null {
  try { return JSON.parse(decodeURIComponent(atob(str))); } catch { return null; }
}
 
// ---- PREMIUM PAGE ----
function PremiumPage({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);
 
  const subscribe = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert("Erreur lors de la connexion à Stripe. Réessaie.");
    }
    setLoading(null);
  };
 
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
 
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #C97D4E, #e5a07a)", padding: "2rem 1.5rem 1.5rem", position: "relative" as const }}>
          <button onClick={onClose} style={{ position: "absolute" as const, top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.3)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍🍳</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Georgia', serif", marginBottom: 4 }}>PetitChef Premium</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>Cuisine intelligente sans limites</div>
        </div>
 
        <div style={{ padding: "1.5rem" }}>
 
          {/* Features */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 12 }}>Ce que vous obtenez</div>
            {[
              { icon: "🔍", title: "Recherches illimitées", desc: "Cherchez autant de recettes que vous voulez, sans limite quotidienne" },
              { icon: "♥", title: "Favoris illimités", desc: "Sauvegardez toutes vos recettes préférées sans restriction" },
              { icon: "🛒", title: "Liste de courses", desc: "Générez automatiquement votre liste de courses depuis le planning" },
              { icon: "📅", title: "Planning complet", desc: "Planifiez vos 21 repas de la semaine avec vos propres recettes" },
              { icon: "⎘", title: "Partage de recettes", desc: "Partagez vos recettes avec vos proches via un lien unique" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fdf3ec", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
 
          {/* Pricing */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
 
            {/* Monthly */}
            <div style={{ border: "1.5px solid #e5e5e5", borderRadius: 16, padding: "1.25rem", textAlign: "center" as const }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8 }}>Mensuel</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>4.99€</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>par mois</div>
              <button onClick={() => subscribe("monthly")} disabled={loading !== null} style={{ width: "100%", height: 40, borderRadius: 10, border: "1.5px solid #C97D4E", background: "#fff", color: "#C97D4E", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading === "monthly" ? "…" : "Choisir"}
              </button>
            </div>
 
            {/* Yearly */}
            <div style={{ border: "2px solid #C97D4E", borderRadius: 16, padding: "1.25rem", textAlign: "center" as const, position: "relative" as const, background: "#fdf9f6" }}>
              <div style={{ position: "absolute" as const, top: -10, left: "50%", transform: "translateX(-50%)", background: "#C97D4E", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" as const }}>ÉCONOMISEZ 33%</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8 }}>Annuel</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>39.99€</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>par an · 3.33€/mois</div>
              <button onClick={() => subscribe("yearly")} disabled={loading !== null} style={{ width: "100%", height: 40, borderRadius: 10, border: "none", background: "#C97D4E", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading === "yearly" ? "…" : "Choisir"}
              </button>
            </div>
          </div>
 
          <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" as const, lineHeight: 1.6 }}>
            Paiement sécurisé par Stripe · Annulable à tout moment · Aucun engagement
          </div>
        </div>
      </div>
    </div>
  );
}
 
// ---- LIMIT BANNER ----
function LimitBanner({ type, onUpgrade }: { type: "searches" | "favs"; onUpgrade: () => void }) {
  const messages = {
    searches: "Tu as utilisé tes 3 recherches gratuites aujourd'hui.",
    favs: "Tu as utilisé ton favori gratuit aujourd'hui.",
  };
  return (
    <div style={{ background: "#fdf3ec", border: "1.5px solid #F0997B", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#C97D4E", marginBottom: 2 }}>Limite atteinte</div>
        <div style={{ fontSize: 12, color: "#7A4A2A" }}>{messages[type]} Reviens demain ou passe Premium.</div>
      </div>
      <button onClick={onUpgrade} style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: "#C97D4E", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
        Premium →
      </button>
    </div>
  );
}
 
// ---- SHOPPING LIST ----
function ShoppingList({ plan }: { plan: MealPlan }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
 
  const allIngredients: string[] = [];
  DAYS.forEach((day) => {
    MEALS.forEach((meal) => {
      const slot = plan[day]?.[meal];
      if (slot) slot.recipe.ingredients.forEach((ing) => {
        if (!allIngredients.includes(ing)) allIngredients.push(ing);
      });
    });
  });
 
  const toggle = (ing: string) => setChecked((prev) => ({ ...prev, [ing]: !prev[ing] }));
  const unchecked = allIngredients.filter((i) => !checked[i]);
  const done = allIngredients.filter((i) => checked[i]);
 
  if (allIngredients.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
        <div style={{ fontSize: 15, color: "#374151", fontWeight: 600, marginBottom: 4 }}>Aucun ingrédient pour l'instant</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Ajoute des recettes dans ton planning pour générer ta liste de courses</div>
      </div>
    );
  }
 
  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f0ee", overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f0ee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Liste de courses</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{unchecked.length} restant · {done.length} fait</div>
          </div>
          {done.length > 0 && (
            <button onClick={() => setChecked({})} style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>Tout décocher</button>
          )}
        </div>
 
        {/* Progress */}
        <div style={{ padding: "0 1.25rem", marginTop: 12 }}>
          <div style={{ height: 4, background: "#f1f0ee", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(done.length / allIngredients.length) * 100}%`, background: "#C97D4E", borderRadius: 999, transition: "width 0.3s" }} />
          </div>
        </div>
 
        {/* Items */}
        <div style={{ padding: "0.75rem 0" }}>
          {unchecked.map((ing, i) => (
            <div key={i} onClick={() => toggle(ing)} style={{ padding: "0.7rem 1.25rem", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: i < unchecked.length - 1 ? "1px solid #f8f6f3" : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf9f6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid #e5e5e5", flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "#374151" }}>{ing}</span>
            </div>
          ))}
          {done.map((ing, i) => (
            <div key={i} onClick={() => toggle(ing)} style={{ padding: "0.7rem 1.25rem", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", opacity: 0.5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid #C97D4E", background: "#C97D4E", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 12 }}>✓</span>
              </div>
              <span style={{ fontSize: 14, color: "#374151", textDecoration: "line-through" }}>{ing}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
 
// ---- PLAN BUTTON ----
function PlanButton({ recipe, plan, setPlan }: { recipe: Recipe; plan: MealPlan; setPlan: (p: MealPlan) => void }) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Lundi");
  const [selectedMeal, setSelectedMeal] = useState<"matin" | "midi" | "soir">("midi");
  const [saved, setSaved] = useState(false);
 
  const save = (e: any) => {
    e.stopPropagation();
    const newPlan = { ...plan };
    newPlan[selectedDay] = { ...newPlan[selectedDay], [selectedMeal]: { recipe } };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  };
 
  return (
    <div style={{ position: "relative" as const }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); setSaved(false); }} style={{ padding: "7px 16px", borderRadius: 999, border: `1.5px solid ${saved ? "#16a34a" : "#e5e5e5"}`, background: saved ? "#f0fdf4" : "#fff", color: saved ? "#16a34a" : "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
        {saved ? "✓ Ajouté !" : "📅 Planifier"}
      </button>
      {open && !saved && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute" as const, bottom: "calc(100% + 8px)", left: 0, background: "#fff", border: "1px solid #f1f0ee", borderRadius: 14, padding: "1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 240 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#C97D4E", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>Ajouter au planning</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Jour</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 10 }}>
            {DAYS.map((d) => (
              <button key={d} onClick={() => setSelectedDay(d)} style={{ padding: "4px 10px", borderRadius: 999, border: `1.5px solid ${selectedDay === d ? "#C97D4E" : "#e5e5e5"}`, fontSize: 11, fontWeight: selectedDay === d ? 600 : 400, color: selectedDay === d ? "#C97D4E" : "#6b7280", cursor: "pointer", background: selectedDay === d ? "#fdf3ec" : "#fff" }}>
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Repas</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {MEALS.map((m) => (
              <button key={m} onClick={() => setSelectedMeal(m)} style={{ flex: 1, padding: "6px 4px", borderRadius: 10, border: `1.5px solid ${selectedMeal === m ? "#C97D4E" : "#e5e5e5"}`, fontSize: 11, fontWeight: selectedMeal === m ? 600 : 400, color: selectedMeal === m ? "#C97D4E" : "#6b7280", cursor: "pointer", background: selectedMeal === m ? "#fdf3ec" : "#fff" }}>
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
          <button onClick={save} style={{ width: "100%", height: 36, borderRadius: 10, border: "none", background: "#C97D4E", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Confirmer</button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ width: "100%", height: 30, borderRadius: 10, border: "none", background: "transparent", color: "#9ca3af", fontSize: 12, cursor: "pointer", marginTop: 4 }}>Annuler</button>
        </div>
      )}
    </div>
  );
}
 
// ---- SHARE BUTTON ----
function ShareButton({ recipe }: { recipe: Recipe }) {
  const [copied, setCopied] = useState(false);
  const share = (e: any) => {
    e.stopPropagation();
    const encoded = encodeRecipe(recipe);
    const url = `${window.location.origin}${window.location.pathname}?recette=${encoded}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={share} style={{ padding: "7px 16px", borderRadius: 999, border: `1.5px solid ${copied ? "#16a34a" : "#e5e5e5"}`, background: copied ? "#f0fdf4" : "#fff", color: copied ? "#16a34a" : "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
      {copied ? "✓ Lien copié !" : "⎘ Partager"}
    </button>
  );
}
 
// ---- SERVING SELECTOR ----
function ServingSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Personnes</span>
      <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e5e5e5", borderRadius: 999, overflow: "hidden", background: "#fafaf9" }}>
        <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(1, value - 1)); }} style={{ width: 30, height: 30, border: "none", background: "transparent", color: value === 1 ? "#ccc" : "#374151", fontSize: 16, cursor: value === 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <span style={{ minWidth: 28, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#C97D4E" }}>{value}</span>
        <button onClick={(e) => { e.stopPropagation(); onChange(Math.min(12, value + 1)); }} style={{ width: 30, height: 30, border: "none", background: "transparent", color: value === 12 ? "#ccc" : "#374151", fontSize: 16, cursor: value === 12 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
    </div>
  );
}
 
// ---- RECIPE CARD ----
function RecipeCard({ recipe, index, highlight = false, plan, setPlan, onFavLimited }: {
  recipe: Recipe; index: number; highlight?: boolean;
  plan?: MealPlan; setPlan?: (p: MealPlan) => void;
  onFavLimited?: () => void;
}) {
  const basePersonnes = recipe.personnes || 2;
  const [personnes, setPersonnes] = useState(basePersonnes);
  const [fav, setFav] = useState(() => {
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    return favs.some((f) => f.titre === recipe.titre);
  });
  const [open, setOpen] = useState(index === 0 || highlight);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState("");
  const [intervalId, setIntervalId] = useState<any>(null);
 
  const scaledIngredients = recipe.ingredients.map((ing) => scaleIngredient(ing, basePersonnes, personnes));
 
  const toggleFav = (e: any) => {
    e.stopPropagation();
    if (fav) {
      const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
      const idx = favs.findIndex((f) => f.titre === recipe.titre);
      if (idx > -1) favs.splice(idx, 1);
      localStorage.setItem("favs", JSON.stringify(favs));
      setFav(false);
      return;
    }
    if (!isPremium()) {
      const usage = getUsage();
      if (usage.favs >= 1) { onFavLimited?.(); return; }
      usage.favs += 1;
      saveUsage(usage);
    }
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    favs.unshift({ ...recipe, personnes });
    localStorage.setItem("favs", JSON.stringify(favs));
    setFav(true);
  };
 
  const startTimer = (e: any) => {
    e.stopPropagation();
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
 
  const diffColors: Record<string, string> = { "Facile": "#16a34a", "Moyen": "#d97706", "Difficile": "#dc2626" };
 
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: highlight ? "2px solid #C97D4E" : "1px solid #f1f0ee", overflow: "hidden", boxShadow: open ? "0 8px 40px rgba(0,0,0,0.07)" : "0 1px 4px rgba(0,0,0,0.03)" }}>
      {highlight && <div style={{ background: "#C97D4E", padding: "6px 1.5rem", fontSize: 12, color: "#fff", fontWeight: 600 }}>🔗 Recette partagée avec vous</div>}
      <div onClick={() => setOpen(!open)} style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 6 }}>{highlight ? "Via PetitChef" : `Recette ${index + 1}`}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.3, fontFamily: "'Georgia', serif" }}>{recipe.titre}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>⏱ {recipe.temps}</span>
            <span style={{ fontSize: 12, color: diffColors[recipe.difficulte] || "#64748b", fontWeight: 500 }}>● {recipe.difficulte}</span>
            {recipe.calories && <span style={{ fontSize: 12, color: "#64748b" }}>🔥 {recipe.calories}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={toggleFav} style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${fav ? "#C97D4E" : "#e5e5e5"}`, background: fav ? "#fdf3ec" : "#fafafa", color: fav ? "#C97D4E" : "#ccc", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>♥</button>
          <span style={{ fontSize: 18, color: "#ccc", display: "block", transform: open ? "rotate(180deg)" : "none" }}>⌄</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #f8f6f3" }}>
          <div style={{ padding: "0.9rem 1.5rem", background: "#fdf9f6", borderBottom: "1px solid #f1f0ee", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8 }}>
            <ServingSelector value={personnes} onChange={setPersonnes} />
            {personnes !== basePersonnes && <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>Ajusté pour {personnes} pers.</span>}
          </div>
          <div style={{ padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 10 }}>Ingrédients</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {scaledIngredients.map((ing, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#374151", padding: "5px 0", display: "flex", alignItems: "flex-start", gap: 8, borderBottom: "1px solid #f8f6f3" }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#C97D4E", flexShrink: 0, marginTop: 7 }} />
                    <span style={{ color: personnes !== basePersonnes ? "#C97D4E" : "#374151" }}>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 10 }}>Préparation</div>
              {recipe.etapes.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fdf3ec", color: "#C97D4E", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "0.9rem 1.5rem", background: "#fafaf9", borderTop: "1px solid #f1f0ee", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <ShareButton recipe={recipe} />
              {plan && setPlan && <PlanButton recipe={recipe} plan={plan} setPlan={setPlan} />}
            </div>
            <button onClick={startTimer} style={{ padding: "7px 20px", borderRadius: 999, border: `1.5px solid ${timerActive ? "#C97D4E" : "#e5e5e5"}`, background: timerActive ? "#C97D4E" : "#fff", color: timerActive ? "#fff" : "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              {timerActive ? `⏹ ${timerDisplay}` : `▶ Minuteur ${parseInt(recipe.temps) || 20} min`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
 
// ---- SHARED RECIPE VIEW ----
function SharedRecipeView({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f9f7f4", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f0ee", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🍳</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Georgia', serif" }}>Petit<span style={{ color: "#C97D4E" }}>Chef</span></span>
        </div>
        <button onClick={onBack} style={{ fontSize: 13, color: "#C97D4E", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>← Découvrir des recettes</button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: "1rem" }}>Une recette vous a été partagée via PetitChef</div>
        <RecipeCard recipe={recipe} index={0} highlight={true} />
      </div>
    </div>
  );
}
 
// ---- MEAL PLANNER ----
function MealPlanner({ plan, setPlan, premium }: { plan: MealPlan; setPlan: (p: MealPlan) => void; premium: boolean }) {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; meal: typeof MEALS[number] } | null>(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealRecipe, setMealRecipe] = useState<Recipe | null>(null);
 
  const removeSlot = (day: string, meal: typeof MEALS[number]) => {
    const newPlan = { ...plan };
    newPlan[day] = { ...newPlan[day], [meal]: null };
    setPlan(newPlan);
    localStorage.setItem("plan", JSON.stringify(newPlan));
  };
 
  const clearPlan = () => {
    const fresh = emptyPlan();
    setPlan(fresh);
    localStorage.setItem("plan", JSON.stringify(fresh));
  };
 
  const generateSuggestion = async (day: string, meal: string) => {
    setMealLoading(true);
    setMealRecipe(null);
    const prompt = `Tu es un chef cuisinier français. Génère une recette ${meal === "matin" ? "légère et rapide pour le matin" : meal === "midi" ? "copieuse et équilibrée pour le déjeuner" : "légère pour le dîner"} pour ${day}. Réponds UNIQUEMENT en JSON valide sans texte avant/après ni backticks. Format : {"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["200g de ...","1 ..."],"etapes":["Étape 1","Étape 2","Étape 3"]}`;
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setMealRecipe(parsed);
    } catch (e) { setMealRecipe(null); }
    setMealLoading(false);
  };
 
  const addSuggestionToPlan = () => {
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
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f0ee", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 6 }}>Planning de la semaine</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", fontFamily: "'Georgia', serif", marginBottom: 4 }}>Mes repas</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {filledCount === 0 ? "Ajoute des recettes via 📅 Planifier dans la recherche" : `${filledCount} repas planifié${filledCount > 1 ? "s" : ""} sur 21`}
            </div>
          </div>
          {filledCount > 0 && <button onClick={clearPlan} style={{ padding: "6px 14px", borderRadius: 999, border: "1.5px solid #fee2e2", background: "#fff8f6", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Vider</button>}
        </div>
        {filledCount > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ height: 6, background: "#f1f0ee", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(filledCount / 21) * 100}%`, background: "#C97D4E", borderRadius: 999, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
      </div>
 
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DAYS.map((day) => (
          <div key={day} style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f0ee", overflow: "hidden" }}>
            <div style={{ background: "#fdf9f6", padding: "0.75rem 1.25rem", borderBottom: "1px solid #f1f0ee" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{day}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {MEALS.map((meal, i) => {
                const slot = plan[day]?.[meal];
                return (
                  <div key={meal} style={{ borderRight: i < 2 ? "1px solid #f8f6f3" : "none", padding: "0.9rem 1rem", minHeight: 80 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase" as const, marginBottom: 6 }}>{MEAL_LABELS[meal]}</div>
                    {slot ? (
                      <div>
                        <div onClick={() => { setSelectedSlot({ day, meal }); setMealRecipe(slot.recipe); setMealLoading(false); }} style={{ fontSize: 12, color: "#374151", fontWeight: 500, lineHeight: 1.4, cursor: "pointer", marginBottom: 6 }}>{slot.recipe.titre}</div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#9ca3af" }}>⏱ {slot.recipe.temps}</span>
                          <button onClick={() => removeSlot(day, meal)} style={{ fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => { setSelectedSlot({ day, meal }); setMealRecipe(null); }} style={{ fontSize: 11, color: "#C97D4E", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 14 }}>+</span> Suggérer
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
 
      <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fdf9f6", borderRadius: 12, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
        💡 Ajoute tes recettes via <strong>📅 Planifier</strong> — ou clique <strong>+ Suggérer</strong> pour une suggestion IA
      </div>
 
      {selectedSlot && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => { setSelectedSlot(null); setMealRecipe(null); }}>
          <div style={{ background: "#f9f7f4", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto" as const }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: "#fff", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f0ee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky" as const, top: 0, zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 4 }}>{selectedSlot.day} — {MEAL_LABELS[selectedSlot.meal]}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{mealRecipe ? mealRecipe.titre : "Suggestion IA"}</div>
              </div>
              <button onClick={() => { setSelectedSlot(null); setMealRecipe(null); }} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #e5e5e5", background: "#fafaf9", color: "#374151", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {!mealRecipe && !mealLoading && (
                <button onClick={() => generateSuggestion(selectedSlot.day, selectedSlot.meal)} style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: "#C97D4E", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  Suggérer une recette pour ce créneau →
                </button>
              )}
              {mealLoading && <div style={{ textAlign: "center", padding: "2rem" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🍳</div><div style={{ fontSize: 14, color: "#6b7280" }}>L'IA prépare une suggestion…</div></div>}
              {mealRecipe && !mealLoading && (
                <>
                  <RecipeCard recipe={mealRecipe} index={0} />
                  {!plan[selectedSlot.day]?.[selectedSlot.meal] && (
                    <button onClick={addSuggestionToPlan} style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: "#C97D4E", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
                      ✓ Ajouter cette recette au planning
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
 
      {/* Shopping List — Premium only */}
      {premium && filledCount > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 12 }}>🛒 Liste de courses</div>
          <ShoppingList plan={plan} />
        </div>
      )}
    </div>
  );
}
 
// ---- MAIN APP ----
export default function App() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [tab, setTab] = useState("recettes");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<{ q: string; time: string }[]>([]);
  const [searched, setSearched] = useState(false);
  const [sharedRecipe, setSharedRecipe] = useState<Recipe | null>(null);
  const [plan, setPlan] = useState<MealPlan>(() => {
    try { return JSON.parse(localStorage.getItem("plan") || "null") || emptyPlan(); } catch { return emptyPlan(); }
  });
  const [showPremium, setShowPremium] = useState(false);
  const [premium, setPremium] = useState(isPremium());
  const [limitType, setLimitType] = useState<"searches" | "favs" | null>(null);
  const [usage, setUsage] = useState(getUsage());
 
  // Check for Stripe success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const sessionId = params.get("session_id");
    const canceled = params.get("canceled");
 
    if (success && sessionId) {
      fetch("/api/verify-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      }).then((r) => r.json()).then((data) => {
        if (data.isPremium) {
          setPremiumActive(data.email || "");
          setPremium(true);
          window.history.replaceState({}, "", "/");
        }
      });
    }
    if (canceled) window.history.replaceState({}, "", "/");
  }, []);
 
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recetteParam = params.get("recette");
    if (recetteParam) {
      const decoded = decodeRecipe(recetteParam);
      if (decoded) setSharedRecipe(decoded);
    }
  }, []);
 
  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("favs") || "[]"));
    setHistory(JSON.parse(localStorage.getItem("hist") || "[]"));
  }, [tab]);
 
  const toggleFilter = (f: string) =>
    setActiveFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
 
  const addHistory = (q: string) => {
    const h = JSON.parse(localStorage.getItem("hist") || "[]").filter((x: any) => x.q !== q);
    h.unshift({ q, time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) });
    if (h.length > 20) h.pop();
    localStorage.setItem("hist", JSON.stringify(h));
  };
 
  const generate = async (q = query) => {
    if (!q.trim()) return;
 
    if (!premium) {
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
    const prompt = `Tu es un chef cuisinier français. L'utilisateur veut cuisiner avec : "${q}".${filters} Génère exactement 3 recettes pour 2 personnes. Réponds UNIQUEMENT en JSON valide sans texte avant/après ni backticks. Format : {"recettes":[{"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["200g de poulet","1 citron","2 gousses d'ail"],"etapes":["Étape 1 détaillée","Étape 2 détaillée","Étape 3 détaillée"]},{"titre":"...","temps":"...","difficulte":"Moyen","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]},{"titre":"...","temps":"...","difficulte":"Difficile","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}]}`;
 
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Erreur ${res.status}`); }
      const data = await res.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      addHistory(q);
      setRecipes(parsed.recettes);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };
 
  if (sharedRecipe) {
    return <SharedRecipeView recipe={sharedRecipe} onBack={() => { setSharedRecipe(null); window.history.replaceState({}, "", window.location.pathname); }} />;
  }
 
  const filledCount = DAYS.reduce((acc, day) => acc + MEALS.filter((m) => plan[day]?.[m] !== null).length, 0);
  const searchesLeft = premium ? "∞" : Math.max(0, 3 - usage.searches);
 
  return (
    <div style={{ minHeight: "100vh", background: "#f9f7f4", fontFamily: "system-ui, sans-serif" }}>
 
      {showPremium && <PremiumPage onClose={() => setShowPremium(false)} />}
 
      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f0ee", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🍳</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Georgia', serif", letterSpacing: "-0.5px" }}>Petit<span style={{ color: "#C97D4E" }}>Chef</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!premium && (
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{searchesLeft} recherche{searchesLeft !== "∞" && Number(searchesLeft) !== 1 ? "s" : ""} restante{searchesLeft !== "∞" && Number(searchesLeft) !== 1 ? "s" : ""}</span>
          )}
          {premium ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", background: "#fdf3ec", padding: "4px 10px", borderRadius: 999, border: "1px solid #F0997B" }}>✦ Premium</span>
          ) : (
            <button onClick={() => setShowPremium(true)} style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#C97D4E", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Premium →
            </button>
          )}
        </div>
      </div>
 
      {/* Hero */}
      <div style={{ background: "#fff", padding: "2.5rem 1.5rem 2rem", borderBottom: "1px solid #f1f0ee" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Cuisine intelligente</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1a", marginBottom: 8, fontFamily: "'Georgia', serif", letterSpacing: "-0.5px", lineHeight: 1.2 }}>Qu'est-ce qu'on cuisine aujourd'hui ?</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.6 }}>Entre un ingrédient, plusieurs, ou un type comme "protéines" — PetitChef génère 3 recettes personnalisées.</p>
 
          <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
            <div style={{ flex: 1, position: "relative" as const }}>
              <span style={{ position: "absolute" as const, left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#9ca3af", pointerEvents: "none" as const }}>🔍</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} placeholder="poulet, riz, citron…" style={{ width: "100%", height: 50, padding: "0 18px 0 46px", borderRadius: 14, border: "1.5px solid #e5e5e5", fontSize: 15, background: "#fafaf9", color: "#1a1a1a", outline: "none", boxSizing: "border-box" as const }} onFocus={(e) => e.target.style.borderColor = "#C97D4E"} onBlur={(e) => e.target.style.borderColor = "#e5e5e5"} />
            </div>
            <button onClick={() => generate()} disabled={loading} style={{ height: 50, padding: "0 24px", borderRadius: 14, border: "none", background: loading ? "#e5a07a" : "#C97D4E", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>{loading ? "…" : "Trouver"}</button>
          </div>
 
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: "0.75rem" }}>
            {FILTERS.map((f) => <button key={f} onClick={() => toggleFilter(f)} style={{ padding: "6px 16px", borderRadius: 999, border: `1.5px solid ${activeFilters.includes(f) ? "#C97D4E" : "#e5e5e5"}`, fontSize: 13, fontWeight: 500, color: activeFilters.includes(f) ? "#C97D4E" : "#6b7280", cursor: "pointer", background: activeFilters.includes(f) ? "#fdf3ec" : "#fff" }}>{f}</button>)}
          </div>
 
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9ca3af", marginRight: 4 }}>Suggestions :</span>
            {SUGGESTIONS.map((s) => <span key={s} onClick={() => { setQuery(s); generate(s); }} style={{ fontSize: 12, color: "#6b7280", cursor: "pointer", padding: "4px 12px", borderRadius: 999, background: "#f3f4f6", border: "1px solid #e5e5e5", fontWeight: 500 }}>{s}</span>)}
          </div>
        </div>
      </div>
 
      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e5e5", marginBottom: "1.5rem" }}>
          {[
            { id: "recettes", label: "Recettes" },
            { id: "planning", label: filledCount > 0 ? `📅 (${filledCount})` : "📅 Planning" },
            { id: "favoris", label: "❤ Favoris" },
            { id: "historique", label: "Historique" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 6px", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "#C97D4E" : "#6b7280", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#C97D4E" : "transparent"}`, marginBottom: -1, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
 
        {tab === "recettes" && (
          <>
            {limitType === "searches" && <LimitBanner type="searches" onUpgrade={() => setShowPremium(true)} />}
            {limitType === "favs" && <LimitBanner type="favs" onUpgrade={() => setShowPremium(true)} />}
            {loading && <div style={{ textAlign: "center", padding: "5rem 1rem" }}><div style={{ fontSize: 48, marginBottom: 16 }}>🍳</div><div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 4 }}>Le chef prépare vos recettes…</div><div style={{ fontSize: 13, color: "#9ca3af" }}>Quelques secondes suffiront</div></div>}
            {error && <div style={{ background: "#fff8f6", border: "1px solid #fbd5c5", borderRadius: 12, padding: "1rem 1.25rem", fontSize: 13, color: "#c2410c", marginBottom: 16 }}><strong>Erreur :</strong> {error}</div>}
            {!loading && !searched && (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>👨‍🍳</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8, fontFamily: "'Georgia', serif" }}>Bienvenue sur PetitChef</div>
                <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>Entre un ingrédient ou une idée ci-dessus<br />pour découvrir vos recettes</div>
                {!premium && (
                  <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fdf3ec", borderRadius: 12, fontSize: 13, color: "#7A4A2A" }}>
                    Version gratuite · {searchesLeft} recherche{Number(searchesLeft) !== 1 ? "s" : ""} restante{Number(searchesLeft) !== 1 ? "s" : ""} aujourd'hui
                    <button onClick={() => setShowPremium(true)} style={{ display: "block", margin: "8px auto 0", padding: "6px 16px", borderRadius: 999, border: "none", background: "#C97D4E", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Passer Premium →</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recipes.map((r, i) => <RecipeCard key={i} recipe={r} index={i} plan={plan} setPlan={setPlan} onFavLimited={() => setLimitType("favs")} />)}
            </div>
          </>
        )}
 
        {tab === "planning" && <MealPlanner plan={plan} setPlan={setPlan} premium={premium} />}
 
        {tab === "favoris" && (
          <div>
            {favorites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}><div style={{ fontSize: 48, marginBottom: 16 }}>♥</div><div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 4 }}>Aucun favori pour l'instant</div><div style={{ fontSize: 13, color: "#9ca3af" }}>Appuie sur ♥ pour sauvegarder une recette</div></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{favorites.map((r, i) => <RecipeCard key={i} recipe={r} index={i} plan={plan} setPlan={setPlan} onFavLimited={() => setLimitType("favs")} />)}</div>
            )}
          </div>
        )}
 
        {tab === "historique" && (
          <div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 1rem", color: "#9ca3af", fontSize: 14 }}>Aucune recherche récente.</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f0ee", overflow: "hidden" }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.q); generate(h.q); }} style={{ padding: "1rem 1.25rem", borderBottom: i < history.length - 1 ? "1px solid #f8f6f3" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14 }}>🔍</span><span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{h.q}</span></div>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
 
      <div style={{ textAlign: "center", padding: "2rem", borderTop: "1px solid #f1f0ee", marginTop: "2rem" }}>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>🍳 <strong style={{ color: "#C97D4E" }}>PetitChef</strong> — Cuisine intelligente propulsée par IA</span>
      </div>
    </div>
  );
}