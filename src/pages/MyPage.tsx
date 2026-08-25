import { useApp } from '../state/AppStateContext';
import { me, myRatedIds, myRatingFor, myContributions } from '../state/selectors';
import { mealIcon, stars, dateLabel } from '../state/helpers';

export function MyPage() {
  const { state, actions } = useApp();
  const person = me(state);
  const ratedIds = myRatedIds(state).filter((id) => myRatingFor(state, id));
  const meAvgGiven = ratedIds.length ? (ratedIds.reduce((a, id) => a + myRatingFor(state, id), 0) / ratedIds.length).toFixed(1) : '—';
  const meRated = ratedIds
    .map((id) => ({ id, r: state.recipes.find((x) => x.id === id) }))
    .filter((x): x is { id: string; r: NonNullable<typeof x.r> } => !!x.r)
    .sort((a, b) => myRatingFor(state, b.id) - myRatingFor(state, a.id) || a.r.title.localeCompare(b.r.title));

  const givenCounts = [0, 0, 0, 0, 0];
  myRatedIds(state).forEach((id) => { const v = myRatingFor(state, id); if (v) givenCounts[v - 1]++; });
  const givenMax = Math.max(...givenCounts, 1);

  const mine = myContributions(state);
  const contribVotes = mine.reduce((a, r) => a + r.votes, 0);
  const meContribAvg = contribVotes ? (mine.reduce((a, r) => a + r.rating * r.votes, 0) / contribVotes).toFixed(1) : '—';
  const contribNotes = mine.reduce((a, r) => a + (r.comments || []).length + (state.extraComments[r.id] || []).length, 0);
  const bestContribution = mine.slice().sort((a, b) => b.rating - a.rating)[0];

  const needsWork = state.rejected.filter((p) => p.submitter === person.name);
  const waiting = state.pending.filter((p) => p.submitter === person.name);
  const myAsks = state.asks.filter((a) => a.by === person.name).slice().sort((a, b) => (b.sentOn || '').localeCompare(a.sentOn || ''));

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>My page</h6>
      <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{person.name}</h1>
      <p style={{ fontSize: 16, margin: '0 0 40px' }} className="text-muted">Reading and cooking here since {dateLabel(person.joined)}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(150px,1fr))', gap: 36, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 52, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-accent)' }}>{ratedIds.length}</div>
          <div style={{ fontSize: 15, marginTop: 6 }}>Recipes I rated</div>
          <div style={{ fontSize: 13 }} className="text-muted">{myRatedIds(state).length} of {state.recipes.length} recipes in the archive</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 52, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-accent)' }}>{meAvgGiven}</div>
          <div style={{ fontSize: 15, marginTop: 6 }}>Average I give</div>
          <div style={{ fontSize: 13 }} className="text-muted">Across {ratedIds.length} recipes I rated</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 52, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-accent-2)' }}>{meContribAvg}</div>
          <div style={{ fontSize: 15, marginTop: 6 }}>Average my recipes get</div>
          <div style={{ fontSize: 13 }} className="text-muted">From {contribVotes} ratings by other cooks</div>
        </div>
      </div>

      <h2 style={{ margin: '56px 0 6px', fontSize: 28 }}>My inner circle</h2>
      <p style={{ fontSize: 15, maxWidth: '64ch', margin: '0 0 22px' }} className="text-muted">
        The people who can open the recipes you marked for your inner circle. Write the email address they use here — everybody else sees only your public recipes.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,420px) auto', gap: 12, alignItems: 'end', maxWidth: 660 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Email address</label>
          <input className="input" type="email" value={state.circleDraft} onChange={(e) => actions.setCircleDraft(e.target.value)} placeholder="tia.lurdes@example.pt" />
        </div>
        <button className="btn btn-primary" onClick={actions.addCircleEmail}>Add to my circle</button>
      </div>
      {!!state.circleError && <p style={{ fontSize: 14, margin: '10px 0 0', color: 'var(--color-accent-2)' }}>{state.circleError}</p>}
      <div style={{ marginTop: 26, maxWidth: 660 }}>
        {state.circle.map((email) => (
          <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: '13px 0', borderBottom: '1px solid var(--color-divider)' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17 }}>{email}</span>
            <button className="btn btn-ghost" onClick={() => actions.removeCircleEmail(email)} style={{ color: 'var(--color-accent-2)', paddingRight: 0 }}>Remove</button>
          </div>
        ))}
        {state.circle.length === 0 && <p style={{ fontSize: 16, margin: 0 }} className="text-muted">Nobody is in your circle yet. Recipes you mark for the inner circle stay with you until you add someone.</p>}
      </div>

      <h2 style={{ margin: '64px 0 6px', fontSize: 28 }}>Recipes I have rated</h2>
      <p style={{ fontSize: 15, maxWidth: '60ch', margin: '0 0 20px' }} className="text-muted">Every recipe you gave stars to, with your rating beside what everybody else gave it.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 170px 170px', gap: 24, paddingBottom: 10, borderBottom: '1px solid var(--color-text)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
        <span>Recipe</span><span>My rating</span><span>Everyone</span>
      </div>
      {meRated.map(({ id, r }) => (
        <div key={id} className="rating-row">
          <div>
            <a href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(id); }} style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, color: 'inherit', textDecoration: 'none' }}>{r.title}</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 3 }} className="text-muted">
              <i className={`ph-duotone ${mealIcon(r.meal)}`} style={{ fontSize: 16, color: 'var(--color-accent)' }} aria-hidden="true" />{r.nationality} · {r.meal}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, color: 'var(--color-accent-700)', letterSpacing: '0.08em' }}>{stars(myRatingFor(state, id))}</div>
            <div style={{ fontSize: 13 }} className="text-muted">{myRatingFor(state, id)} of 5</div>
          </div>
          <span style={{ fontSize: 15 }} className="text-muted">{r.rating.toFixed(1)} from everyone</span>
        </div>
      ))}
      {meRated.length === 0 && <p style={{ fontSize: 16, padding: '18px 0 0' }} className="text-muted">You have not rated anything yet. Open a recipe and click a star.</p>}

      <div style={{ marginTop: 56, maxWidth: 520 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 26 }}>The ratings I give</h2>
        <p style={{ fontSize: 15, margin: '0 0 18px' }} className="text-muted">How generous a rater you are.</p>
        {[5, 4, 3, 2, 1].map((n) => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '78px minmax(0,1fr) 30px', gap: 14, alignItems: 'center', padding: '6px 0' }}>
            <span style={{ fontSize: 15, color: 'var(--color-accent-700)', letterSpacing: '0.06em' }}>{stars(n)}</span>
            <div style={{ height: 12, background: 'var(--color-neutral-200)' }}>
              <div style={{ height: 12, background: 'var(--color-accent)', width: `${Math.round((givenCounts[n - 1] / givenMax) * 100)}%` }} />
            </div>
            <span style={{ fontSize: 14, textAlign: 'right' }} className="text-muted">{givenCounts[n - 1]}</span>
          </div>
        ))}
      </div>

      <h2 style={{ margin: '64px 0 6px', fontSize: 28 }}>Recipes I brought to the archive</h2>
      <p style={{ fontSize: 15, maxWidth: '62ch', margin: '0 0 20px' }} className="text-muted">Recipes you wrote down and submitted — the cook they came from is credited on each one. These are the ratings other people have left on your work.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 38, marginBottom: 26, fontSize: 15 }}>
        <span><strong>{mine.length}</strong> published</span>
        <span><strong>{contribVotes}</strong> ratings received</span>
        <span><strong>{contribNotes}</strong> notes from other cooks</span>
        <span className="text-muted">Best received: {bestContribution ? `${bestContribution.title} — ${bestContribution.rating.toFixed(1)} of 5 from ${bestContribution.votes} cooks` : '—'}</span>
      </div>
      {mine.slice().sort((a, b) => b.rating - a.rating).map((r) => (
        <div key={r.id} className="contribution-row">
          <div>
            <a href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(r.id); }} style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, color: 'inherit', textDecoration: 'none' }}>{r.title}</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 3 }} className="text-muted">
              <i className={`ph-duotone ${mealIcon(r.meal)}`} style={{ fontSize: 16, color: 'var(--color-accent)' }} aria-hidden="true" />{r.nationality} · {r.meal}
            </div>
            <div style={{ fontSize: 14, marginTop: 4 }}>{r.author === person.name ? 'Your own recipe' : `Written down from ${r.author}`}</div>
          </div>
          <div>
            <div style={{ fontSize: 16, color: 'var(--color-accent-700)', letterSpacing: '0.08em' }}>{stars(r.rating)}</div>
            <div style={{ fontSize: 13 }} className="text-muted">{r.rating.toFixed(1)} of 5</div>
          </div>
          <span style={{ fontSize: 15 }} className="text-muted">{r.votes} ratings · {((r.comments || []).length + (state.extraComments[r.id] || []).length) === 1 ? '1 note' : `${(r.comments || []).length + (state.extraComments[r.id] || []).length} notes`}</span>
          <span style={{ fontSize: 14 }} className="text-muted">Published {dateLabel(r.date)}</span>
        </div>
      ))}

      {needsWork.length > 0 && (
        <div style={{ marginTop: 34, padding: '16px 18px', background: 'var(--color-accent-100)', maxWidth: '74ch' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Needs something from you</div>
          <p style={{ fontSize: 14, margin: '0 0 10px' }} className="text-muted">Submissions an editor has sent back or turned down. Fix what they asked for and send it again.</p>
          {needsWork.map((w) => (
            <div key={w.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 170px', gap: 20, padding: '12px 0', borderTop: '1px solid var(--color-divider)', alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 6 }}>
                  <span className="tag tag-accent">Pending revision</span>
                  <span className="tag tag-outline">{w.reason}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19 }}>{w.title}</div>
                <div style={{ fontSize: 14 }} className="text-muted">Written down from {w.author}</div>
                {!!w.note && <div style={{ fontSize: 14, lineHeight: 1.5, fontStyle: 'italic', marginTop: 5, maxWidth: '60ch' }}>“{w.note}”</div>}
                <div style={{ fontSize: 13, marginTop: 5 }} className="text-muted">Sent back to you {dateLabel(w.rejectedOn)} by {w.by}</div>
              </div>
              <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('contribute'); }}>Send a revised copy</a>
            </div>
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <div style={{ marginTop: 34, padding: '16px 18px', background: 'var(--color-accent-2-100)', maxWidth: '70ch' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Waiting for an editor</div>
          {waiting.map((w) => (
            <div key={w.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline', padding: '5px 0', fontSize: 15 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{w.title}</span>
              <span className="text-muted">Written down from {w.author}</span>
              <span className="text-muted" style={{ marginLeft: 'auto' }}>{w.wait}</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ margin: '64px 0 6px', fontSize: 28 }}>Questions I have sent</h2>
      <p style={{ fontSize: 15, maxWidth: '62ch', margin: '0 0 20px' }} className="text-muted">Questions and suggestions you sent from the questions page, newest first, with the editor's reply where one has arrived.</p>
      {myAsks.map((a) => (
        <div key={a.id} className="ask-me-row">
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 7 }}>
              <span className="tag tag-accent">{a.kind}</span>
              {a.published && <span className="tag tag-outline">Published for everybody</span>}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, lineHeight: 1.2, marginBottom: 5 }}>{a.subject}</div>
            <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0, maxWidth: '64ch', fontStyle: 'italic' }}>“{a.text}”</p>
            {a.status === 'Answered' && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--color-accent-100)', maxWidth: '64ch' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', marginBottom: 5 }}>{a.repliedBy} replied {dateLabel(a.repliedOn)}</div>
                <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>{a.reply}</p>
              </div>
            )}
            {a.status === 'Closed' && <p style={{ fontSize: 14, margin: '10px 0 0' }} className="text-muted">Closed by an editor without a written reply.</p>}
          </div>
          <div>
            {a.status === 'Waiting' && <span className="tag tag-accent-2">Waiting for an answer</span>}
            {a.status === 'Answered' && <span className="tag tag-neutral">Answered</span>}
            <div style={{ fontSize: 13, marginTop: 7 }} className="text-muted">Sent {dateLabel(a.sentOn)}</div>
          </div>
        </div>
      ))}
      {myAsks.length === 0 && (
        <p style={{ fontSize: 16 }} className="text-muted">
          You have not asked anything yet. The <a href="#" onClick={(e) => { e.preventDefault(); actions.go('faq'); }}>questions page</a> has a form at the foot.
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 44 }}>
        <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('contribute'); }}>Add another recipe</a>
        <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }}>Find something to cook</a>
      </div>
    </div>
  );
}
