import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PuzzleCanvas from './components/PuzzleCanvas';
import UIOverlay from './components/UIOverlay';
import EffectsLayer from './components/EffectsLayer';
import AdminLeaderboard from './components/AdminLeaderboard';
import { LEVELS, getLevelConfig } from './engine/levels';
import { generatePuzzleImage } from './utils/generatePuzzleImage';
import monaLisaImage from './assets/monalisa_Medium.jpeg';
import starryNightImage from './assets/starrynight.jpg';
import tinkerSpaceImage from './assets/tinkerspace.jpeg';
import thhLogo from './assets/icons/THH.png';
import nyanCatGif from './assets/icons/nyan-cat.gif';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { insertCompletedParticipantRun, validateParticipantIdentity } from './services/participantRuns';
import { fetchAdminLeaderboard, signInAdminWithPassword } from './services/adminLeaderboard';
import { VENUE_OPTIONS } from './data/venues';

const INITIAL_STATE = {
  currentLevel: 1,
  status: 'IDLE'
};

const EMPTY_PARTICIPANT_FORM = {
  participantName: '',
  venueName: ''
};

const LEVEL_IMAGE_SOURCES = {
  1: monaLisaImage,
  2: starryNightImage,
  3: tinkerSpaceImage
};
const SESSION_STORAGE_KEY = 'pieceout_admin_session';
const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

function createSubmissionState(status = 'idle', errorMessage = '') {
  return { status, errorMessage };
}

function readStoredAdminSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.accessToken || !parsed?.expiresAt) {
      return null;
    }
    const nowUnix = Math.floor(Date.now() / 1000);
    if (parsed.expiresAt <= nowUnix) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAdminSession(session) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!session) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function createRunId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  const [participantForm, setParticipantForm] = useState(EMPTY_PARTICIPANT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [activeRunMeta, setActiveRunMeta] = useState(null);
  const [submissionState, setSubmissionState] = useState(() => createSubmissionState());
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthState, setAdminAuthState] = useState(() => createSubmissionState());
  const [adminSession, setAdminSession] = useState(() => readStoredAdminSession());
  const [leaderboardState, setLeaderboardState] = useState({
    status: 'idle',
    errorMessage: '',
    rows: []
  });

  const [imageCache, setImageCache] = useState(() => new Map());
  const savedRunIdsRef = useRef(new Set());

  const levelConfig = useMemo(() => getLevelConfig(gameState.currentLevel), [gameState.currentLevel]);
  const currentImage = imageCache.get(gameState.currentLevel) || null;

  useEffect(() => {
    let cancelled = false;
    const levelsToKeep = [gameState.currentLevel, gameState.currentLevel + 1].filter(
      (level) => level <= LEVELS.length
    );

    setImageCache((previous) => {
      const nextCache = new Map(previous);
      for (const key of nextCache.keys()) {
        if (!levelsToKeep.includes(key)) {
          nextCache.delete(key);
        }
      }
      return nextCache;
    });

    for (const level of levelsToKeep) {
      const imageSource = LEVEL_IMAGE_SOURCES[level];
      if (!imageSource) {
        setImageCache((previous) => {
          if (previous.has(level)) {
            return previous;
          }
          const nextCache = new Map(previous);
          nextCache.set(level, generatePuzzleImage(getLevelConfig(level)));
          return nextCache;
        });
        continue;
      }

      loadImage(imageSource)
        .then((loadedImage) => {
          if (cancelled) {
            return;
          }

          setImageCache((previous) => {
            if (previous.has(level)) {
              return previous;
            }
            const nextCache = new Map(previous);
            nextCache.set(level, loadedImage);
            return nextCache;
          });
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setImageCache((previous) => {
            if (previous.has(level)) {
              return previous;
            }
            const nextCache = new Map(previous);
            nextCache.set(level, generatePuzzleImage(getLevelConfig(level)));
            return nextCache;
          });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [gameState.currentLevel]);

  const startRun = useCallback(({ participantName, venueName }) => {
    setParticipantForm({
      participantName,
      venueName
    });
    setFormErrors({});
    setActiveRunMeta({
      runId: createRunId(),
      startedOn: new Date().toISOString()
    });
    setSubmissionState(createSubmissionState());
    setGameState({
      currentLevel: 1,
      status: 'PLAYING'
    });
    setProgress({ snapped: 0, total: 0 });
    setRunKey((value) => value + 1);
  }, []);

  const handleParticipantNameChange = useCallback((value) => {
    setParticipantForm((previous) => ({ ...previous, participantName: value }));
    setFormErrors((previous) => {
      if (!previous.participantName && !previous.global) {
        return previous;
      }
      return {
        ...previous,
        participantName: '',
        global: ''
      };
    });
  }, []);

  const handleVenueNameChange = useCallback((value) => {
    setParticipantForm((previous) => ({ ...previous, venueName: value }));
    setFormErrors((previous) => {
      if (!previous.venueName && !previous.global) {
        return previous;
      }
      return {
        ...previous,
        venueName: '',
        global: ''
      };
    });
  }, []);

  const handleStartSubmit = useCallback(() => {
    if (!isSupabaseConfigured()) {
      setFormErrors((previous) => ({
        ...previous,
        global: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      }));
      return;
    }

    const validation = validateParticipantIdentity(participantForm);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (!VENUE_OPTIONS.includes(validation.values.venueName)) {
      setFormErrors({ venueName: 'Please select a venue from the dropdown list.' });
      return;
    }

    startRun(validation.values);
  }, [participantForm, startRun]);

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
    if (gameState.status === 'FINISHED') {
      setGameState(INITIAL_STATE);
      setProgress({ snapped: 0, total: 0 });
      setRunKey((value) => value + 1);
      setParticipantForm(EMPTY_PARTICIPANT_FORM);
      setFormErrors({});
      setActiveRunMeta(null);
      setSubmissionState(createSubmissionState());
      return;
    }

    const validation = validateParticipantIdentity(participantForm);
    if (!validation.isValid) {
      setGameState(INITIAL_STATE);
      setProgress({ snapped: 0, total: 0 });
      setFormErrors(validation.errors);
      setActiveRunMeta(null);
      setSubmissionState(createSubmissionState());
      return;
    }

    if (!VENUE_OPTIONS.includes(validation.values.venueName)) {
      setGameState(INITIAL_STATE);
      setProgress({ snapped: 0, total: 0 });
      setFormErrors({ venueName: 'Please select a venue from the dropdown list.' });
      setActiveRunMeta(null);
      setSubmissionState(createSubmissionState());
      return;
    }

    startRun(validation.values);
  }, [gameState.status, participantForm, startRun]);

  const saveCompletedRun = useCallback(async () => {
    if (gameState.status !== 'FINISHED' || !activeRunMeta) {
      return;
    }

    if (savedRunIdsRef.current.has(activeRunMeta.runId)) {
      return;
    }

    setSubmissionState(createSubmissionState('saving'));

    try {
      await insertCompletedParticipantRun({
        participantName: participantForm.participantName,
        venueName: participantForm.venueName,
        startedOn: activeRunMeta.startedOn,
        completedOn: new Date().toISOString()
      });
      savedRunIdsRef.current.add(activeRunMeta.runId);
      setSubmissionState(createSubmissionState('success'));
    } catch (error) {
      setSubmissionState(
        createSubmissionState(
          'error',
          error instanceof Error ? error.message : 'Failed to save participant run.'
        )
      );
    }
  }, [activeRunMeta, gameState.status, participantForm.participantName, participantForm.venueName]);

  useEffect(() => {
    if (gameState.status !== 'FINISHED') {
      return;
    }

    if (submissionState.status !== 'idle') {
      return;
    }

    if (!activeRunMeta) {
      setSubmissionState(createSubmissionState('error', 'Run metadata missing. Please restart and try again.'));
      return;
    }

    void saveCompletedRun();
  }, [activeRunMeta, gameState.status, saveCompletedRun, submissionState.status]);

  const handleRetrySave = useCallback(() => {
    if (submissionState.status !== 'error') {
      return;
    }
    void saveCompletedRun();
  }, [saveCompletedRun, submissionState.status]);

  const handleCheatComplete = useCallback(() => {
    if (gameState.status !== 'PLAYING' && gameState.status !== 'COMPLETED') {
      return;
    }

    if (!activeRunMeta) {
      return;
    }

    const finalLevel = LEVELS.length;
    const finalLevelConfig = getLevelConfig(finalLevel);
    const totalPieces = finalLevelConfig.rows * finalLevelConfig.cols;

    setEffectKey((value) => value + 1);
    setSubmissionState(createSubmissionState());
    setGameState({
      currentLevel: finalLevel,
      status: 'FINISHED'
    });
    setProgress({ snapped: totalPieces, total: totalPieces });
    setRunKey((value) => value + 1);
  }, [activeRunMeta, gameState.status]);

  const showPuzzle =
    gameState.status === 'PLAYING' || gameState.status === 'COMPLETED' || gameState.status === 'FINISHED';
  const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const isSupabaseReady = isSupabaseConfigured();
  const isAdminAuthenticated = Boolean(adminSession?.accessToken);

  const loadLeaderboard = useCallback(async () => {
    if (!adminSession?.accessToken) {
      return;
    }

    setLeaderboardState((previous) => ({
      ...previous,
      status: 'loading',
      errorMessage: ''
    }));

    try {
      const rows = await fetchAdminLeaderboard({ accessToken: adminSession.accessToken });
      setLeaderboardState({
        status: 'success',
        errorMessage: '',
        rows
      });
    } catch (error) {
      setLeaderboardState((previous) => ({
        ...previous,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Failed to load leaderboard.'
      }));
    }
  }, [adminSession]);

  useEffect(() => {
    if (!isAdminPage || !isAdminAuthenticated) {
      return;
    }
    void loadLeaderboard();
  }, [isAdminAuthenticated, isAdminPage, loadLeaderboard]);

  const handleAdminSignIn = useCallback(async () => {
    if (!isSupabaseReady) {
      setAdminAuthState(createSubmissionState('error', 'Supabase is not configured.'));
      return;
    }

    setAdminAuthState(createSubmissionState('loading'));

    try {
      const session = await signInAdminWithPassword({
        adminEmail: ADMIN_EMAIL,
        password: adminPasswordInput
      });

      if (ADMIN_EMAIL && String(session.userEmail || '').toLowerCase() !== ADMIN_EMAIL) {
        throw new Error('This account is not allowed for admin access.');
      }

      setAdminSession(session);
      writeStoredAdminSession(session);
      setAdminPasswordInput('');
      setAdminAuthState(createSubmissionState('success'));
      setLeaderboardState((previous) => ({
        ...previous,
        status: 'loading',
        errorMessage: ''
      }));

      try {
        const rows = await fetchAdminLeaderboard({ accessToken: session.accessToken });
        setLeaderboardState({
          status: 'success',
          errorMessage: '',
          rows
        });
      } catch (loadError) {
        setLeaderboardState({
          status: 'error',
          errorMessage: loadError instanceof Error ? loadError.message : 'Failed to load leaderboard.',
          rows: []
        });
      }
    } catch (error) {
      setAdminAuthState(
        createSubmissionState('error', error instanceof Error ? error.message : 'Admin login failed.')
      );
    }
  }, [adminPasswordInput, isSupabaseReady]);

  const handleAdminLogout = useCallback(() => {
    setAdminSession(null);
    writeStoredAdminSession(null);
    setAdminPasswordInput('');
    setAdminAuthState(createSubmissionState());
    setLeaderboardState({ status: 'idle', errorMessage: '', rows: [] });
  }, []);

  return (
    <div className="app-shell">
      <header className="hero-band" aria-label="Jigsaw flow theme header">
        <h1 className="hero-title">Piece Out!</h1>
        <p className="hero-subtitle">Drag, snap, and finish 3 quick levels.</p>
      </header>

      {!isAdminPage ? (
        <main className="game-frame">
          <img src={thhLogo} alt="TinkHerHack logo" className="stage-logo" />
          <img src={nyanCatGif} alt="Nyan cat" className="stage-nyan-cat" />
          <section className="game-surface">
            <p className="stage-label">
              LEVEL {gameState.currentLevel} · {levelConfig.rows}×{levelConfig.cols}
            </p>

            {showPuzzle && currentImage ? (
              <PuzzleCanvas
                runKey={runKey}
                levelConfig={levelConfig}
                imageBitmap={currentImage}
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
              participantName={participantForm.participantName}
              venueName={participantForm.venueName}
              venueOptions={VENUE_OPTIONS}
              formErrors={formErrors}
              submissionState={submissionState}
              onParticipantNameChange={handleParticipantNameChange}
              onVenueNameChange={handleVenueNameChange}
              onStartSubmit={handleStartSubmit}
              onNext={handleNextLevel}
              onReplayLevel={handleReplayLevel}
              onRestartAll={handleRestartAll}
              onRetrySubmit={handleRetrySave}
              onCheatComplete={handleCheatComplete}
              themeLabel="TOP PICK"
            />
          </section>
        </main>
      ) : (
        <main className="admin-frame">
          <AdminLeaderboard
            adminEmail={ADMIN_EMAIL}
            isSupabaseReady={isSupabaseReady}
            isAuthenticated={isAdminAuthenticated}
            passwordInput={adminPasswordInput}
            authState={adminAuthState}
            leaderboardState={leaderboardState}
            onPasswordChange={setAdminPasswordInput}
            onSignIn={handleAdminSignIn}
            onRefresh={loadLeaderboard}
            onLogout={handleAdminLogout}
          />
        </main>
      )}

      <EffectsLayer triggerKey={effectKey} />
    </div>
  );
}
