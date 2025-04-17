// Référence à Firestore
const db = firebase.firestore();

// Fonction pour récupérer les inspections de piste
async function getTrailInspections() {
  try {
    const snapshot = await db.collection('trail_inspections').get();
    return snapshot.docs.map(doc => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des inspections:", error);
    return [];
  }
}

// Fonction pour récupérer les inspections d'abri
async function getShelterInspections() {
  try {
    const snapshot = await db.collection('shelter_inspections').get();
    return snapshot.docs.map(doc => {
      return { id: doc.id, ...doc.data() };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des inspections d'abri:", error);
    return [];
  }
}

// Fonction pour ajouter une inspection de piste
async function addTrailInspection(inspectionData) {
  try {
    const result = await db.collection('trail_inspections').add({
      ...inspectionData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Inspection ajoutée avec ID:", result.id);
    return result.id;
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'inspection:", error);
    throw error;
  }
}

// Fonction pour ajouter une inspection d'abri
async function addShelterInspection(inspectionData) {
  try {
    const result = await db.collection('shelter_inspections').add({
      ...inspectionData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Inspection d'abri ajoutée avec ID:", result.id);
    return result.id;
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'inspection d'abri:", error);
    throw error;
  }
}