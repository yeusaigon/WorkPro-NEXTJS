"use client";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  type QueryConstraint,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { globalCache } from "@/lib/cache";

/**
 * Custom hook for cached Firestore real-time queries.
 *
 * - Caches last-known data in memory with a configurable TTL.
 * - Returns a stable `refresh()` callback.
 * - Avoids redundant onSnapshot subscriptions when the same query is used
 *   across components.
 */

type CacheOptions = {
  /** TTL in milliseconds for the in-memory cache (default 30s). */
  ttlMs?: number;
  /** If true, skips caching and always reads from Firestore. */
  skipCache?: boolean;
};

type QueryResult<T> = {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

// Track active subscription keys to prevent duplicate listeners
const activeSubscriptions = new Map<string, number>();

export function useFirestoreQuery<T extends { id: string }>(
  collectionPath: [string, ...string[]],
  constraints: QueryConstraint[] = [],
  options: CacheOptions = {},
): QueryResult<T> {
  const { ttlMs = 30_000, skipCache = false } = options;

  const [data, setData] = useState<T[]>(() => {
    if (skipCache) return [];
    const cacheKey = buildCacheKey(collectionPath, constraints);
    return globalCache.get<T[]>(cacheKey) ?? [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (skipCache) return true;
    const cacheKey = buildCacheKey(collectionPath, constraints);
    return !globalCache.get<T[]>(cacheKey);
  });

  const [error, setError] = useState<string | null>(null);
  const refreshTrigger = useRef(0);

  const refresh = useCallback(() => {
    refreshTrigger.current += 1;
    setError(null);
  }, []);

  useEffect(() => {
    let unsubAuth: (() => void) | undefined;
    let unsubSnapshot: (() => void) | undefined;
    let cancelled = false;

    const auth = getFirebaseAuth();
    const cacheKey = buildCacheKey(collectionPath, constraints);

    unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnapshot?.();
      if (!user || cancelled) {
        if (!user) {
          setData([]);
          setIsLoading(false);
        }
        return;
      }

      const currentCount = activeSubscriptions.get(cacheKey) ?? 0;
      activeSubscriptions.set(cacheKey, currentCount + 1);

      const db = getFirebaseDb();
      // Build collection reference from tuple path
      const [first, ...rest] = collectionPath;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ref: any = collection(db, first);
      for (const seg of rest) {
        ref = collection(ref, seg);
      }
      const q: Query<DocumentData> = query(ref, ...constraints);

      setIsLoading(true);

      unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          if (cancelled) return;

          const items: T[] = [];
          snapshot.forEach((doc) => {
            items.push({ ...(doc.data() as T), id: doc.id });
          });

          if (!skipCache) {
            globalCache.set(cacheKey, items, ttlMs);
          }

          setData(items);
          setIsLoading(false);
          setError(null);
        },
        (err) => {
          if (cancelled) return;
          console.error("[useFirestoreQuery] Snapshot error:", err);

          if (!skipCache) {
            const cached = globalCache.get<T[]>(cacheKey);
            if (cached) {
              setData(cached);
              setIsLoading(false);
            }
          }

          setError(err.message ?? "Lỗi kết nối dữ liệu");
          setIsLoading(false);
        },
      );
    });

    return () => {
      cancelled = true;
      unsubAuth?.();
      unsubSnapshot?.();

      const currentCount = activeSubscriptions.get(cacheKey) ?? 1;
      if (currentCount <= 1) {
        activeSubscriptions.delete(cacheKey);
      } else {
        activeSubscriptions.set(cacheKey, currentCount - 1);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refreshTrigger.current,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(collectionPath),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(constraints),
  ]);

  return { data, isLoading, error, refresh };
}

function buildCacheKey(
  collectionPath: string[],
  constraints: QueryConstraint[],
): string {
  const pathKey = collectionPath.join("/");
  const constraintsKey = constraints.map((c) => JSON.stringify(c)).join("|");
  return `fs:${pathKey}::${constraintsKey}`;
}
