import { useApp } from '../state/AppStateContext';
import { pantryCatalogue, matchRecipe, visibleRecipes } from '../state/selectors';
import { mealIcon, timeText } from '../state/helpers';

export function CupboardPage() {
  const { state, actions } = useApp();
  const vis = visibleRecipes(state);
  const q = state.pantryQuery.trim().toLowerCase();
  const pantryOptions = pantryCatalogue(state)
    .filter((o) => !q || o.key.indexOf(q) >= 0)
    .slice(0, q ? 40 : 28);

  const rows = vis.map((r) => ({ r, m: matchRecipe(state, r) }))
    .filter((x) => x.m.total > 0 && x.m.haveCount > 0)
    .filter((x) => !state.pantryOnlyComplete || x.m.missing.length === 0)
    .sort((a, b) => b.m.pct - a.m.pct || a.m.missing.length - b.m.missing.length);

  const readyCount = vis.filter((r) => { const m = matchRecipe(state, r); return m.total > 0 && m.missing.length === 0; }).length;
  const oneAwayCount = vis.filter((r) => matchRecipe(state, r).missing.length === 1).length;

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Cook from my cupboard</h6>
      <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 10px' }}>What can I make tonight?</h1>
      <p style={{ fontSize: 17, lineHeight: 1.5, maxWidth: '62ch', margin: '0 0 34px' }} className="text-muted">
        Tick off what you have in. Recipes are ordered by how close you are to being able to cook them. Salt, pepper and water are assumed to be in every kitchen and are never counted as missing.
      </p>

      <div className="cupboard-layout">
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24 }}>My cupboard</h2>
          <p style={{ fontSize: 14, margin: '0 0 14px' }} className="text-muted">{state.pantry.length} ingredients ticked</p>
          {state.pantry.length === 0 && <p style={{ fontSize: 15, margin: '0 0 14px' }}>Nothing ticked yet — start with the list below.</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {state.pantry.slice().sort().map((k) => (
              <button key={k} className="tag tag-accent" onClick={() => actions.togglePantryItem(k)} style={{ border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Remove from cupboard">
                {k}<span style={{ opacity: 0.65 }}>✕</span>
              </button>
            ))}
          </div>
          <div className="field">
            <label>Find an ingredient</label>
            <input className="input" value={state.pantryQuery} onChange={(e) => actions.setPantryQuery(e.target.value)} placeholder="tomatoes, tahini, buttermilk…" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 420, overflowY: 'auto', borderTop: '1px solid var(--color-divider)', marginBottom: 14 }}>
            {pantryOptions.map((o) => {
              const on = state.pantry.indexOf(o.key) >= 0;
              return (
                <label key={o.key} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--color-divider)', cursor: 'pointer', fontSize: 15 }}>
                  <input type="checkbox" checked={on} onChange={() => actions.togglePantryItem(o.key)} />
                  <span>{o.key}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13 }} className="text-muted">{o.uses === 1 ? 'in 1 recipe' : `in ${o.uses} recipes`}</span>
                </label>
              );
            })}
          </div>
          <button className="btn btn-ghost" onClick={actions.clearPantry} style={{ paddingLeft: 0, color: 'var(--color-accent-2)' }}>Empty the cupboard</button>
        </div>

        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 34, alignItems: 'baseline', marginBottom: 6 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 46, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-accent)' }}>{readyCount}</div>
              <div style={{ fontSize: 15, marginTop: 4 }}>Ready to cook now</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 46, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-accent-2)' }}>{oneAwayCount}</div>
              <div style={{ fontSize: 15, marginTop: 4 }}>One ingredient away</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, marginLeft: 'auto', cursor: 'pointer' }}>
              <input type="checkbox" checked={state.pantryOnlyComplete} onChange={actions.togglePantryOnly} />
              Only what I can cook now
            </label>
          </div>

          {rows.map(({ r, m }) => (
            <div key={r.id} className="pantry-match-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, marginBottom: 3 }} className="text-muted">
                  <i className={`ph-duotone ${mealIcon(r.meal)}`} style={{ fontSize: 17, color: 'var(--color-accent)' }} aria-hidden="true" />{r.nationality} · {r.meal} · {timeText(r.time)}
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(r.id); }} style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24, lineHeight: 1.15, color: 'inherit', textDecoration: 'none' }}>{r.title}</a>
                <p style={{ fontSize: 15, lineHeight: 1.5, maxWidth: '58ch', margin: '6px 0 0' }} className="text-muted">{r.blurb}</p>
                {m.missing.length > 0 ? (
                  <div style={{ fontSize: 14, marginTop: 8 }}><span style={{ color: 'var(--color-accent-2-700)' }}>{m.missing.length === 1 ? 'You are missing one thing:' : `You are missing ${m.missing.length}:`}</span> {m.missing.join(', ')}</div>
                ) : (
                  <div style={{ fontSize: 14, marginTop: 8, color: 'var(--color-accent-700)' }}>You have everything for this.</div>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22 }}>{m.pct}%</span>
                  <span style={{ fontSize: 13 }} className="text-muted">of the list</span>
                </div>
                <div style={{ height: 10, background: 'var(--color-neutral-200)', marginBottom: 6 }}>
                  <div style={{ height: 10, background: 'var(--color-accent)', width: `${m.pct}%` }} />
                </div>
                <div style={{ fontSize: 13, marginBottom: 10 }} className="text-muted">{m.haveCount} of {m.total} ingredients in your cupboard</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(r.id); }}>Open the recipe</a>
                  <button className="btn btn-ghost" onClick={() => actions.addToListFromCupboard(r.id)} style={{ fontSize: 13 }}>Add this recipe to my shopping list</button>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p style={{ fontSize: 16, padding: '24px 0 0' }} className="text-muted">Nothing matches yet. Tick a few more ingredients, or untick “only what I can cook now”.</p>}
        </div>
      </div>
    </div>
  );
}
