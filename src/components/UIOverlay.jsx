export default function UIOverlay({
  status,
  currentLevel,
  maxLevel,
  progress,
  isMuted,
  onStart,
  onNext,
  onReplayLevel,
  onRestartAll,
  onToggleMute,
  themeLabel
}) {
  return (
    <div className="ui-overlay">
      {status !== 'IDLE' && (
        <header className="hud">
          <div className="hud-pill tilt-left">
            <span className="pill-kicker">{themeLabel}</span>
            <span>LEVEL {currentLevel} / {maxLevel}</span>
          </div>
          <div className="hud-pill tilt-right">
            <span className="pill-kicker">SNAPPED</span>
            <span>{progress.snapped} / {progress.total || 0}</span>
          </div>
          <div className="hud-actions">
            <button type="button" className="hud-button" onClick={onToggleMute}>
              {isMuted ? 'UNMUTE' : 'MUTE'}
            </button>
            <button type="button" className="hud-button" onClick={onRestartAll}>
              RESTART
            </button>
          </div>
        </header>
      )}

      {status === 'IDLE' && (
        <div className="center-modal center-modal-idle">
          <h1>ENTER FLOW MODE</h1>
          <p>Drag pieces into place and clear all 3 levels.</p>
          <button type="button" className="cta-button" onClick={onStart}>
            START RUN
          </button>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div className="center-modal center-modal-complete">
          <p className="modal-kicker">LEVEL COMPLETE</p>
          <h2>CLEAN SNAP ON LEVEL {currentLevel}</h2>
          <p>Difficulty rises next. Keep the same rhythm and tighter drop precision.</p>
          <div className="modal-actions">
            <button type="button" className="cta-button" onClick={onNext}>
              NEXT LEVEL
            </button>
            <button type="button" className="ghost-button" onClick={onReplayLevel}>
              REPLAY LEVEL
            </button>
          </div>
        </div>
      )}

      {status === 'FINISHED' && (
        <div className="center-modal center-modal-finished">
          <p className="modal-kicker">ALL LEVELS DONE</p>
          <h2>FLOW SEQUENCE FINISHED</h2>
          <p>You cleared the full demo stack. Run it again and beat your own pace.</p>
          <button type="button" className="cta-button" onClick={onRestartAll}>
            REPLAY ALL
          </button>
        </div>
      )}
    </div>
  );
}
