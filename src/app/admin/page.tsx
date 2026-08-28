'use client';

import { createClient, type Session } from '@supabase/supabase-js';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown> & { id?: string };
type Field = { name: string; label: string; type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'experience' };
type Definition = { key: string; label: string; columns: string[]; fields: Field[]; readOnly?: boolean };

const definitions: Definition[] = [
  { key: 'social-links', label: 'Social Links', columns: ['type', 'label', 'href'], fields: [
    { name: 'type', label: 'Type' }, { name: 'label', label: 'Label' }, { name: 'href', label: 'URL / Address' },
    { name: 'icon', label: 'Bootstrap Icon Class' }, { name: 'sort_order', label: 'Sort Order', type: 'number' },
  ] },
  { key: 'skills', label: 'Skills', columns: ['name', 'percentage', 'category'], fields: [
    { name: 'name', label: 'Skill' }, { name: 'percentage', label: 'Percentage', type: 'number' },
    { name: 'category', label: 'Category' }, { name: 'sort_order', label: 'Sort Order', type: 'number' },
  ] },
  { key: 'education', label: 'Education', columns: ['degree', 'school', 'start_year', 'end_year'], fields: [
    { name: 'degree', label: 'Degree' }, { name: 'short_degree', label: 'Short Degree' }, { name: 'field', label: 'Field' },
    { name: 'school', label: 'School' }, { name: 'thesis', label: 'Thesis', type: 'textarea' },
    { name: 'start_year', label: 'Start Year' }, { name: 'end_year', label: 'End Year' },
    { name: 'sort_order', label: 'Sort Order', type: 'number' },
  ] },
  { key: 'experiences', label: 'Experience', columns: ['role', 'company', 'start_label', 'end_label'], fields: [
    { name: 'company', label: 'Company' }, { name: 'role', label: 'Role' }, { name: 'location', label: 'Location' },
    { name: 'start_label', label: 'Start' }, { name: 'end_label', label: 'End' },
    { name: 'is_current', label: 'Current Position', type: 'checkbox' }, { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'sort_order', label: 'Sort Order', type: 'number' },
  ] },
  { key: 'projects', label: 'Projects', columns: ['project_location', 'start_label', 'end_label'], fields: [
    { name: 'experience_id', label: 'Experience', type: 'experience' }, { name: 'project_location', label: 'Project / Location' },
    { name: 'start_label', label: 'Start' }, { name: 'end_label', label: 'End' },
    { name: 'description', label: 'Description', type: 'textarea' }, { name: 'sort_order', label: 'Sort Order', type: 'number' },
  ] },
  { key: 'contact-messages', label: 'Contact Inbox', columns: ['name', 'email', 'subject', 'message'], fields: [], readOnly: true },
];

const profileFields: Field[] = [
  { name: 'name', label: 'Name' }, { name: 'role', label: 'Role' }, { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email' }, { name: 'date_of_birth', label: 'Date of Birth' }, { name: 'website', label: 'Website' },
  { name: 'city', label: 'City' }, { name: 'summary_en', label: 'Summary (English)', type: 'textarea' },
  { name: 'summary_id', label: 'Summary (Indonesian)', type: 'textarea' }, { name: 'bio_en', label: 'About Bio (English)', type: 'textarea' },
  { name: 'bio_id', label: 'About Bio (Indonesian)', type: 'textarea' }, { name: 'about_intro', label: 'About Intro', type: 'textarea' },
  { name: 'resume_intro', label: 'Resume Intro', type: 'textarea' }, { name: 'footer_tagline', label: 'Footer Tagline' },
  { name: 'avatar_url', label: 'Avatar URL' }, { name: 'cv_url', label: 'CV URL' },
];

function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key';
  return createClient(url, key);
}

export default function AdminPage() {
  const supabase = useMemo(createSupabaseBrowserClient, []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState('profile');
  const [data, setData] = useState<Record<string, Row | Row[]>>({});
  const [editor, setEditor] = useState<{ definition: Definition; row: Row; creating: boolean } | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: authData }) => setSession(authData.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const adminFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!session) throw new Error('Authentication required');
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${session.access_token}`, ...options.headers },
    });
    const payload = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(payload.error || 'Admin request failed');
    return payload;
  }, [session]);

  const loadAll = useCallback(async () => {
    if (!session) return;
    setBusy(true); setStatus('Loading content…');
    try {
      const keys = ['profile', ...definitions.map((definition) => definition.key)];
      const results = await Promise.all(keys.map((key) => adminFetch(`/api/admin/${key}`)));
      setData(Object.fromEntries(keys.map((key, index) => [key, results[index].data])));
      setStatus('Content loaded');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to load admin data');
    } finally {
      setBusy(false);
    }
  }, [adminFetch, session]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('Signing in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setStatus(error ? error.message : 'Signed in'); setBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    try {
      const result = await adminFetch('/api/admin/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      setData((current) => ({ ...current, profile: result.data })); setStatus('Profile saved');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save profile'); }
    finally { setBusy(false); }
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const values: Row = {};
    editor.definition.fields.forEach((field) => {
      if (field.type === 'checkbox') values[field.name] = form.has(field.name);
      else if (field.type === 'number') {
        const raw = form.get(field.name); if (raw !== null && raw !== '') values[field.name] = Number(raw);
      } else values[field.name] = form.get(field.name) || null;
    });
    const path = editor.creating ? `/api/admin/${editor.definition.key}` : `/api/admin/${editor.definition.key}/${editor.row.id}`;
    setBusy(true);
    try {
      await adminFetch(path, { method: editor.creating ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      setEditor(null); setStatus(`${editor.definition.label} saved`); await loadAll();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to save record'); }
    finally { setBusy(false); }
  }

  async function remove(definition: Definition, row: Row) {
    if (!row.id || !window.confirm(`Delete this ${definition.label.toLowerCase()} record?`)) return;
    setBusy(true);
    try { await adminFetch(`/api/admin/${definition.key}/${row.id}`, { method: 'DELETE' }); setStatus('Record deleted'); await loadAll(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to delete record'); }
    finally { setBusy(false); }
  }

  async function upload(kind: 'avatar' | 'cv', file: File | undefined) {
    if (!file) return;
    const form = new FormData(); form.append('kind', kind); form.append('file', file);
    setBusy(true);
    try {
      const result = await adminFetch('/api/admin/upload', { method: 'POST', body: form });
      const key = kind === 'avatar' ? 'avatar_url' : 'cv_url';
      setData((current) => ({ ...current, profile: { ...(current.profile as Row), [key]: result.url } }));
      setStatus('File uploaded. Save the profile to publish the new URL.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setBusy(false); }
  }

  if (!session) {
    return <main className="admin-login"><form onSubmit={login}><h1>Resume Admin</h1><p>Sign in with an authorized Supabase account.</p>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button disabled={busy}>Sign in</button><output>{status}</output></form></main>;
  }

  const profile = (data.profile || {}) as Row;
  const definition = definitions.find((item) => item.key === active);
  const rows = definition ? (data[definition.key] as Row[] || []) : [];

  return <main className="admin-shell">
    <aside><h1>Resume CMS</h1><p>{session.user.email}</p>
      <nav><button className={active === 'profile' ? 'active' : ''} onClick={() => setActive('profile')}>Profile</button>
        {definitions.map((item) => <button key={item.key} className={active === item.key ? 'active' : ''} onClick={() => setActive(item.key)}>{item.label}</button>)}
      </nav><button className="secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></aside>
    <section className="admin-content"><header><div><h2>{active === 'profile' ? 'Profile' : definition?.label}</h2><p>Changes are served immediately by the public API.</p></div><output>{busy ? 'Working…' : status}</output></header>
      {active === 'profile' ? <form className="admin-form profile-form" onSubmit={saveProfile}>
        {profileFields.map((field) => <FieldControl key={field.name} field={field} value={profile[field.name]} />)}
        <div className="upload-row"><label>Upload avatar<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload('avatar', event.target.files?.[0])} /></label>
          <label>Upload PDF<input type="file" accept="application/pdf" onChange={(event) => void upload('cv', event.target.files?.[0])} /></label></div>
        <button disabled={busy}>Save profile</button>
      </form> : definition && <div className="resource-panel">
        {!definition.readOnly && <button onClick={() => setEditor({ definition, row: {}, creating: true })}>Add {definition.label}</button>}
        <div className="table-wrap"><table><thead><tr>{definition.columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}<th>Actions</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>{definition.columns.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}
            <td className="actions">{!definition.readOnly && <button className="secondary" onClick={() => setEditor({ definition, row, creating: false })}>Edit</button>}<button className="danger" onClick={() => void remove(definition, row)}>Delete</button></td></tr>)}</tbody>
        </table></div>
      </div>}
    </section>
    {editor && <div className="modal-backdrop"><form className="admin-form modal-card" onSubmit={saveEditor}><h2>{editor.creating ? 'Add' : 'Edit'} {editor.definition.label}</h2>
      {editor.definition.fields.map((field) => <FieldControl key={field.name} field={field} value={editor.row[field.name]} experiences={(data.experiences as Row[]) || []} />)}
      <div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditor(null)}>Cancel</button><button disabled={busy}>Save</button></div>
    </form></div>}
  </main>;
}

function FieldControl({ field, value, experiences = [] }: { field: Field; value: unknown; experiences?: Row[] }) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (field.type === 'textarea') return <label className="wide">{field.label}<textarea name={field.name} defaultValue={stringValue} rows={4} /></label>;
  if (field.type === 'checkbox') return <label className="checkbox"><input type="checkbox" name={field.name} defaultChecked={Boolean(value)} />{field.label}</label>;
  if (field.type === 'experience') return <label>{field.label}<select name={field.name} defaultValue={stringValue} required><option value="">Select experience</option>{experiences.map((item) => <option key={item.id} value={item.id}>{String(item.role || item.company)}</option>)}</select></label>;
  return <label>{field.label}<input name={field.name} type={field.type || 'text'} defaultValue={stringValue} /></label>;
}
