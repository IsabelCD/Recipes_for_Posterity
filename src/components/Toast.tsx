import { useApp } from '../state/AppStateContext';

export function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;
  return (
    <div
      className="print-hide"
      style={{
        position: 'fixed', left: 298, bottom: 26, zIndex: 60,
        background: 'var(--color-text)', color: 'var(--color-bg)',
        padding: '12px 18px', borderRadius: 2, fontSize: 15, boxShadow: 'var(--shadow-lg)',
      }}
    >
      {state.toast}
    </div>
  );
}
