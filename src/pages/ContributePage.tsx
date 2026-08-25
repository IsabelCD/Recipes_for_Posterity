import { useApp } from '../state/AppStateContext';
import { ImageSlot } from '../components/ImageSlot';
import { MEALS, TASTES } from '../data/taxonomy';
import { ACCESS_OPTIONS } from '../data/content';
import { me } from '../state/selectors';

const STEP_TITLES = ['1. The basics', '2. Ingredients and steps', '3. Check and send'];

export function ContributePage() {
  const { state, actions } = useApp();
  const form = state.form;
  const t = state.editTarget;
  const filledIng = form.ingredients.filter((i) => i.n.trim());
  const usedNames = new Set<string>();
  form.steps.forEach((s) => (s.uses || []).forEach((u) => usedNames.add(u.n)));
  const unassigned = filledIng.map((i) => i.n).filter((n) => !usedNames.has(n));
  const assignedCount = filledIng.length - unassigned.length;
  const stepsFilled = form.steps.filter((s) => s.text.trim());

  if (state.formDone) {
    return (
      <div className="page" style={{ maxWidth: 1080 }}>
        <div style={{ maxWidth: '58ch' }}>
          <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Sent for review</h6>
          <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 18px' }}>
            {state.lastTitle ? `“${state.lastTitle}” has been sent` : 'Your recipe has been sent'}
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55 }}>It is now in the editors' queue. One of them reads every submission before it appears in the archive, usually within three days. Nothing is published until it has been checked.</p>
          <p style={{ fontSize: 18, lineHeight: 1.55 }} className="text-muted">You can see it waiting on the approval queue page.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <button className="btn btn-primary" onClick={() => actions.go('admin')}>See the queue</button>
            <button className="btn btn-secondary" onClick={actions.resetForm}>Add another recipe</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      {!t ? (
        <>
          <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Contribute</h6>
          <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 10px' }}>Add a recipe</h1>
          <p style={{ fontSize: 16, maxWidth: '58ch', margin: '0 0 28px' }} className="text-muted">Three short pages of questions. Only the title and one ingredient are required — leave anything else blank if you do not know it. Nothing is published until an editor has read it.</p>
        </>
      ) : (
        <>
          <h6 style={{ color: 'var(--color-accent-2)', margin: '0 0 10px' }}>Editors only · amending</h6>
          <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 10px' }}>Amend “{t.title}”</h1>
          <p style={{ fontSize: 16, maxWidth: '64ch', margin: '0 0 20px' }} className="text-muted">
            {t.kind === 'pending'
              ? `Correct small things yourself — a typo, a unit, a missing amount — and then publish it, instead of sending it back to ${state.pending.find((x) => x.id === t.id)?.submitter || ''} for a revision.`
              : 'Editing the published recipe. Saving replaces it with this version; the ratings and notes stay as they are.'}
          </p>
          <p style={{ fontSize: 15, maxWidth: '64ch', margin: '0 0 28px' }}>Everything is on the same three pages as the submission form. You can save from any page — a typo does not need the whole form again.</p>
        </>
      )}

      <div style={{ display: 'flex', gap: 30, paddingBottom: 10, borderBottom: '1px solid var(--color-text)', marginBottom: 32 }}>
        {STEP_TITLES.map((label, i) => (
          <div key={label} style={{ fontFamily: state.formStep === i + 1 ? 'var(--font-heading)' : undefined, fontWeight: state.formStep === i + 1 ? 600 : undefined, fontSize: 16, color: state.formStep === i + 1 ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 45%, transparent)' }}>
            {label}
          </div>
        ))}
      </div>

      {state.formStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '24px 40px', maxWidth: 840 }}>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>What is the recipe called?</label>
            <input className="input" type="text" value={form.title} onChange={(e) => actions.setFormField('title', e.target.value)} placeholder="Lemon cake" />
          </div>
          <div className="field">
            <label>Who wrote or invented it?</label>
            <input className="input" type="text" value={form.author} onChange={(e) => actions.setFormField('author', e.target.value)} placeholder="The cook it came from" />
          </div>
          <div className="field">
            <label>Who is submitting it? (you)</label>
            <input className="input" type="text" value={form.submitter} onChange={(e) => actions.setFormField('submitter', e.target.value)} placeholder={me(state).name} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>If you saw it somewhere, paste the link — optional</label>
            <input className="input" type="text" value={form.source} onChange={(e) => actions.setFormField('source', e.target.value)} placeholder="https://  a website, a video, a social post" />
          </div>
          <div className="field">
            <label>Nationality or region</label>
            <input className="input" type="text" value={form.nationality} onChange={(e) => actions.setFormField('nationality', e.target.value)} placeholder="Portuguese, Korean, Yorkshire" />
          </div>
          <div className="field">
            <label>Type of meal</label>
            <select className="input" value={form.meal} onChange={(e) => actions.setFormField('meal', e.target.value)}>
              {MEALS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>How does it taste? Pick as many as apply</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TASTES.map((tt) => {
                const on = form.tastes.indexOf(tt) !== -1;
                return (
                  <button
                    key={tt}
                    onClick={() => actions.toggleFormTaste(tt)}
                    style={{
                      cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '5px 12px', borderRadius: 2,
                      border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                      background: on ? 'var(--color-accent)' : 'transparent',
                      color: on ? 'var(--color-bg)' : 'var(--color-text)',
                    }}
                  >
                    {tt}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field">
            <label>How many portions does it make?</label>
            <input className="input" type="number" value={form.portions} onChange={(e) => actions.setFormField('portions', e.target.value)} min={1} />
          </div>
          <div className="field">
            <label>How long does it take, in minutes?</label>
            <input className="input" type="number" value={form.time} onChange={(e) => actions.setFormField('time', e.target.value)} min={1} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>How difficult is it, out of 5?</label>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="radio">
                  <input type="radio" name="difficulty" checked={Number(form.difficulty) === n} onChange={() => actions.setFormField('difficulty', n)} />
                  <span className="dot" />
                  <span>{n === 1 ? '1 — very easy' : n === 5 ? '5 — hard' : String(n)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1', marginTop: 14 }}>
            <label>Who can see this recipe?</label>
            <p style={{ fontSize: 14, margin: '0 0 12px', maxWidth: '64ch' }} className="text-muted">Some recipes are meant for the whole table and some are not. You can change this later, and an editor always reads the recipe before it is published.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ACCESS_OPTIONS.map((o) => (
                <label key={o.v} className="radio" style={{ alignItems: 'flex-start' }}>
                  <input type="radio" name="access" checked={(form.access || 'public') === o.v} onChange={() => actions.setFormField('access', o.v)} />
                  <span className="dot" style={{ marginTop: 4 }} />
                  <span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17 }}>{o.label}</span>
                    <span style={{ display: 'block', fontSize: 14, maxWidth: '56ch' }} className="text-muted">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.access === 'circle' && (
              <p style={{ fontSize: 14, margin: '14px 0 0' }}>
                Right now {state.circle.length === 1 ? 'one person is in your inner circle' : `${state.circle.length} people are in your inner circle`}. Add or remove people on{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); actions.go('me'); }} style={{ color: 'var(--color-accent-700)' }}>My page</a>.
              </p>
            )}
          </div>
        </div>
      )}

      {state.formStep === 2 && (
        <div style={{ maxWidth: 880 }}>
          <h3 style={{ margin: '0 0 4px' }}>Ingredients and quantities</h3>
          <p style={{ fontSize: 14, margin: '0 0 16px' }} className="text-muted">
            One line each. Leave salt and pepper out unless the amount matters. If there is no fixed amount — cinnamon, sugar for dusting, chilli — mark it <strong>q.b.</strong> (quanto basta: as much as the cook likes). Those lines stay as they are when the portions change.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 100px 92px minmax(0,1fr) 40px', gap: 10, marginBottom: 8, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 60%, transparent)' }}>
            <span>Amount</span><span>Unit</span><span>As you like</span><span>Ingredient</span><span />
          </div>
          {form.ingredients.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 100px 92px minmax(0,1fr) 40px', gap: 10, marginBottom: 8, alignItems: 'center' }}>
              {!row.qb ? (
                <input className="input" type="text" value={row.q} onChange={(e) => actions.setIngredient(i, { q: e.target.value })} placeholder="400" />
              ) : (
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, color: 'var(--color-accent-700)' }}>q.b.</span>
              )}
              {!row.qb ? (
                <input className="input" type="text" value={row.u} onChange={(e) => actions.setIngredient(i, { u: e.target.value })} placeholder="g" />
              ) : (
                <span style={{ fontSize: 14 }} className="text-muted">as you like</span>
              )}
              {!row.qb ? (
                <button className="tag tag-outline" onClick={() => actions.toggleIngredientQb(i)} style={{ cursor: 'pointer', background: 'transparent' }}>q.b.</button>
              ) : (
                <button className="tag tag-accent" onClick={() => actions.toggleIngredientQb(i)} style={{ cursor: 'pointer', border: '1px solid var(--color-accent)' }}>q.b. ✓</button>
              )}
              <input className="input" type="text" value={row.n} onChange={(e) => actions.setIngredient(i, { n: e.target.value })} placeholder="ripe tomatoes, chopped" />
              <button className="btn btn-ghost" onClick={() => actions.removeIngredient(i)} aria-label="Remove this ingredient" style={{ color: 'var(--color-accent-2)' }}>✕</button>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={actions.addIngredient} style={{ marginTop: 6 }}>+ Another ingredient</button>

          <h3 style={{ margin: '40px 0 4px' }}>Steps</h3>
          <p style={{ fontSize: 14, margin: '0 0 16px' }} className="text-muted">
            One step per box, in the order you do them. Under each step, say how much of an ingredient is used at that point — you rarely use the whole amount in one go, and this is what lets the quantities rescale correctly when a cook changes the portions.
            <br />In the main text of the step don&apos;t write &quot;400g of sugar&quot;, instead write &quot;half the sugar&quot; or &quot;the sugar&quot; and specify in the box below the quantity.
          </p>
          {form.steps.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) 40px', gap: 12, marginBottom: 22, alignItems: 'start' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19, paddingTop: 6, color: 'var(--color-accent)' }}>{i + 1}</span>
              <div>
                <textarea className="input" value={s.text} onChange={(e) => actions.setStepText(i, e.target.value)} placeholder="Soften the onion in oil over a low heat for ten minutes." style={{ minHeight: 68 }} />
                {s.uses.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {s.uses.map((u, j) => (
                      <div key={j} style={{ display: 'grid', gridTemplateColumns: '84px 62px minmax(0,1fr) 34px', gap: 10, alignItems: 'center' }}>
                        {!u.qb ? (
                          <input className="input" type="text" value={u.q} onChange={(e) => actions.setStepUseQty(i, j, e.target.value)} placeholder="250" style={{ minHeight: 32 }} />
                        ) : (
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, color: 'var(--color-accent-700)' }}>q.b.</span>
                        )}
                        <span style={{ fontSize: 14 }} className="text-muted">{u.qb ? '' : (u.u || '—')}</span>
                        <span style={{ fontSize: 15 }}>{u.n}</span>
                        <button className="btn btn-ghost" onClick={() => actions.removeStepUse(i, j)} aria-label="Remove this amount" style={{ color: 'var(--color-accent-2)', padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {filledIng.length > 0 && (
                  <select className="input" value="Add an ingredient used in this step" onChange={(e) => actions.addStepUse(i, e.target.value)} style={{ marginTop: 10, width: 'auto', minWidth: 280, minHeight: 32, fontSize: 13 }}>
                    <option>Add an ingredient used in this step</option>
                    {filledIng.map((ing) => <option key={ing.n} value={ing.n}>{ing.n}</option>)}
                  </select>
                )}
                <div style={{ marginTop: 10 }}>
                  {!s.photo ? (
                    <button className="btn btn-ghost" onClick={() => actions.toggleStepPhoto(i)} style={{ paddingLeft: 0, fontSize: 13 }}>+ Photograph of this step</button>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 5 }}>
                        <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="text-muted">What it should look like at this point</span>
                        <button className="btn btn-ghost" onClick={() => actions.toggleStepPhoto(i)} style={{ padding: 0, color: 'var(--color-accent-2)', fontSize: 13 }}>Remove</button>
                      </div>
                      <div style={{ width: 250, height: 165, border: '6px solid #fffdf8', boxShadow: '0 2px 10px color-mix(in srgb, var(--color-text) 16%, transparent)' }}>
                        <ImageSlot id={s.photoId || `step-${state.draftId}-${i + 1}`} shape="rect" placeholder="Drop a photograph of this step" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => actions.removeStep(i)} aria-label="Remove this step" style={{ color: 'var(--color-accent-2)' }}>✕</button>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={actions.addStep} style={{ marginTop: 6 }}>+ Another step</button>
        </div>
      )}

      {state.formStep === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 48, maxWidth: 920, alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Anything else to know?</h3>
            <p style={{ fontSize: 14, margin: '0 0 14px' }} className="text-muted">What to serve it with, what to do with leftovers, what your family calls it.</p>
            <div className="field" style={{ marginBottom: 24 }}>
              <label>Notes — optional</label>
              <textarea className="input" value={form.notes} onChange={(e) => actions.setFormField('notes', e.target.value)} style={{ minHeight: 130 }} />
            </div>
            <div className="field">
              <label>Photographs — up to three, optional</label>
              <p style={{ fontSize: 14, margin: '4px 0 12px' }} className="text-muted">
                Add a frame and drag a photograph onto it. The first one stands for the dish; the others can be anything worth seeing. {form.photos.length} of 3 used
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {form.photos.map((id, i) => (
                  <div key={id}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="text-muted">{i === 0 ? 'The finished dish' : 'Another photograph'}</span>
                      <button className="btn btn-ghost" onClick={() => actions.removePhoto(i)} style={{ marginLeft: 'auto', padding: 0, color: 'var(--color-accent-2)', fontSize: 13 }}>Remove</button>
                    </div>
                    <div style={{ height: 170, border: '6px solid #fffdf8', boxShadow: '0 2px 10px color-mix(in srgb, var(--color-text) 16%, transparent)' }}>
                      <ImageSlot id={id} shape="rect" placeholder="Drop a photograph of the dish" />
                    </div>
                  </div>
                ))}
              </div>
              {form.photos.length === 0 && <p style={{ fontSize: 15, margin: 0 }} className="text-muted">No photographs yet — a recipe can be sent without one.</p>}
              {form.photos.length < 3 && <button className="btn btn-secondary" onClick={actions.addPhoto} style={{ marginTop: 12 }}>{form.photos.length === 0 ? '+ Add a photograph' : '+ Another photograph'}</button>}
            </div>
          </div>
          <div>
            <h3 style={{ margin: '0 0 14px' }}>Check before sending</h3>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 15, lineHeight: 1.5 }}>
              {[
                { k: 'Title', v: form.title || 'not filled in' },
                { k: 'Author', v: form.author || 'not named' },
                { k: 'Submitted by', v: form.submitter || 'not filled in' },
                { k: 'Original link', v: form.source || 'none' },
                { k: 'Nationality', v: form.nationality || 'not filled in' },
                { k: 'Type of meal', v: form.meal },
                { k: 'Taste', v: form.tastes.length ? form.tastes.join(', ') : 'not filled in' },
                { k: 'Portions', v: String(form.portions) },
                { k: 'Time', v: `${form.time} minutes` },
                { k: 'Difficulty', v: `${form.difficulty} of 5` },
                { k: 'Who can see it', v: ACCESS_OPTIONS.find((o) => o.v === (form.access || 'public'))?.label || 'Everyone' },
                { k: 'Ingredients', v: `${filledIng.length} listed` },
                { k: 'Steps', v: `${stepsFilled.length} written` },
                { k: 'Amounts per step', v: `${assignedCount} of ${filledIng.length} ingredients given an amount in at least one step` },
                { k: 'Photographs', v: `${form.photos.length} of the dish, ${form.steps.filter((s) => s.text.trim() && s.photo).length} on steps` },
              ].map((row) => (
                <div key={row.k} style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr)', gap: 14, padding: '8px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <span className="text-muted">{row.k}</span>
                  <span>{row.v}</span>
                </div>
              ))}
            </div>
            {unassigned.length > 0 && (
              <p style={{ fontSize: 14, lineHeight: 1.55, margin: '16px 0 0', color: 'var(--color-accent-2-700)' }}>
                Not yet used in any step: {unassigned.join(', ')}. You can still send it — the whole quantity will simply show in the ingredient list.
              </p>
            )}
            <p style={{ fontSize: 14, lineHeight: 1.55, margin: '20px 0 0' }} className="text-muted">
              By sending this you confirm the recipe is your own, or that you have named the person it came from. An editor may write to you with a question before it goes live.
            </p>
          </div>
        </div>
      )}

      {!!state.formError && <p style={{ color: 'var(--color-accent-2-700)', fontSize: 15, margin: '24px 0 0' }}>{state.formError}</p>}
      <div style={{ display: 'flex', gap: 12, margin: '34px 0 0', alignItems: 'center' }}>
        {state.formStep > 1 && <button className="btn btn-secondary" onClick={actions.prevStep}>← Back</button>}
        {state.formStep < 3 && <button className="btn btn-primary" onClick={actions.nextStep}>Continue →</button>}
        {state.formStep === 3 && !t && <button className="btn btn-primary" onClick={actions.submitForm}>Send for review</button>}
        {t?.kind === 'pending' && (
          <>
            <button className="btn btn-primary" onClick={actions.saveEditAndPublish}>Save and publish</button>
            <button className="btn btn-secondary" onClick={actions.saveEdit}>Save, keep in the queue</button>
          </>
        )}
        {t?.kind === 'recipe' && <button className="btn btn-primary" onClick={actions.saveEdit}>Save the new version</button>}
        {!!t && <button className="btn btn-ghost" onClick={actions.cancelEdit} style={{ color: 'var(--color-accent-2)' }}>Cancel</button>}
        <span className="text-muted" style={{ fontSize: 14, marginLeft: 6 }}>
          {state.formStep === 1 ? 'Page 1 of 3 — about the recipe' : state.formStep === 2 ? 'Page 2 of 3 — what goes in it and what to do' : 'Page 3 of 3 — nothing is published until an editor approves it'}
        </span>
      </div>
    </div>
  );
}
