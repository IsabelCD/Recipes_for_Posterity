import { useApp } from '../state/AppStateContext';
import { TASTES, MEALS } from '../data/taxonomy';
import { filtered, visibleRecipes, accessOf } from '../state/selectors';
import { mealIcon, stars, timeText, dateLabel, accessWords } from '../state/helpers';

const SINCE_OPTIONS = ['Any time', 'Last 30 days', 'Last 90 days', 'Last year'];
const RATING_OPTIONS = ['Any', '3', '4', '4.5'];
const TIME_OPTIONS = ['Any', '20', '30', '45', '60'];
const DIFFICULTY_OPTIONS = ['Any', '1', '2', '3', '4'];
const SORT_OPTIONS = ['Highest rated', 'Newest first', 'Quickest first', 'Easiest first', 'Title A to Z'];

export function SearchPage() {
  const { state, actions } = useApp();
  const f = state.f;
  const vis = visibleRecipes(state);
  const list = filtered(state);
  const nationalityOptions = ['All'].concat(Array.from(new Set(vis.map((r) => r.nationality))).sort());
  const authorOptions = ['All'].concat(Array.from(new Set(vis.map((r) => r.author))).sort());
  const tasteList = f.tasteList || [];
  const seeingEverything = state.signedIn && state.role === 'editor';

  const activeFilterLabel = (() => {
    const bits: string[] = [];
    if (f.q) bits.push(`“${f.q}”`);
    if (f.nationality !== 'All') bits.push(f.nationality);
    if (f.meal !== 'All') bits.push(f.meal);
    if (tasteList.length) bits.push(tasteList.join(' + '));
    if (f.author !== 'All') bits.push(`by ${f.author}`);
    if (f.since !== 'Any time') bits.push(f.since.toLowerCase());
    if (f.rating !== 'Any') bits.push(`${f.rating}+ stars`);
    if (f.time !== 'Any') bits.push(`under ${f.time} min`);
    if (f.difficulty !== 'Any') bits.push(`difficulty up to ${f.difficulty}`);
    return bits.length ? bits.join(' · ') : 'no filters applied';
  })();

  return (
    <div className="page" style={{ maxWidth: 1440 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Search</h6>
      <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 10px' }}>Find a recipe</h1>
      <p style={{ fontSize: 16, maxWidth: '56ch', margin: '0 0 34px' }} className="text-muted">
        Type a word, or leave the box empty and use the filters. Everything updates as you go — you do not need to press a search button.
      </p>
      <div className="search-layout">
        <div className="sticky-side" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="field">
            <label>Words in the recipe</label>
            <input className="input" type="text" value={f.q} onChange={(e) => actions.setFilter('q', e.target.value)} placeholder="tomato, scones, quick supper" />
          </div>
          <div className="field">
            <label>Nationality</label>
            <select className="input" value={f.nationality} onChange={(e) => actions.setFilter('nationality', e.target.value)}>
              {nationalityOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type of meal</label>
            <select className="input" value={f.meal} onChange={(e) => actions.setFilter('meal', e.target.value)}>
              {['All'].concat(MEALS).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Taste</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TASTES.map((t) => {
                const on = tasteList.indexOf(t) !== -1;
                return (
                  <button
                    key={t}
                    onClick={() => actions.toggleTasteFilter(t)}
                    style={{
                      cursor: 'pointer', font: 'inherit', fontSize: 12, padding: '4px 11px', borderRadius: 2,
                      border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                      background: on ? 'var(--color-accent)' : 'transparent',
                      color: on ? 'var(--color-bg)' : 'var(--color-text)',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field">
            <label>Author</label>
            <select className="input" value={f.author} onChange={(e) => actions.setFilter('author', e.target.value)}>
              {authorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date submitted</label>
            <select className="input" value={f.since} onChange={(e) => actions.setFilter('since', e.target.value)}>
              {SINCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Rating</label>
            <select className="input" value={f.rating} onChange={(e) => actions.setFilter('rating', e.target.value)}>
              {RATING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Time to make</label>
            <select className="input" value={f.time} onChange={(e) => actions.setFilter('time', e.target.value)}>
              {TIME_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Difficulty</label>
            <select className="input" value={f.difficulty} onChange={(e) => actions.setFilter('difficulty', e.target.value)}>
              {DIFFICULTY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={actions.clearFilters}>Clear all filters</button>
          {state.selected.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, padding: '14px 16px', background: 'var(--color-accent-100)', boxShadow: '0 1px 0 color-mix(in srgb, var(--color-text) 14%, transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ph-duotone ph-basket" style={{ fontSize: 24, color: 'var(--color-accent-700)' }} aria-hidden="true" />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, lineHeight: 1.2 }}>
                  {state.selected.length === 1 ? '1 recipe picked for your shopping list' : `${state.selected.length} recipes picked for your shopping list`}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: 14 }}>
                {state.selected.map((id) => state.recipes.find((x) => x.id === id)?.title).filter(Boolean).join(' · ')}
              </div>
              <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('list'); }}>Go to my shopping list</a>
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--color-text)' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>{list.length === 1 ? '1 recipe' : `${list.length} recipes`}</span>
            <span className="text-muted" style={{ fontSize: 14 }}>{activeFilterLabel}</span>
            {seeingEverything && <span className="tag tag-accent-2">Editor view · private recipes included</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="text-muted">Order</span>
              <select className="input" value={f.sort} onChange={(e) => actions.setFilter('sort', e.target.value)} style={{ width: 'auto', minWidth: 158 }}>
                {SORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          {list.map((r) => {
            const picked = state.selected.indexOf(r.id) !== -1;
            const restricted = accessOf(state, r) !== 'public';
            return (
              <div key={r.id} className="result-row">
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                    <span className="tag tag-accent">{r.nationality}</span>
                    <span className="tag tag-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <i className={`ph-duotone ${mealIcon(r.meal)}`} style={{ fontSize: 15, color: 'var(--color-accent-700)' }} aria-hidden="true" />{r.meal}
                    </span>
                    <span className="tag tag-outline" style={{ whiteSpace: 'nowrap' }}>{r.tastes.join(' · ')}</span>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); actions.openRecipe(r.id); }}
                    style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26, lineHeight: 1.15, color: 'inherit', textDecoration: 'none', display: 'block', marginBottom: 6 }}
                  >
                    {r.title}
                  </a>
                  <p style={{ fontSize: 15, lineHeight: 1.55, maxWidth: '66ch', margin: '0 0 9px' }}>{r.blurb}</p>
                  <div style={{ fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 16 }} className="text-muted">
                    <span>by {r.author}</span>
                    <span>{dateLabel(r.date)}</span>
                    <span>{timeText(r.time)}</span>
                    <span>Difficulty {r.difficulty} of 5</span>
                    {restricted && <span className="tag tag-accent-2">{accessWords(accessOf(state, r))}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 18, letterSpacing: '0.06em', color: 'var(--color-accent)' }}>{stars(r.rating)}</div>
                  <div style={{ fontSize: 13 }} className="text-muted">{r.rating.toFixed(1)} from {r.votes} ratings</div>
                  <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(r.id); }} style={{ marginTop: 4, width: '100%' }}>Open recipe</a>
                  {picked ? (
                    <button className="btn btn-primary" onClick={() => actions.toggleSelect(r.id)} style={{ width: '100%' }}>✓ In your list</button>
                  ) : (
                    <button className="btn btn-ghost" onClick={() => actions.toggleSelect(r.id)} style={{ paddingLeft: 0 }}>+ Shopping list</button>
                  )}
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div style={{ padding: '48px 0' }}>
              <h3 style={{ margin: '0 0 8px' }}>Nothing matches all of those filters</h3>
              <p style={{ fontSize: 16, maxWidth: '46ch' }} className="text-muted">Try removing the narrowest one. Difficulty and time rule out the most recipes.</p>
              <button className="btn btn-primary" onClick={actions.clearFilters}>Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
