export type TimeOfDayPhase = 'dawn' | 'day' | 'dusk' | 'night' | 'midnight';

export interface TimeOfDayInfo {
  phase: TimeOfDayPhase;
  greeting: string;
  label: string;
}

export function getTimeOfDayInfo(date: Date = new Date()): TimeOfDayInfo {
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) {
    return {
      phase: 'dawn',
      greeting: 'Good morning',
      label: 'First Light',
    };
  }
  if (hour >= 8 && hour < 17) {
    return {
      phase: 'day',
      greeting: hour < 12 ? 'Good morning' : 'Good afternoon',
      label: 'Daylight',
    };
  }
  if (hour >= 17 && hour < 20) {
    return {
      phase: 'dusk',
      greeting: 'Good evening',
      label: 'Twilight',
    };
  }
  if (hour >= 20 && hour < 24) {
    return {
      phase: 'night',
      greeting: 'Good evening',
      label: 'Starlight',
    };
  }
  return {
    phase: 'midnight',
    greeting: 'Late night',
    label: 'Midnight',
  };
}
