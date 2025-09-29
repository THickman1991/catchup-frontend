// src/views/FriendsView.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ID } from 'appwrite';
import { account, databases } from '../appwrite'; // from your appwrite.js
import '../App.css'; // keep your existing styles

// Read IDs from Vite env (same names you set locally and on Vercel)
const DB  = import.meta.env.VITE_DB_ID;
const COL = import.meta.env.VITE_COL_FRIENDS;

// Helpers
const toISO = (val) => (val ? new Date(val).toISOString() : null);
const fmtDate = (iso) =>
  !iso ? '' : new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function FriendsView() {
  // Connection / status
  const [connectedMsg, setConnectedMsg] = useState('Connecting…');
  const [error, setError] = useState('');

  // Data
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [lastReceived, setLastReceived] = useState('');
  const [lastSent, setLastSent] = useState('');
  const [lastCatchup, setLastCatchup] = useState('');

  // Which columns to show in the list
  const [show, setShow] = useState({
    relationship: true,
    phone: false,
    birthday: false,
    received: false,
    sent: false,
    catchup: false,
  });

  // Ensure we have an anonymous session, then load data
  useEffect(() => {
    let mounted = true;

    const go = async () => {
      try {
        // If no session, create anonymous
        try {
          await account.get();
        } catch {
          await account.createAnonymousSession();
        }
        const user = await account.get();
        if (!mounted) return;
        setConnectedMsg(`Connected ✓`);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Failed to connect');
      }
      await loadFriends();
    };

    go();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const res = await databases.listDocuments(DB, COL);
      // Sort by Name ascending
      const rows = [...res.documents].sort((a, b) =>
        (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' })
      );
      setFriends(rows);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const onAdd = async () => {
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    if (!relationship) {
      setError('Please choose a relationship.');
      return;
    }

    const doc = {
      Name: trimmed,
      Relationship: relationship,
      PhoneNumber: phone || null,
      Birthday_day: toISO(birthday),
      Last_Message_Received: toISO(lastReceived),
      Last_Message_Sent: toISO(lastSent),
      Last_catchup: toISO(lastCatchup),
    };

    try {
      const created = await databases.createDocument(DB, COL, ID.unique(), doc);
      setFriends((prev) => [...prev, created].sort((a, b) =>
        (a.Name || '').localeCompare(b.Name || '', undefined, { sensitivity: 'base' })
      ));
      // reset form but keep relationship to speed up multiple adds
      setName('');
      setPhone('');
      setBirthday('');
      setLastReceived('');
      setLastSent('');
      setLastCatchup('');
    } catch (err) {
      setError(err?.message || 'Failed to add friend');
    }
  };

  const onDelete = async (id) => {
    setError('');
    try {
      await databases.deleteDocument(DB, COL, id);
      setFriends((prev) => prev.filter((f) => f.$id !== id));
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    }
  };

  const rows = useMemo(() => friends, [friends]);

  return (
    <div>
      <h1>CatchUp</h1>

      <div style={{ marginBottom: 12, opacity: 0.9 }}>
        <small>{connectedMsg}</small>
      </div>

      {error && (
        <div style={{
          background: '#ff4d4f', color: 'white', padding: '8px 12px',
          borderRadius: 6, marginBottom: 12
        }}>
          {error}
        </div>
      )}

      {/* Column toggles */}
      <section style={{ marginBottom: 12 }}>
        <strong>Show columns:</strong>{' '}
        <label style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={show.relationship}
            onChange={(e) => setShow((s) => ({ ...s, relationship: e.target.checked }))}
          />{' '}
          Relationship
        </label>
        <label style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={show.phone}
            onChange={(e) => setShow((s) => ({ ...s, phone: e.target.checked }))}
          />{' '}
          Phone
        </label>
        <label style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={show.birthday}
            onChange={(e) => setShow((s) => ({ ...s, birthday: e.target.checked }))}
          />{' '}
          Birthday
        </label>
        <label style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={show.received}
            onChange={(e) => setShow((s) => ({ ...s, received: e.target.checked }))}
          />{' '}
          Last message received
        </label>
        <label style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={show.sent}
            onChange={(e) => setShow((s) => ({ ...s, sent: e.target.checked }))}
          />{' '}
          Last message sent
        </label>
        <label>
          <input
            type="checkbox"
            checked={show.catchup}
            onChange={(e) => setShow((s) => ({ ...s, catchup: e.target.checked }))}
          />{' '}
          Last catch-up
        </label>
      </section>

      {/* Add friend form */}
      <section style={{ marginBottom: 18 }}>
        <h3>Add a friend</h3>

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <div>
            <label>Friend name (required)</label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label>Relationship (required)</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="Friend">Friend</option>
              <option value="Close Friend">Close Friend</option>
              <option value="Best Friend">Best Friend</option>
              <option value="Family">Family</option>
              <option value="Colleague">Colleague</option>
              <option value="Acquaintance">Acquaintance</option>
            </select>
          </div>

          <div>
            <label>Phone (optional)</label>
            <input
              type="tel"
              placeholder="07…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label>Birthday (optional)</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label>Last message received (optional)</label>
            <input
              type="date"
              value={lastReceived}
              onChange={(e) => setLastReceived(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label>Last message sent (optional)</label>
            <input
              type="date"
              value={lastSent}
              onChange={(e) => setLastSent(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label>Last catch-up (optional)</label>
            <input
              type="date"
              value={lastCatchup}
              onChange={(e) => setLastCatchup(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ alignSelf: 'end' }}>
            <button onClick={onAdd}>Add</button>
          </div>
        </div>
      </section>

      {/* Friends list */}
      <section>
        <h3>Friends</h3>
        {loading ? (
          <p>Loading…</p>
        ) : rows.length === 0 ? (
          <p>No friends found.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map((f) => (
              <li key={f.$id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {f.Name || '(no name)'}
                    {show.relationship && f.Relationship ? (
                      <span style={{ fontWeight: 400, opacity: 0.85 }}> — {f.Relationship}</span>
                    ) : null}
                  </div>

                  {/* Optional details line */}
                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    {show.phone && f.PhoneNumber ? <span>☎ {f.PhoneNumber} · </span> : null}
                    {show.birthday && f.Birthday_day ? <span>🎂 {fmtDate(f.Birthday_day)} · </span> : null}
                    {show.received && f.Last_Message_Received ? <span>📥 {fmtDate(f.Last_Message_Received)} · </span> : null}
                    {show.sent && f.Last_Message_Sent ? <span>📤 {fmtDate(f.Last_Message_Sent)} · </span> : null}
                    {show.catchup && f.Last_catchup ? <span>👋 {fmtDate(f.Last_catchup)}</span> : null}
                  </div>
                </div>

                <div>
                  <button onClick={() => onDelete(f.$id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
