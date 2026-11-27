import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
}

const CELL_SIZE = 12;
const STEP_MS = 240;
const DEATH_MS = 1200;

const COLORS = {
  head: '#dd5719',
  bodyA: '#ff7a33',
  bodyB: '#ffab73',
  gold: '#ffd700',
  dead: '#ff4d4d',
};

const DIRS: Point[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function SnakeWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = 24;
    const rows = 13;
    canvas.width = cols * CELL_SIZE;
    canvas.height = rows * CELL_SIZE;

    let snake: Point[] = [];
    let dir: Point = { x: 1, y: 0 };
    let apple: Point | null = null;
    let isDead = false;
    let deathAt = 0;
    let lastTick = performance.now();
    let rafId = 0;

    const key = (p: Point) => `${p.x},${p.y}`;
    const inBounds = (p: Point) => p.x >= 0 && p.x < cols && p.y >= 0 && p.y < rows;

    const spawnApple = () => {
      const occupied = new Set(snake.map(key));
      const free: Point[] = [];
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          if (!occupied.has(`${x},${y}`)) free.push({ x, y });
        }
      }
      apple = free.length > 0 ? free[Math.floor(Math.random() * free.length)] : null;
    };

    const reset = () => {
      const sx = Math.floor(cols / 2);
      const sy = Math.floor(rows / 2);
      snake = [
        { x: sx, y: sy },
        { x: sx - 1, y: sy },
        { x: sx - 2, y: sy },
      ];
      dir = { x: 1, y: 0 };
      isDead = false;
      spawnApple();
    };

    // BFS к цели с учётом тела змейки (хвост освобождается)
    const findNextDir = (): Point => {
      const head = snake[0];
      const occupied = new Set(snake.slice(0, -1).map(key));

      const validMoves = DIRS.filter((d) => {
        if (d.x === -dir.x && d.y === -dir.y) return false;
        const next = { x: head.x + d.x, y: head.y + d.y };
        return inBounds(next) && !occupied.has(key(next));
      });

      if (validMoves.length === 0) return dir;

      if (apple) {
        const queue: Array<{ pt: Point; firstDir: Point }> = [];
        const visited = new Set<string>([key(head)]);
        for (const d of validMoves) {
          const next = { x: head.x + d.x, y: head.y + d.y };
          if (next.x === apple.x && next.y === apple.y) return d;
          visited.add(key(next));
          queue.push({ pt: next, firstDir: d });
        }
        while (queue.length > 0) {
          const cur = queue.shift()!;
          for (const d of DIRS) {
            const nxt = { x: cur.pt.x + d.x, y: cur.pt.y + d.y };
            const k = key(nxt);
            if (!inBounds(nxt) || occupied.has(k) || visited.has(k)) continue;
            if (nxt.x === apple.x && nxt.y === apple.y) return cur.firstDir;
            visited.add(k);
            queue.push({ pt: nxt, firstDir: cur.firstDir });
          }
        }
      }

      // Если путь к яблоку закрыт — выбираем направление с максимумом свободных клеток (flood fill)
      let bestDir = validMoves[0];
      let bestArea = -1;
      for (const d of validMoves) {
        const start = { x: head.x + d.x, y: head.y + d.y };
        const seen = new Set<string>([key(start)]);
        const q: Point[] = [start];
        while (q.length > 0) {
          const p = q.shift()!;
          for (const step of DIRS) {
            const n = { x: p.x + step.x, y: p.y + step.y };
            const k = key(n);
            if (inBounds(n) && !occupied.has(k) && !seen.has(k)) {
              seen.add(k);
              q.push(n);
            }
          }
        }
        if (seen.size > bestArea) {
          bestArea = seen.size;
          bestDir = d;
        }
      }
      return bestDir;
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ретро-моргание при смерти (каждые 120 мс)
      if (isDead && Math.floor((now - deathAt) / 120) % 2 !== 0) {
        return;
      }

      // Яблоко — цельный золотой блок
      if (apple) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(apple.x * CELL_SIZE, apple.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }

      // Слитная змейка: убираем зазор в сторону соседних сегментов по цепочке
      const gap = 1;
      for (let i = 0; i < snake.length; i++) {
        const seg = snake[i];
        let gT = gap;
        let gR = gap;
        let gB = gap;
        let gL = gap;

        if (i > 0) {
          const prev = snake[i - 1];
          const dx = prev.x - seg.x;
          const dy = prev.y - seg.y;
          if (dy === -1) gT = 0;
          if (dx === 1) gR = 0;
          if (dy === 1) gB = 0;
          if (dx === -1) gL = 0;
        }

        if (i < snake.length - 1) {
          const next = snake[i + 1];
          const dx = next.x - seg.x;
          const dy = next.y - seg.y;
          if (dy === -1) gT = 0;
          if (dx === 1) gR = 0;
          if (dy === 1) gB = 0;
          if (dx === -1) gL = 0;
        }

        if (i === 0) {
          ctx.fillStyle = COLORS.head;
        } else {
          ctx.fillStyle = Math.floor(i / 3) % 2 === 0 ? COLORS.bodyA : COLORS.bodyB;
        }

        ctx.fillRect(
          seg.x * CELL_SIZE + gL,
          seg.y * CELL_SIZE + gT,
          CELL_SIZE - gL - gR,
          CELL_SIZE - gT - gB,
        );
      }
    };

    const loop = (now: number) => {
      if (isDead) {
        if (now - deathAt >= DEATH_MS) {
          reset();
          lastTick = now;
        }
      } else if (now - lastTick >= STEP_MS) {
        lastTick = now;
        dir = findNextDir();
        const nextHead = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        const willEat = Boolean(apple && nextHead.x === apple.x && nextHead.y === apple.y);
        const bodyToCheck = willEat ? snake : snake.slice(0, -1);

        if (!inBounds(nextHead) || bodyToCheck.some((s) => s.x === nextHead.x && s.y === nextHead.y)) {
          isDead = true;
          deathAt = now;
        } else {
          snake.unshift(nextHead);
          if (willEat) {
            spawnApple();
          } else {
            snake.pop();
          }
        }
      }

      draw(now);
      rafId = requestAnimationFrame(loop);
    };

    reset();
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="hero-preview-wrap hero-snake-wrap" aria-label="Ретро-виджет Змейка">
      <canvas ref={canvasRef} className="hero-snake-canvas" />
    </div>
  );
}
