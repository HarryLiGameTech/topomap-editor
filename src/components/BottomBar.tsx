interface Props {
  /** Called when the Validate button is pressed */
  onValidate: () => void;
  /** Called when the second action button is pressed */
  onImport: () => void;
}

export function BottomBar({ onValidate, onImport }: Props) {
  return (
    <footer className="bottom-bar">
      <button className="btn btn-primary" onClick={onValidate}>
        Validate
      </button>
      <button className="btn btn-secondary" onClick={onImport}>
        Import Map
      </button>
    </footer>
  );
}
