export default function UIOverlay({
  status,
  currentLevel,
  maxLevel,
  progress,
  participantName,
  venueName,
  venueOptions,
  formErrors,
  submissionState,
  onParticipantNameChange,
  onVenueNameChange,
  onStartSubmit,
  onNext,
  onReplayLevel,
  onRestartAll,
  onRetrySubmit,
  onCheatComplete,
  themeLabel
}) {
  const displayParticipantName = (participantName || '').trim() || 'Champ';
  const displayVenueName = (venueName || '').trim() || 'your venue';

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
            {(status === 'PLAYING' || status === 'COMPLETED') && (
              <button type="button" className="hud-button hud-button-cheat" onClick={onCheatComplete}>
                CHEAT FINISH
              </button>
            )}
            <button type="button" className="hud-button" onClick={onRestartAll}>
              RESTART
            </button>
          </div>
        </header>
      )}

      {status === 'IDLE' && (
        <div className="center-modal center-modal-idle">
          <h1>ENTER FLOW MODE</h1>
          <p>Add participant and venue details before starting the run.</p>
          <form
            className="identity-form"
            onSubmit={(event) => {
              event.preventDefault();
              onStartSubmit();
            }}
          >
            <label className="identity-field">
              Participant Name
              <input
                type="text"
                className="identity-input"
                value={participantName}
                onChange={(event) => onParticipantNameChange(event.target.value)}
                maxLength={120}
                autoComplete="name"
              />
            </label>
            {formErrors.participantName && (
              <p className="field-error" role="alert">
                {formErrors.participantName}
              </p>
            )}

            <label className="identity-field">
              Venue Name
              <select
                className="identity-input identity-select"
                value={venueName}
                onChange={(event) => onVenueNameChange(event.target.value)}
              >
                <option value="">Select a venue</option>
                {venueOptions.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </label>
            {formErrors.venueName && (
              <p className="field-error" role="alert">
                {formErrors.venueName}
              </p>
            )}

            {formErrors.global && (
              <p className="field-error" role="alert">
                {formErrors.global}
              </p>
            )}

            <button type="submit" className="cta-button">
              START RUN
            </button>
          </form>
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
          <p className="modal-kicker">MISSION COMPLETE</p>
          <h2>NICE WORK, {displayParticipantName}!</h2>
          <p>All levels cleared from {displayVenueName}.</p>
          {submissionState.status === 'saving' && (
            <p className="save-status">Saving your run...</p>
          )}
          {submissionState.status === 'success' && (
            <p className="save-status save-success">Run saved successfully.</p>
          )}
          {submissionState.status === 'error' && (
            <>
              <p className="save-status save-error" role="alert">
                {submissionState.errorMessage || 'Failed to save participant run.'}
              </p>
              <button type="button" className="ghost-button retry-button" onClick={onRetrySubmit}>
                RETRY SAVE
              </button>
            </>
          )}
          <button type="button" className="cta-button" onClick={onRestartAll}>
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
