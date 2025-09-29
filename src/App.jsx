// src/App.jsx
import React, { useState } from 'react';
import FriendsView from "./views/FriendsView";
import './App.css';

function Placeholder({ title }) {
  return (
    <div style={{ padding: '16px' }}>
      <h2>{title}</h2>
      <p>Coming soon…</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('friends'); // friends | profile | catchups

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === 'friends' && <FriendsView />}
        {tab === 'profile' && <Placeholder title="Profile" />}
        {tab === 'catchups' && <Placeholder title="CatchUps" />}
      </main>

      <nav className="app-tabbar" role="tablist" aria-label="Main">
        <button
          role="tab"
          aria-selected={tab === 'profile'}
          onClick={() => setTab('profile')}
        >Profile</button>

        <button
          role="tab"
          aria-selected={tab === 'friends'}
          onClick={() => setTab('friends')}
        >Friends</button>

        <button
          role="tab"
          aria-selected={tab === 'catchups'}
          onClick={() => setTab('catchups')}
        >CatchUps</button>
      </nav>
    </div>
  );
}
