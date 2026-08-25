import { useApp } from '../state/AppStateContext';
import { HeroBanner } from '../components/HeroBanner';
import { ImageSlot } from '../components/ImageSlot';
import { CmykNumeral } from '../components/CmykNumeral';
import { PAGES, PURPOSES, TUTORIAL } from '../data/content';
import { visibleRecipes } from '../state/selectors';
import { mealIcon, stars, timeText, dateLabel } from '../state/helpers';

export function HomePage() {
  const { state, actions } = useApp();
  const vis = visibleRecipes(state);
  const latest = vis.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  const indexItems = PAGES.concat(
    state.signedIn && state.role === 'editor'
      ? [{ key: 'admin', label: 'Approval queue', n: '10', desc: 'For editors: approve or reject new recipes, and handle reader reports and takedown requests.' }]
      : [],
  );

  return (
    <>
      <HeroBanner
        height={340}
        kicker="Family recipe archive"
        title="Recipes for Posterity"
        titleSize={52}
        src="/design-assets/hero-collage.png"
        alt="A collage of dishes from the archive"
      />
      <div className="page" style={{ maxWidth: 1180, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', paddingBottom: 7, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--color-text)' }}>
          <span>{vis.length} recipes in the archive</span>
          <span style={{ marginLeft: 'auto' }}>{dateLabel('2026-08-14')}</span>
        </div>

        <div className="split-hero">
          <div>
            <h1 style={{ fontSize: 64, lineHeight: 1, letterSpacing: '-0.03em', margin: '0 0 22px', maxWidth: '18ch' }}>
              A place to keep the recipes we actually cook.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, maxWidth: '54ch', margin: '0 0 16px' }}>
              This website stores family and household recipes so they can be found again. Anyone can add a recipe. Anyone can search what has been added. Every submission is read by an editor before it appears, so the archive stays accurate.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }}>Find a recipe</a>
              <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('contribute'); }}>Add a recipe</a>
            </div>
          </div>
          <div className="cutouts" style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'flex-end', opacity: 0.75 }}>
            <div style={{ width: 286, height: 230, rotate: '-5deg', border: '7px solid #fffdf8', boxShadow: '0 8px 18px color-mix(in srgb, var(--color-text) 20%, transparent)' }}>
              <ImageSlot id="cut-waffle" shape="rect" placeholder="Drop a waffle cut-out" />
            </div>
            <div style={{ width: 220, height: 220, rotate: '4deg', border: '7px solid #fffdf8', boxShadow: '0 8px 18px color-mix(in srgb, var(--color-text) 20%, transparent)' }}>
              <ImageSlot id="cut-tomatoes" shape="rect" placeholder="Drop a tomato cut-out" />
            </div>
          </div>
        </div>

        <div style={{ padding: '52px 0 0' }}>
          <h6 style={{ margin: '0 0 14px', color: 'var(--color-accent)' }}>What this website does</h6>
          <div className="grid-4" style={{ gap: '0 34px', borderTop: '1px solid var(--color-text)' }}>
            {PURPOSES.map((p) => (
              <div key={p.title} style={{ padding: '14px 0 16px' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 17, marginBottom: 3 }}>{p.title}</div>
                <div style={{ fontSize: 15, lineHeight: 1.5 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '64px 0 0' }}>
          <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>How to use this website</h6>
          <h2 style={{ fontSize: 34, margin: '0 0 36px' }}>Four steps, start to finish</h2>
          <div className="grid-4">
            {TUTORIAL.map((step) => (
              <div key={step.n}>
                <CmykNumeral value={step.n} style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 58, marginBottom: 16 }} />
                <h4 style={{ fontSize: 20, margin: '0 0 7px' }}>{step.title}</h4>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: '0 0 8px' }}>{step.body}</p>
                <a
                  className="btn btn-ghost" href="#" style={{ paddingLeft: 0 }}
                  onClick={(e) => { e.preventDefault(); if (step.go) actions.go(step.go); else if (step.recipeId) actions.openRecipe(step.recipeId); }}
                >
                  {step.link} →
                </a>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '66px 0 0', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: 64, alignItems: 'start' }}>
          <div>
            <h6 style={{ color: 'var(--color-accent)', margin: '0 0 10px' }}>Contents</h6>
            <h2 style={{ fontSize: 30, margin: '0 0 16px' }}>Where everything is</h2>
            <p style={{ fontSize: 15, maxWidth: '32ch' }} className="text-muted">The same list is in the bar on the left, on every page. Five more pages are being built and are listed there too.</p>
            <ImageSlot id="cut-cake" shape="rect" placeholder="Drop a cake cut-out" style={{ width: 314, height: 283 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {indexItems.map((row) => (
              <a
                key={row.key}
                href="#"
                onClick={(e) => { e.preventDefault(); actions.go(row.key); }}
                style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,200px) minmax(0,1fr)', gap: 18, alignItems: 'baseline', padding: '14px 8px 14px 0', color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--color-divider)' }}
              >
                <span style={{ fontSize: 12, letterSpacing: '0.08em', color: 'var(--color-accent)' }}>{row.n}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>{row.label}</span>
                <span style={{ fontSize: 14, lineHeight: 1.45, color: 'color-mix(in srgb, var(--color-text) 62%, transparent)' }}>{row.desc}</span>
              </a>
            ))}
          </div>
        </div>

        <div style={{ padding: '66px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 22 }}>
            <h2 style={{ fontSize: 30, margin: 0 }}>Added most recently</h2>
            <a className="btn btn-ghost" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }}>See all {vis.length} →</a>
          </div>
          <div className="grid-3">
            {latest.map((r) => (
              <a key={r.id} className="card" href="#" onClick={(e) => { e.preventDefault(); actions.openRecipe(r.id); }} style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="card-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className={`ph-duotone ${mealIcon(r.meal)}`} style={{ fontSize: 17, color: 'var(--color-accent)' }} aria-hidden="true" />
                  {r.nationality} · {r.meal}
                </span>
                <span className="card-title" style={{ fontSize: 20 }}>{r.title}</span>
                <p className="card-body">{r.blurb}</p>
                <span className="card-meta">{stars(r.rating)}  {r.rating.toFixed(1)} · {timeText(r.time)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
