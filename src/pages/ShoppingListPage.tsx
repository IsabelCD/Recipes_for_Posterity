import { useApp } from '../state/AppStateContext';
import { shoppingItems, portionsFor } from '../state/selectors';
import { fmt } from '../state/helpers';

export function ShoppingListPage() {
  const { state, actions } = useApp();
  const items = shoppingItems(state);
  const done = items.filter((i) => state.ticked[i.key]).length;
  const listRecipes = state.selected.map((id) => state.recipes.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Shopping list</h6>
      <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 10px' }}>What to buy</h1>
      <p style={{ fontSize: 16, maxWidth: '60ch', margin: '0 0 34px' }} className="text-muted">
        Every ingredient from the recipes you picked, added together. Set how many portions you want of each recipe and the amounts change to match. Tick things off as you put them in the basket.
      </p>
      {state.selected.length > 0 ? (
        <div className="list-layout">
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--color-text)' }}>
              <h2 style={{ margin: 0, fontSize: 26 }}>{items.length === 1 ? '1 thing to buy' : `${items.length} things to buy`}</h2>
              <span className="text-muted" style={{ fontSize: 14, marginLeft: 'auto' }}>{done} of {items.length} in the basket</span>
            </div>
            {items.map((it) => (
              <label key={it.key} className="shopping-row">
                <input type="checkbox" checked={!!state.ticked[it.key]} onChange={() => actions.toggleTicked(it.key)} style={{ width: 16, height: 16, accentColor: 'var(--color-accent)', cursor: 'pointer' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 16, color: 'var(--color-accent-700)' }}>
                  {it.total ? `${fmt(it.total)}${it.unit ? ` ${it.unit}` : ''}` : (it.qb ? 'q.b.' : it.unit || '')}
                </span>
                <span>
                  <span style={{ fontSize: 17 }}>{it.name}</span>
                  <span style={{ display: 'block', fontSize: 12 }} className="text-muted">for {it.recipes.join(' and ')}</span>
                </span>
              </label>
            ))}
            <p style={{ fontSize: 14, marginTop: 20, maxWidth: '56ch' }} className="text-muted">
              Salt, pepper and water are assumed to be in your kitchen already and are left off the list. Where two recipes need the same thing, the amounts have been added together.
            </p>
            <div className="print-hide" style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-primary" onClick={actions.printPage}>Print this list</button>
              <button className="btn btn-secondary" onClick={actions.clearTicks}>Untick everything</button>
            </div>
          </div>
          <div>
            <h6 style={{ margin: '0 0 12px', color: 'var(--color-accent-2)' }}>Recipes in this list</h6>
            {listRecipes.map((x) => {
              const p = portionsFor(state, x);
              return (
                <div key={x.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(x.id); }} style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18, color: 'inherit', textDecoration: 'none', display: 'block', marginBottom: 2 }}>{x.title}</a>
                  <div style={{ fontSize: 12, marginBottom: 8 }} className="text-muted">{x.portions === p ? 'as written' : `written for ${x.portions}`}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => actions.decPortions(x.id, x.portions)} aria-label="Fewer portions">−</button>
                    <span style={{ fontSize: 14, minWidth: 92, textAlign: 'center' }}>{p}{p === 1 ? ' portion' : ' portions'}</span>
                    <button className="btn btn-secondary btn-icon" onClick={() => actions.incPortions(x.id, x.portions)} aria-label="More portions">+</button>
                  </div>
                  <button className="btn btn-ghost" onClick={() => actions.toggleSelect(x.id)} style={{ paddingLeft: 0, color: 'var(--color-accent-2)' }}>Remove</button>
                </div>
              );
            })}
            <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }} style={{ marginTop: 20, width: '100%' }}>Add more recipes</a>
          </div>
        </div>
      ) : (
        <div>
          <h2 style={{ margin: '0 0 10px', fontSize: 26 }}>Your list is empty</h2>
          <p style={{ fontSize: 16, maxWidth: '48ch' }} className="text-muted">On any recipe, press “Add to my shopping list”. Everything you add appears here with the amounts added up, scaled to the portions you want.</p>
          <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }} style={{ marginTop: 6 }}>Find recipes</a>
        </div>
      )}
    </div>
  );
}
