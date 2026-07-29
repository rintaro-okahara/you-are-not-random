interface SettingsPanelProps {
  readonly learningEnabled: boolean;
  readonly alpha: number;
  readonly onLearningChange: (enabled: boolean) => void;
  readonly onAlphaChange: (alpha: number) => void;
  readonly onReset: () => void;
}

export function SettingsPanel({
  learningEnabled,
  alpha,
  onLearningChange,
  onAlphaChange,
  onReset,
}: SettingsPanelProps) {
  return (
    <section className="card settings-card" aria-labelledby="settings-title">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">MODEL CONTROL</p>
          <h2 id="settings-title">設定</h2>
        </div>
      </div>
      <label className="switch-row">
        <span>
          <strong>オンライン学習</strong>
          <small>expertの混合と重み更新</small>
        </span>
        <input
          type="checkbox"
          aria-label="学習を有効にする"
          checked={learningEnabled}
          onChange={(event) => onLearningChange(event.currentTarget.checked)}
        />
        <span className="switch-visual" aria-hidden="true" />
      </label>
      <div className="range-control">
        <div className="range-heading">
          <label htmlFor="fixed-share-alpha">忘却率 / Fixed Share α</label>
          <output htmlFor="fixed-share-alpha">{alpha.toFixed(2)}</output>
        </div>
        <input
          id="fixed-share-alpha"
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          value={alpha}
          onChange={(event) => onAlphaChange(event.currentTarget.valueAsNumber)}
        />
        <div className="range-labels" aria-hidden="true">
          <span>0.00 / 記憶重視</span>
          <span>0.20 / 変化重視</span>
        </div>
        <p>
          大きくすると最近強いexpertへ切り替わりやすくなります。0なら通常のHedgeに近づきます。
        </p>
      </div>
      <button className="reset-button" type="button" onClick={onReset}>
        すべてリセット
      </button>
    </section>
  );
}
