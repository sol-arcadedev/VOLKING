import { useState, useEffect } from 'react';
import { getTimeUntilNextRound } from '../utils/helpers';
import type { CountdownTimer } from '../types';

/**
 * Custom hook for countdown timer
 */
export const useCountdown = (): CountdownTimer => {
  const [timer, setTimer] = useState<CountdownTimer>(getTimeUntilNextRound());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(getTimeUntilNextRound());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return timer;
};
