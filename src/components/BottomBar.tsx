interface Props {
  /** Called when the Validate button is pressed */
  onValidate: () => void;
  /** Called when the JSON backup button is pressed */
  onExportJson: () => void;
  /** Called when the import button is pressed */
  onImport: () => void;
}

export function BottomBar({ onValidate, onExportJson, onImport }: Props) {
  return (
    <footer className="bottom-bar">
      <button className="btn btn-primary" onClick={onValidate}>
        Validate
      </button>
      <button className="btn btn-secondary" onClick={onExportJson}>
        Export JSON map
      </button>
      <button className="btn btn-secondary" onClick={onImport}>
        Import Map
      </button>
    </footer>
  );
}
