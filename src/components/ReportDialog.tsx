import { useApp } from '../state/AppStateContext';
import { REPORT_KINDS } from '../data/reasons';

export function ReportDialog({ recipeId }: { recipeId: string }) {
  const { state, actions } = useApp();
  if (!state.reportOpen) return null;
  const kind = REPORT_KINDS.find((k) => k.label === state.reportKind) || REPORT_KINDS[0];

  return (
    <div className="dialog-backdrop print-hide">
      <div className="dialog">
        <div className="dialog-title">Report a problem with this recipe</div>
        <p className="dialog-body" style={{ margin: 0 }}>
          Editors read every report and reply either way. Small corrections are usually made within a few days; nothing is deleted automatically.
        </p>
        <div className="field">
          <label>What is wrong?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {REPORT_KINDS.map((k) => (
              <label key={k.label} className="radio" style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '6px 0', cursor: 'pointer' }}>
                <input type="radio" name="reportKind" checked={state.reportKind === k.label} onChange={() => actions.setReportKind(k.label)} />
                <span>
                  <span style={{ fontSize: 15 }}>{k.label}</span>
                  <span style={{ display: 'block', fontSize: 13 }} className="text-muted">{k.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>{state.reportKind === 'Should be taken down' ? 'Why should it come down?' : 'What should it say instead?'}</label>
          <textarea
            className="input"
            value={state.reportText}
            onChange={(e) => actions.setReportText(e.target.value)}
            placeholder={kind.placeholder}
          />
        </div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={actions.closeReport}>Cancel</button>
          <button className="btn btn-primary" onClick={() => actions.sendReport(recipeId)}>Send to the editors</button>
        </div>
      </div>
    </div>
  );
}
