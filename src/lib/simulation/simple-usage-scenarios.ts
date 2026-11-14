/**
 * Illustrative daily active-use scenarios, not demographic screen-on-time measurements.
 * Public mobile-internet and social-media averages inform the middle scenario,
 * but do not determine the activity split or imply a validated population distribution.
 */
export type SimpleUsagePreset = 'Light' | 'Typical' | 'Heavy';

export const SIMPLE_USAGE_SCENARIOS: Record<SimpleUsagePreset, {
  webHours: string;
  videoHours: string;
  gamingHours: string;
  description: string;
  disclaimer: string;
}> = {
  Light: {
    webHours: '0.75',
    videoHours: '0.75',
    gamingHours: '0.1',
    description: 'About 1 h 36 min of active browsing, video and light gaming daily.',
    disclaimer: 'Illustrative lighter-use scenario; messaging and background time are not separately measured.',
  },
  Typical: {
    webHours: '1.5',
    videoHours: '1.5',
    gamingHours: '0.5',
    description: 'About 3 h 30 min of mixed browsing, video and gaming daily.',
    disclaimer: 'Illustrative balanced-use scenario informed by broad online activity research, not a measured average smartphone workload.',
  },
  Heavy: {
    webHours: '2.5',
    videoHours: '2.5',
    gamingHours: '1.5',
    description: 'About 6 h 30 min of active browsing, video and gaming daily.',
    disclaimer: 'Illustrative demanding-use scenario, not a representative population average.',
  },
};
