// src/App.jsx
import { useEffect, useState } from "react";
import { account, db } from "./appwrite";
import { ID, Query } from "appwrite";

const DB_ID = import.meta.env.VITE_DB_ID;
const FRIENDS_COL = import.meta.env.VITE_COL_FRIENDS;

const RELATIONSHIP_OPTIONS = [
  "Friend",
  "Close Friend",
  "Best Friend",
  "Family",
  "Partner",
  "Colleague",
  "Other",
];

// ---- helpers --------------------------------------------------------------
function Field({ label, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.8 }}>
        {label} {required ? "(required)" : "(optional)"}
      </span>
      {children}
    </label>
  );
}
function toISO(dateStr) {
  if (!dateStr) return null;
  return `${dateStr}T00:00:00.000Z`;
}
function fromISO(iso) {
  if (!iso) return "";
  const i = String(iso);
  return i.includes("T") ? i.slice(0, 10) : i; // YYYY-MM-DD
}
function fmtDate(iso) {
  if (!iso) return "—";
  return fromISO(iso);
}

// ---- Appwrite attribute keys ---------------------------------------------
const ATTR = {
  name: "Name",
  relationship: "Relationship",
  phone: "PhoneNumber",
  birthday: "Birthday_day",
  lastSent: "Last_Message_Sent",
  lastReceived: "Last_Message_Received",
  lastCatchup: "Last_catchup",
};

// Only Name + Relationship are required in your schema
const REQUIRED = {
  [ATTR.name]: true,
  [ATTR.relationship]: true,
  [ATTR.phone]: false,
  [ATTR.birthday]: false,
  [ATTR.lastReceived]: false,
  [ATTR.lastCatchup]: false,
  [ATTR.lastSent]: false,
};

// Define all selectable columns (except Name which is always shown)
const ALL_COLS = [
  { key: ATTR.relationship, label: "Relationship", type: "select" },
  { key: ATTR.phone, label: "Phone", type: "text" },
  { key: ATTR.birthday, label: "Birthday", type: "date" },
  { key: ATTR.lastReceived, label: "Last received", type: "date" },
  { key: ATTR.lastSent, label: "Last sent", type: "date" },
  { key: ATTR.lastCatchup, label: "Last catch-up", type: "date" },
];

const STORAGE_KEY = "catchupVisibleCols";

// ==========================================================================
export default function App() {
  const [connectedMsg, setConnectedMsg] = useState("Connecting…");
  const [error, setError] = useState("");
  const [friends, setFriends] = useState([]);

  // Create form
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Friend");
  const [birthday, setBirthday] = useState("");
  const [lastReceived, setLastReceived] = useState("");
  const [lastCatchup, setLastCatchup] = useState("");
  const [lastSent, setLastSent] = useState("");
  const [phone, setPhone] = useState("");

  // Edit form (one row at a time)
  const [editingId, setEditingId] = useState(null);
  const [eName, setEName] = useState("");
  const [eRelationship, setERelationship] = useState("Friend");
  const [eBirthday, setEBirthday] = useState("");
  const [eLastReceived, setELastReceived] = useState("");
  const [eLastCatchup, setELastCatchup] = useState("");
  const [eLastSent, setELastSent] = useState("");
  const [ePhone, setEPhone] = useState("");

  // Visible columns (besides Name)
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // default: show Relationship and Last catch-up
    return [ATTR.relationship, ATTR.lastCatchup];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
  }, [visibleCols]);

  useEffect(() => {
    (async () => {
      try {
        try { await account.get(); }
        catch { await account.createAnonymousSession(); }
        setConnectedMsg("Connected ✓");
        await loadFriends();
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  async function loadFriends() {
    try {
      const res = await db.listDocuments(DB_ID, FRIENDS_COL, [Query.limit(500)]);
      setFriends(res.documents);
    } catch (e) {
      setError(e.message);
    }
  }

  function isReq(attrKey) {
    return !!REQUIRED[attrKey];
  }

  // ---- Create -------------------------------------------------------------
  async function addFriend() {
    setError("");
    if (isReq(ATTR.name) && !name.trim()) return setError("Please enter a name.");
    if (isReq(ATTR.relationship) && !relationship) return setError("Please choose a relationship.");

    try {
      const doc = {
        [ATTR.name]: name.trim(),
        [ATTR.relationship]: relationship,
      };
      if (phone)        doc[ATTR.phone]        = phone.trim();
      if (birthday)     doc[ATTR.birthday]     = toISO(birthday);
      if (lastReceived) doc[ATTR.lastReceived] = toISO(lastReceived);
      if (lastCatchup)  doc[ATTR.lastCatchup]  = toISO(lastCatchup);
      if (lastSent)     doc[ATTR.lastSent]     = toISO(lastSent);

      const created = await db.createDocument(DB_ID, FRIENDS_COL, ID.unique(), doc);
      setFriends((prev) => [created, ...prev]);

      // reset
      setName(""); setRelationship("Friend"); setBirthday("");
      setLastReceived(""); setLastCatchup(""); setLastSent(""); setPhone("");
    } catch (e) {
      setError(e.message);
    }
  }

  // ---- Delete -------------------------------------------------------------
  async function deleteFriend(id) {
    try {
      await db.deleteDocument(DB_ID, FRIENDS_COL, id);
      setFriends((prev) => prev.filter((f) => f.$id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  // ---- Edit ---------------------------------------------------------------
  function startEdit(f) {
    setEditingId(f.$id);
    setEName(f[ATTR.name] ?? "");
    setERelationship(f[ATTR.relationship] ?? "Friend");
    setEPhone(f[ATTR.phone] ?? "");
    setEBirthday(fromISO(f[ATTR.birthday]));
    setELastReceived(fromISO(f[ATTR.lastReceived]));
    setELastCatchup(fromISO(f[ATTR.lastCatchup]));
    setELastSent(fromISO(f[ATTR.lastSent]));
  }
  function cancelEdit() {
    setEditingId(null);
  }
  async function saveEdit() {
    setError("");
    if (isReq(ATTR.name) && !eName.trim()) return setError("Name is required.");
    if (isReq(ATTR.relationship) && !eRelationship) return setError("Relationship is required.");

    try {
      const update = {
        [ATTR.name]: eName.trim(),
        [ATTR.relationship]: eRelationship,
        [ATTR.phone]: ePhone || null,
        [ATTR.birthday]: eBirthday ? toISO(eBirthday) : null,
        [ATTR.lastReceived]: eLastReceived ? toISO(eLastReceived) : null,
        [ATTR.lastCatchup]: eLastCatchup ? toISO(eLastCatchup) : null,
        [ATTR.lastSent]: eLastSent ? toISO(eLastSent) : null,
      };
      const updated = await db.updateDocument(DB_ID, FRIENDS_COL, editingId, update);
      setFriends((prev) => prev.map((f) => (f.$id === editingId ? updated : f)));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  // ---- UI -----------------------------------------------------------------
  function onSubmitCreate(e) { e.preventDefault(); addFriend(); }

  const visible = new Set(visibleCols);
  const toggleCol = (key) => {
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 1100 }}>
      <h1>CatchUp</h1>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      <p>{connectedMsg}</p>

      {/* Column toggles */}
      <div style={{ margin: "12px 0 18px", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <strong>Columns to show:</strong>
        {ALL_COLS.map((c) => (
          <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={visible.has(c.key)}
              onChange={() => toggleCol(c.key)}
            />
            {c.label}
          </label>
        ))}
        <span style={{ opacity: 0.7, marginLeft: 8 }}>Name is always shown</span>
      </div>

      {/* Create Form */}
      <h2 style={{ marginTop: 8 }}>Add a friend</h2>
      <form
        onSubmit={onSubmitCreate}
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 220px 1fr 1fr 1fr 1fr",
          alignItems: "end",
          maxWidth: 1100,
        }}
      >
        <Field label="Friend name" required={isReq(ATTR.name)}>
          <input placeholder="e.g. Alex" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8 }} />
        </Field>

        <Field label="Relationship" required={isReq(ATTR.relationship)}>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)} style={{ padding: 8 }}>
            {RELATIONSHIP_OPTIONS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        </Field>

        <Field label="Phone" required={isReq(ATTR.phone)}>
          <input placeholder="07…" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ padding: 8 }} />
        </Field>

        <Field label="Birthday" required={isReq(ATTR.birthday)}>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={{ padding: 8 }} />
        </Field>

        <Field label="Last received" required={isReq(ATTR.lastReceived)}>
          <input type="date" value={lastReceived} onChange={(e) => setLastReceived(e.target.value)} style={{ padding: 8 }} />
        </Field>

        <Field label="Last catch-up" required={isReq(ATTR.lastCatchup)}>
          <input type="date" value={lastCatchup} onChange={(e) => setLastCatchup(e.target.value)} style={{ padding: 8 }} />
        </Field>

        <Field label="Last sent" required={isReq(ATTR.lastSent)}>
          <input type="date" value={lastSent} onChange={(e) => setLastSent(e.target.value)} style={{ padding: 8 }} />
        </Field>

        <div style={{ alignSelf: "end" }}>
          <button type="submit" style={{ padding: "10px 16px" }}>Add</button>
        </div>
      </form>

      {/* Table */}
      <h2 style={{ marginTop: 24 }}>Friends</h2>
      {!friends.length ? (
        <p>No friends found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #2a2a2a" }}>
                <th style={{ padding: "8px 6px" }}>Name</th>
                {ALL_COLS.filter(c => visible.has(c.key)).map((c) => (
                  <th key={c.key} style={{ padding: "8px 6px" }}>{c.label}</th>
                ))}
                <th style={{ padding: "8px 6px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {friends.map((f) => {
                const isEditing = editingId === f.$id;
                return (
                  <tr key={f.$id} style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {/* Name */}
                    <td style={{ padding: "8px 6px" }}>
                      {isEditing ? (
                        <input value={eName} onChange={(e)=>setEName(e.target.value)} style={{ padding: 6, width: "100%" }} />
                      ) : (
                        f[ATTR.name] || "—"
                      )}
                    </td>

                    {/* Dynamic selected columns */}
                    {ALL_COLS.filter(c => visible.has(c.key)).map((c) => {
                      const key = c.key;
                      const type = c.type;
                      let display = "—";
                      if (type === "date") display = fmtDate(f[key]);
                      else display = f[key] || "—";

                      if (!isEditing) {
                        return <td key={key} style={{ padding: "8px 6px" }}>{display}</td>;
                      }

                      // Editing inputs
                      let input = null;
                      if (key === ATTR.relationship) {
                        input = (
                          <select value={eRelationship} onChange={(e)=>setERelationship(e.target.value)} style={{ padding: 6, width: "100%" }}>
                            {RELATIONSHIP_OPTIONS.map((opt)=><option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        );
                      } else if (key === ATTR.phone) {
                        input = <input value={ePhone} onChange={(e)=>setEPhone(e.target.value)} style={{ padding: 6, width: "100%" }} />;
                      } else if (type === "date") {
                        const map = {
                          [ATTR.birthday]: [eBirthday, setEBirthday],
                          [ATTR.lastReceived]: [eLastReceived, setELastReceived],
                          [ATTR.lastCatchup]: [eLastCatchup, setELastCatchup],
                          [ATTR.lastSent]: [eLastSent, setELastSent],
                        };
                        const [val, setVal] = map[key] || ["", ()=>{}];
                        input = <input type="date" value={val} onChange={(e)=>setVal(e.target.value)} style={{ padding: 6, width: "100%" }} />;
                      } else {
                        input = <input value={display} style={{ padding: 6, width: "100%" }} readOnly />;
                      }
                      return <td key={key} style={{ padding: "8px 6px" }}>{input}</td>;
                    })}

                    {/* Actions */}
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} style={{ padding: "6px 10px", marginRight: 6 }}>Save</button>
                          <button onClick={cancelEdit} style={{ padding: "6px 10px" }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(f)} style={{ padding: "6px 10px", marginRight: 6 }}>Edit</button>
                          <button onClick={() => deleteFriend(f.$id)} style={{ padding: "6px 10px" }}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}






