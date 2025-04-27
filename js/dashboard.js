Trail Inspection for Orford Skimo /

Erreur complète: ReferenceError: loginLink is not defined
    at HTMLDocument.<anonymous> (dashboard.js:198:26)

Je suis en train d'analyser une erreur dans votre application SkiTrack. L'erreur indique que loginLink n'est pas défini dans le fichier dashboard.js à la ligne 198. C'est un problème de référence d'élément DOM qui peut facilement être corrigé.

Le problème se produit dans la fonction qui gère le menu mobile. Le code essaie d'accéder à un élément avec l'ID login-link, mais il ne vérifie pas correctement si cet élément existe avant de l'utiliser.

Voici comment corriger cette erreur dans le fichier js/dashboard.js :

javascript

// Dans la partie du code qui gère le menu mobile
if (mobileLoginLink && loginLink) {
  // Cette condition échoue quand loginLink est null
}

Le problème se produit parce que loginLink est utilisé avant d'être initialisé avec document.getElementById('login-link').

Je vais créer un correctif pour résoudre ce problème :

Je viens de corriger l'erreur dans le fichier dashboard.js. Le problème principal était que le code faisait référence à des éléments du DOM sans vérifier correctement s'ils existaient avant de les utiliser.

Dans mon correctif, j'ai ajouté des vérifications supplémentaires pour s'assurer que les éléments existent avant d'essayer d'y accéder. Voici les changements spécifiques que j'ai apportés :

    J'ai ajouté des vérifications pour tous les éléments du DOM utilisés dans le code du menu mobile
    J'ai ajouté une vérification pour mobileNav avant d'essayer de lui ajouter des événements
    J'ai ajouté une vérification pour mobileNav avant d'essayer d'y accéder dans les gestionnaires d'événements

L'erreur spécifique que vous rencontriez était à la ligne 198 où le code essayait d'accéder à loginLink qui n'avait pas été défini correctement. Maintenant, le code vérifie que loginLink existe avant de l'utiliser.

Pour appliquer cette correction :

    Remplacez le contenu actuel de votre fichier js/dashboard.js par celui que j'ai fourni
    Rechargez votre application pour vérifier que le menu mobile fonctionne correctement

Cela devrait résoudre l'erreur ReferenceError: loginLink is not defined et éviter des problèmes similaires avec d'autres éléments du DOM.

Il semble que je définisse dans dashboard.js et admin.html le menu mobile. N'y en a-t-il pas un de trop ?

Vous avez tout à fait raison ! J'ai examiné les fichiers et il y a effectivement une duplication dans la gestion du menu mobile. Ce même code est défini à plusieurs endroits :

    Dans js/dashboard.js - Code général pour le menu mobile
    Dans pages/admin.html - Code spécifique à la page admin
    Dans plusieurs autres pages HTML comme trail-inspection.html, shelter-inspection.html, etc.

Cette duplication est inefficace et peut causer des problèmes comme celui que vous avez rencontré. Il serait préférable de centraliser ce code dans un seul fichier JavaScript qui serait chargé par toutes les pages.

Voici comment nous pourrions restructurer cela :

    Garder le code du menu mobile uniquement dans js/dashboard.js
    Supprimer les implémentations redondantes dans les fichiers HTML individuels
    S'assurer que toutes les pages chargent dashboard.js

Une solution propre serait de créer un nouveau fichier, par exemple js/mobile-menu.js, qui contiendrait uniquement la logique du menu mobile, puis de l'inclure dans toutes les pages. Mais pour simplifier, nous pouvons garder cette logique dans dashboard.js puisqu'il est déjà chargé dans la plupart des pages.

Voulez-vous que je prépare ces modifications pour centraliser la gestion du menu mobile ?

Oui

Je vais créer un fichier JavaScript dédié au menu mobile et retirer les duplications dans les autres fichiers. Commençons par le nouveau fichier qui contiendra uniquement la logique du menu mobile.

Maintenant, nettoyons le fichier dashboard.js pour en retirer la logique du menu mobile.

Maintenant, mettons à jour les fichiers HTML pour inclure notre nouveau script mobile-menu.js. Commençons par index.html :

Maintenant, mettons à jour le fichier de la page d'administration :


// dashboard.js
// Ce fichier peut être utilisé pour des fonctionnalités supplémentaires 
// spécifiques au tableau de bord qui ne sont pas dans map.js

// Fonction appelée après l'authentification
function loadDashboardData() {
  // Cette fonction peut être vide si loadMapData gère déjà tout
  console.log("Chargement du tableau de bord");
  
  // Si vous souhaitez charger des données supplémentaires non gérées par map.js
  loadRecentInspections();
}

// Fonction pour charger les inspections récentes
/**
 * Charge les inspections les plus récentes pour le tableau de bord
 */
async function loadRecentInspections() {
  try {
    const recentInspectionsTable = document.getElementById('recent-inspections-table');
    
    if (!recentInspectionsTable) {
      console.error("Tableau des inspections récentes non trouvé");
      return;
    }
    
    // Afficher un message de chargement
    recentInspectionsTable.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">Chargement des inspections récentes...</td>
      </tr>
    `;
    
    // Calculer la date d'il y a 7 jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    // Charger les inspections de sentiers des 7 derniers jours
    const trailInspectionsSnapshot = await db.collection('trail_inspections')
      .where('date', '>=', sevenDaysAgoTimestamp)
      .orderBy('date', 'desc')
      .get();
    
    // Charger les données des sentiers
    const trailsMap = new Map();
    const trailsSnapshot = await db.collection('trails').get();
    trailsSnapshot.forEach(doc => {
      trailsMap.set(doc.id, doc.data());
    });
    
    // Charger les données des inspecteurs
    const inspectorsMap = new Map();
    const inspectorsSnapshot = await db.collection('inspectors').get();
    inspectorsSnapshot.forEach(doc => {
      inspectorsMap.set(doc.id, doc.data());
    });
    
    // Traiter les inspections de sentiers
    const recentInspections = [];
    const sentierTraités = new Set(); // Pour suivre les sentiers déjà traités
    
    trailInspectionsSnapshot.forEach(doc => {
      const data = doc.data();
      const trailId = data.trail_id;
      
      // Si on a déjà une inspection pour ce sentier, on passe
      if (sentierTraités.has(trailId)) {
        return;
      }
      
      // Marquer ce sentier comme traité
      sentierTraités.add(trailId);
      
      const inspectorId = data.inspector_id;
      
      // Obtenir les informations du sentier
      const trail = trailsMap.get(trailId) || { name: 'Sentier inconnu' };
      
      // Obtenir les informations de l'inspecteur
      const inspector = inspectorsMap.get(inspectorId) || { name: 'Inspecteur inconnu' };
      
      recentInspections.push({
        id: doc.id,
        type: 'trail',
        date: data.date.toDate(),
        location: trail.name,
        locationId: trailId,
        inspector: inspector.name,
        inspectorId: inspectorId,
        condition: data.condition || 'not-inspected',
        issues: data.issues || []
      });
      
      // Si on a 5 inspections de sentiers différents, on arrête
      if (recentInspections.length >= 5) {
        return;
      }
    });
    
    // Si aucune inspection trouvée
    if (recentInspections.length === 0) {
      recentInspectionsTable.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center;">Aucune inspection récente (moins de 7 jours)</td>
        </tr>
      `;
      return;
    }
    
    // Vider le tableau
    recentInspectionsTable.innerHTML = '';
    
    // Créer les lignes du tableau
    recentInspections.forEach(inspection => {
      const row = document.createElement('tr');
      
      // Formater la date
      const date = inspection.date;
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      // Type d'inspection - toujours "Sentier" dans ce cas
      const typeText = 'Sentier';
      const typeClass = 'type-trail';
      
      // État
      let statusText = '';
      switch (inspection.condition) {
        case 'good':
          statusText = 'Bon';
          break;
        case 'warning':
          statusText = 'Attention';
          break;
        case 'critical':
          statusText = 'Critique';
          break;
        default:
          statusText = 'Non inspecté';
      }
      
      // Ajouter un indicateur s'il y a des problèmes signalés
      const hasIssues = inspection.issues && inspection.issues.length > 0;
      const issueIndicator = hasIssues ? 
        `<span class="issue-indicator" title="${inspection.issues.join('\n- ')}">⚠️</span>` : '';
      
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td><span class="type-badge ${typeClass}">${typeText}</span></td>
        <td>${inspection.location} ${issueIndicator}</td>
        <td>${inspection.inspector}</td>
        <td><span class="status-badge status-${inspection.condition}">${statusText}</span></td>
      `;
      
      recentInspectionsTable.appendChild(row);
    });
    
  } catch (error) {
    console.error("Erreur lors du chargement des inspections récentes:", error);
    
    const recentInspectionsTable = document.getElementById('recent-inspections-table');
    if (recentInspectionsTable) {
      recentInspectionsTable.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #e02424;">Erreur lors du chargement des données</td>
        </tr>
      `;
    }
  }
}
