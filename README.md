# ◭ Topomap Editor

A visual sketch-map editing tool built with **React + TypeScript + Canvas (Vite)**.  
Draw nodes, connect them with edges, and annotate everything through the properties panel.

---

## Quickstart

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |

### 1 — Clone & install

```bash
git clone <repo-url>
cd topomap-editor
npm install
```

### 2 — Start the dev server

```bash
npm run dev
```

Open the URL printed in the terminal (usually **http://localhost:5173**) in your browser.

### 3 — Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

---

## Usage

### Canvas (left 80 %)

| Action | Result |
|--------|--------|
| **Left-click** on empty space | Place a node and type its name in the focused Label field |
| **Left-click** on a node | Select it (highlighted in white) |
| **Left-click** on a second node | Select the pair for connection |
| **Right-click** with 2 nodes selected | Connect them with an edge |
| **Left-click** on an edge | Select the edge |
| **Left-click** on empty space with a manual selection | Deselect |
| **Left-drag** on the canvas | Select nodes whose centers are in the box. Ctrl/⌘-drag adds to the selection. Escape cancels a drag. |
| **Ctrl-click** or **⌘-click** on nodes | Add or remove individual nodes from a selection of any size |
| **Delete** or **Backspace** with canvas focus | Delete selected nodes and their incident edges |
| **Grid** slider after importing a background | Adjust grid opacity (hidden by default on floor plans) |
| **Escape** | Clear selection |

> **Tip:** When two nodes are selected you will see a dashed preview line and a hint — right-click anywhere on the canvas to confirm the connection.

### Properties panel (right 20 %)

The panel appears automatically when exactly **one** node or edge is selected.

**Node properties**

Choose the node type before placement or in Node Properties. The next placement uses that type. Room alternates between `_inside` and `_outside` with the caret before the suffix. A uniquely matched pair such as `301_inside` and `301_outside` connects automatically. Elevator lobby uses `elevator_<name>_landing`. Stairwell alternates independently between `staircase_<name>_landing` and `staircase_<name>_outside`. Both put the caret immediately after the prefix. Custom starts empty. While naming, click empty space to place another node or press Escape to finish.

| Field | Description |
|-------|-------------|
| Label | Free-text name displayed below the node |
| Position X / Y | Numeric coordinates (editable directly) |
| Color | Choose from 5 preset colours |
| DSL fields | Add any number of String, Number, Bool, or homogeneous List fields |
| Delete Node | Removes the node and all its connected edges |

**Edge properties**

| Field | Description |
|-------|-------------|
| Label | Free-text annotation shown at the midpoint |
| From → To | Read-only display of the connected nodes |
| Style | `Solid` or `Dashed` line rendering |
| Weight | Thickness slider (1 – 10) |
| DSL fields | Add any number of String, Number, Bool, or homogeneous List fields |
| Delete Edge | Removes only this edge |

New nodes start with `displayName`, `shopName`, `description`, and `tags: List[String]` DSL fields. New edges start with a required numeric `cost` field. DSL field names must be unique valid identifiers containing letters, digits, or underscores and cannot start with a digit.

### Bottom bar

| Button | Status |
|--------|--------|
| **Export Map** | _TODO — stub only_ |
| **Import Map** | _TODO — stub only_ |

---

## Project structure

```
topomap-editor/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx                # React DOM entry point
    ├── App.tsx                 # Root layout (header / body / bottom-bar)
    ├── App.css                 # All component styles
    ├── index.css               # Global reset
    ├── types.ts                # Domain models: Triangle, Line, Selection
    ├── hooks/
    │   └── useMapStore.ts      # MVVM ViewModel — useReducer-based state store
    └── components/
        ├── CanvasEditor.tsx    # Interactive Canvas pane (80 %)
        ├── RightPanel.tsx      # Contextual properties panel (20 %)
        └── BottomBar.tsx       # Action buttons at the bottom
```

---

## Tech stack

- **React 18** — UI framework
- **TypeScript** — type safety across the whole codebase
- **Vite 5** — dev server and bundler
- **HTML Canvas API** — all map rendering (no external graphics library)
- **useReducer** — predictable state management without a third-party store

---

## License

MIT
