import { useApp } from '../state/AppStateContext';
import { PAGES } from '../data/content';
import { me } from '../state/selectors';

export function Sidebar() {
  const { state, actions } = useApp();
  const person = me(state);

  return (
    <div className="sidebar print-hide">
      <div style={{ height: 4, background: 'var(--color-text)', marginBottom: 8 }} />
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); actions.go('home'); }}
        style={{
          display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22,
          lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--color-text)', textDecoration: 'none',
          padding: '7px 10px 8px', margin: '0 -4px', rotate: '-0.8deg',
          boxShadow: '0 1px 0 color-mix(in srgb, var(--color-text) 16%, transparent)',
          backgroundColor: 'var(--color-accent-300)',
        }}
      >
        Recipes for Posterity
      </a>
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)', marginTop: 6 }}>
        Family recipe archive
      </div>
      <div style={{ height: 1, background: 'var(--color-text)', margin: '10px 0 26px' }} />

      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 10 }}>
        Pages
      </div>
      <div className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 30 }}>
        {PAGES.map((p) => {
          const active = state.page === p.key;
          return (
            <a
              key={p.key}
              href="#"
              onClick={(e) => { e.preventDefault(); actions.go(p.key); }}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', gap: 10, alignItems: 'baseline', padding: '9px 10px',
                textDecoration: 'none', borderRadius: 2,
                background: active ? 'var(--color-accent)' : undefined,
                color: active ? 'var(--color-bg)' : 'inherit',
              }}
            >
              <span style={{ fontSize: 11, minWidth: 14, opacity: active ? 0.8 : 1, color: active ? undefined : 'var(--color-accent)' }}>{p.n}</span>
              <span style={{ fontFamily: active ? 'var(--font-heading)' : undefined, fontWeight: active ? 600 : undefined, fontSize: active ? 16 : 16 }}>{p.label}</span>
            </a>
          );
        })}
      </div>

      {state.signedIn && state.role === 'editor' && (
        <div className="sidebar-editor-nav">
          <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 10 }}>
            For editors
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 30 }}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); actions.go('admin'); }}
              aria-current={state.page === 'admin' ? 'page' : undefined}
              style={{
                display: 'flex', gap: 10, alignItems: 'center', padding: '9px 10px', textDecoration: 'none', borderRadius: 2,
                background: state.page === 'admin' ? 'var(--color-accent)' : undefined,
                color: state.page === 'admin' ? 'var(--color-bg)' : 'inherit',
              }}
            >
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>Approval queue</span>
              {state.page === 'admin' ? (
                <span style={{ marginLeft: 'auto', fontSize: 12 }}>{state.pending.length}</span>
              ) : (
                <span className="tag tag-accent-2" style={{ marginLeft: 'auto' }}>{state.pending.length}</span>
              )}
            </a>
          </div>
        </div>
      )}

      <div className="sidebar-account" style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid var(--color-divider)' }}>
        {state.signedIn ? (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 5 }}>
              Signed in
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, lineHeight: 1.15 }}>{person.name}</div>
            <div style={{ fontSize: 13, marginBottom: 9 }} className="text-muted">
              {state.role === 'editor' ? 'Editor · publishes and replies' : 'Reader · rates, notes and submits'}
            </div>
            <button className="btn btn-ghost" onClick={actions.signOut} style={{ paddingLeft: 0, fontSize: 14 }}>Sign out</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 5 }}>
              Not signed in
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.45, margin: '0 0 9px' }} className="text-muted">
              Searching, reading, printing and the shopping list all work without an account.
            </p>
            <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('signin'); }} style={{ width: '100%', justifyContent: 'center' }}>
              Sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
