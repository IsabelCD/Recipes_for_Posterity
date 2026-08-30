import { useApp } from '../state/AppStateContext';
import { HeroBanner } from '../components/HeroBanner';
import { CmykNumeral } from '../components/CmykNumeral';
import { visibleRecipes } from '../state/selectors';
import heroCollage from '../images/Presentation1.png';
import aboutPhoto from '../images/IMG_3605.jpg';

export function AboutPage() {
  const { state, actions } = useApp();
  const vis = visibleRecipes(state);
  const aboutCounts = [
    { n: String(vis.length), k: 'recipes published' },
    { n: String(new Set(vis.map((r) => r.submitter)).size), k: 'people have submitted one' },
    { n: String(vis.reduce((a, r) => a + (r.comments || []).length, 0)), k: 'notes left by cooks' },
    { n: String(state.pending.length + state.rejected.length), k: 'waiting to be read' },
  ];

  return (
    <>
      <HeroBanner
        height={300}
        kicker="About us"
        title="Recipes for Posterity"
        titleSize={46}
        src={heroCollage}
        alt="A collage of dishes from the archive"
      />
      <div className="page" style={{ maxWidth: 1180, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 480px' }}>
            <h1 style={{ fontSize: 44, lineHeight: 1.04, letterSpacing: '-0.03em', margin: '0 0 16px', maxWidth: '24ch' }}>
              A household archive, kept properly.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, maxWidth: '60ch', margin: '0 0 12px' }}>
              My name is Isabel Couto Dias, and I am the creator of this website. This website is an attempt to centralize all the recipes that have worked in my household and to introduce functionalities that would help organize the day to day planning of said meals.{' '}
              <br />Because this is supposed to be a clean slate to work from, there is a higher level of control over what recipes are accepted in this repository. We want to make sure the instructions are clear, and people can reproduce the recipes.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, maxWidth: '60ch', margin: 0 }} className="text-muted">
              Anyone can add a recipe and anyone can search what is here. Nothing is published until an editor has read it, and the cook a recipe came from is always named, even when somebody else wrote it down.
            </p>
          </div>
          <div style={{ width: 402, maxWidth: '100%', height: 272, background: '#b6b0a7', borderRadius: 8, overflow: 'hidden' }}>
            <img
              src={aboutPhoto}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </div>

        <div className="grid-4" style={{ padding: '44px 0 0' }}>
          {aboutCounts.map((c) => (
            <div key={c.k}>
              <CmykNumeral value={c.n} style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 52, lineHeight: 1 }} />
              <div style={{ fontSize: 15, lineHeight: 1.4, marginTop: 8, maxWidth: '22ch' }}>{c.k}</div>
            </div>
          ))}
        </div>

        <div className="grid-3" style={{ padding: '60px 0 0' }}>
          <div>
            <h6 style={{ color: 'var(--color-accent)', margin: '0 0 8px' }}>Who keeps it</h6>
            <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>For now, one editor (Isabel)</h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>The archive is run by the people who cook from it. Editors read every submission, check the quantities against the number of portions, and write back with a question when something cannot be cooked as written.</p>
          </div>
          <div>
            <h6 style={{ color: 'var(--color-accent)', margin: '0 0 8px' }}>What we publish</h6>
            <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>Recipes somebody actually cooks</h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>Family recipes, household staples, the thing you make when there is nothing in. Written in your own words, with the amounts you really use and the steps in the order you do them.</p>
          </div>
          <div>
            <h6 style={{ color: 'var(--color-accent-2)', margin: '0 0 8px' }}>What we will not</h6>
            <h3 style={{ fontSize: 22, margin: '0 0 8px' }}>Duplicated or unclear recipes</h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}>We do not want to fill this repository with very similar recipes that will overload the users with the illusion of choices. Additionally, all recipes should be clear enough for a beginner to understand.</p>
          </div>
        </div>

        <div style={{ padding: '60px 0 0', maxWidth: '60ch' }}>
          <h2 style={{ fontSize: 30, margin: '0 0 10px' }}>Adding one yourself</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, margin: '0 0 18px' }}>Three short pages of questions: what it is called and who it came from, then the ingredients and the steps with the amount used at each one, then anything else worth knowing. Only the title and one ingredient are required.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a className="btn btn-primary" href="#" onClick={(e) => { e.preventDefault(); actions.go('contribute'); }}>Add a recipe</a>
            <a className="btn btn-secondary" href="#" onClick={(e) => { e.preventDefault(); actions.go('search'); }}>Read what is here</a>
          </div>
        </div>
      </div>
    </>
  );
}
