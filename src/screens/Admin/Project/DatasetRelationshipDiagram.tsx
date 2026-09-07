// @ts-nocheck
// Visual, drag-to-connect way to set up the SAME column links ProjectDatasets.tsx's own
// "Link this column to another table" editor already creates (ProjectDatasetField.
// reference_dataset/reference_column) — additive, not a replacement: the dropdown editor
// stays exactly as it is, this is just a nicer way to reach for it when a project has a
// handful of tables and the relationships between them are easier to see than to describe.
//
// Every column gets FOUR connector dots — a target+source pair on its left edge and
// another pair on its right (stacked so each side still just looks like one dot — see
// TableNode) — so a connection can be dragged from whichever side is actually closer to
// the other table, instead of every link being forced through the same left-side point
// and fanning out into a tangle once several tables reference the same popular column.
// Which side an EXISTING link renders on is picked dynamically from the two tables'
// current on-screen positions (see sideFor below), so it stays sane after dragging tables
// around or hitting Auto Arrange.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, useNodesState, useEdgesState, useReactFlow, BackgroundVariant,
  BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Link2, Loader2, LayoutGrid } from 'lucide-react';
import { updateProjectDatasetField } from '../../../services/projects';

const ACCENT = '#0038A8';
const NODE_WIDTH = 260;
const ROW_HEIGHT = 30;
const HEADER_HEIGHT = 40;

// Lets the custom edge below reach the delete handler without threading it through every
// edge's own `data` (which would need rebuilding on every render just to stay fresh) —
// provided once by the component at the bottom, read by LinkEdge via useContext instead.
const DiagramActionsContext = createContext(null);

function nodeHeight(table) {
  return HEADER_HEIGHT + Math.max(1, (table.fields || []).length) * ROW_HEIGHT;
}

// One box per table, one row per column. No `overflow-hidden` on the outer card: the
// connector dots below sit right on each row's left/right edge (slightly outside it, via
// a negative offset) so they're grabbable — clipping the card would clip THEM too, which
// is exactly what made dragging a connection impossible before this fix.
// `data.highlightedFields` marks every column that's part of a link either as the source
// (it has reference_dataset set) or the target (some other table's column points at it),
// so a relationship is visible on BOTH ends, not just the one that "owns" the link.
function TableNode({ data }) {
  return (
    <div className="w-64 bg-white border-2 border-gray-200 rounded-xl shadow-md">
      <div className="px-3 py-2 bg-blue-50 border-b border-gray-200 rounded-t-xl">
        <p className="text-sm font-bold truncate" style={{ color: ACCENT }}>{data.table.name}</p>
      </div>
      <div>
        {(data.table.fields || []).length === 0 && (
          <p className="px-3 py-3 text-xs text-gray-400 italic rounded-b-xl">No columns yet</p>
        )}
        {(data.table.fields || []).map((f) => {
          const highlighted = data.highlightedFields?.has(f.name);
          return (
            <div key={f.id}
              className={`relative flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b border-gray-50 last:border-b-0 last:rounded-b-xl ${
                highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}>
              {/* Left side: a target UNDER a source, stacked at the same spot — visually
                  one dot, but draggable-from (source, painted last) and droppable-onto
                  (target, still reachable via React Flow's proximity-based drop detection). */}
              <Handle type="target" position={Position.Left} id={`to-l:${f.name}`}
                style={{ width: 11, height: 11, background: ACCENT, left: -6, border: '2px solid #fff', zIndex: 10 }} />
              <Handle type="source" position={Position.Left} id={`from-l:${f.name}`}
                style={{ width: 11, height: 11, background: ACCENT, left: -6, border: '2px solid #fff', zIndex: 11 }} />
              <span className="truncate text-gray-700">{f.label}</span>
              {highlighted && <Link2 size={11} className="shrink-0 text-blue-500" />}
              <Handle type="target" position={Position.Right} id={`to-r:${f.name}`}
                style={{ width: 11, height: 11, background: ACCENT, right: -6, border: '2px solid #fff', zIndex: 10 }} />
              <Handle type="source" position={Position.Right} id={`from-r:${f.name}`}
                style={{ width: 11, height: 11, background: ACCENT, right: -6, border: '2px solid #fff', zIndex: 11 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const nodeTypes = { table: TableNode };

// A connection's line + a small floating pill on top of it (the "<column> → <table>.
// <column>" label, plus a × button) — the pill is what makes deleting a connection
// discoverable without needing to know "select it, then press Delete" first (that still
// works too, via onEdgesDelete below).
function LinkEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, label, data }) {
  const { onDeleteLink } = useContext(DiagramActionsContext) || {};
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
          className="nodrag nopan flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-2 pr-1 py-0.5 shadow-sm"
        >
          <span className="text-[10px] text-gray-500 whitespace-nowrap max-w-[220px] truncate">{label}</span>
          <button type="button" title="Remove this link"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove this link?\n\n${label}`)) onDeleteLink?.(data?.fieldId);
            }}
            className="w-4 h-4 shrink-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600">
            <X size={10} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { link: LinkEdge };

// Undirected adjacency (a link's direction doesn't matter for grouping — A referencing B
// puts them in the same cluster either way) — used both to find connected components and
// to pick each component's hub (its most-connected table) below.
function buildAdjacency(datasets) {
  const idSet = new Set(datasets.map((t) => t.id));
  const adj = {};
  datasets.forEach((t) => { adj[t.id] = new Set(); });
  datasets.forEach((t) => {
    (t.fields || []).forEach((f) => {
      if (f.reference_dataset && idSet.has(f.reference_dataset)) {
        adj[t.id].add(f.reference_dataset);
        adj[f.reference_dataset].add(t.id);
      }
    });
  });
  return adj;
}

function connectedComponents(datasets, adj) {
  const visited = new Set();
  const components = [];
  datasets.forEach((t) => {
    if (visited.has(t.id)) return;
    const comp = [];
    const stack = [t.id];
    visited.add(t.id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      adj[cur].forEach((n) => { if (!visited.has(n)) { visited.add(n); stack.push(n); } });
    }
    components.push(comp);
  });
  return components;
}

const RADIAL_GAP = 110;
const RING_MARGIN = 160;

// Hub-and-spoke layout for one connected component: its most-connected table sits in the
// center, everything related to it (directly or transitively, within this component)
// rings around it — reads like an actual relationship diagram instead of forcing every
// table into a strict left-to-right chain, and every spoke naturally exits/enters from
// whichever side of each box actually faces the center (see sidesFor), so a popular "hub"
// column's many connections spread across its own left AND right dots on their own,
// without needing to override geometry the way the earlier alternating attempt did.
// Returns positions relative to the component's own (0,0)-anchored bounding box, so the
// caller can place each component's box independently on the shared canvas.
function radialLayoutComponent(ids, adj, byId) {
  let hubId = ids[0];
  let hubDegree = -1;
  ids.forEach((id) => {
    const d = adj[id].size;
    if (d > hubDegree) { hubDegree = d; hubId = id; }
  });
  const hub = byId[hubId];
  const hubHeight = nodeHeight(hub);
  const satellites = ids.filter((id) => id !== hubId);

  if (satellites.length === 0) {
    return { positions: { [hubId]: { x: 0, y: 0 } }, width: NODE_WIDTH, height: hubHeight };
  }

  const satHeights = satellites.map((id) => nodeHeight(byId[id]));
  const avgSatHeight = satHeights.reduce((a, b) => a + b, 0) / satHeights.length;
  // Enough radius that adjacent satellites don't overlap each other around the ring,
  // and enough to clear the hub's own footprint too (whichever is bigger).
  const circumference = satellites.length * (NODE_WIDTH + RADIAL_GAP);
  const minRadius = NODE_WIDTH / 2 + Math.max(hubHeight, avgSatHeight) / 2 + RING_MARGIN;
  const radius = Math.max(circumference / (2 * Math.PI), minRadius);

  const centers = { [hubId]: { x: 0, y: 0 } };
  satellites.forEach((id, i) => {
    const angle = (i / satellites.length) * 2 * Math.PI - Math.PI / 2; // first satellite straight up
    centers[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  [hubId, ...satellites].forEach((id) => {
    const h = nodeHeight(byId[id]);
    const left = centers[id].x - NODE_WIDTH / 2, top = centers[id].y - h / 2;
    minX = Math.min(minX, left); maxX = Math.max(maxX, left + NODE_WIDTH);
    minY = Math.min(minY, top); maxY = Math.max(maxY, top + h);
  });
  const positions = {};
  [hubId, ...satellites].forEach((id) => {
    const h = nodeHeight(byId[id]);
    positions[id] = { x: centers[id].x - NODE_WIDTH / 2 - minX, y: centers[id].y - h / 2 - minY };
  });
  return { positions, width: maxX - minX, height: maxY - minY };
}

// Lays out every connected component (each its own hub-and-spoke cluster) in a wrapping
// left-to-right flow, biggest clusters first so the result reads tidier than an arbitrary/
// insertion-order arrangement — then tables with no relationships at all get pushed onto
// their own fresh row underneath every cluster, instead of drifting in wherever they'd
// otherwise fall in the size-sorted flow.
function layoutNodes(datasets) {
  const byId = {};
  datasets.forEach((t) => { byId[t.id] = t; });
  const adj = buildAdjacency(datasets);
  const allComponents = connectedComponents(datasets, adj);
  const connected = allComponents.filter((c) => c.length > 1).sort((a, b) => b.length - a.length);
  const isolated = allComponents.filter((c) => c.length === 1);

  const ROW_MAX_WIDTH = 1700;
  let cursorX = 40, cursorY = 40, rowHeight = 0;
  const nodes = [];
  const placeComponent = (ids) => {
    const { positions, width, height } = radialLayoutComponent(ids, adj, byId);
    if (cursorX > 40 && cursorX + width > ROW_MAX_WIDTH) {
      cursorX = 40;
      cursorY += rowHeight + RADIAL_GAP;
      rowHeight = 0;
    }
    ids.forEach((id) => {
      nodes.push({
        id: String(id),
        type: 'table',
        position: { x: cursorX + positions[id].x, y: cursorY + positions[id].y },
        data: { table: byId[id] },
      });
    });
    cursorX += width + RADIAL_GAP;
    rowHeight = Math.max(rowHeight, height);
  };

  connected.forEach(placeComponent);
  if (isolated.length && connected.length) {
    // Force a fresh row (with extra breathing room) before the "no relationship" section.
    cursorX = 40;
    cursorY += rowHeight + RADIAL_GAP * 2;
    rowHeight = 0;
  }
  isolated.forEach(placeComponent);

  return nodes;
}

// Which side of each table a link should draw from/into, based on where the two tables
// currently sit on screen — the source table's RIGHT side and the target's LEFT side when
// the source is (roughly) to the left of the target, otherwise flipped. Falls back to
// right→left (the old fixed behavior) if a position isn't known yet for some reason.
// Which side a link exits/lands on — the side actually facing the other table, based on
// their current on-screen positions, so a connection always routes directly instead of
// looping around to reach a fixed side that doesn't match where the other table actually
// is. (An earlier version alternated the target side to spread out a "hub" column's many
// incoming lines, but that overrode geometry for roughly half of them — producing exactly
// the kind of wrong-side, looping line this is meant to avoid. Reverted: always trust
// position over trying to force visual spacing.)
function sidesFor(sourceId, targetId, positionsById) {
  const sp = positionsById[sourceId];
  const tp = positionsById[targetId];
  if (!sp || !tp || sp.x <= tp.x) return { sourceSide: 'r', targetSide: 'l' };
  return { sourceSide: 'l', targetSide: 'r' };
}

function buildEdges(datasets, positionsById) {
  const edges = [];
  datasets.forEach((table) => {
    (table.fields || []).forEach((f) => {
      if (!f.reference_dataset || !f.reference_column) return;
      const targetTable = datasets.find((d) => d.id === f.reference_dataset);
      const targetField = targetTable?.fields?.find((tf) => tf.name === f.reference_column);
      const { sourceSide, targetSide } = sidesFor(String(table.id), String(f.reference_dataset), positionsById);
      edges.push({
        id: `link-${f.id}`,
        type: 'link',
        source: String(table.id),
        sourceHandle: `from-${sourceSide}:${f.name}`,
        target: String(f.reference_dataset),
        targetHandle: `to-${targetSide}:${f.reference_column}`,
        label: `${f.label} → ${targetTable?.name || '?'}.${targetField?.label || f.reference_column}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: ACCENT, width: 16, height: 16 },
        style: { stroke: ACCENT, strokeWidth: 1.5 },
        data: { fieldId: f.id },
      });
    });
  });
  return edges;
}

// Every column name (per table id) that's part of SOME link, whichever end it's on — used
// to highlight both the referencing column and the column it points to, not just one side.
function buildHighlightedFields(datasets) {
  const map = {};
  const mark = (tableId, fieldName) => {
    if (!map[tableId]) map[tableId] = new Set();
    map[tableId].add(fieldName);
  };
  datasets.forEach((table) => {
    (table.fields || []).forEach((f) => {
      if (!f.reference_dataset || !f.reference_column) return;
      mark(table.id, f.name);
      mark(f.reference_dataset, f.reference_column);
    });
  });
  return map;
}

function attachNodeExtras(nodes, datasets) {
  const highlightMap = buildHighlightedFields(datasets);
  return nodes.map((n) => ({ ...n, data: { ...n.data, highlightedFields: highlightMap[Number(n.id)] || new Set() } }));
}

// useReactFlow() (needed to re-fit the view after Auto Arrange changes the layout extent)
// only works inside a ReactFlowProvider — the default export below just supplies that,
// since the Auto Arrange BUTTON lives in this component's own header, outside <ReactFlow>
// itself, and still needs to trigger a re-fit.
function DiagramCanvas({ datasets, onDatasetsChange, onClose }) {
  const { fitView } = useReactFlow();
  const initialNodes = useMemo(() => attachNodeExtras(layoutNodes(datasets), datasets), [datasets]);
  const initialPositions = useMemo(() => Object.fromEntries(initialNodes.map((n) => [n.id, n.position])), [initialNodes]);
  const initialEdges = useMemo(() => buildEdges(datasets, initialPositions), [datasets, initialPositions]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Re-syncs the canvas after a link/unlink completes on the backend — refetches through
  // the parent so ProjectDatasets.tsx's own table view (and the pill list's own "Linked
  // to" indicator) picks up the change too, not just this diagram. Only edges/highlights
  // are rebuilt here, not node positions — a save shouldn't undo any manual dragging.
  const refresh = useCallback(async () => {
    const fresh = await onDatasetsChange();
    const withTables = nodes.map((n) => {
      const table = fresh.find((d) => String(d.id) === n.id);
      return table ? { ...n, data: { ...n.data, table } } : n;
    });
    const updated = attachNodeExtras(withTables, fresh);
    setNodes(updated);
    const positionsById = Object.fromEntries(updated.map((n) => [n.id, n.position]));
    setEdges(buildEdges(fresh, positionsById));
  }, [onDatasetsChange, nodes, setNodes, setEdges]);

  const onConnect = useCallback(async (params) => {
    setError('');
    if (params.source === params.target) {
      setError("A column can't link to a column on its own table.");
      return;
    }
    const sourceTable = datasets.find((d) => String(d.id) === params.source);
    const sourceFieldName = (params.sourceHandle || '').replace(/^from-[lr]:/, '');
    const sourceField = sourceTable?.fields?.find((f) => f.name === sourceFieldName);
    const targetFieldName = (params.targetHandle || '').replace(/^to-[lr]:/, '');
    if (!sourceField) return;
    setBusy(true);
    try {
      await updateProjectDatasetField(sourceField.id, {
        reference_dataset: Number(params.target),
        reference_column: targetFieldName,
      });
      await refresh();
    } catch (err) {
      setError('Failed to save that link.');
    } finally {
      setBusy(false);
    }
  }, [datasets, refresh]);

  const deleteLinkedFields = useCallback(async (fieldIds) => {
    setBusy(true);
    setError('');
    try {
      await Promise.all(fieldIds.map((fieldId) => updateProjectDatasetField(fieldId, { reference_dataset: null, reference_column: '' })));
      await refresh();
    } catch (err) {
      setError('Failed to remove that link.');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  // The × button on an edge's own label — the primary, discoverable way to remove a link.
  const handleDeleteLink = useCallback((fieldId) => {
    if (!fieldId) return;
    deleteLinkedFields([fieldId]);
  }, [deleteLinkedFields]);

  // Select-then-press-Delete still works too, as an alternative to the × button — gated
  // through onBeforeDelete (not onEdgesDelete) specifically so a cancelled confirm() stops
  // the removal before it happens. onEdgesDelete fires AFTER React Flow has already wiped
  // the edge from local state, so a "Cancel" there would still leave the line visually gone
  // until the next refresh. Also blocks deleting a NODE entirely — this diagram only
  // manages links, so pressing Delete on a selected table box shouldn't make it vanish from
  // the canvas with nothing actually happening on the backend.
  const onBeforeDelete = useCallback(async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
    if (nodesToDelete.length) return false;
    if (!edgesToDelete.length) return true;
    const ok = window.confirm(
      edgesToDelete.length === 1 ? `Remove this link?\n\n${edgesToDelete[0].label}` : `Remove ${edgesToDelete.length} links?`
    );
    if (!ok) return false;
    const fieldIds = edgesToDelete.map((edge) => edge.data?.fieldId).filter(Boolean);
    if (fieldIds.length) deleteLinkedFields(fieldIds);
    return true;
  }, [deleteLinkedFields]);

  // Keeps sidesFor's rule actually live: dragging a table across the hub's x-position
  // should flip which side its connections use right away, not just after the next Auto
  // Arrange or link change. Reads the just-dropped node's OWN position from the callback's
  // own argument (guaranteed current) rather than the `nodes` closure for that one node,
  // since React may not have re-rendered with its final drag position yet at this point.
  const onNodeDragStop = useCallback((_, draggedNode) => {
    const positionsById = Object.fromEntries(
      nodes.map((n) => [n.id, n.id === draggedNode.id ? draggedNode.position : n.position])
    );
    setEdges(buildEdges(datasets, positionsById));
  }, [nodes, datasets, setEdges]);

  const autoArrange = useCallback(() => {
    const laidOut = attachNodeExtras(layoutNodes(datasets), datasets);
    setNodes(laidOut);
    const positionsById = Object.fromEntries(laidOut.map((n) => [n.id, n.position]));
    setEdges(buildEdges(datasets, positionsById));
    // fitView needs the new node positions/sizes to actually be in the DOM before it can
    // measure them — the `fitView` prop on <ReactFlow> only ever runs once, on mount, so a
    // RE-layout (this button) needs this imperative call instead, deferred a tick so the
    // setNodes above has actually rendered by the time it runs.
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
  }, [datasets, setNodes, setEdges, fitView]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] max-w-6xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Table Relationships</h3>
            <p className="text-xs text-gray-400">
              Drag from a column's dot to another table's column to link them. Click the × on a connection to remove it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {busy && <Loader2 size={16} className="animate-spin text-gray-400" />}
            <button type="button" onClick={autoArrange} title="Group connected tables together and reset positions"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 text-gray-600 hover:border-[#0038A8] hover:text-[#0038A8]">
              <LayoutGrid size={13} /> Auto Arrange
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>
        {error && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600 shrink-0">{error}</div>
        )}
        <div className="flex-1 min-h-0">
          {datasets.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Create at least one table to see it here.
            </div>
          ) : (
            <DiagramActionsContext.Provider value={{ onDeleteLink: handleDeleteLink }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onBeforeDelete={onBeforeDelete}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                colorMode="light"
                deleteKeyCode={['Backspace', 'Delete']}
                connectionRadius={30}
                minZoom={0.05}
                fitView
                fitViewOptions={{ padding: 0.15 }}
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
                <Controls />
              </ReactFlow>
            </DiagramActionsContext.Provider>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DatasetRelationshipDiagram(props) {
  return (
    <ReactFlowProvider>
      <DiagramCanvas {...props} />
    </ReactFlowProvider>
  );
}
