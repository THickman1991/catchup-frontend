// src/App.jsx
import React, { useState } from 'react';
import FriendsView from './views/FriendsView';
import './App.css';

function Placeholder({ title }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>Coming soon…</p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('friends'); // 'profile' | 'friends' | 'catchups'

  return (
    <div className="app-shell">
      <main className="page">
        {tab === 'friends' && <FriendsView />}
        {tab === 'profile' && <Placeholder title="Profile" />}
        {tab === 'catchups' && <Placeholder title="CatchUps" />}
      </main>

      <nav className="tabbar" role="tablist" aria-label="Main tabs">
        <button
          className={`tab-btn ${tab === 'profile' ? 'active' : ''}`}
          onClick={() => setTab('profile')}
          role="tab"
          aria-selected={tab === 'profile'}
        >
          Profile
        </button>

        <button
          className={`tab-btn ${tab === 'friends' ? 'active' : ''}`}
          onClick={() => setTab('friends')}
          role="tab"
          aria-selected={tab === 'friends'}
        >
          Friends
        </button>

        <button
          className={`tab-btn ${tab === 'catchups' ? 'active' : ''}`}
          onClick={() => setTab('catchups')}
          role="tab"
          aria-selected={tab === 'catchups'}
        >
          CatchUps
        </button>
      </nav>
    </div>
  );
}
