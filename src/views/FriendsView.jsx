import React, { useEffect, useMemo, useState } from 'react';
import { ID } from 'appwrite';
import { account, databases } from '../appwrite'; // from your appwrite.js

const DB_ID  = import.meta.env.VITE_DB_ID;
const COL_ID = import.meta.env.VITE_COL_FRIENDS;

const toISO = (v) => (v ? new Date(v).toISOString() : null);
const daysSince = (iso) => {
  if (!iso) return null;
  const then = new Date(iso);
  if (isNaN(then)) return null;
  const diff = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  return diff < 0 ? 0 : diff;
};
const sinceLabel = (iso) => {
  const d = daysSince(iso);
  if (d === null) return '—';
  if (d === 0) return 'Today';
  return `${d}d since catch-up`;
};

export default function FriendsView() {
  const [status, setStatus] = useState('Connecting…');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);

  // add form
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [lastReceived, setLastReceived] = useState('');
  const [lastSent, setLastSent] = useState('');
  const [lastCatchup, setLastCatchup] = useState('');

  // filters
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState('All'); // All | Close | Family

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        if (!alive) return;
        setStatus('Connected ✓');
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to connect');
      }
      await loadFriends();
    })();
    return () => { alive = false; };
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const res = await databases.listDocuments(DB_ID, COL_ID);
      const rows = [...res.documents].sort((a, b) =>
        (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' })
      );
      setFriends(rows);
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async () => {
    setError('');
    const n = name.trim();
    if (!n) return setError('Please enter a name.');

    const doc = {
      Name: n,
      Relationship: relationship,
      PhoneNumber: phone || null,
      Birthday_day: toISO(birthday),
      Last_Message_Received: toISO(lastReceived),
      Last_Message_Sent: toISO(lastSent),
      Last_catchup: toISO(lastCatchup),
    };

    try {
      const created = await databases.createDocument(DB_ID, COL_ID, ID.unique(), doc);
      setFriends((prev) => [...prev, created].sort((a, b) =>
        (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' })
      ));
      setName(''); setRelationship('Friend'); setPhone('');
      setBirthday(''); setLastReceived(''); setLastSent(''); setLastCatchup('');
      setShowAdd(false);
    } catch (e) {
      setError(e?.message || 'Failed to add friend');
    }
  };

  const removeFriend = async (id) => {
    try {
      await databases.deleteDocument(DB_ID, COL_ID, id);
      setFriends((prev) => prev.filter((f) => f.$id !== id));
    } catch (e) {
      setError(e?.message || 'Failed to delete');
    }
  };

  const onText = (friend) => {
    const digits = (friend.PhoneNumber || '').replace(/\D+/g, '');
    if (!digits) return alert('No phone number saved for this friend.');
    try {
      window.location.href = `sms:${digits}`;
      setTimeout(() => { window.location.href = `tel:${digits}`; }, 120);
    } catch {
      window.location.href = `tel:${digits}`;
    }
  };

  const onPlan = (friend) => {
    const first = (friend.Name || '').split(' ')[0] || 'there';
    const subject = encodeURIComponent('Catch up?');
    const body = encodeURIComponent(`Hi ${first},\n\nShall we plan a catch-up soon?\n\n– Sent from CatchUp`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return friends
      .filter((f) => {
        if (chip === 'Close')  return ['Close Friend', 'Best Friend'].includes(f.Relationship);
        if (chip === 'Family') return (f.Relationship || '').toLowerCase() === 'family';
        return true;
      })
      .filter((f) => {
        if (!term) return true;
        const bag = `${f.Name || ''} ${f.Relationship || ''} ${f.PhoneNumber || ''}`.toLowerCase();
        return bag.includes(term);
      })
      .sort((a, b) => (daysSince(b.Last_catchup) ?? -1) - (daysSince(a.Last_catchup) ?? -1));
  }, [friends, chip, search]);

  return (
    <div>
      {/* Header */}
      <div className="cu-header">
        <div>
          <div className="cu-kicker">CatchUp</div>
          <h1 className="cu-title">Friends</h1>
        </div>
        <button className="cu-fab" onClick={() => setShowAdd((x) => !x)} aria-label="Add">+</button>
      </div>

      <div className="cu-status"><small>{status}</small></div>
      {error && <div className="cu-error">{error}</div>}

      {/* Search + chips */}
      <div className="cu-search">
        <span className="cu-search-icon" aria-hidden>🔎</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends…" />
      </div>
      <div className="cu-chips">
        {['All', 'Close', 'Family'].map((c) => (
          <button key={c} className={`cu-chip ${chip === c ? 'active' : ''}`} onClick={() => setChip(c)}>{c}</button>
        ))}
      </div>

      {/* Add card */}
      {showAdd && (
        <section className="cu-card cu-add">
          <h3>Add a friend</h3>
          <div className="cu-grid">
            <label>Friend name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
            </label>
            <label>Relationship
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                <option>Friend</option>
                <option>Close Friend</option>
                <option>Best Friend</option>
                <option>Family</option>
                <option>Colleague</option>
                <option>Acquaintance</option>
              </select>
            </label>
            <label>Phone
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" />
            </label>
            <label>Birthday
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </label>
            <label>Last message received
              <input type="date" value={lastReceived} onChange={(e) => setLastReceived(e.target.value)} />
            </label>
            <label>Last message sent
              <input type="date" value={lastSent} onChange={(e) => setLastSent(e.target.value)} />
            </label>
            <label>Last catch-up
              <input type="date" value={lastCatchup} onChange={(e) => setLastCatchup(e.target.value)} />
            </label>
            <div className="cu-actions">
              <button onClick={addFriend}>Add</button>
              <button className="cu-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </section>
      )}

      {/* List */}
      <section className="cu-list">
        <h3>Friends</h3>
        {loading ? (
          <p>Loading…</p>
        ) : filtered.length === 0 ? (
          <p>No friends match your search.</p>
        ) : (
          <ul className="cu-items">
            {filtered.map((f) => (
              <li key={f.$id} className="cu-item">
                <div className="cu-left">
                  <div className="cu-avatar" aria-hidden>{String(f.Name || '?').trim().charAt(0).toUpperCase()}</div>
                </div>
                <div className="cu-mid">
                  <div className="cu-name">{f.Name || '(no name)'}</div>
                  <div className="cu-row">
                    {f.Relationship && <span className="cu-pill">{f.Relationship}</span>}
                    <span className="cu-pill cu-pill-muted">{sinceLabel(f.Last_catchup)}</span>
                  </div>
                </div>
                <div className="cu-right">
                  <button className="cu-ghost" onClick={() => onText(f)}>Text</button>
                  <button className="cu-primary" onClick={() => onPlan(f)}>Plan</button>
                </div>
                <button className="cu-del" onClick={() => removeFriend(f.$id)} aria-label="Delete">×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
