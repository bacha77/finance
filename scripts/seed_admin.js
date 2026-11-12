import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'storehouse-finance-app',
  appId: '1:175636734866:web:b0cdd7eafee8ef03b8974b',
  storageBucket: 'storehouse-finance-app.firebasestorage.app',
  apiKey: 'AIzaSyC-abzA14GoWDF9gxJFYpr3K6FpZzD4hCY',
  authDomain: 'storehouse-finance-app.firebaseapp.com',
  messagingSenderId: '175636734866',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedAdmin() {
  const adminEmail = 'bacha7@gmail.com';
  const churchId = 'storehouse-admin-church';
  console.log(`Seeding super admin account & workspace: ${adminEmail}...`);

  // 1. Admins collection
  await setDoc(doc(db, 'admins', adminEmail), {
    email: adminEmail,
    role: 'super_admin',
    created_at: new Date().toISOString(),
    is_active: true
  }, { merge: true });

  // 2. Main Admin Church
  await setDoc(doc(db, 'churches', churchId), {
    id: churchId,
    name: 'Storehouse Main Sanctuary',
    plan: 'enterprise',
    city: 'New York',
    state: 'NY',
    currency: 'USD',
    is_active: true,
    fiscal_year_start: 'January',
    created_at: new Date().toISOString()
  }, { merge: true });

  // 3. Default Fund
  await setDoc(doc(db, 'funds', `${churchId}-general`), {
    id: `${churchId}-general`,
    church_id: churchId,
    name: 'General Operating Fund',
    is_unrestricted: true,
    created_at: new Date().toISOString()
  }, { merge: true });

  // 4. Default Department
  await setDoc(doc(db, 'departments', `${churchId}-general`), {
    id: `${churchId}-general`,
    church_id: churchId,
    name: 'General Ministry',
    created_at: new Date().toISOString()
  }, { merge: true });

  console.log(`Successfully seeded super admin: ${adminEmail} and Church: ${churchId}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Error seeding admin:', err);
  process.exit(1);
});
