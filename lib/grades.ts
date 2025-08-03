export type Grade =
  | 'A+' | 'A' | 'A-'
  | 'B+' | 'B' | 'B-'
  | 'C+' | 'C' | 'C-'
  | 'D' | 'F';

export function gradeFromDeltaPct(x: number): Grade {
  if (x >= 0.25) return 'A+';
  if (x >= 0.18) return 'A';
  if (x >= 0.12) return 'A-';
  if (x >= 0.08) return 'B+';
  if (x >= 0.04) return 'B';
  if (x >= 0.00) return 'B-';
  if (x >= -0.04) return 'C+';
  if (x >= -0.08) return 'C';
  if (x >= -0.12) return 'C-';
  if (x >= -0.20) return 'D';
  return 'F';
}

/** Return a readable color for the grade (teal/green for strong, yellow/orange/red for weaker). */
export function gradeColor(g: Grade): string {
  switch (g) {
    case 'A+': case 'A': case 'A-': return '#5eead4'; // teal-300
    case 'B+': case 'B': case 'B-': return '#6ee7b7'; // emerald-300
    case 'C+': case 'C': case 'C-': return '#fde68a'; // yellow-300
    case 'D':                       return '#fdba74'; // orange-300
    case 'F': default:              return '#f87171'; // red-400
  }
}
