/* ========================================
   20. GUIDE D'UTILISATION
   ======================================== */

/*
COMMENT CHANGER DE THÈME:
1. Dans votre HTML, ajoutez data-theme="nom-du-theme" sur <body>
   Exemple: <body data-theme="dark">
   
2. Pour changer dynamiquement avec JavaScript:
   document.body.setAttribute('data-theme', 'dark');
   
3. Pour créer un nouveau thème:
   - Ajoutez une nouvelle section dans _themes.css
   - Définissez les variables --theme-* pour votre thème
   
STRUCTURE DES FICHIERS:
css/
├── main.css                 # Point d'entrée principal
├── config/
│   ├── _variables.css       # Variables globales
│   └── _themes.css          # Définitions des thèmes
├── base/
│   ├── _reset.css          # Reset CSS
│   └── _typography.css     # Styles typographiques
├── utilities/
│   └── _helpers.css        # Classes utilitaires
├── components/
│   ├── _buttons.css        # Boutons
│   ├── _cards.css          # Cartes
│   ├── _forms.css          # Formulaires
│   ├── _badges.css         # Badges
│   ├── _tables.css         # Tableaux
│   └── _modals.css         # Modales
├── layout/
│   ├── _header.css         # En-tête
│   ├── _main.css           # Contenu principal
│   └── _footer.css         # Pied de page
├── pages/
│   ├── _dashboard.css      # Styles du tableau de bord
│   └── _map.css            # Styles de la carte
├── responsive/
│   └── _breakpoints.css    # Media queries
└── animations/
    └── _keyframes.css      # Animations

CONVENTIONS DE NOMMAGE:
- Variables CSS: --nom-categorie-variante (ex: --color-primary-light)
- Classes utilitaires: .propriete-valeur (ex: .text-center, .m-2)
- Composants: .composant-element-modificateur (ex: .btn-primary-large)
- États: .is-state ou .has-state (ex: .is-active, .has-error)

MAINTENANCE:
- Toutes les couleurs sont définies dans les variables
- Les espacements utilisent les variables --space-*
- Les ombres utilisent les variables --shadow-*
- Les transitions utilisent les variables --transition-*
- Les z-index utilisent les variables --z-*

AJOUT DE NOUVEAUX COMPOSANTS:
1. Créer un nouveau fichier dans le dossier approprié
2. Utiliser les variables CSS définies
3. Importer le fichier dans main.css
4. Documenter le composant avec des commentaires

OPTIMISATION:
- Utilisez les classes utilitaires pour les styles simples
- Évitez la duplication en utilisant les variables
- Groupez les media queries par composant
- Utilisez les propriétés CSS logiques (padding-inline, margin-block, etc.)
*/