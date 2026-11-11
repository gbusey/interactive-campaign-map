export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href={import.meta.env.BASE_URL}>
          <span className="crest" aria-hidden="true">K</span>
          <span>Kislev<span className="wordmark-caption">Campaign map</span></span>
        </a>
        <span className="edition">Pathfinder Second Edition</span>
      </header>

      <main id="main-content">
        <section className="welcome" aria-labelledby="welcome-title">
          <p className="eyebrow">The northern frontier</p>
          <h1 id="welcome-title">Every march.<br />Every stronghold.</h1>
          <p className="intro">A shared view of the war in Kislev, built around the intelligence your party gathers.</p>

          <div className="map-placeholder">
            <span className="compass" aria-hidden="true">✧</span>
            <h2>The campaign map is coming next</h2>
            <p>This is the first foundation release. The interactive map, editor, and travel tools are still to come.</p>
          </div>
        </section>

        <aside className="field-notes" aria-labelledby="field-notes-title">
          <p className="eyebrow">At the table</p>
          <h2 id="field-notes-title">One campaign.<br />A common picture.</h2>
          <ul className="feature-list">
            <li><h3>Follow the front</h3><p>Settlements, fortresses, and armies, with allegiance and last-known intelligence.</p></li>
            <li><h3>Keep everyone informed</h3><p>Planned shared updates from the on-page editor to every player’s map.</p></li>
            <li><h3>Plan the journey</h3><p>Planned route measurements and travel estimates using PF2e rules.</p></li>
          </ul>
          <p className="device-note">Made for the laptop at the head of the table and the phones around it.</p>
        </aside>
      </main>

      <footer><span>Kislev campaign atlas</span><span>Foundation release · 0.1.0</span></footer>
    </div>
  )
}
