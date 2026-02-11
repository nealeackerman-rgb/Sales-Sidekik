
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore/lite';
import { auth, db, isMock, onAuthStateChanged } from '../services/firebase';
import { Account } from '../types';

/**
 * Scalable hook for managing accounts as a Firestore Subcollection.
 * Uses a Map structure internally to prevent duplication.
 */
export function useAccountsCollection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  // 1. Initial Load & Cleanup from Local Cache
  useEffect(() => {
    const saved = localStorage.getItem('sales_sidekik_accounts_cache');
    if (saved) {
      try {
        const raw = JSON.parse(saved) as Account[];
        // Strict Deduplication Pass on Load
        const uniqueMap = new Map<string, Account>();
        raw.forEach(acc => {
          if (acc.id) uniqueMap.set(acc.id, acc);
        });
        const cleanList = Array.from(uniqueMap.values());
        
        // Sort
        cleanList.sort((a, b) => a.name.localeCompare(b.name));
        
        setAccounts(cleanList);
        
        // Update cache if duplicates were found
        if (cleanList.length !== raw.length) {
          console.warn(`[AccountsSync] Cleanup: Removed ${raw.length - cleanList.length} duplicates from cache.`);
          localStorage.setItem('sales_sidekik_accounts_cache', JSON.stringify(cleanList));
        }
      } catch (e) {
        console.warn("[AccountsSync] Cache parse error", e);
        setAccounts([]);
      }
    }
  }, []);

  // 2. Auth Watcher & Data Sync
  useEffect(() => {
    if (isMock) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        await reconcileData(user.uid);
      } else {
        setUid(null);
        setAccounts([]); // Don't clear local state immediately on logout to prevent flicker, but safe to do here
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Fetches data from Firestore and merges with local state using a Map.
   */
  const reconcileData = async (userId: string) => {
    setIsLoading(true);
    try {
      // Fetch Collection
      const querySnapshot = await getDocs(collection(db, 'users', userId, 'accounts'));
      const fetchedMap = new Map<string, Account>();
      
      querySnapshot.forEach((doc) => {
        fetchedMap.set(doc.id, doc.data() as Account);
      });

      const fetchedList = Array.from(fetchedMap.values());
      fetchedList.sort((a, b) => a.name.localeCompare(b.name));

      setAccounts(fetchedList);
      localStorage.setItem('sales_sidekik_accounts_cache', JSON.stringify(fetchedList));
    } catch (e) {
      console.error("[AccountsSync] Sync Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Upsert a single account. Uses Map to ensure no duplicates.
   */
  const saveAccount = async (account: Account) => {
    if (!account.id) account.id = crypto.randomUUID();

    // 1. Optimistic Update
    setAccounts(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      map.set(account.id, account);
      
      const updatedList = Array.from(map.values());
      // Optional: Resort? Usually keeping order is better for UX, or sort by name
      // updatedList.sort((a, b) => a.name.localeCompare(b.name)); 
      
      localStorage.setItem('sales_sidekik_accounts_cache', JSON.stringify(updatedList));
      return updatedList;
    });

    // 2. Remote Update
    if (uid && !isMock) {
      setIsSyncing(true);
      try {
        const docRef = doc(db, 'users', uid, 'accounts', account.id);
        await setDoc(docRef, JSON.parse(JSON.stringify(account))); // Ensure clean JSON
      } catch (e) {
        console.error(`[AccountsSync] Save failed for ${account.id}`, e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  /**
   * Delete a single account.
   */
  const deleteAccount = async (id: string) => {
    // 1. Optimistic Update
    setAccounts(prev => {
      const updated = prev.filter(a => a.id !== id);
      localStorage.setItem('sales_sidekik_accounts_cache', JSON.stringify(updated));
      return updated;
    });

    // 2. Remote Update
    if (uid && !isMock) {
      setIsSyncing(true);
      try {
        const docRef = doc(db, 'users', uid, 'accounts', id);
        await deleteDoc(docRef);
      } catch (e) {
        console.error(`[AccountsSync] Delete failed for ${id}`, e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  /**
   * Bulk Delete.
   * Removes multiple accounts by ID.
   */
  const bulkDelete = async (idsToDelete: string[]) => {
    if (!idsToDelete.length) return;

    // 1. Optimistic Update
    setAccounts(prev => {
      const idSet = new Set(idsToDelete);
      const updated = prev.filter(a => !idSet.has(a.id));
      localStorage.setItem('sales_sidekik_accounts_cache', JSON.stringify(updated));
      return updated;
    });

    // 2. Remote Batch Delete
    if (uid && !isMock) {
      setIsSyncing(true);
      try {
        // Parallel deletions
        await Promise.all(idsToDelete.map(id => {
             const docRef = doc(db, 'users', uid, 'accounts', id);
             return deleteDoc(docRef);
        }));
      } catch (e) {
        console.error("[AccountsSync] Bulk delete failed", e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  /**
   * Bulk Upsert. Critical for "Analyze & Enrich" feature.
   * Merges new list into existing list using Map to prevent duplicates.
   */
  const bulkSave = async (updates: Account[]) => {
    // 1. Optimistic Merge
    setAccounts(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      updates.forEach(acc => {
        if (!acc.id) acc.id = crypto.randomUUID();
        map.set(acc.id, acc);
      });
      
      const mergedList = Array.from(map.values());
      // mergedList.sort((a, b) => a.name.localeCompare(b.name));
      
      localStorage.setItem('sales_sidekik_accounts_cache', JSON.stringify(mergedList));
      return mergedList;
    });

    // 2. Remote Batch Update
    if (uid && !isMock) {
      setIsSyncing(true);
      try {
        // Firestore batch is limited to 500 ops. We'll do parallel promises for simplicity
        // in this "Senior Architect" fix, but for huge lists, chunking is recommended.
        await Promise.all(updates.map(acc => {
          const docRef = doc(db, 'users', uid, 'accounts', acc.id);
          return setDoc(docRef, JSON.parse(JSON.stringify(acc)));
        }));
      } catch (e) {
        console.error("[AccountsSync] Bulk save failed", e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return { 
    accounts, 
    saveAccount, 
    deleteAccount, 
    bulkSave, 
    bulkDelete, // Exported new function
    isLoading, 
    isSyncing 
  };
}
