import { useApp } from '../state/AppStateContext';
import { REJECT_REASONS } from '../data/reasons';
import { ADMIN_RULES } from '../data/content';
import { mealIcon, timeText, dateLabel, host, accessWords } from '../state/helpers';
import type { Access } from '../types';

export function AdminPage() {
  const { state, actions } = useApp();

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Editors only</h6>
      <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 10px' }}>Approval queue</h1>
      <p style={{ fontSize: 16, maxWidth: '60ch', margin: '0 0 32px' }} className="text-muted">
        New recipes wait here until an editor approves them. Readers cannot see this page in the finished website — it is shown here so you can try both sides. Approving publishes the recipe. Otherwise pick a reason: send it back to be revised, and it waits under Pending revision until the submitter replies, or reject it outright and it leaves the site.
      </p>

      <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--color-text)', marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 26 }}>Waiting for approval</h2>
        <span className="tag tag-accent-2">{state.pending.length}</span>
      </div>
      {state.pending.map((p) => {
        const reason = state.queueReason[p.id];
        const dish = (p.photos || []).length;
        const steps = (p.stepPhotos || []).filter(Boolean).length;
        const photoLine = !dish && !steps ? 'No photographs attached.'
          : `${dish === 1 ? 'One photograph of the dish' : `${dish} photographs of the dish`}, ${steps === 0 ? 'none on the steps' : steps === 1 ? 'one on a step' : `${steps} on the steps`}.`;
        return (
          <div key={p.id} className="queue-row">
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                <span className="tag tag-accent">{p.nationality}</span>
                <span className="tag tag-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <i className={`ph-duotone ${mealIcon(p.meal)}`} style={{ fontSize: 15, color: 'var(--color-accent-700)' }} aria-hidden="true" />{p.meal}
                </span>
                <span className="tag tag-outline" style={{ whiteSpace: 'nowrap' }}>{p.tastes.join(' · ')}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24, lineHeight: 1.15, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 14, marginBottom: 8 }} className="text-muted">
                Author: {p.author} · submitted by {p.submitter} · {p.portions} portions · {timeText(p.time)} · difficulty {p.difficulty} of 5 · visible to: {accessWords((p.access || 'public') as Access).toLowerCase()}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.5, maxWidth: '64ch' }}>{p.summary}</div>
              {!!p.source && <div style={{ fontSize: 14, marginTop: 6 }}>Submitted link: <a href={p.source} target="_blank" rel="noreferrer">{host(p.source)}</a></div>}
              {!!p.flag && <div style={{ fontSize: 14, marginTop: 8, color: 'var(--color-accent-2-700)' }}>{p.flag}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13 }} className="text-muted">{p.wait}</div>
              <div style={{ fontSize: 13 }} className="text-muted">{photoLine}</div>
              <button className="btn btn-primary" onClick={() => actions.approveSubmission(p.id)}>Approve and publish</button>
              <button className="btn btn-secondary" onClick={() => actions.loadIntoForm(p, 'pending')}>Amend before approving</button>
              <p style={{ fontSize: 12, margin: 0 }} className="text-muted">For small corrections — a typo, a unit, a missing amount — without writing to the author.</p>
              <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 7 }}>If not, pick a reason</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 9 }}>
                  {REJECT_REASONS.map((k) => (
                    <button
                      key={k.label}
                      className={reason === k.label ? 'tag tag-accent-2' : 'tag tag-outline'}
                      onClick={() => actions.pickQueueReason(p.id, k.label)}
                      style={reason === k.label ? { cursor: 'pointer', border: '1px solid var(--color-accent-2)' } : { cursor: 'pointer', background: 'transparent' }}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                {reason ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea className="input" value={state.queueNote[p.id] || ''} onChange={(e) => actions.setQueueNote(p.id, e.target.value)} rows={4} style={{ fontSize: 14 }} />
                    <button className="btn btn-secondary" onClick={() => actions.resendSubmission(p.id)}>Send back to revise</button>
                    <button className="btn btn-ghost" onClick={() => actions.rejectSubmission(p.id)} style={{ color: 'var(--color-accent-2)' }}>Reject outright</button>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, margin: 0 }} className="text-muted">Choosing a reason writes the message to the submitter, which you can edit before sending.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {state.pending.length === 0 && <p style={{ fontSize: 16, padding: '22px 0 0' }} className="text-muted">Nothing waiting. Every submission has been read.</p>}

      <div style={{ padding: '52px 0 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--color-text)' }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>Pending revision</h2>
          <span className="tag tag-neutral">{state.rejected.length}</span>
          <span style={{ fontSize: 14 }} className="text-muted">Sent back to the submitter, waiting for a reply. When they resubmit it returns here to Waiting for approval on its own.</span>
        </div>
        {state.rejected.map((p) => (
          <div key={p.id} className="rejected-row">
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                <span className="tag tag-accent">Pending revision</span>
                <span className="tag tag-outline">{p.reason}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, lineHeight: 1.15, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 14, marginBottom: 6 }} className="text-muted">Author: {p.author} · submitted by {p.submitter}</div>
              <div style={{ fontSize: 15, lineHeight: 1.5, maxWidth: '64ch' }}>{p.summary}</div>
              {!!p.note && <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6, fontStyle: 'italic', maxWidth: '64ch' }} className="text-muted">“{p.note}”</div>}
              <div style={{ fontSize: 13, marginTop: 6 }} className="text-muted">Sent back {dateLabel(p.rejectedOn)} by {p.by} · no reply yet</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => actions.dropRejected(p.id)} style={{ color: 'var(--color-accent-2)' }}>Close without publishing</button>
            </div>
          </div>
        ))}
        {state.rejected.length === 0 && <p style={{ fontSize: 16, padding: '20px 0 0' }} className="text-muted">Nothing out for revision.</p>}
      </div>

      <div style={{ padding: '52px 0 0' }}>
        <div style={{ display: 'flex', gap: 22, alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--color-text)' }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>Reader reports</h2>
          <span className="tag tag-neutral">{state.takedowns.length}</span>
          <span style={{ fontSize: 14 }} className="text-muted">Corrections and takedown requests</span>
        </div>
        {state.takedowns.map((t) => {
          const isTakedown = (t.kind || 'Should be taken down') === 'Should be taken down';
          return (
            <div key={t.id} className="queue-row">
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <span className={isTakedown ? 'tag tag-accent-2' : 'tag tag-accent'}>{t.kind}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: 14, marginBottom: 6 }} className="text-muted">Reported by {t.by}</div>
                <div style={{ fontSize: 15, lineHeight: 1.5, maxWidth: '64ch', fontStyle: 'italic' }}>“{t.reason}”</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!isTakedown && <button className="btn btn-primary" onClick={() => actions.fixTakedown(t.recipeId, t.id)}>Amend the recipe</button>}
                <button className="btn btn-secondary" onClick={() => actions.dismissTakedown(t.id)}>Leave as it is</button>
                <button className="btn btn-ghost" onClick={() => actions.removeTakedownRecipe(t.id, t.recipeId)} style={{ color: 'var(--color-accent-2)' }}>Delete the recipe</button>
              </div>
            </div>
          );
        })}
        {state.takedowns.length === 0 && <p style={{ fontSize: 16, padding: '20px 0 0' }} className="text-muted">Nothing reported.</p>}
      </div>

      <div style={{ padding: '52px 0 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--color-text)' }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>Questions and suggestions</h2>
          <span className="tag tag-accent-2">{state.asks.filter((a) => a.status === 'Waiting').length}</span>
          <span style={{ fontSize: 14 }} className="text-muted">Sent from the questions page. Your reply goes to the sender's own page; tick the box to publish it for everybody as well.</span>
        </div>
        {state.asks.filter((a) => a.status !== 'Closed').map((a) => {
          const draft = state.askReply[a.id] === undefined ? a.reply : state.askReply[a.id];
          const willPublish = state.askPublish[a.id] === undefined ? a.published : state.askPublish[a.id];
          const answered = a.status === 'Answered';
          return (
            <div key={a.id} className="ask-row">
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                  <span className="tag tag-accent">{a.kind}</span>
                  {!answered && <span className="tag tag-accent-2">Waiting for a reply</span>}
                  {answered && <span className="tag tag-neutral">Answered</span>}
                  {a.published && <span className="tag tag-outline">On the questions page</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, lineHeight: 1.2, marginBottom: 4 }}>{a.subject}</div>
                <div style={{ fontSize: 14, marginBottom: 8 }} className="text-muted">From {a.by} · {dateLabel(a.sentOn)}</div>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, maxWidth: '64ch', fontStyle: 'italic' }}>“{a.text}”</p>
                {answered && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--color-accent-100)', maxWidth: '64ch' }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 5 }}>Reply sent</div>
                    <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>{a.reply}</p>
                    <div style={{ fontSize: 13, marginTop: 6 }} className="text-muted">{a.repliedBy} · {dateLabel(a.repliedOn)}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea className="input" rows={5} value={draft} onChange={(e) => actions.setAdminAskDraft(a.id, e.target.value)} placeholder={answered ? 'Revise the reply…' : `Write the reply to ${a.by.split(' ')[0]}…`} style={{ fontSize: 14 }} />
                <label style={{ display: 'flex', gap: 9, alignItems: 'baseline', fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!willPublish} onChange={() => actions.toggleAdminAskPublish(a.id)} />
                  <span>Publish this answer on the questions page</span>
                </label>
                <button className="btn btn-primary" onClick={() => actions.sendAdminAskReply(a.id)}>{answered ? 'Update the reply' : 'Send the reply'}</button>
                {answered && <button className="btn btn-secondary" onClick={() => actions.unpublishAdminAsk(a.id)}>{a.published ? 'Take off the questions page' : 'Publish this answer'}</button>}
                <button className="btn btn-ghost" onClick={() => actions.closeAdminAsk(a.id)} style={{ color: 'var(--color-accent-2)' }}>Close without replying</button>
              </div>
            </div>
          );
        })}
        {state.asks.filter((a) => a.status !== 'Closed').length === 0 && <p style={{ fontSize: 16, padding: '20px 0 0' }} className="text-muted">Nothing asked. Every question has been answered or closed.</p>}
      </div>

      <div style={{ padding: '52px 0 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--color-text)' }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>Editors</h2>
          <span className="tag tag-neutral">{state.editors.length === 1 ? '1 editor' : `${state.editors.length} editors`}</span>
          <span style={{ fontSize: 14 }} className="text-muted">Editors can publish, send submissions back and answer questions. Give the role only to people who read submissions.</span>
        </div>
        {state.editors.slice().sort((a, b) => a.displayName.localeCompare(b.displayName)).map((ac) => {
          const self = ac.uid === state.currentUser?.uid;
          return (
            <div key={ac.uid} className="account-row">
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, lineHeight: 1.2 }}>{ac.displayName}</div>
                <div style={{ fontSize: 14 }} className="text-muted">{ac.email}{ac.createdAt ? ` · joined ${dateLabel(ac.createdAt)}` : ''}</div>
              </div>
              <div><span className="tag tag-accent-2">Editor</span></div>
              <div>
                {!self && <button className="btn btn-secondary" onClick={() => actions.demoteEditor(ac.uid)} style={{ width: '100%', justifyContent: 'center' }}>Return to reader</button>}
                {self && <span style={{ fontSize: 14 }} className="text-muted">This is your own account.</span>}
              </div>
            </div>
          );
        })}

        <div style={{ padding: '30px 0 0', maxWidth: 660 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Add an editor</h3>
          <p style={{ fontSize: 14, margin: '0 0 14px' }} className="text-muted">Write the email address of the account. They have to have signed up already — nothing is sent to an address we do not hold.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'end' }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Email address</label>
              <input className="input" type="email" value={state.editorDraft} onChange={(e) => actions.setEditorDraft(e.target.value)} placeholder="whitcombe@example.pt" />
            </div>
            <button className="btn btn-primary" onClick={actions.addEditor}>Make an editor</button>
          </div>
          {!!state.editorError && <p style={{ fontSize: 14, margin: '10px 0 0', color: 'var(--color-accent-2)' }}>{state.editorError}</p>}
        </div>
      </div>

      <div style={{ padding: '52px 0 0', maxWidth: '70ch' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 26 }}>The rules editors work to</h2>
        {ADMIN_RULES.map((ru) => (
          <div key={ru.n} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--color-divider)', fontSize: 15, lineHeight: 1.5 }}>
            <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{ru.n}</span>
            <span>{ru.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
