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
      console.warn(`Firestore Query Error on [${this.colName}]:`, err);
      return { data: null, count: 0, error: err };
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
    const colName = this.colName;
    return {
      eq: async (field: string, val: any) => {
        try {
          // Clean undefined values
          const clean: Record<string, any> = { ...values };
          Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

          if (field === 'id') {
            await setDoc(doc(db, colName, String(val)), clean, { merge: true });
            return { data: [clean], error: null };
          }

          // Otherwise query documents by field
          const q = query(collection(db, colName), where(field, '==', val));
          const snapshot = await getDocs(q);
          const updates = snapshot.docs.map((d) => updateDoc(d.ref, clean));
          await Promise.all(updates);

          return { data: snapshot.docs.map((d) => ({ id: d.id, ...d.data(), ...clean })), error: null };
        } catch (err: any) {
          console.error(`Firestore Update Error on [${colName}]:`, err);
          return { data: null, error: err };
        }
      },
    };
  }

  delete() {
    const colName = this.colName;
    return {
      eq: async (field: string, val: any) => {
        try {
          if (field === 'id') {
            await deleteDoc(doc(db, colName, String(val)));
            return { data: null, error: null };
          }

          const q = query(collection(db, colName), where(field, '==', val));
          const snapshot = await getDocs(q);
          const deletes = snapshot.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);

          return { data: null, error: null };
        } catch (err: any) {
          console.error(`Firestore Delete Error on [${colName}]:`, err);
          return { data: null, error: err };
        }
      },
    };
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

