import { useState, useEffect, useCallback } from 'react';
import { LocationResult, Coordinates } from '../types';
import { calculateHaversineDistance } from './geocodingService';

const STORAGE_KEY = 'openmap_recent_searches_v2';
const EVENT_NAME = 'openmap_recent_searches_changed';

const INITIAL_RECENTS: LocationResult[] = [
  {
    id: 'rec-b60-sharjah',
    name: 'B60 Burgers - Muwaileh',
    displayName: 'B60 Burgers - Muwaileh, Muwaileh Commercial - Industrial Area - Sharjah',
    subtitle: 'Muwaileh Commercial - Industrial Area - Sharjah',
    lat: 25.297422,
    lng: 55.459045,
    category: 'food',
  },
  {
    id: 'rec-arabian-majlis',
    name: 'Arabian Majlis Restaurant',
    displayName: 'Arabian Majlis Restaurant, University City Rd - Muwaileh Commercial - Sharjah',
    subtitle: 'University City Rd - Muwaileh Commercial - Sharjah',
    lat: 25.301416,
    lng: 55.452814,
    category: 'food',
  }
];

export function getRecentSearches(proximity?: Coordinates | null): LocationResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let items: LocationResult[] = [];
    if (raw) {
      items = JSON.parse(raw);
    } else {
      items = INITIAL_RECENTS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    if (proximity) {
      return items.map((item) => ({
        ...item,
        distanceFromUser: calculateHaversineDistance(proximity, { lat: item.lat, lng: item.lng }),
      }));
    }
    return items;
  } catch (e) {
    console.warn('Failed to read recent searches from localStorage:', e);
    return INITIAL_RECENTS;
  }
}

export function saveRecentSearch(place: LocationResult): LocationResult[] {
  try {
    const existing = getRecentSearches(null);
    // Remove if already exists (by id or close coordinates or exact name)
    const filtered = existing.filter(
      (item) =>
        item.id !== place.id &&
        item.name.toLowerCase().trim() !== place.name.toLowerCase().trim() &&
        !(Math.abs(item.lat - place.lat) < 0.0001 && Math.abs(item.lng - place.lng) < 0.0001)
    );

    // Clean place object to store essential fields
    const newEntry: LocationResult = {
      id: place.id || `loc-${Date.now()}`,
      name: place.name,
      displayName: place.displayName || place.name,
      subtitle: place.subtitle || place.displayName,
      lat: place.lat,
      lng: place.lng,
      category: place.category || 'place',
    };

    const updated = [newEntry, ...filtered].slice(0, 20); // Keep top 20
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    return updated;
  } catch (e) {
    console.warn('Failed to save recent search to localStorage:', e);
    return [];
  }
}

export function removeRecentSearch(id: string | number): LocationResult[] {
  try {
    const existing = getRecentSearches(null);
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    return updated;
  } catch (e) {
    console.warn('Failed to remove recent search:', e);
    return [];
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch (e) {
    console.warn('Failed to clear recent searches:', e);
  }
}

export function useRecentSearches(proximity?: Coordinates | null) {
  const [recents, setRecents] = useState<LocationResult[]>(() => getRecentSearches(proximity));

  const refresh = useCallback(() => {
    setRecents(getRecentSearches(proximity));
  }, [proximity]);

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const addRecent = useCallback((place: LocationResult) => {
    saveRecentSearch(place);
  }, []);

  const removeRecent = useCallback((id: string | number) => {
    removeRecentSearch(id);
  }, []);

  const clearAll = useCallback(() => {
    clearRecentSearches();
  }, []);

  return { recents, addRecent, removeRecent, clearAll };
}
