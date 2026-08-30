import { useApp } from '../state/AppStateContext';
import { ImageSlot } from '../components/ImageSlot';
import { CmykNumeral } from '../components/CmykNumeral';
import { ReportDialog } from '../components/ReportDialog';
import { activeRecipe, accessOf, myRatingFor } from '../state/selectors';
import { mealIcon, stars, timeText, dateLabel, host, fmt, accessWords } from '../state/helpers';

export function RecipeBlockedPage() {
  const { state, actions } = useApp();
  const r = activeRecipe(state);
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h6 style={{ color: 'var(--color-accent-2)', margin: '0 0 12px' }}>Private recipe</h6>
      <h1 style={{ fontSize: 40, lineHeight: 1.06, letterSpacing: '-0.03em', margin: '0 0 14px' }}>This one is not yours to read</h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, margin: '0 0 26px' }}>
        The cook who submitted it kept it for {accessWords(accessOf(state, r)).toLowerCase()}. If you think you should have it, ask them to add your email to their inner circle.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }}>Find something else</a>
        {!state.signedIn && <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('signin'); }}>Sign in</a>}
      </div>
    </div>
  );
}

export function RecipePage() {
  const { state, actions } = useApp();
  const r = activeRecipe(state);
  const base = r.portions;
  const portions = state.portionsById[r.id] || base;
  const factor = portions / base;
  const myRating = myRatingFor(state, r.id);
  const comments = (r.comments || []).concat(state.extraComments[r.id] || []);
  const restricted = accessOf(state, r) !== 'public';
  const inList = state.selected.indexOf(r.id) !== -1;

  return (
    <div data-print-page className="print-page page" style={{ maxWidth: 1320 }}>
      <a className="btn btn-ghost print-hide" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }} style={{ paddingLeft: 0, marginBottom: 16 }}>← Back to search</a>
      <div className="print-grid recipe-layout">
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
            <span className="tag tag-accent">{r.nationality}</span>
            <span className="tag tag-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i className={`ph-duotone ${mealIcon(r.meal)}`} style={{ fontSize: 15, color: 'var(--color-accent-700)' }} aria-hidden="true" />{r.meal}
            </span>
            <span className="tag tag-outline" style={{ whiteSpace: 'nowrap' }}>{r.tastes.join(' · ')}</span>
            <span className="tag tag-neutral">{r.language}</span>
            {restricted && <span className="tag tag-accent-2">{accessWords(accessOf(state, r))}</span>}
          </div>
          <h1 style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em', margin: '0 0 16px', maxWidth: '20ch' }}>{r.title}</h1>
          <p style={{ fontSize: 19, lineHeight: 1.5, maxWidth: '58ch', margin: '0 0 18px' }}>{r.blurb}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 14, padding: '12px 0', borderTop: '1px solid var(--color-text)', borderBottom: '1px solid var(--color-divider)' }}>
            <span><span className="text-muted">Author</span> · {r.author}</span>
            <span><span className="text-muted">Submitted by</span> · {r.submitter}</span>
            <span><span className="text-muted">Added</span> · {dateLabel(r.date)}</span>
            <span><span className="text-muted">Time</span> · {timeText(r.time)}</span>
            <span><span className="text-muted">Difficulty</span> · {r.difficulty} of 5</span>
          </div>
          {!!r.source && <p style={{ fontSize: 14, margin: '12px 0 0' }}>Original recipe: <a href={r.source} target="_blank" rel="noreferrer">{host(r.source)}</a></p>}
          {!!(r.photos && r.photos.length) && (
            <div data-print-photos className="print-photos" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '22px 0 0' }}>
              {r.photos!.map((id) => (
                <div key={id} style={{ width: 262, height: 190, border: '7px solid #fffdf8', boxShadow: '0 4px 14px color-mix(in srgb, var(--color-text) 18%, transparent)' }}>
                  <ImageSlot id={id} shape="rect" placeholder="Photograph of the dish" />
                </div>
              ))}
            </div>
          )}

          <div data-print-sec className="print-sec" style={{ padding: '40px 0 0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 30 }}>Ingredients</h2>
              <div className="print-hide" style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 'auto' }}>
                <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="text-muted">Portions</span>
                <button className="btn btn-secondary btn-icon" onClick={() => actions.decPortions(r.id, base)} aria-label="Fewer portions">−</button>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 21, minWidth: 26, textAlign: 'center' }}>{portions}</span>
                <button className="btn btn-secondary btn-icon" onClick={() => actions.incPortions(r.id, base)} aria-label="More portions">+</button>
              </div>
            </div>
            <p style={{ fontSize: 14, margin: '0 0 18px', maxWidth: '70ch' }} className="text-muted">
              {portions === base ? `Quantities are for ${base} portions, as the cook wrote them.` : `Quantities scaled from ${base} to ${portions} portions.`} Amounts shown under each step of the method scale with them.
            </p>
            <div data-print-ing className="print-ing" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0 40px' }}>
              {r.ingredients.map((i, idx) => (
                <div key={idx} className="ingredient-row">
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, color: 'var(--color-accent-700)' }}>
                    {i.qb ? 'q.b.' : `${i.q ? fmt(i.q * factor) : ''}${i.u ? ` ${i.u}` : ''}`}
                  </span>
                  <span style={{ fontSize: 16 }}>{i.n}</span>
                </div>
              ))}
            </div>
          </div>

          <div data-print-sec className="print-sec" style={{ padding: '48px 0 0' }}>
            <h2 style={{ margin: '0 0 22px', fontSize: 30 }}>Method</h2>
            <div data-print-steps className="print-steps">
              {r.steps.map((text, i) => {
                const uses = (r.uses && r.uses[i]) || [];
                const photoId = (r.stepPhotos || [])[i];
                return (
                  <div key={i} className="step-row">
                    <CmykNumeral value={String(i + 1).padStart(2, '0')} style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 34 }} />
                    <div>
                      <p style={{ fontSize: 17, lineHeight: 1.6, margin: 0, maxWidth: '64ch' }}>{text}</p>
                      {!!photoId && (
                        <div data-print-stepphoto className="print-stepphoto" style={{ width: 280, height: 186, marginTop: 12, border: '7px solid #fffdf8', boxShadow: '0 4px 14px color-mix(in srgb, var(--color-text) 18%, transparent)' }}>
                          <ImageSlot id={photoId} shape="rect" placeholder="Photograph of this step" />
                        </div>
                      )}
                      {uses.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 22px', marginTop: 9, fontSize: 14 }}>
                          <span className="text-muted" style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11, alignSelf: 'center' }}>Uses now</span>
                          {uses.map((u, j) => (
                            <span key={j}>
                              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--color-accent-700)' }}>
                                {u.qb ? 'q.b.' : `${fmt((Number(u.q) || 0) * factor)}${u.u ? ` ${u.u}` : ''}`}
                              </span> {u.n}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="print-hide" style={{ padding: '32px 0 0' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 30 }}>Rate this recipe</h2>
            {!state.signedIn && (
              <>
                <p style={{ fontSize: 15, margin: '0 0 12px', maxWidth: '56ch' }} className="text-muted">A rating is kept against your name, so it needs an account. Reading, scaling and printing the recipe do not.</p>
                <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('signin'); }}>Sign in to rate this recipe</a>
              </>
            )}
            {state.signedIn && (
              <>
                <p style={{ fontSize: 15, margin: '0 0 14px' }} className="text-muted">
                  {myRating ? 'Saved on its own — you can change it at any time, with or without a note.' : 'One click saves it. No note needed — only rate it if you have cooked it.'}
                </p>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => actions.setMyRating(r.id, n)}
                      aria-label={`${n} of 5`}
                      style={{ cursor: 'pointer', background: 'transparent', border: 0, padding: 2, fontSize: 32, lineHeight: 1, color: n <= myRating ? 'var(--color-accent)' : 'var(--color-neutral-400)' }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: 15, marginLeft: 10 }} className="text-muted">{myRating ? `You gave it ${myRating} of 5 — saved` : 'Click a star'}</span>
                  {!!myRating && <button className="btn btn-ghost" onClick={() => actions.clearMyRating(r.id)} style={{ marginLeft: 6, fontSize: 13 }}>Remove my rating</button>}
                </div>
              </>
            )}
          </div>

          <div className="print-hide" style={{ padding: '44px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 30 }}>Community notes</h2>
              <span className="text-muted" style={{ fontSize: 14 }}>{comments.length === 1 ? '1 note' : `${comments.length} notes`}</span>
            </div>
            <p style={{ fontSize: 15, margin: '0 0 20px', maxWidth: '58ch' }} className="text-muted">Substitutions, timings, what went wrong. Notes stay attached to the recipe for whoever cooks it next.</p>
            {comments.map((c, i) => {
              const commentKey = `${r.id}__${i}`;
              const replies = state.commentReplies[commentKey] || [];
              const replyOpen = !!state.openReplies[commentKey];
              return (
                <div key={i} style={{ padding: '16px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16 }}>{c.by}</span>
                    <span style={{ fontSize: 13 }} className="text-muted">{c.when}</span>
                    <span style={{ fontSize: 15, color: 'var(--color-accent)', letterSpacing: '0.06em', marginLeft: 'auto' }}>{c.rating ? stars(c.rating) : ''}</span>
                  </div>
                  <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, maxWidth: '66ch' }}>{c.text}</p>

                  {replies.length > 0 && (
                    <div style={{ marginTop: 12, paddingLeft: 20, borderLeft: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {replies.map((rp, j) => (
                        <div key={j}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 2 }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>{rp.by}</span>
                            <span style={{ fontSize: 12 }} className="text-muted">{rp.when}</span>
                          </div>
                          <p style={{ fontSize: 15, lineHeight: 1.5, margin: 0, maxWidth: '62ch' }}>{rp.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {state.signedIn && (
                    <div style={{ marginTop: 10 }}>
                      <button className="btn btn-ghost" onClick={() => actions.toggleReplyBox(commentKey)} style={{ paddingLeft: 0, fontSize: 13 }}>
                        {replyOpen ? 'Cancel' : 'Reply'}
                      </button>
                      {replyOpen && (
                        <div style={{ maxWidth: '60ch' }}>
                          <textarea
                            className="input"
                            value={state.replyDrafts[commentKey] || ''}
                            onChange={(e) => actions.setReplyDraft(commentKey, e.target.value)}
                            placeholder={`Reply to ${c.by.split(' ')[0]}…`}
                            style={{ fontSize: 14, minHeight: 60 }}
                          />
                          <button className="btn btn-primary" onClick={() => actions.postReply(commentKey)} style={{ marginTop: 8 }}>Post reply</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ padding: '20px 0 0', maxWidth: '60ch' }}>
              {!state.signedIn && (
                <>
                  <p style={{ fontSize: 15, margin: '0 0 12px', maxWidth: '56ch' }} className="text-muted">Notes are signed with your name, so writing one needs an account. Reading them does not.</p>
                  <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('signin'); }}>Sign in to add a note</a>
                </>
              )}
              {state.signedIn && (
                <>
                  <div className="field">
                    <label>Add a note <span className="text-muted" style={{ fontWeight: 400 }}>— optional, the rating above stands on its own</span></label>
                    <textarea className="input" value={state.commentDraft} onChange={(e) => actions.setCommentDraft(e.target.value)} placeholder="I used smoked paprika instead and it worked well." />
                  </div>
                  <button className="btn btn-primary" onClick={() => actions.postComment(r.id)} style={{ marginTop: 10 }}>Post note</button>
                </>
              )}
            </div>
          </div>
        </div>

        <div data-print-side className="print-side sticky-side">
          <div style={{ borderTop: '4px solid var(--color-text)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
              <span style={{ fontSize: 24, color: 'var(--color-accent)', letterSpacing: '0.06em' }}>{stars(r.rating)}</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19 }}>{r.rating.toFixed(1)}</span>
            </div>
            <p style={{ fontSize: 14, margin: '0 0 20px' }} className="text-muted">{r.rating.toFixed(1)} from {r.votes} ratings</p>
            <div className="print-hide" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
              <button className="btn btn-primary" onClick={() => actions.toggleSelect(r.id)} style={{ margin: 0 }}>
                {inList ? '✓ In your shopping list — remove' : `Add these ${portions} portions to my shopping list`}
              </button>
              <button className="btn btn-secondary" onClick={actions.printPage} style={{ margin: 0 }}>Print this recipe</button>
            </div>
            <div data-print-keep className="print-keep" style={{ paddingTop: 22 }}>
              <h6 style={{ margin: '0 0 6px' }}>At a glance</h6>
              {[
                { k: 'Makes', v: `${base} portions as written` },
                { k: 'Time', v: timeText(r.time) },
                { k: 'Difficulty', v: `${r.difficulty} of 5` },
                { k: 'Who can see it', v: accessWords(accessOf(state, r)) },
                { k: 'Taste', v: r.tastes.join(', ') },
                { k: 'Added', v: dateLabel(r.date) },
              ].map((ft) => (
                <div key={ft.k} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr)', gap: 10, fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <span className="text-muted">{ft.k}</span><span>{ft.v}</span>
                </div>
              ))}
            </div>
            {!!r.notes && (
              <div style={{ paddingTop: 24 }}>
                <h6 style={{ margin: '0 0 6px', color: 'var(--color-accent-2)' }}>Note from the cook</h6>
                <p style={{ fontSize: 15, lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>{r.notes}</p>
              </div>
            )}
            <div className="print-hide" style={{ paddingTop: 24 }}>
              <button className="btn btn-ghost" onClick={actions.openReport} style={{ paddingLeft: 0, color: 'var(--color-accent-2)' }}>Tell an editor something is wrong</button>
              <p style={{ fontSize: 13, margin: '4px 0 0' }} className="text-muted">A wrong ingredient, a quantity that does not work, a missing step, a wrong credit — or a request to take the recipe down.</p>
            </div>
          </div>
        </div>
      </div>
      <ReportDialog recipeId={r.id} />
    </div>
  );
}
