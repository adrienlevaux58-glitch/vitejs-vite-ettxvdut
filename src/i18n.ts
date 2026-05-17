export type Lang = "fr" | "en";

export const t = {
  fr: {
    // Navbar
    login: "Connexion",
    premium: "Premium",
    install: "Installer l'application sur mon téléphone",
    logout: "Se déconnecter",
    searchesLeft: (n: number) => `${n} recherche${n !== 1 ? "s" : ""} restante${n !== 1 ? "s" : ""}`,

    // Hero
    aiTag: "IA culinaire",
    heroTitle: "Qu'est-ce qu'on cuisine",
    heroTitleItalic: "aujourd'hui",
    heroTitleEnd: " ?",
    heroSub: "Entre un ingrédient ou un type de plat — PetitChef génère 3 recettes personnalisées.",
    searchPlaceholder: "poulet, riz, citron…",
    findBtn: "Trouver",
    suggestions: "Suggestions :",
    filters: ["Végétarien", "Sans gluten", "Rapide", "Léger"],
    suggestions_list: ["Poulet", "Pâtes", "Protéines", "Poisson", "Végétarien", "Rapide"],

    // Tabs
    recipes: "Recettes",
    planning: "Planning",
    favorites: "Favoris",
    history: "Historique",

    // Recipe card
    recipe: "Recette",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    persons: "Personnes",
    ingredients: "Ingrédients",
    preparation: "Préparation",
    saveFav: "♥ Sauvegardé",
    addFav: "♡ Favoris",
    share: "⎘ Partager",
    copied: "✓ Copié",
    planify: "📅 Planifier",
    addToPlan: "Ajouter au planning",
    confirm: "Confirmer",
    confirmed: "✓ Ajouté !",

    // Meal plan
    weekPlanning: "Planning de la semaine",
    myMeals: "Planning de la semaine",
    noMeals: "Ajoute des recettes depuis la recherche",
    mealsCount: (n: number) => `${n} / 21 repas planifiés`,
    suggest: "+ Suggérer",
    suggestRecipe: "Suggérer une recette →",
    addToPlanning: "✓ Ajouter au planning",
    clear: "Vider",
    morning: "Matin",
    noon: "Midi",
    evening: "Soir",
    preparing: "🍳 Préparation…",
    suggestionIA: "Suggestion IA",

    // Shopping list
    shoppingList: "Liste de courses",
    articles: (n: number) => `${n} article${n !== 1 ? "s" : ""}`,
    done: (n: number) => `${n} fait${n !== 1 ? "s" : ""}`,
    uncheckAll: "Tout décocher",
    emptyShoppingList: "Ajoute des recettes au planning pour générer ta liste",
    shoppingPremium: "🛒 La liste de courses est disponible en Premium",
    courses: "Courses",
    hide: "Masquer",

    // States
    welcome: "Bienvenue sur PetitChef",
    welcomeSub: "Entre un ingrédient ci-dessus pour commencer",
    freeSearches: (n: number) => `${n} recherche${n !== 1 ? "s" : ""} gratuite${n !== 1 ? "s" : ""} aujourd'hui`,
    noFavorites: "Aucun favori pour l'instant",
    noFavoritesSub: "Appuie sur ♡ dans une recette pour sauvegarder",
    noHistory: "Aucune recherche récente.",
    cookingMsg: "Le chef prépare vos recettes…",

    // Limits
    limitSearches: "3 recherches gratuites utilisées aujourd'hui. Passe Premium pour continuer.",
    limitFavs: "1 favori gratuit utilisé aujourd'hui. Passe Premium pour continuer.",
    limitBtn: "Premium →",

    // Auth
    loginTitle: "Connexion",
    signupTitle: "Créer un compte",
    continueGoogle: "Continuer avec Google",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Mot de passe",
    loginBtn: "Se connecter",
    signupBtn: "Créer mon compte",
    noAccount: "Pas encore de compte ?",
    hasAccount: "Déjà un compte ?",
    signup: "S'inscrire",
    loginLink: "Se connecter",
    confirmEmail: "Vérifie ton email pour confirmer ton compte !",

    // Premium page
    premiumTag: "PetitChef Premium",
    premiumTitle: "Cuisine sans limites",
    premiumSub: "Tout ce dont tu as besoin pour bien manger",
    premiumFeatures: [
      { icon: "🔍", title: "Recherches illimitées", desc: "Sans limite quotidienne" },
      { icon: "♥", title: "Favoris illimités", desc: "Sauvegarde toutes tes recettes" },
      { icon: "🛒", title: "Liste de courses", desc: "Générée depuis ton planning" },
      { icon: "📅", title: "Planning complet", desc: "7 jours × 3 repas" },
      { icon: "⎘", title: "Partage de recettes", desc: "Lien unique par recette" },
    ],
    monthly: "Mensuel",
    yearly: "Annuel",
    perMonth: "par mois",
    perYear: "par an · 3.33€/mois",
    save33: "Économisez 33%",
    choose: "Choisir",
    stripeNote: "Paiement sécurisé par Stripe · Annulable à tout moment",

    // Shared
    sharedRecipe: "Une recette partagée via PetitChef",
    discover: "← Découvrir",

    // Footer
    footer: "Cuisine intelligente par IA",

    // AI prompt
    aiPrompt: (q: string, filters: string) =>
      `Tu es un chef cuisinier français. L'utilisateur veut cuisiner avec : "${q}".${filters} Génère exactement 3 recettes pour 2 personnes. UNIQUEMENT JSON valide sans texte avant/après ni backticks. Format : {"recettes":[{"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["200g de poulet","1 citron"],"etapes":["Étape 1","Étape 2","Étape 3"]},{"titre":"...","temps":"...","difficulte":"Moyen","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]},{"titre":"...","temps":"...","difficulte":"Difficile","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}]}`,
    aiFilters: (filters: string[]) => ` Contraintes : ${filters.join(", ")}.`,
    aiSuggestPrompt: (day: string, meal: string) =>
      `Tu es un chef cuisinier français. Génère une recette ${meal === "matin" ? "légère pour le matin" : meal === "midi" ? "copieuse pour le déjeuner" : "légère pour le dîner"} pour ${day}. UNIQUEMENT JSON valide sans backticks. Format : {"titre":"...","temps":"20 min","difficulte":"Facile","calories":"350kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}`,
  },

  en: {
    // Navbar
    login: "Login",
    premium: "Premium",
    install: "Install the app on my phone",
    logout: "Sign out",
    searchesLeft: (n: number) => `${n} search${n !== 1 ? "es" : ""} left`,

    // Hero
    aiTag: "AI cooking",
    heroTitle: "What shall we cook",
    heroTitleItalic: "today",
    heroTitleEnd: " ?",
    heroSub: "Enter an ingredient or a food type — PetitChef generates 3 personalized recipes.",
    searchPlaceholder: "chicken, rice, lemon…",
    findBtn: "Find",
    suggestions: "Suggestions:",
    filters: ["Vegetarian", "Gluten-free", "Quick", "Light"],
    suggestions_list: ["Chicken", "Pasta", "Proteins", "Fish", "Vegetarian", "Quick"],

    // Tabs
    recipes: "Recipes",
    planning: "Planner",
    favorites: "Favorites",
    history: "History",

    // Recipe card
    recipe: "Recipe",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    persons: "Servings",
    ingredients: "Ingredients",
    preparation: "Preparation",
    saveFav: "♥ Saved",
    addFav: "♡ Favorite",
    share: "⎘ Share",
    copied: "✓ Copied",
    planify: "📅 Plan",
    addToPlan: "Add to planner",
    confirm: "Confirm",
    confirmed: "✓ Added!",

    // Meal plan
    weekPlanning: "Weekly Planner",
    myMeals: "Weekly Planner",
    noMeals: "Add recipes from the search",
    mealsCount: (n: number) => `${n} / 21 meals planned`,
    suggest: "+ Suggest",
    suggestRecipe: "Suggest a recipe →",
    addToPlanning: "✓ Add to planner",
    clear: "Clear",
    morning: "Morning",
    noon: "Lunch",
    evening: "Dinner",
    preparing: "🍳 Preparing…",
    suggestionIA: "AI Suggestion",

    // Shopping list
    shoppingList: "Shopping List",
    articles: (n: number) => `${n} item${n !== 1 ? "s" : ""}`,
    done: (n: number) => `${n} done`,
    uncheckAll: "Uncheck all",
    emptyShoppingList: "Add recipes to your planner to generate your list",
    shoppingPremium: "🛒 Shopping list is available with Premium",
    courses: "Shopping",
    hide: "Hide",

    // States
    welcome: "Welcome to PetitChef",
    welcomeSub: "Enter an ingredient above to get started",
    freeSearches: (n: number) => `${n} free search${n !== 1 ? "es" : ""} today`,
    noFavorites: "No favorites yet",
    noFavoritesSub: "Tap ♡ on a recipe to save it",
    noHistory: "No recent searches.",
    cookingMsg: "The chef is preparing your recipes…",

    // Limits
    limitSearches: "You've used your 3 free searches today. Upgrade to Premium to continue.",
    limitFavs: "You've used your free favorite today. Upgrade to Premium to continue.",
    limitBtn: "Premium →",

    // Auth
    loginTitle: "Login",
    signupTitle: "Create an account",
    continueGoogle: "Continue with Google",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    loginBtn: "Sign in",
    signupBtn: "Create account",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    signup: "Sign up",
    loginLink: "Sign in",
    confirmEmail: "Check your email to confirm your account!",

    // Premium page
    premiumTag: "PetitChef Premium",
    premiumTitle: "Cook without limits",
    premiumSub: "Everything you need to eat well",
    premiumFeatures: [
      { icon: "🔍", title: "Unlimited searches", desc: "No daily limit" },
      { icon: "♥", title: "Unlimited favorites", desc: "Save all your recipes" },
      { icon: "🛒", title: "Shopping list", desc: "Generated from your planner" },
      { icon: "📅", title: "Full planner", desc: "7 days × 3 meals" },
      { icon: "⎘", title: "Share recipes", desc: "Unique link per recipe" },
    ],
    monthly: "Monthly",
    yearly: "Yearly",
    perMonth: "per month",
    perYear: "per year · €3.33/month",
    save33: "Save 33%",
    choose: "Choose",
    stripeNote: "Secure payment by Stripe · Cancel anytime",

    // Shared
    sharedRecipe: "A recipe shared via PetitChef",
    discover: "← Discover",

    // Footer
    footer: "Smart cooking powered by AI",

    // AI prompt
    aiPrompt: (q: string, filters: string) =>
      `You are a professional chef. The user wants to cook with: "${q}".${filters} Generate exactly 3 recipes for 2 people. ONLY valid JSON without any text before/after or backticks. Format: {"recettes":[{"titre":"...","temps":"20 min","difficulte":"Easy","calories":"350kcal","personnes":2,"ingredients":["200g chicken","1 lemon"],"etapes":["Step 1","Step 2","Step 3"]},{"titre":"...","temps":"...","difficulte":"Medium","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]},{"titre":"...","temps":"...","difficulte":"Hard","calories":"...kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}]}`,
    aiFilters: (filters: string[]) => ` Dietary constraints: ${filters.join(", ")}.`,
    aiSuggestPrompt: (day: string, meal: string) =>
      `You are a professional chef. Generate a ${meal === "matin" ? "light morning" : meal === "midi" ? "hearty lunch" : "light dinner"} recipe for ${day}. ONLY valid JSON without backticks. Format: {"titre":"...","temps":"20 min","difficulte":"Easy","calories":"350kcal","personnes":2,"ingredients":["..."],"etapes":["...","...","..."]}`,
  },
} as const;

export type Translations = typeof t.fr;