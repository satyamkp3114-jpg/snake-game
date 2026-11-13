
export interface ScoreEntry {
  score: number;
  length: number;
  date: number;
}

const STORAGE_KEY = 'neon-snake-scores';

export function loadScores(): ScoreEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): {
  scores: ScoreEntry[];
  rank: number;
} {
  const scores = [...loadScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const rank = scores.findIndex(
    s => s === entry
  );

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(scores)
    );
  } catch {
    // Storage unavailable
  }

  return { scores, rank };
}
