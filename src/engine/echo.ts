export interface EchoState { values: number[]; pending: number | null; moves: number; }
export function echoStep(state: EchoState, signal: number): EchoState {
  if (![0, 1, 2].includes(signal)) return state;
  const values = [...state.values];
  values[signal] = (values[signal] + 1) % 4;
  if (state.pending !== null) values[(state.pending + 1) % 3] = (values[(state.pending + 1) % 3] + 1) % 4;
  return { values, pending: signal, moves: state.moves + 1 };
}
const patterns = [
  { start: [0, 0, 0], path: [0, 1] }, { start: [0, 1, 0], path: [2, 0, 2] },
  { start: [1, 0, 2], path: [1, 2, 0] }, { start: [2, 1, 0], path: [0, 2, 1, 0] },
  { start: [0, 2, 1], path: [2, 2, 0, 1] }, { start: [1, 1, 1], path: [1, 0, 2, 1, 2] },
  { start: [3, 0, 2], path: [0, 1, 0, 2, 2, 1] }, { start: [2, 3, 1], path: [2, 0, 1, 0, 1, 2] },
];
export const ECHO_LEVELS = patterns.map((pattern, index) => ({
  id: `echo-${index + 1}`, name: `Sinal ${index + 1}`, start: pattern.start,
  target: pattern.path.reduce(echoStep, { values: pattern.start, pending: null, moves: 0 } as EchoState).values,
  limit: pattern.path.length + 3, solution: pattern.path,
}));
export function echoSolved(state: EchoState, target: number[]): boolean { return state.values.every((value, index) => value === target[index]); }
