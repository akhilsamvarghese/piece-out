import { useCallback, useEffect, useMemo, useState } from 'react';
import PuzzleCanvas from './components/PuzzleCanvas';
import UIOverlay from './components/UIOverlay';
import EffectsLayer from './components/EffectsLayer';
import { LEVELS, getLevelConfig } from './engine/levels';
import { generatePuzzleImage } from './utils/generatePuzzleImage';
import testPuzzleImage from './assets/pic.png';
import thhLogo from './assets/icons/THH.png';

const INITIAL_STATE = {
  currentLevel: 1,
  status: 'IDLE',
  isMuted: true
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function App() {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [progress, setProgress] = useState({ snapped: 0, total: 0 });
  const [runKey, setRunKey] = useState(0);
  const [effectKey, setEffectKey] = useState(0);
  const [sourceImage, setSourceImage] = useState(null);

  const [imageCache, setImageCache] = useState(() => new Map());

  const levelConfig = useMemo(() => getLevelConfig(gameState.currentLevel), [gameState.currentLevel]);
  const currentImage = imageCache.get(gameState.currentLevel) || null;

  useEffect(() => {
    let cancelled = false;

    loadImage(testPuzzleImage)
      .then((loadedImage) => {
        if (!cancelled) {
          setSourceImage(loadedImage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourceImage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setImageCache((previous) => {
      const nextCache = new Map(previous);
      const levelsToKeep = [gameState.currentLevel, gameState.currentLevel + 1].filter(
        (level) => level <= LEVELS.length
      );

      for (const level of levelsToKeep) {
        if (sourceImage) {
          nextCache.set(level, sourceImage);
        } else if (!nextCache.has(level)) {
          nextCache.set(level, generatePuzzleImage(getLevelConfig(level)));
        }
      }

      for (const key of nextCache.keys()) {
        if (!levelsToKeep.includes(key)) {
          nextCache.delete(key);
        }
      }

      return nextCache;
    });
  }, [gameState.currentLevel, sourceImage]);

  const beginPlay = useCallback(() => {
    setGameState((previous) => ({ ...previous, status: 'PLAYING' }));
    setProgress({ snapped: 0, total: 0 });
    setRunKey((value) => value + 1);
  }, []);

  const handleProgress = useCallback((snappedCount, totalCount) => {
    setProgress({ snapped: snappedCount, total: totalCount });
  }, []);

  const handleLevelComplete = useCallback(() => {
    setEffectKey((value) => value + 1);
    setGameState((previous) => {
      if (previous.currentLevel >= LEVELS.length) {
        return { ...previous, status: 'FINISHED' };
      }
      return { ...previous, status: 'COMPLETED' };
    });
  }, []);

  const handleNextLevel = useCallback(() => {
    setGameState((previous) => ({
      ...previous,
      currentLevel: Math.min(previous.currentLevel + 1, LEVELS.length),
      status: 'PLAYING'
    }));
    setProgress({ snapped: 0, total: 0 });
    setRunKey((value) => value + 1);
  }, []);

  const handleReplayLevel = useCallback(() => {
    setGameState((previous) => ({ ...previous, status: 'PLAYING' }));
    setProgress({ snapped: 0, total: 0 });
    setRunKey((value) => value + 1);
  }, []);

  const handleRestartAll = useCallback(() => {
    setGameState((previous) => ({ ...previous, currentLevel: 1, status: 'PLAYING' }));
    setProgress({ snapped: 0, total: 0 });
    setRunKey((value) => value + 1);
  }, []);

  const toggleMute = useCallback(() => {
    setGameState((previous) => ({ ...previous, isMuted: !previous.isMuted }));
  }, []);

  const showPuzzle =
    gameState.status === 'PLAYING' || gameState.status === 'COMPLETED' || gameState.status === 'FINISHED';

  return (
    <div className="app-shell">
      <header className="hero-band" aria-label="Jigsaw flow theme header">
        <h1 className="hero-title">Jigsaw Flow</h1>
        <p className="hero-subtitle">Drag, snap, and finish 3 quick levels.</p>
      </header>

      <main className="game-frame">
        <img src={thhLogo} alt="TinkHerHack logo" className="stage-logo" />
        <section className="game-surface">
          <p className="stage-label">
            LEVEL {gameState.currentLevel} · {levelConfig.rows}×{levelConfig.cols}
          </p>

          {showPuzzle && currentImage ? (
            <PuzzleCanvas
              runKey={runKey}
              levelConfig={levelConfig}
              imageBitmap={currentImage}
              isMuted={gameState.isMuted}
              onLevelComplete={handleLevelComplete}
              onProgress={handleProgress}
            />
          ) : (
            <div className="idle-stage" aria-hidden="true" />
          )}

          <UIOverlay
            status={gameState.status}
            currentLevel={gameState.currentLevel}
            maxLevel={LEVELS.length}
            progress={progress}
            isMuted={gameState.isMuted}
            onStart={beginPlay}
            onNext={handleNextLevel}
            onReplayLevel={handleReplayLevel}
            onRestartAll={handleRestartAll}
            onToggleMute={toggleMute}
            themeLabel="TOP PICK"
          />
        </section>
      </main>

      <EffectsLayer triggerKey={effectKey} />
    </div>
  );
}
