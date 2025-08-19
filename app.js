
import { auth, db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const ADMIN_MATRICULAS = ['70029','6266','4144'];

auth.onAuthStateChanged(async user => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const userInfoEl = document.getElementById('userInfo');
      userInfoEl.innerHTML = `${data.nome} — ${data.matricula}`;
      if (ADMIN_MATRICULAS.includes(data.matricula)) {
        const badge = document.createElement('span');
        badge.className = 'badge-admin';
        badge.textContent = 'ADMIN';
        userInfoEl.appendChild(badge);
      }
    }
  }
});

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  await auth.signOut();
  location.reload();
});
