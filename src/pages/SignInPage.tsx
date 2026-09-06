import { useApp } from '../state/AppStateContext';
import { GATE_ROWS, SIGN_ROLES } from '../data/content';

export function SignInPage() {
  const { state, actions } = useApp();
  const { signMode, pendingPage, signRole } = state;

  const signHeadline = signMode === 'new'
    ? 'Create a reader account.'
    : pendingPage === 'admin' ? 'Editors sign in here.'
      : pendingPage === 'contribute' ? 'Adding a recipe needs an account.'
        : pendingPage === 'me' ? 'Your page needs an account.'
          : 'Sign in to keep things against your name.';

  const signIntro = signMode === 'new'
    ? 'A name, an email address and a password. Nothing else is asked, and nothing is kept against your name until you sign in.'
    : pendingPage === 'admin'
      ? 'The approval queue, the reports and the questions readers send are visible to editors only.'
      : pendingPage === 'contribute'
        ? 'An editor reads every submission and often sends comments back — a question about a quantity, a step that needs a line more. Those comments need somewhere to reach you.'
        : 'Searching, reading, scaling portions, the shopping list, cooking from your cupboard and printing all work without an account. Signing in is only needed where the website has to remember something about you.';

  const signButtonLabel = signMode === 'new'
    ? 'Create the account and sign in'
    : signRole === 'editor' ? 'Sign in as an editor' : 'Sign in';

  const signRoleHint = signRole === 'editor'
    ? 'Editors read submissions, publish or send them back, and answer the questions readers send.'
    : 'Rate recipes, write notes and submit your own recipes.';

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Accounts</h6>
      <h1 style={{ fontSize: 52, lineHeight: 1, letterSpacing: '-0.03em', margin: '0 0 16px', maxWidth: '22ch' }}>{signHeadline}</h1>
      <p style={{ fontSize: 18, lineHeight: 1.55, maxWidth: '56ch', margin: '0 0 44px' }} className="text-muted">{signIntro}</p>

      <div className="grid-2">
        <div style={{ maxWidth: '44ch' }}>
          {signMode !== 'new' && (
            <div className="field">
              <label>Signing in as</label>
              <div className="seg">
                {SIGN_ROLES.map((sr) => (
                  <button
                    key={sr.key}
                    className="seg-opt"
                    aria-pressed={signRole === sr.key}
                    onClick={() => actions.pickSignRole(sr.key)}
                    style={signRole === sr.key ? { background: sr.key === 'editor' ? 'var(--color-accent-2)' : 'var(--color-accent)', color: 'var(--color-bg)' } : undefined}
                  >
                    {sr.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }} className="text-muted">{signRoleHint}</p>
            </div>
          )}
          {signMode === 'new' && (
            <p style={{ fontSize: 15, lineHeight: 1.55, margin: '0 0 18px', padding: '12px 14px', background: 'var(--color-accent-100)', maxWidth: '46ch' }}>
              New accounts are reader accounts: rate recipes, write notes and submit your own. Editor accounts are given out by the editors themselves.
            </p>
          )}
          <div className="field">
            <label>Your name</label>
            <input className="input" value={state.signName} onChange={(e) => actions.setSignName(e.target.value)} placeholder="Ana Ribeiro" />
            <p style={{ fontSize: 13, margin: '5px 0 0' }} className="text-muted">This is the name that appears on your notes and on the recipes you submit.</p>
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={state.signEmail} onChange={(e) => actions.setSignEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={state.signPass} onChange={(e) => actions.setSignPass(e.target.value)} placeholder="At least eight characters" />
          </div>
          {!!state.signError && (
            <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-accent-2-700)', maxWidth: '46ch', lineHeight: 1.5 }}>{state.signError}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={actions.doSignIn}>{signButtonLabel}</button>
            {signMode !== 'new' && <button className="btn btn-secondary" onClick={actions.toCreate}>Create an account</button>}
            {signMode === 'new' && <button className="btn btn-secondary" onClick={actions.toSignIn}>I already have one</button>}
          </div>
          <a className="btn btn-ghost" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }} style={{ paddingLeft: 0, marginTop: 8 }}>
            Keep looking without an account →
          </a>
        </div>

        <div>
          <h2 style={{ fontSize: 26, margin: '0 0 4px', paddingBottom: 8, borderBottom: '1px solid var(--color-text)' }}>What needs an account</h2>
          {GATE_ROWS.map((g) => (
            <div key={g.what} style={{ display: 'grid', gridTemplateColumns: '136px minmax(0,1fr)', gap: 16, padding: '11px 0', borderBottom: '1px solid var(--color-divider)', alignItems: 'baseline' }}>
              <span className={`tag ${g.open ? 'tag-neutral' : 'tag-accent'}`}>{g.open ? 'No account' : 'Sign in'}</span>
              <span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, display: 'block' }}>{g.what}</span>
                <span style={{ fontSize: 14, lineHeight: 1.5 }} className="text-muted">{g.why}</span>
              </span>
            </div>
          ))}
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: '16px 0 0', maxWidth: '48ch' }} className="text-muted">
            Nothing is kept against your name unless you sign in. Without an account the shopping list and the portions you set live only in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}
