import { useEffect, useRef } from 'react';
import PuzzleEngine from '../engine/PuzzleEngine';
import { playSnapSound } from '../utils/audio';

export default function PuzzleCanvas({
  levelConfig,
  imageBitmap,
  isMuted,
  onLevelComplete,
  onProgress,
  runKey
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const mutedRef = useRef(isMuted);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!canvasRef.current || !imageBitmap) {
      return undefined;
    }

    const engine = new PuzzleEngine({
      canvas: canvasRef.current,
      imageBitmap,
      levelConfig,
      onProgress,
      onLevelComplete,
      onSnap: () => {
        playSnapSound({ muted: mutedRef.current });
      }
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [imageBitmap, levelConfig, onLevelComplete, onProgress, runKey]);

  return <canvas ref={canvasRef} className="puzzle-canvas" aria-label="Jigsaw puzzle canvas" />;
}
