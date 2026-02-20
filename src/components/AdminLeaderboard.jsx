function formatDuration(durationMs) {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString();
}

export default function AdminLeaderboard({
  adminEmail,
  isSupabaseReady,
  isAuthenticated,
  passwordInput,
  authState,
  leaderboardState,
  onPasswordChange,
  onSignIn,
  onRefresh,
  onLogout
}) {
  return (
    <section className="admin-board">
      <header className="admin-board-header">
        <p className="modal-kicker">ADMIN</p>
        <h2>Leaderboard</h2>
        <p>Fastest completion times from saved participant runs.</p>
      </header>

      {!isSupabaseReady && (
        <p className="admin-error" role="alert">
          Supabase is not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
        </p>
      )}

      {!adminEmail && (
        <p className="admin-error" role="alert">
          Admin email is not configured. Add `VITE_ADMIN_EMAIL` in `.env.local`.
        </p>
      )}

      {!isAuthenticated ? (
        <form
          className="admin-login"
          onSubmit={(event) => {
            event.preventDefault();
            onSignIn();
          }}
        >
          <label className="identity-field">
            Admin Password
            <input
              type="password"
              className="identity-input"
              value={passwordInput}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {authState.errorMessage && (
            <p className="admin-error" role="alert">
              {authState.errorMessage}
            </p>
          )}
          <button
            type="submit"
            className="cta-button"
            disabled={authState.status === 'loading' || !isSupabaseReady || !adminEmail}
          >
            {authState.status === 'loading' ? 'SIGNING IN...' : 'LOGIN'}
          </button>
        </form>
      ) : (
        <div className="admin-results">
          <div className="admin-toolbar">
            <button type="button" className="ghost-button" onClick={onRefresh}>
              REFRESH
            </button>
            <button type="button" className="hud-button" onClick={onLogout}>
              LOGOUT
            </button>
          </div>

          {leaderboardState.status === 'loading' && <p className="save-status">Loading leaderboard...</p>}
          {leaderboardState.status === 'error' && (
            <p className="admin-error" role="alert">
              {leaderboardState.errorMessage}
            </p>
          )}
          {leaderboardState.status === 'success' && leaderboardState.rows.length === 0 && (
            <p className="save-status">No runs saved yet.</p>
          )}

          {leaderboardState.rows.length > 0 && (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Participant</th>
                    <th>Venue</th>
                    <th>Time</th>
                    <th>Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardState.rows.map((row) => (
                    <tr key={`${row.rank}-${row.participantName}-${row.completedOn}`}>
                      <td>#{row.rank}</td>
                      <td>{row.participantName}</td>
                      <td>{row.venueName}</td>
                      <td>{formatDuration(row.durationMs)}</td>
                      <td>{formatDateTime(row.completedOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
