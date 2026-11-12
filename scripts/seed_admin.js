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
  console.log(`Seeding super admin account: ${adminEmail}...`);

  await setDoc(doc(db, 'admins', adminEmail), {
    email: adminEmail,
    role: 'super_admin',
    created_at: new Date().toISOString(),
    is_active: true
  }, { merge: true });

  console.log(`Successfully seeded super admin: ${adminEmail}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Error seeding admin:', err);
  process.exit(1);
});
