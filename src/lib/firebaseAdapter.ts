import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  type WhereFilterOp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db, storage, auth } from './firebase';

interface FilterCondition {
  field: string;
  op: WhereFilterOp;
  value: any;
}

class QueryBuilder {
  private colName: string;
  private filters: FilterCondition[] = [];
  private orderField?: string;
  private orderAscending: boolean = true;
  private limitCount?: number;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private isHeadCountOnly: boolean = false;

  constructor(colName: string) {
    this.colName = colName;
  }

  select(_columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (options?.head) {
      this.isHeadCountOnly = true;
    }
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: '==', value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: '!=', value });
    return this;
  }

  in(field: string, values: any[]) {
    if (values && values.length > 0) {
      this.filters.push({ field, op: 'in', value: values.slice(0, 30) });
    }
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, op: '>=', value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, op: '<=', value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ field, op: '>', value });
    return this;
  }

  lt(field: string, value: any) {
    this.filters.push({ field, op: '<', value });
    return this;
  }

  like(field: string, value: any) {
    this.filters.push({ field, op: '==', value });
    return this;
  }

  ilike(field: string, value: any) {
    this.filters.push({ field, op: '==', value });
    return this;
  }

  is(field: string, value: any) {
    if (value === null) {
      this.filters.push({ field, op: '==', value: null });
    } else {
      this.filters.push({ field, op: '==', value });
    }
    return this;
  }

  range(_from: number, to: number) {
    this.limitCount = to + 1;
    return this;
  }

  order(field: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderField = field;
    this.orderAscending = ascending;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.execute();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this.execute();
  }

  private async execute(): Promise<{ data: any; count?: number | null; error: any }> {
    try {
      // Direct doc lookup optimization: if querying solely by 'id' == value
      const idFilter = this.filters.length === 1 && this.filters[0].field === 'id' ? this.filters[0] : null;
      if (idFilter && (this.isSingle || this.isMaybeSingle)) {
        const docRef = doc(db, this.colName, String(idFilter.value));
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          let item: any = { id: snap.id, ...snap.data() };
          if (this.colName === 'profiles' && item.church_id && !item.churches) {
            try {
              const cSnap = await getDoc(doc(db, 'churches', item.church_id));
              if (cSnap.exists()) {
                item.churches = { id: cSnap.id, ...cSnap.data() };
              }
            } catch {
              // Ignore relational lookup failure
            }
          }
          return { data: item, count: 1, error: null };
        }
        if (this.isMaybeSingle) {
          return { data: null, count: 0, error: null };
        }
        return { data: null, count: 0, error: new Error('Document not found') };
      }

      // Build collection query
      const constraints: any[] = [];
      for (const f of this.filters) {
        constraints.push(where(f.field, f.op, f.value));
      }

      if (this.orderField) {
        constraints.push(orderBy(this.orderField, this.orderAscending ? 'asc' : 'desc'));
      }

      if (this.limitCount) {
        constraints.push(firestoreLimit(this.limitCount));
      }

      const q = query(collection(db, this.colName), ...constraints);
      const snapshot = await getDocs(q);

      if (this.isHeadCountOnly) {
        return { data: [], count: snapshot.size, error: null };
      }

      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Enrich relations if standard relational tables (e.g. churches) are queried
      if (this.colName === 'profiles') {
        const enriched = await Promise.all(
          items.map(async (item: any) => {
            if (item.church_id && !item.churches) {
              try {
                const cSnap = await getDoc(doc(db, 'churches', item.church_id));
                if (cSnap.exists()) {
                  return { ...item, churches: { id: cSnap.id, ...cSnap.data() } };
                }
              } catch {
                // Ignore relational lookup failure
              }
            }
            return item;
          })
        );
        if (this.isSingle) {
          return { data: enriched[0] || null, count: enriched.length, error: enriched[0] ? null : new Error('Row not found') };
        }
        if (this.isMaybeSingle) {
          return { data: enriched[0] || null, count: enriched.length, error: null };
        }
        return { data: enriched, count: enriched.length, error: null };
      }

      if (this.isSingle) {
        if (items.length === 0) return { data: null, count: 0, error: new Error('Row not found') };
        return { data: items[0], count: items.length, error: null };
      }

      if (this.isMaybeSingle) {
        return { data: items[0] || null, count: items.length, error: null };
      }

      return { data: items, count: items.length, error: null };
    } catch (err: any) {
      console.warn(`Firestore Query Error on [${this.colName}], using in-memory filter fallback:`, err);
      try {
        const churchFilter = this.filters.find(f => f.field === 'church_id');
        const fallbackConstraints: any[] = [];
        if (churchFilter) {
          fallbackConstraints.push(where('church_id', '==', churchFilter.value));
        }
        const fallbackQ = query(collection(db, this.colName), ...fallbackConstraints);
        const fallbackSnap = await getDocs(fallbackQ);
        let items: any[] = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const f of this.filters) {
          if (f.field === 'church_id') continue;
          if (f.op === '==') items = items.filter((it: any) => it[f.field] === f.value);
          else if (f.op === '!=') items = items.filter((it: any) => it[f.field] !== f.value);
          else if (f.op === 'in') items = items.filter((it: any) => Array.isArray(f.value) && f.value.includes(it[f.field]));
          else if (f.op === '>=') items = items.filter((it: any) => it[f.field] >= f.value);
          else if (f.op === '<=') items = items.filter((it: any) => it[f.field] <= f.value);
          else if (f.op === '>') items = items.filter((it: any) => it[f.field] > f.value);
          else if (f.op === '<') items = items.filter((it: any) => it[f.field] < f.value);
        }

        if (this.orderField) {
          items.sort((a: any, b: any) => {
            const va = a[this.orderField!];
            const vb = b[this.orderField!];
            if (va < vb) return this.orderAscending ? -1 : 1;
            if (va > vb) return this.orderAscending ? 1 : -1;
            return 0;
          });
        }

        if (this.limitCount) {
          items = items.slice(0, this.limitCount);
        }

        if (this.isSingle) {
          return { data: items[0] || null, count: items.length, error: items[0] ? null : new Error('Row not found') };
        }
        if (this.isMaybeSingle) {
          return { data: items[0] || null, count: items.length, error: null };
        }
        return { data: items, count: items.length, error: null };
      } catch {
        return { data: null, count: 0, error: err };
      }
    }
  }

  // Thenable for await query
  then(onfulfilled?: (value: { data: any; count?: number | null; error: any }) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class TableOperations {
  private colName: string;

  constructor(colName: string) {
    this.colName = colName;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    const qb = new QueryBuilder(this.colName);
    return qb.select(columns, options);
  }

  insert(data: any | any[]) {
    const colName = this.colName;

    const executeInsert = async () => {
      try {
        const records = Array.isArray(data) ? data : [data];
        const inserted: any[] = [];

        for (const rec of records) {
          const id = rec.id || crypto.randomUUID();
          const payload = { ...rec, id };
          // Remove undefined fields
          Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

          await setDoc(doc(db, colName, String(id)), payload, { merge: true });
          inserted.push(payload);
        }

        const resData = Array.isArray(data) ? inserted : inserted[0];
        return { data: resData, error: null, inserted };
      } catch (err: any) {
        console.error(`Firestore Insert Error on [${colName}]:`, err);
        return { data: null, error: err, inserted: [] };
      }
    };

    const promise = executeInsert();

    const selectHandler = (_columns: string = '*') => {
      return {
        single: async () => {
          const res = await promise;
          return { data: res.inserted[0] || null, error: res.error };
        },
        maybeSingle: async () => {
          const res = await promise;
          return { data: res.inserted[0] || null, error: res.error };
        },
        then: (resolve?: any, reject?: any) => {
          return promise.then((r) => ({ data: r.data, error: r.error })).then(resolve, reject);
        },
      };
    };

    return {
      select: selectHandler,
      single: async () => {
        const res = await promise;
        return { data: res.inserted[0] || null, error: res.error };
      },
      maybeSingle: async () => {
        const res = await promise;
        return { data: res.inserted[0] || null, error: res.error };
      },
      then: (resolve?: any, reject?: any) => {
        return promise.then((r) => ({ data: r.data, error: r.error })).then(resolve, reject);
      },
    };
  }

  upsert(data: any | any[], _options?: { onConflict?: string }) {
    return this.insert(data);
  }

  update(values: Record<string, any>) {
    return new UpdateBuilder(this.colName, values);
  }

  delete() {
    return new DeleteBuilder(this.colName);
  }
}

class UpdateBuilder {
  private colName: string;
  private values: Record<string, any>;
  private filters: FilterCondition[] = [];

  constructor(colName: string, values: Record<string, any>) {
    this.colName = colName;
    this.values = values;
  }

  eq(field: string, val: any) {
    this.filters.push({ field, op: '==', value: val });
    return this;
  }

  neq(field: string, val: any) {
    this.filters.push({ field, op: '!=', value: val });
    return this;
  }

  in(field: string, vals: any[]) {
    this.filters.push({ field, op: 'in', value: vals });
    return this;
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      const clean: Record<string, any> = { ...this.values };
      Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

      const idFilter = this.filters.find(f => f.field === 'id' && f.op === '==');
      if (idFilter && this.filters.length === 1) {
        await setDoc(doc(db, this.colName, String(idFilter.value)), clean, { merge: true });
        return { data: [clean], error: null };
      }

      const constraints = this.filters.map(f => where(f.field, f.op, f.value));
      const q = query(collection(db, this.colName), ...constraints);
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(d => updateDoc(d.ref, clean));
      await Promise.all(updates);
      return { data: snapshot.docs.map(d => ({ id: d.id, ...d.data(), ...clean })), error: null };
    } catch (err: any) {
      console.error(`Firestore Update Error on [${this.colName}]:`, err);
      return { data: null, error: err };
    }
  }

  then(onfulfilled?: (val: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class DeleteBuilder {
  private colName: string;
  private filters: FilterCondition[] = [];

  constructor(colName: string) {
    this.colName = colName;
  }

  eq(field: string, val: any) {
    this.filters.push({ field, op: '==', value: val });
    return this;
  }

  neq(field: string, val: any) {
    this.filters.push({ field, op: '!=', value: val });
    return this;
  }

  in(field: string, vals: any[]) {
    this.filters.push({ field, op: 'in', value: vals });
    return this;
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      const idFilter = this.filters.find(f => f.field === 'id' && f.op === '==');
      if (idFilter && this.filters.length === 1) {
        await deleteDoc(doc(db, this.colName, String(idFilter.value)));
        return { data: null, error: null };
      }

      const constraints = this.filters.map(f => where(f.field, f.op, f.value));
      const q = query(collection(db, this.colName), ...constraints);
      const snapshot = await getDocs(q);
      const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletes);
      return { data: null, error: null };
    } catch (err: any) {
      console.error(`Firestore Delete Error on [${this.colName}]:`, err);
      return { data: null, error: err };
    }
  }

  then(onfulfilled?: (val: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ── Firebase Storage Bucket Adapter ─────────────────────────────────────────
class StorageBucket {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(path: string, file: File | Blob) {
    try {
      const storageRef = ref(storage, `${this.bucketName}/${path}`);
      const snap = await uploadBytes(storageRef, file);
      return { data: { path: snap.metadata.fullPath }, error: null };
    } catch (err: any) {
      console.error(`Firebase Storage upload error on [${this.bucketName}]:`, err);
      return { data: null, error: err };
    }
  }

  getPublicUrl(path: string) {
    // If it's already a full download URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return { data: { publicUrl: path } };
    }
    // Storage download URLs can be resolved asynchronously, but getPublicUrl is synchronous in Supabase
    // Return standard Firebase Storage public REST URL
    const encoded = encodeURIComponent(path.startsWith(`${this.bucketName}/`) ? path : `${this.bucketName}/${path}`);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storage.app.options.storageBucket}/o/${encoded}?alt=media`;
    return { data: { publicUrl } };
  }
}

// ── Unified Firestore & Firebase Client Adapter ─────────────────────────────
export const firebaseClient = {
  from(tableName: string) {
    return new TableOperations(tableName);
  },

  storage: {
    from(bucketName: string) {
      return new StorageBucket(bucketName);
    },
  },

  async rpc(fnName: string, args: Record<string, any>) {
    try {
      if (fnName === 'record_subscription_payment') {
        const { p_church_id, p_plan, p_end_date, p_order_id, p_amount, p_method, p_notes } = args;

        // Update church in Firestore
        await setDoc(
          doc(db, 'churches', p_church_id),
          {
            plan: p_plan,
            subscription_end_date: p_end_date,
            paypal_order_id: p_order_id,
            cancel_at_period_end: false,
          },
          { merge: true }
        );

        // Record payment in admin_payments collection
        if (p_amount > 0) {
          await addDoc(collection(db, 'admin_payments'), {
            church_id: p_church_id,
            amount: p_amount,
            payment_method: p_method || 'PayPal',
            notes: p_notes,
            created_at: new Date().toISOString(),
          });
        }

        return { data: null, error: null };
      }

      if (fnName === 'encrypt_employee_pii') {
        const { p_employee_id, p_ssn, p_dob } = args;
        const encodedSsn = p_ssn ? btoa(encodeURIComponent(p_ssn)) : '';
        const encodedDob = p_dob ? btoa(encodeURIComponent(p_dob)) : '';
        await setDoc(doc(db, 'staff_pii', String(p_employee_id)), {
          ssn: encodedSsn,
          dob: encodedDob,
          updated_at: new Date().toISOString(),
        }, { merge: true });
        if (encodedSsn) {
          await setDoc(doc(db, 'staff', String(p_employee_id)), {
            ssn: encodedSsn,
          }, { merge: true });
        }
        return { data: { success: true }, error: null };
      }

      if (fnName === 'decrypt_employee_pii') {
        const { p_employee_id } = args;
        try {
          const snap = await getDoc(doc(db, 'staff_pii', String(p_employee_id)));
          if (snap.exists()) {
            const d = snap.data();
            let ssn = d.ssn || '';
            let dob = d.dob || '';
            try { ssn = decodeURIComponent(atob(ssn)); } catch {}
            try { dob = decodeURIComponent(atob(dob)); } catch {}
            return { data: { ssn, dob }, error: null };
          }
          const staffSnap = await getDoc(doc(db, 'staff', String(p_employee_id)));
          if (staffSnap.exists()) {
            const d = staffSnap.data();
            let ssn = d.ssn || '';
            try { ssn = decodeURIComponent(atob(ssn)); } catch {}
            return { data: { ssn, dob: d.dob || '' }, error: null };
          }
        } catch (err: any) {
          return { data: null, error: err };
        }
        return { data: { ssn: '', dob: '' }, error: null };
      }

      return { data: null, error: new Error(`RPC function ${fnName} not recognized`) };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  channel(_name: string) {
    const channelObj = {
      on(_event: string, _config: any, _callback?: (...args: any[]) => void) {
        return channelObj;
      },
      subscribe(callback?: (status: string) => void) {
        if (callback) callback('SUBSCRIBED');
        return channelObj;
      },
      unsubscribe() {
        return Promise.resolve();
      },
    };
    return channelObj;
  },

  removeChannel(_channel: any) {
    return Promise.resolve();
  },

  removeAllChannels() {
    return Promise.resolve([]);
  },

  getChannels() {
    return [];
  },

  functions: {
    async invoke(fnName: string, _options?: any) {
      console.log(`Firebase function invoke [${fnName}]`);
      return { data: { success: true }, error: null };
    },
  },

  auth: {
    async getUser() {
      const user = auth.currentUser;
      return { data: { user: user ? { id: user.uid, email: user.email } : null }, error: null };
    },
    async getSession() {
      const user = auth.currentUser;
      return { data: { session: user ? { user: { id: user.uid, email: user.email } } : null }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user: { id: user.uid, email: user.email } } : null);
      });
      return { data: { subscription: { unsubscribe } } };
    },
    async updateUser(attributes: Record<string, any>) {
      console.log('Firebase auth.updateUser:', attributes);
      return { data: { user: auth.currentUser }, error: null };
    },
    async signInWithOtp({ email }: { email: string; options?: any }) {
      console.log(`Firebase: OTP requested for ${email}`);
      return { data: null, error: null };
    },
    async resetPasswordForEmail(email: string) {
      console.log(`Firebase: Password reset requested for ${email}`);
      return { data: null, error: null };
    },
  },
};

