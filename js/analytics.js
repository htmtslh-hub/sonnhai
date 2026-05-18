(async function() {
  try {
    const { db, collection, doc, getDoc, setDoc, increment } = await import('/firebase.js');

    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'page_views', today);

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await setDoc(docRef, { views: increment(1) }, { merge: true });
    } else {
      await setDoc(docRef, { date: today, views: 1 });
    }
  } catch (e) {}
})();
