
export type Dir = 'up' | 'down' | 'left' | 'right';

export type Vec = {
  x: number;
  y: number;
};

export type GameState = {
  snake: Vec[];
  food: Vec;
  direction: Dir;
  score: number;
  gameOver: boolean;
};

export const GRID_SIZE = 20;

export function createGame(): GameState {
  return {
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ],
    food: { x: 15, y: 10 },
    direction: 'right',
    score: 0,
    gameOver: false
  };
}

export function changeDirection(
  state: GameState,
  direction: Dir
): GameState {
  const opposite: Record<Dir, Dir> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  };

  if (opposite[state.direction] === direction) {
    return state;
  }

  return { ...state, direction };
}

export function moveGame(state: GameState): GameState {
  if (state.gameOver) return state;

  const head = { ...state.snake[0] };

  if (state.direction === 'up') head.y--;
  if (state.direction === 'down') head.y++;
  if (state.direction === 'left') head.x--;
  if (state.direction === 'right') head.x++;

  const ateFood =
    head.x === state.food.x &&
    head.y === state.food.y;

  const body = ateFood
    ? state.snake
    : state.snake.slice(0, -1);

  const hitWall =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= GRID_SIZE ||
    head.y >= GRID_SIZE;

  const hitSelf = body.some(
    part => part.x === head.x && part.y === head.y
  );

  if (hitWall || hitSelf) {
    return { ...state, gameOver: true };
  }

  const snake = [head, ...body];

  return {
    ...state,
    snake,
    score: ateFood ? state.score + 10 : state.score,
    food: ateFood
      ? {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        }
      : state.food
  };
}
