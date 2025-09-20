import { useMemo, useState } from 'react';

import './App.css';

const PROJECT_NAME = 'Tiny Orchestra';
const PROJECT_VERSION = '0.1.0';

export function App(): JSX.Element {
  const [username, setUsername] = useState('');

  const welcomeMessage = useMemo(() => `Welcome to ${PROJECT_NAME}!`, []);

  return (
    <main className="app-shell">
      <header>
        <h1>{welcomeMessage}</h1>
        <p>Phase 0 scaffolding is ready for future tracker and sequencer work.</p>
      </header>
      <section className="panel">
        <p>
          The desktop shell is powered by React, Vite, and Tauri. Core DSP utilities live in a
          shared workspace package, keeping the audio engine testable outside the UI.
        </p>
        <label className="field">
          <span>Who&apos;s orchestrating today?</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your name"
          />
        </label>
        <p className="status" role="status" aria-live="polite">
          {username ? `Hello, ${username}!` : 'Set your name to personalize upcoming sessions.'}
        </p>
        <footer className="footer">
          <small>
            Workspace version: <strong>{PROJECT_VERSION}</strong>
          </small>
        </footer>
      </section>
    </main>
  );
}

export default App;
