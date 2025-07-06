import { useEffect, useState } from 'react';

let version = 0;
const listeners: (() => void)[] = [];

export function useRecipeSync() {
  const [, setTick] = useState(0);
  function onSync() { setTick(t => t + 1); }
  useEffect(() => {
    listeners.push(onSync);
    return () => {
      const idx = listeners.indexOf(onSync);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return version;
}

export function triggerRecipeSync() {
  version++;
  listeners.forEach(fn => fn());
} 