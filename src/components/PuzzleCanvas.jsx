import { useEffect, useRef } from 'react';
import PuzzleEngine from '../engine/PuzzleEngine';

export default function PuzzleCanvas({
  levelConfig,
  imageBitmap,
  onLevelComplete,
  onProgress,
  runKey
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !imageBitmap) {
      return undefined;
    }

    const engine = new PuzzleEngine({
      canvas: canvasRef.current,
      imageBitmap,
      levelConfig,
      onProgress,
      onLevelComplete
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [imageBitmap, levelConfig, onLevelComplete, onProgress, runKey]);

  return <canvas ref={canvasRef} className="puzzle-canvas" aria-label="Jigsaw puzzle canvas" />;
}
