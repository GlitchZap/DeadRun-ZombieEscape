import React, { useState, useEffect } from "react";
import Confetti from "react-confetti";

const MOVES = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const getGridSize = (level) => (level <= 1 ? 6 : level <= 4 ? 8 : level <= 7 ? 10 : 12);
const getZombieCount = (level) => {
    if (level === 1) return 1;
    if (level >= 2 && level <= 4) return 2;
    if (level >= 5 && level <= 8) return 3;
    if (level >= 9) return 4;
  };

const getManhattanDistance = (pos1, pos2) => {
  return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
};

const getZombieMove = (zombiePos, playerPos, obstacles, gridSize) => {
  let bestMove = null;
  let shortestDistance = Infinity;
  
  for (const [dx, dy] of MOVES) {
    const newX = zombiePos[0] + dx;
    const newY = zombiePos[1] + dy;
    
    if (newX >= 0 && newX < gridSize && 
        newY >= 0 && newY < gridSize && 
        !obstacles.has(`${newX},${newY}`)) {
      
      const distance = getManhattanDistance([newX, newY], playerPos);
      const randomFactor = Math.random() * 0.3;
      const adjustedDistance = distance + randomFactor;
      
      if (adjustedDistance < shortestDistance) {
        shortestDistance = adjustedDistance;
        bestMove = [dx, dy];
      }
    }
  }
  
  return bestMove || [0, 0];
};

const bfs = (start, target, obstacles, gridSize) => {
  let queue = [[start]];
  let visited = new Set();
  visited.add(`${start[0]},${start[1]}`);

  while (queue.length) {
    let path = queue.shift();
    let [x, y] = path[path.length - 1];

    if (x === target[0] && y === target[1]) return path;

    for (let [dx, dy] of MOVES) {
      let nx = x + dx, ny = y + dy;
      let key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize && !visited.has(key) && !obstacles.has(key)) {
        visited.add(key);
        queue.push([...path, [nx, ny]]);
      }
    }
  }
  return null;
};

const generateExit = (gridSize) => {
  let x, y;
  do {
    x = Math.floor(Math.random() * gridSize);
    y = Math.floor(Math.random() * gridSize);
  } while (x === gridSize - 1 && y === gridSize - 1);
  return [x, y];
};

const generateObstacles = (exit, gridSize, level) => {
  let obstacles = new Set();
  let maxObstacles = 5 + Math.floor(level * 1.5);

  do {
    obstacles.clear();
    while (obstacles.size < maxObstacles) {
      let x = Math.floor(Math.random() * gridSize);
      let y = Math.floor(Math.random() * gridSize);
      let key = `${x},${y}`;
      if (key !== "0,0" && key !== `${exit[0]},${exit[1]}` && key !== `${gridSize-1},${gridSize-1}`) {
        obstacles.add(key);
      }
    }
  } while (!bfs([gridSize - 1, gridSize - 1], exit, obstacles, gridSize));

  return obstacles;
};

const initializeLevel = (level) => {
  const gridSize = getGridSize(level);
  const exit = generateExit(gridSize);
  const obstacles = generateObstacles(exit, gridSize, level);
  const player = [gridSize - 1, gridSize - 1];
  
  const minDistanceFromPlayer = Math.floor(gridSize / 3);
  const zombies = [];
  const zombieCount = getZombieCount(level);
  
  while (zombies.length < zombieCount) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    
    const distanceFromPlayer = getManhattanDistance([x, y], player);
    const tooCloseToOtherZombies = zombies.some(
      z => getManhattanDistance([x, y], z) < 2
    );
    
    if (distanceFromPlayer >= minDistanceFromPlayer && 
        !tooCloseToOtherZombies && 
        !obstacles.has(`${x},${y}`)) {
      zombies.push([x, y]);
    }
  }
  
  return {
    gridSize,
    exit,
    obstacles,
    player,
    zombiePositions: zombies,
    playerPath: [player]
  };
};

const moveZombies = (playerPos, currentZombies, obstacles, gridSize) => {
  return currentZombies.map(zombie => {
    const [move_x, move_y] = getZombieMove(
      zombie,
      playerPos,
      obstacles,
      gridSize
    );
    
    const new_x = zombie[0] + move_x;
    const new_y = zombie[1] + move_y;
    
    if (new_x >= 0 && new_x < gridSize &&
        new_y >= 0 && new_y < gridSize &&
        !obstacles.has(`${new_x},${new_y}`)) {
      return [new_x, new_y];
    }
    return zombie;
  });
};

const BackgroundEffects = () => (
  <div className="fixed inset-0 pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-black/50" />
  </div>
);

const GraffitiPath = ({ path, gridSize }) => {
  return path.map((pos, index) => (
    <div
      key={index}
      className="absolute w-2 h-2 rounded-full animate-pulse"
      style={{
        left: `${(pos[1] * 40) + 20}px`,
        top: `${(pos[0] * 40) + 20}px`,
        backgroundColor: `hsl(${index * (360 / path.length)}, 70%, 50%)`,
        opacity: 0.6,
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 10px currentColor',
        animation: 'pulse 2s infinite'
      }}
    />
  ));
};

const GameBoard = () => {
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState(initializeLevel(1));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [deathPosition, setDeathPosition] = useState(null);
  const [moves, setMoves] = useState(0);
  const [shake, setShake] = useState(false);

  const optimalPath = bfs(
    [gameState.gridSize - 1, gameState.gridSize - 1], 
    gameState.exit, 
    gameState.obstacles, 
    gameState.gridSize
  );

  const movePlayer = (dx, dy) => {
    if (gameOver) return;

    let [px, py] = gameState.player;
    let nx = px + dx, ny = py + dy;
    let key = `${nx},${ny}`;

    if (nx >= 0 && nx < gameState.gridSize && 
        ny >= 0 && ny < gameState.gridSize && 
        !gameState.obstacles.has(key)) {
      
      const newPlayerPos = [nx, ny];
      setMoves(prev => prev + 1);
      
      const newZombiePositions = moveZombies(
        newPlayerPos,
        gameState.zombiePositions,
        gameState.obstacles,
        gameState.gridSize
      );
      
      setGameState(prev => ({
        ...prev,
        player: newPlayerPos,
        zombiePositions: newZombiePositions,
        playerPath: [...prev.playerPath, newPlayerPos]
      }));

      if (nx === gameState.exit[0] && ny === gameState.exit[1]) {
        setGameOver(true);
        setWon(true);
        setShowAnalytics(true);
        return;
      }

      const collision = newZombiePositions.some(([zx, zy]) => 
        zx === nx && zy === ny
      );

      if (collision) {
        setDeathPosition(newPlayerPos);
        setGameOver(true);
        setWon(false);
        setShowAnalytics(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowUp") movePlayer(-1, 0);
    if (event.key === "ArrowDown") movePlayer(1, 0);
    if (event.key === "ArrowLeft") movePlayer(0, -1);
    if (event.key === "ArrowRight") movePlayer(0, 1);
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.player, gameOver]);

  const handleNextLevel = () => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setGameState(initializeLevel(nextLevel));
    setGameOver(false);
    setWon(false);
    setShowAnalytics(false);
    setStartTime(Date.now());
    setDeathPosition(null);
    setMoves(0);
  };

  const handleRestart = () => {
    setLevel(1);
    setGameState(initializeLevel(1));
    setGameOver(false);
    setWon(false);
    setShowAnalytics(false);
    setStartTime(Date.now());
    setDeathPosition(null);
    setMoves(0);
  };

  const handleRestartLevel = () => {
    setGameState(initializeLevel(level));
    setGameOver(false);
    setWon(false);
    setShowAnalytics(false);
    setStartTime(Date.now());
    setDeathPosition(null);
    setMoves(0);
  };

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-6 relative overflow-hidden">
      <BackgroundEffects />
      {won && <Confetti />}
      <div className="flex justify-between items-center w-full max-w-2xl mb-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            🧟 Zombie Escape - Level {level}
          </h1>
          <p className="text-gray-400">⏳ Time: {elapsedTime}s | 🚶 Moves: {moves}</p>
        </div>
        <button 
          onClick={handleRestart}
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-all transform hover:scale-105 active:scale-95"
        >
          Restart Game
        </button>
      </div>

      {gameOver && !won && (
        <div className="text-red-500 text-2xl mb-4 animate-bounce font-bold">
          Game Over! 💀
        </div>
      )}

      <div 
        className={`relative grid gap-1 border-2 border-white/30 p-2 bg-black/50 backdrop-blur-sm transition-all duration-200 ${
          shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
        style={{ 
          gridTemplateColumns: `repeat(${gameState.gridSize}, 40px)`,
          animation: shake ? 'shake 0.5s ease-in-out' : 'none'
        }}
      >
        {Array.from({ length: gameState.gridSize }).map((_, row) =>
          Array.from({ length: gameState.gridSize }).map((_, col) => {
            let key = `${row},${col}`;
            const isDeathPosition = deathPosition && deathPosition[0] === row && deathPosition[1] === col;
            
            return (
              <div 
                key={key} 
                className={`w-10 h-10 flex items-center justify-center border transition-all duration-200 transform hover:scale-105 ${
                  isDeathPosition ? "bg-red-700 animate-pulse" :
                  gameState.player[0] === row && gameState.player[1] === col ? "bg-blue-500 animate-bounce" :
                  gameState.zombiePositions.some(([zx, zy]) => zx === row && zy === col) ? "bg-red-500 animate-pulse" :
                  gameState.exit[0] === row && gameState.exit[1] === col ? "bg-yellow-500 animate-pulse" :
                  gameState.obstacles.has(key) ? "bg-gray-500" : "bg-black/50"
                }`}
              >
                {isDeathPosition ? "💀" :
                 gameState.player[0] === row && gameState.player[1] === col ? "🧑" : 
                 gameState.zombiePositions.some(([zx, zy]) => zx === row && zy === col) ? "🧟" : 
                 gameState.exit[0] === row && gameState.exit[1] === col ? "🚪" : ""}
              </div>
            );
          })
        )}
        {won && <GraffitiPath path={gameState.playerPath} gridSize={gameState.gridSize} />}
      </div>

      {showAnalytics && (
        <div className="bg-gray-800/80 backdrop-blur-sm p-4 mt-4 rounded-lg shadow-lg w-full max-w-2xl animate-fadeIn">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            📊 Level Stats
          </h2>
          <p>Time Taken: {elapsedTime}s</p>
          <p>Steps Taken: {moves}</p>
          <p>Optimal Path Length: {optimalPath ? optimalPath.length - 1 : 'N/A'}</p>
          <p>Zombie Count: {gameState.zombiePositions.length}</p>

          <h3 className="text-lg font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-600">
            🚶 Path Taken
          </h3>
          <div className="text-sm overflow-x-auto">
            {gameState.playerPath.map((pos, idx) => (
              <span key={idx} className="inline-block mr-2 animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
                ({pos[0]}, {pos[1]})
                {idx < gameState.playerPath.length - 1 ? " → " : ""}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-1 border-2 border-green-400/30 p-2 backdrop-blur-sm"
            style={{ gridTemplateColumns: `repeat(${gameState.gridSize}, 20px)` }}>
            {Array.from({ length: gameState.gridSize }).map((_, row) =>
              Array.from({ length: gameState.gridSize }).map((_, col) => (
                <div
                  key={`${row},${col}`}
                  className={`w-5 h-5 transition-all duration-300 ${
                    optimalPath?.some(([x, y]) => x === row && y === col)
                      ? "bg-green-500/50 animate-pulse"
                      : "bg-gray-700/30"
                  }`}
                />
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-4">
        {gameOver && (
          <button 
            onClick={handleRestartLevel} 
            className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95"
          >
            Retry Level
          </button>
        )}
        {won && (
          <button 
            onClick={handleNextLevel} 
            className="bg-green-500 px-4 py-2 rounded hover:bg-green-600 transition-all transform hover:scale-105 active:scale-95"
          >
            Next Level
          </button>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default GameBoard;