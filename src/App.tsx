import { useState, useEffect } from "react";
 
type Recipe = {
  titre: string;
  temps: string;
  difficulte: string;
  calories: string;
  ingredients: string[];
  etapes: string[];
  personnes?: number;
};
 
const SUGGESTIONS = ["Poulet", "Pâtes", "Protéines", "Poisson", "Végétarien", "Rapide"];
const FILTERS = ["Végétarien", "Sans gluten", "Rapide", "Léger"];
 
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
  try {
    return JSON.parse(decodeURIComponent(atob(str)));
  } catch {
    return null;
  }
}
 
function ShareButton({ recipe }: { recipe: Recipe }) {
  const [copied, setCopied] = useState(false);
 
  const share = (e: any) => {
    e.stopPropagation();
    const encoded = encodeRecipe(recipe);
    const url = `${window.location.origin}${window.location.pathname}?recette=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
 
  return (
    <button
      onClick={share}
      style={{
        padding: "7px 16px",
        borderRadius: 999,
        border: `1.5px solid ${copied ? "#16a34a" : "#e5e5e5"}`,
        background: copied ? "#f0fdf4" : "#fff",
        color: copied ? "#16a34a" : "#374151",
        fontSize: 13,
        cursor: "pointer",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.2s",
      }}
    >
      {copied ? "✓ Lien copié !" : "⎘ Partager"}
    </button>
  );
}
 
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
 
function RecipeCard({ recipe, index, highlight = false }: { recipe: Recipe; index: number; highlight?: boolean }) {
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
 
  const scaledIngredients = recipe.ingredients.map((ing) =>
    scaleIngredient(ing, basePersonnes, personnes)
  );
 
  const toggleFav = (e: any) => {
    e.stopPropagation();
    const favs: Recipe[] = JSON.parse(localStorage.getItem("favs") || "[]");
    const idx = favs.findIndex((f) => f.titre === recipe.titre);
    if (idx > -1) favs.splice(idx, 1);
    else favs.unshift({ ...recipe, personnes });
    localStorage.setItem("favs", JSON.stringify(favs));
    setFav(!fav);
  };
 
  const startTimer = (e: any) => {
    e.stopPropagation();
    if (timerActive) {
      clearInterval(intervalId);
      setTimerActive(false);
      setTimerDisplay("");
      return;
    }
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
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: highlight ? "2px solid #C97D4E" : "1px solid #f1f0ee",
      overflow: "hidden",
      boxShadow: open ? "0 8px 40px rgba(0,0,0,0.07)" : "0 1px 4px rgba(0,0,0,0.03)",
    }}>
      {highlight && (
        <div style={{ background: "#C97D4E", padding: "6px 1.5rem", fontSize: 12, color: "#fff", fontWeight: 600, letterSpacing: "0.5px" }}>
          🔗 Recette partagée avec vous
        </div>
      )}
 
      {/* Header */}
      <div onClick={() => setOpen(!open)} style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 6 }}>
            {highlight ? "Via PetitChef" : `Recette ${index + 1}`}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.3, fontFamily: "'Georgia', serif" }}>
            {recipe.titre}
          </div>
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
 
      {/* Body */}
      {open && (
        <div style={{ borderTop: "1px solid #f8f6f3" }}>
          <div style={{ padding: "0.9rem 1.5rem", background: "#fdf9f6", borderBottom: "1px solid #f1f0ee", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8 }}>
            <ServingSelector value={personnes} onChange={setPersonnes} />
            {personnes !== basePersonnes && (
              <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                Ajusté pour {personnes} pers.
              </span>
            )}
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
            <ShareButton recipe={recipe} />
            <button onClick={startTimer} style={{ padding: "7px 20px", borderRadius: 999, border: `1.5px solid ${timerActive ? "#C97D4E" : "#e5e5e5"}`, background: timerActive ? "#C97D4E" : "#fff", color: timerActive ? "#fff" : "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              {timerActive ? `⏹ ${timerDisplay}` : `▶ Minuteur ${parseInt(recipe.temps) || 20} min`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
 
// Shared recipe view
function SharedRecipeView({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f9f7f4", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f0ee", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🍳</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Georgia', serif" }}>
            Petit<span style={{ color: "#C97D4E" }}>Chef</span>
          </span>
        </div>
        <button onClick={onBack} style={{ fontSize: 13, color: "#C97D4E", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
          ← Découvrir des recettes
        </button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: "1rem" }}>Une recette vous a été partagée via PetitChef</div>
        <RecipeCard recipe={recipe} index={0} highlight={true} />
      </div>
    </div>
  );
}
 
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
 
  // Check for shared recipe in URL
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
    setLoading(true);
    setError(null);
    setRecipes([]);
    setTab("recettes");
    setSearched(true);
 
    const filters = activeFilters.length ? ` Contraintes : ${activeFilters.join(", ")}.` : "";
    const prompt = `Tu es un chef cuisinier français. L'utilisateur veut cuisiner avec : "${q}".${filters} Génère exactement 3 recettes pour 2 personnes. Réponds UNIQUEMENT en JSON valide sans texte avant/après ni backticks. Format : {"recettes":[{"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["200g de poulet","1 citron","2 gousses d'ail"],"etapes":["Étape 1 détaillée","Étape 2 détaillée","Étape 3 détaillée"]},{"titre":"...","temps":"...","difficulte":"Moyen","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]},{"titre":"...","temps":"...","difficulte":"Difficile","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}]}`;
 
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur ${res.status}`); }
      const data = await res.json();
      const text = (data.content || []).map((i: any) => i.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      addHistory(q);
      setRecipes(parsed.recettes);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };
 
  // Show shared recipe if URL contains one
  if (sharedRecipe) {
    return <SharedRecipeView recipe={sharedRecipe} onBack={() => {
      setSharedRecipe(null);
      window.history.replaceState({}, "", window.location.pathname);
    }} />;
  }
 
  return (
    <div style={{ minHeight: "100vh", background: "#f9f7f4", fontFamily: "system-ui, sans-serif" }}>
 
      {/* Navbar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f1f0ee", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🍳</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Georgia', serif", letterSpacing: "-0.5px" }}>
            Petit<span style={{ color: "#C97D4E" }}>Chef</span>
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase" as const, fontWeight: 500 }}>IA Culinaire</span>
      </div>
 
      {/* Hero */}
      <div style={{ background: "#fff", padding: "3rem 2rem 2.5rem", borderBottom: "1px solid #f1f0ee" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C97D4E", letterSpacing: "2px", textTransform: "uppercase" as const, marginBottom: 12 }}>Cuisine intelligente</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a", marginBottom: 8, fontFamily: "'Georgia', serif", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            Qu'est-ce qu'on cuisine aujourd'hui ?
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280", marginBottom: "2rem", lineHeight: 1.6 }}>
            Entre un ingrédient, plusieurs, ou un type comme "protéines" — PetitChef génère 3 recettes personnalisées en quelques secondes.
          </p>
 
          <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
            <div style={{ flex: 1, position: "relative" as const }}>
              <span style={{ position: "absolute" as const, left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#9ca3af", pointerEvents: "none" as const }}>🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                placeholder="poulet, riz, citron… ou 'végétarien rapide'"
                style={{ width: "100%", height: 52, padding: "0 18px 0 46px", borderRadius: 14, border: "1.5px solid #e5e5e5", fontSize: 15, background: "#fafaf9", color: "#1a1a1a", outline: "none", boxSizing: "border-box" as const }}
                onFocus={(e) => e.target.style.borderColor = "#C97D4E"}
                onBlur={(e) => e.target.style.borderColor = "#e5e5e5"}
              />
            </div>
            <button onClick={() => generate()} disabled={loading} style={{ height: 52, padding: "0 28px", borderRadius: 14, border: "none", background: loading ? "#e5a07a" : "#C97D4E", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
              {loading ? "…" : "Trouver"}
            </button>
          </div>
 
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: "0.75rem" }}>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => toggleFilter(f)} style={{ padding: "6px 16px", borderRadius: 999, border: `1.5px solid ${activeFilters.includes(f) ? "#C97D4E" : "#e5e5e5"}`, fontSize: 13, fontWeight: 500, color: activeFilters.includes(f) ? "#C97D4E" : "#6b7280", cursor: "pointer", background: activeFilters.includes(f) ? "#fdf3ec" : "#fff" }}>
                {f}
              </button>
            ))}
          </div>
 
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9ca3af", marginRight: 4 }}>Suggestions :</span>
            {SUGGESTIONS.map((s) => (
              <span key={s} onClick={() => { setQuery(s); generate(s); }} style={{ fontSize: 12, color: "#6b7280", cursor: "pointer", padding: "4px 12px", borderRadius: 999, background: "#f3f4f6", border: "1px solid #e5e5e5", fontWeight: 500 }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
 
      {/* Content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e5e5", marginBottom: "1.5rem" }}>
          {[{ id: "recettes", label: "Recettes" }, { id: "favoris", label: "❤ Favoris" }, { id: "historique", label: "Historique" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "#C97D4E" : "#6b7280", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#C97D4E" : "transparent"}`, marginBottom: -1, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
 
        {tab === "recettes" && (
          <>
            {loading && (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🍳</div>
                <div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 4 }}>Le chef prépare vos recettes…</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>Quelques secondes suffiront</div>
              </div>
            )}
            {error && (
              <div style={{ background: "#fff8f6", border: "1px solid #fbd5c5", borderRadius: 12, padding: "1rem 1.25rem", fontSize: 13, color: "#c2410c", marginBottom: 16 }}>
                <strong>Erreur :</strong> {error}
              </div>
            )}
            {!loading && !searched && (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>👨‍🍳</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", marginBottom: 8, fontFamily: "'Georgia', serif" }}>Bienvenue sur PetitChef</div>
                <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>Entre un ingrédient ou une idée ci-dessus<br />pour découvrir vos recettes</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recipes.map((r, i) => <RecipeCard key={i} recipe={r} index={i} />)}
            </div>
          </>
        )}
 
        {tab === "favoris" && (
          <div>
            {favorites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>♥</div>
                <div style={{ fontSize: 16, color: "#374151", fontWeight: 600, marginBottom: 4 }}>Aucun favori pour l'instant</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>Appuie sur ♥ pour sauvegarder une recette</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {favorites.map((r, i) => <RecipeCard key={i} recipe={r} index={i} />)}
              </div>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14 }}>🔍</span>
                      <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{h.q}</span>
                    </div>
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