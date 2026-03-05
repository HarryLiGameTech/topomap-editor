interface Props {
  /** Called when the first action button is pressed */
  onExport: () => void;
  /** Called when the second action button is pressed */
  onImport: () => void;
}

export function BottomBar({ onExport, onImport }: Props) {
  return (
    <footer className="bottom-bar">
      <button className="btn btn-primary" onClick={onExport}>
        Export Map
      </button>
      <button className="btn btn-secondary" onClick={onImport}>
        Import Map
      </button>
    </footer>
  );
}
