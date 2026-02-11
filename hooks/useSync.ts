import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore/lite';
import { auth, db, isMock, onAuthStateChanged } from '../services/firebase';

/**
 * Custom hook for synchronized state between React, LocalStorage, and Firestore.
 * Implements an optimistic update pattern and an "Auto-Heal" rescue logic.
 */
export function useSync<T>(key: string, initialValue: T) {
  // Initialize state from LocalStorage for instant perceived performance
  const [data, setData] = useState<T>(() => {
    const saved = localStorage.getItem(`sales_sidekik_${key}`);
    try {
      return saved ? JSON.parse(saved) : initialValue;
    } catch (e) {
      console.warn(`[Sync] Failed to parse local storage for ${key}`, e);
      return initialValue;
    }
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    if (isMock) {
      console.info(`[Sync] Running in Mock Mode for ${key}`);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        
        // --- INITIALIZATION & AUTO-HEAL LOGIC ---
        const reconcileWithCloud = async () => {
          try {
            const docRef = doc(db, 'users', user.uid, 'sync', key);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
              // Scenario A (Normal): Cloud document exists.
              // Cloud is the single source of truth. Download it and overwrite LocalStorage.
              const cloudVal = snap.data().value as T;
              setData(cloudVal);
              localStorage.setItem(`sales_sidekik_${key}`, JSON.stringify(cloudVal));
              console.debug(`[Sync] ${key} synchronized from Cloud.`);
            } else {
              // Scenario B (Rescue): Cloud document does NOT exist.
              // Check if we have valid data trapped in LocalStorage.
              const trappedData = localStorage.getItem(`sales_sidekik_${key}`);
              if (trappedData) {
                const parsedTrapped = JSON.parse(trappedData);
                // Rescue: Upload the local data to the Cloud immediately to ensure persistence.
                await setDoc(docRef, { 
                  value: parsedTrapped, 
                  updatedAt: new Date().toISOString() 
                }, { merge: true });
                console.info(`[Sync] ${key} rescue triggered: Local data uploaded to Cloud.`);
              }
            }
          } catch (e) {
            console.warn(`[Sync] Reconcile/Rescue failed for ${key}:`, e);
          }
        };
        
        reconcileWithCloud();
      } else {
        setUid(null);
      }
    });

    return unsubscribe;
  }, [key]);

  /**
   * Updates state immediately (optimistic) and persists to both local and cloud storage.
   */
  const saveData = async (newValue: T | ((prev: T) => T)) => {
    // Determine the new value (handling functional updates)
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(data) 
      : newValue;

    // 1. Optimistic Update (UI + LocalStorage)
    setData(resolvedValue);
    localStorage.setItem(`sales_sidekik_${key}`, JSON.stringify(resolvedValue));

    // 2. Cloud Sync (Background)
    if (uid && !isMock && db) {
      setIsSyncing(true);
      try {
        // Deep clone to ensure serializable data and no mutation issues
        const cleanPayload = JSON.parse(JSON.stringify(resolvedValue));
        
        const docRef = doc(db, 'users', uid, 'sync', key);
        await setDoc(docRef, { 
          value: cleanPayload, 
          updatedAt: new Date().toISOString() 
        }, { merge: true });
        
      } catch (e) {
        console.error(`[Sync] Cloud push error for ${key}:`, e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return [data, saveData, isSyncing] as const;
}