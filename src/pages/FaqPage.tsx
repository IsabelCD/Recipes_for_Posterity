import { useApp } from '../state/AppStateContext';
import { FAQ } from '../data/faq';
import { ASK_KINDS } from '../data/content';
import { dateLabel } from '../state/helpers';

export function FaqPage() {
  const { state, actions } = useApp();
  const publicAsks = state.publicAsks
    .slice()
    .sort((a, b) => (b.repliedOn || '').localeCompare(a.repliedOn || ''));

  const askTextLabel = state.askKind === 'A suggestion' ? 'What should change, and why?' : 'What would you like to know?';
  const askPlaceholder = state.askKind === 'A suggestion'
    ? 'Describe what you would add or change, and what it would let you do.'
    : 'Ask it as you would ask a person in the kitchen.';

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Questions and answers</h6>
      <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 14px', maxWidth: '22ch' }}>The things people ask us</h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, maxWidth: '58ch', margin: '0 0 40px' }} className="text-muted">
        Twelve questions, in the order they usually come up. If yours is not here, ask it at the foot of this page — an editor answers every one.
      </p>
      <div className="split-faq">
        <div>
          <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>Still stuck?</h3>
          <p style={{ fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>Every recipe page has a line at the foot for reporting something wrong — a quantity that does not work, a missing step, the wrong cook credited. An editor replies either way.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('contribute'); }}>Add a recipe</a>
            <a className="btn btn-ghost" href="#" onClick={(e) => { e.preventDefault(); actions.go('about'); }} style={{ paddingLeft: 0 }}>Read about us →</a>
          </div>
        </div>
        <div>
          {FAQ.map((g) => (
            <div key={g.heading} style={{ padding: '0 0 34px' }}>
              <h2 style={{ fontSize: 26, margin: '0 0 4px', paddingBottom: 8, borderBottom: '1px solid var(--color-text)' }}>{g.heading}</h2>
              {g.items.map((it) => {
                const open = state.openQ === it.id;
                return (
                  <div key={it.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); actions.toggleFaq(it.id); }}
                      style={{ display: 'flex', gap: 16, alignItems: 'baseline', padding: '15px 4px', color: 'inherit', textDecoration: 'none' }}
                    >
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, lineHeight: 1.35, maxWidth: '52ch' }}>{it.q}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 20, lineHeight: 1, color: 'var(--color-accent)' }}>{open ? '−' : '+'}</span>
                    </a>
                    {open && <p style={{ fontSize: 17, lineHeight: 1.65, margin: 0, padding: '0 4px 20px', maxWidth: '64ch' }}>{it.a}</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="split-faq" style={{ paddingTop: 70 }}>
        <div>
          <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>Ask us something</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, margin: '0 0 20px' }} className="text-muted">
            A question about how the archive works, or a suggestion for the website itself. An editor reads every one and replies; the answers that would help other cooks are published beside this form.
          </p>
          <div className="field">
            <label>What are you sending?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ASK_KINDS.map((k) => (
                <label key={k.label} className="radio" style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', cursor: 'pointer' }}>
                  <input type="radio" name="askKind" checked={state.askKind === k.label} onChange={() => actions.setAskKind(k.label)} />
                  <span className="dot" />
                  <span>
                    <span style={{ fontSize: 16 }}>{k.label}</span>
                    <span style={{ display: 'block', fontSize: 14 }} className="text-muted">{k.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>In a few words</label>
            <input className="input" value={state.askSubject} onChange={(e) => actions.setAskSubject(e.target.value)} placeholder="Converting cups to grams" />
          </div>
          <div className="field">
            <label>{askTextLabel}</label>
            <textarea className="input" rows={5} value={state.askText} onChange={(e) => actions.setAskText(e.target.value)} placeholder={askPlaceholder} style={{ fontSize: 15 }} />
          </div>
          {!!state.askError && <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--color-accent-2-700)' }}>{state.askError}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {state.signedIn ? (
              <>
                <button className="btn btn-primary" onClick={actions.sendAsk}>Send to an editor</button>
                <a className="btn btn-ghost" href="#" onClick={(e) => { e.preventDefault(); actions.go('me'); }} style={{ paddingLeft: 0 }}>See my questions →</a>
              </>
            ) : (
              <>
                <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('signin'); }}>Sign in to send this</a>
                <span style={{ fontSize: 14, maxWidth: '32ch' }} className="text-muted">The reply has to reach you somewhere, so sending needs an account.</span>
              </>
            )}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: '14px 0 0', maxWidth: '44ch' }} className="text-muted">
            The reply arrives on your own page, under “Questions I have sent”. You will be told if it is published here too.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: 26, margin: '0 0 4px', paddingBottom: 8, borderBottom: '1px solid var(--color-text)' }}>Answered for everybody</h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: '14px 0 22px' }} className="text-muted">Questions and suggestions sent by readers, with the editor's reply as it was written.</p>
          {publicAsks.map((a) => (
            <div key={a.id} style={{ padding: '0 0 26px', marginBottom: 26, borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                <span className="tag tag-accent">{a.kind}</span>
                <span className="tag tag-outline">Asked {dateLabel(a.sentOn)}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, lineHeight: 1.25, marginBottom: 6 }}>{a.subject}</div>
              <p style={{ fontSize: 16, lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 10px', maxWidth: '62ch' }}>“{a.text}”</p>
              <p style={{ fontSize: 16, lineHeight: 1.65, margin: 0, maxWidth: '64ch' }}>{a.reply}</p>
              <div style={{ fontSize: 13, marginTop: 8 }} className="text-muted">Answered by {a.repliedBy} · {dateLabel(a.repliedOn)}</div>
            </div>
          ))}
          {publicAsks.length === 0 && <p style={{ fontSize: 16 }} className="text-muted">Nothing published yet. Yours could be the first.</p>}
        </div>
      </div>
    </div>
  );
}
