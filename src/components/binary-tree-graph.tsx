import { formatPoints } from "@/lib/money";

export type TreePerson = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  referrerId: string | null;
  slot?: "LEFT" | "RIGHT" | null;
  depth: number; // 0 = root being viewed
  isActive: boolean;
  pointsPaise: number;
  gender?: "MALE" | "FEMALE" | null;
  createdAt?: Date;
  isRoot?: boolean;
};

type LaidOutNode = {
  // Real-person fields (placeholder uses minimal subset).
  id: string;
  name: string;
  email: string;
  referralCode: string;
  referrerId: string | null;
  slot?: "LEFT" | "RIGHT" | null;
  depth: number;
  isActive: boolean;
  pointsPaise: number;
  gender?: "MALE" | "FEMALE" | null;
  isRoot?: boolean;
  isPlaceholder?: boolean;
  placeholderSide?: "LEFT" | "RIGHT";
  placeholderParentCode?: string;
  children: LaidOutNode[];
  slotStart: number;
  slots: number;
  badge: string;
  // True when this node sits at the depth cutoff and has further downline
  // members hidden below it — clicking drills in to re-root at this node.
  hasMore?: boolean;
  hiddenCount?: number;
};

// Visual constants.
const NODE_W = 180;
const NODE_H = 80;
const SLOT_W = 208;
const LEVEL_H = NODE_H + 56;
const PADDING = 28;

function buildTree(people: TreePerson[], maxVisibleDepth: number): LaidOutNode | null {
  if (people.length === 0) return null;
  const byId = new Map<string, LaidOutNode>();
  for (const p of people) {
    byId.set(p.id, {
      ...p,
      children: [],
      slotStart: 0,
      slots: 1,
      badge: "",
    });
  }
  let root: LaidOutNode | null = null;
  for (const p of people) {
    const node = byId.get(p.id)!;
    if (p.isRoot || p.depth === 0) {
      root = node;
      continue;
    }
    const parent = p.referrerId ? byId.get(p.referrerId) : undefined;
    if (parent) parent.children.push(node);
  }
  if (!root) return null;

  // Cut off the rendered tree at maxVisibleDepth (depth relative to root). Any
  // node sitting at the cutoff that still has real descendants is marked
  // `hasMore` — the UI uses that to invite the user to drill in.
  function pruneAtDepth(n: LaidOutNode) {
    if (n.depth >= maxVisibleDepth) {
      if (n.children.length > 0) {
        n.hasMore = true;
        n.hiddenCount = countDescendants(n);
      }
      n.children = [];
      return;
    }
    for (const c of n.children) pruneAtDepth(c);
  }
  function countDescendants(n: LaidOutNode): number {
    let total = 0;
    for (const c of n.children) total += 1 + countDescendants(c);
    return total;
  }
  pruneAtDepth(root);

  // For each real node, fill missing L/R slots with placeholders.
  // Uses the DB `slot` field (LEFT/RIGHT) — not creation order — so the
  // visual position always matches what the API will check on placement.
  function injectPlaceholders(n: LaidOutNode) {
    // At the depth cutoff we deliberately do not invite new sign-ups — the
    // user must drill in first, otherwise the placeholder would lie about
    // where they'd actually be added in the tree.
    if (n.depth >= maxVisibleDepth) return;
    const bySlot: { LEFT?: LaidOutNode; RIGHT?: LaidOutNode } = {};
    for (const c of n.children) {
      if (c.slot === "LEFT") bySlot.LEFT = c;
      else if (c.slot === "RIGHT") bySlot.RIGHT = c;
      else {
        // No slot field — fall back to creation order for legacy/root node.
        if (!bySlot.LEFT) bySlot.LEFT = c;
        else if (!bySlot.RIGHT) bySlot.RIGHT = c;
      }
    }

    const nextChildren: LaidOutNode[] = [];
    for (const s of ["LEFT", "RIGHT"] as const) {
      const real = bySlot[s];
      if (real) {
        nextChildren.push(real);
      } else {
        nextChildren.push({
          id: `placeholder-${n.id}-${s}`,
          name: "Add member",
          email: "",
          referralCode: "",
          referrerId: n.id,
          depth: n.depth + 1,
          isActive: true,
          pointsPaise: 0,
          isPlaceholder: true,
          placeholderSide: s,
          placeholderParentCode: n.referralCode,
          children: [],
          slotStart: 0,
          slots: 1,
          badge: s === "LEFT" ? "L+" : "R+",
        });
      }
    }
    n.children = nextChildren;
    // Recurse into real children only.
    for (const c of n.children) {
      if (!c.isPlaceholder) injectPlaceholders(c);
    }
  }
  injectPlaceholders(root);

  // Slot badges: ROOT / L1 / R1 / L2 / R2 …
  function assignBadge(n: LaidOutNode) {
    if (n === root) n.badge = "ROOT";
    n.children.forEach((c, i) => {
      if (c.isPlaceholder) {
        // already set L+/R+
        return;
      }
      const slot = i === 0 ? "L" : i === 1 ? "R" : "X";
      c.badge = `${slot}${c.depth}`;
      assignBadge(c);
    });
  }
  assignBadge(root);

  // Measure subtree widths (slots).
  function measure(n: LaidOutNode): number {
    if (n.children.length === 0) {
      n.slots = 1;
      return 1;
    }
    n.slots = n.children.reduce((sum, c) => sum + measure(c), 0);
    return n.slots;
  }
  measure(root);

  // Assign x positions.
  function assign(n: LaidOutNode, start: number) {
    n.slotStart = start;
    let cursor = start;
    for (const c of n.children) {
      assign(c, cursor);
      cursor += c.slots;
    }
  }
  assign(root, 0);
  return root;
}

function centerX(n: LaidOutNode): number {
  return PADDING + (n.slotStart + n.slots / 2) * SLOT_W;
}
function topY(n: LaidOutNode): number {
  return PADDING + n.depth * LEVEL_H;
}

function flatten(root: LaidOutNode): LaidOutNode[] {
  const out: LaidOutNode[] = [];
  function walk(n: LaidOutNode) {
    out.push(n);
    n.children.forEach(walk);
  }
  walk(root);
  return out;
}

function slotBadgeClass(badge: string): string {
  if (badge === "ROOT") return "bg-brand-700 text-white";
  if (badge.startsWith("L")) return "bg-emerald-100 text-emerald-800";
  if (badge.startsWith("R")) return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

// Cartoon doll avatars rendered as inline SVG. Designed to fit a 40x40 wrapper.
function DollAvatar({
  variant,
  isRoot,
}: {
  variant: "MALE" | "FEMALE" | "UNKNOWN" | "PLACEHOLDER";
  isRoot?: boolean;
}) {
  // Root keeps the star — distinguishes "this is the user being viewed".
  if (isRoot) {
    return (
      <div
        className="h-10 w-10 rounded-full grid place-items-center text-base font-bold shrink-0"
        style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff" }}
        aria-label="root"
      >
        ★
      </div>
    );
  }

  // Colors per variant.
  const palette = (() => {
    switch (variant) {
      case "MALE":
        return { bg: "#dbeafe", skin: "#fed7aa", hair: "#1e293b", shirt: "#3b82f6", line: "#0f172a" };
      case "FEMALE":
        return { bg: "#fce7f3", skin: "#fed7aa", hair: "#7c2d12", shirt: "#ec4899", line: "#0f172a" };
      case "PLACEHOLDER":
        return { bg: "#1e293b", skin: "#475569", hair: "#0f172a", shirt: "#334155", line: "#94a3b8" };
      default:
        return { bg: "#f1f5f9", skin: "#cbd5e1", hair: "#64748b", shirt: "#94a3b8", line: "#475569" };
    }
  })();

  return (
    <div
      className="h-10 w-10 rounded-full grid place-items-center shrink-0 overflow-hidden"
      style={{ background: palette.bg }}
      aria-label={variant.toLowerCase()}
    >
      <svg viewBox="0 0 40 40" width={40} height={40}>
        {/* Hair back layer — female gets shoulder-length drape, male gets a fringe cap */}
        {variant === "FEMALE" && (
          <path
            d="M 9 19 Q 9 11 20 9 Q 31 11 31 19 Q 31 29 28 33 L 12 33 Q 9 29 9 19 Z"
            fill={palette.hair}
          />
        )}

        {/* Head */}
        <circle cx="20" cy="16" r="7" fill={palette.skin} />

        {/* Hair front (male: short cap; female: bangs) */}
        {variant === "MALE" && (
          <path
            d="M 13 14 Q 14 9 20 9 Q 26 9 27 14 Q 27 12 25 12 Q 23 13 20 13 Q 17 13 15 12 Q 13 12 13 14 Z"
            fill={palette.hair}
          />
        )}
        {variant === "FEMALE" && (
          <path
            d="M 13 14 Q 14 10 20 10 Q 24 10 26 12 L 22 14 Q 18 15 15 14 Q 14 14 13 14 Z"
            fill={palette.hair}
          />
        )}
        {variant === "PLACEHOLDER" && (
          <path
            d="M 13 14 Q 14 9 20 9 Q 26 9 27 14 Q 24 13 20 13 Q 16 13 13 14 Z"
            fill={palette.hair}
          />
        )}

        {/* Eyes */}
        <circle cx="17.5" cy="16.5" r="0.9" fill={palette.line} />
        <circle cx="22.5" cy="16.5" r="0.9" fill={palette.line} />

        {/* Smile */}
        <path
          d="M 17.5 19.5 Q 20 21 22.5 19.5"
          fill="none"
          stroke={palette.line}
          strokeWidth="0.7"
          strokeLinecap="round"
        />

        {/* Body / shirt */}
        <path
          d="M 8 40 L 8 30 Q 8 25 13 24 Q 16 23.5 20 23.5 Q 24 23.5 27 24 Q 32 25 32 30 L 32 40 Z"
          fill={palette.shirt}
        />

        {/* Collar accent */}
        <path
          d="M 17 24 L 20 27 L 23 24"
          fill="none"
          stroke={palette.line}
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

function genderVariant(gender?: "MALE" | "FEMALE" | null): "MALE" | "FEMALE" | "UNKNOWN" {
  if (gender === "MALE") return "MALE";
  if (gender === "FEMALE") return "FEMALE";
  return "UNKNOWN";
}

export function BinaryTreeGraph({
  people,
  allowNodeClick = true,
  embedded = false,
  maxVisibleDepth = 3,
  drilldownHrefBuilder,
  addMemberPath = "/affiliate/dashboard/add-member",
}: {
  people: TreePerson[];
  allowNodeClick?: boolean;
  // Base path the "Add member" placeholder slots link to. Defaults to the
  // 1000-pt registration; the Pro Max tree passes its own registration path so
  // open slots lead to the Pro Max form (with referId + side prefilled).
  addMemberPath?: string;
  // When true, render only the raw SVG (no card, header, or inner
  // overflow-x-auto). Used by BinaryTreeZoomable, which supplies its own
  // scroll/zoom container — the inner wrapper would otherwise cap the SVG
  // width and block panning to the right edge of the tree.
  embedded?: boolean;
  // How many generations below the root to show in one view. Default 3 shows
  // root + 3 levels (children, grandchildren, great-grandchildren) — to see
  // further the user clicks a boundary node and re-roots the tree there.
  maxVisibleDepth?: number;
  // Builds the URL used when the user clicks a depth-cutoff node to drill in.
  // When provided, the boundary node becomes clickable even if
  // `allowNodeClick` is false (the affiliate view uses this).
  drilldownHrefBuilder?: (id: string) => string;
}) {
  const root = buildTree(people, maxVisibleDepth);
  if (!root) {
    return (
      <div className={embedded ? "p-8 text-center text-sm text-muted-foreground" : "card p-8 text-center text-sm text-muted-foreground"}>
        No downline yet. As people sign up under this user, they appear here.
      </div>
    );
  }

  const nodes = flatten(root);
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const totalWidth = PADDING * 2 + root.slots * SLOT_W;
  const totalHeight = PADDING * 2 + (maxDepth + 1) * LEVEL_H;

  const connectors: { d: string; key: string; placeholder?: boolean; side?: "LEFT" | "RIGHT" }[] = [];
  for (const n of nodes) {
    const px = centerX(n);
    const py = topY(n) + NODE_H;
    for (const c of n.children) {
      const cx = centerX(c);
      const cy = topY(c);
      const midY = py + (cy - py) / 2;
      const d = `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`;
      connectors.push({
        d,
        key: `${n.id}-${c.id}`,
        placeholder: c.isPlaceholder,
        side: c.placeholderSide,
      });
    }
  }

  const realPeople = nodes.filter((n) => !n.isPlaceholder).length;

  const svg = (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="block"
      role="img"
      aria-label="Binary referral tree"
    >
          <defs>
            <filter id="treeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.08" />
            </filter>
          </defs>

          {connectors.map((c) => (
            <path
              key={c.key}
              d={c.d}
              fill="none"
              stroke={c.placeholder ? (c.side === "LEFT" ? "#10b98170" : "#0ea5e970") : "#cbd5e1"}
              strokeWidth={1.5}
              strokeDasharray={c.placeholder ? "4 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {nodes.map((n) => {
            const x = centerX(n) - NODE_W / 2;
            const y = topY(n);
            if (n.isPlaceholder) {
              return <PlaceholderNode key={n.id} x={x} y={y} node={n} addMemberPath={addMemberPath} />;
            }
            return (
              <RealNode
                key={n.id}
                x={x}
                y={y}
                node={n}
                clickable={allowNodeClick}
                drilldownHrefBuilder={drilldownHrefBuilder}
              />
            );
          })}
    </svg>
  );

  // Embedded: hand the bare SVG to the parent (BinaryTreeZoomable), which owns
  // the scroll + zoom container.
  if (embedded) return svg;

  // Standalone: keep the self-contained card + header + horizontal scroll.
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold">Binary tree</h2>
        <span className="text-xs text-muted-foreground">
          {realPeople - 1} downline · {maxDepth} {maxDepth === 1 ? "level" : "levels"} · click <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">L+</span> / <span className="inline-block px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[10px]">R+</span> on an open slot to register
        </span>
      </div>
      <div className="overflow-x-auto bg-gradient-to-b from-brand-50/40 via-transparent to-transparent rounded-xl">
        {svg}
      </div>
    </div>
  );
}

function RealNode({
  x,
  y,
  node: n,
  clickable,
  drilldownHrefBuilder,
}: {
  x: number;
  y: number;
  node: LaidOutNode;
  clickable: boolean;
  drilldownHrefBuilder?: (id: string) => string;
}) {
  const isRoot = n.depth === 0;
  // A drilldown link wins over the default per-node link: when a builder is
  // supplied, every non-root real node re-roots the tree at that user so the
  // viewer can keep drilling regardless of side or depth. Otherwise fall back
  // to the admin detail page used by the network views.
  const drilldownHref = !isRoot && drilldownHrefBuilder ? drilldownHrefBuilder(n.id) : null;
  const href = drilldownHref ?? (clickable ? `/admin/network/${n.id}` : null);
  const isClickable = href !== null;
  const inner = (
    <>
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={12}
        ry={12}
        fill={isRoot ? "#15803d" : "#ffffff"}
        stroke={isRoot ? "#14532d" : n.hasMore ? "#15803d" : "#e2e8f0"}
        strokeWidth={n.hasMore ? 2 : 1.5}
        className={isClickable ? "transition-opacity hover:opacity-90" : undefined}
        style={!isClickable ? { cursor: "default" } : undefined}
      />
      <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
        <div
          className={`h-full px-3 py-2 flex items-center gap-2 ${isRoot ? "text-white" : "text-slate-900"}`}
          style={!isClickable ? { cursor: "default", userSelect: "none" } : undefined}
        >
          <DollAvatar variant={genderVariant(n.gender)} isRoot={isRoot} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isRoot ? "bg-white/20 text-white" : slotBadgeClass(n.badge)
              }`}>
                {n.badge}
              </span>
              <span className={`text-[10px] font-semibold tabular-nums ${isRoot ? "text-brand-100" : "text-brand-700"}`}>
                {formatPoints(n.pointsPaise)}
              </span>
            </div>
            <div className={`mt-0.5 text-sm font-semibold leading-tight truncate ${isRoot ? "text-white" : "text-slate-900"}`}>
              {n.name}
            </div>
            {n.hasMore ? (
              <div className="text-[10px] leading-tight truncate font-medium text-brand-700">
                +{n.hiddenCount} below · tap ▼
              </div>
            ) : (
              <div className={`text-[10px] leading-tight truncate font-mono ${isRoot ? "text-brand-100" : "text-muted-foreground"}`}>
                {n.referralCode}
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    </>
  );
  if (!isClickable) {
    return <g style={{ filter: "url(#treeShadow)" }}>{inner}</g>;
  }
  return <a href={href!} style={{ filter: "url(#treeShadow)" }}>{inner}</a>;
}

function PlaceholderNode({ x, y, node: n, addMemberPath }: { x: number; y: number; node: LaidOutNode; addMemberPath: string }) {
  const isLeft = n.placeholderSide === "LEFT";
  const tone = isLeft
    ? { stroke: "#10b981", fill: "#ecfdf5", chip: "bg-emerald-500 text-white", text: "text-emerald-800" }
    : { stroke: "#0ea5e9", fill: "#f0f9ff", chip: "bg-sky-500 text-white", text: "text-sky-800" };
  const href = `${addMemberPath}?referId=${n.placeholderParentCode}&side=${n.placeholderSide}`;
  return (
    <a href={href} style={{ filter: "url(#treeShadow)" }}>
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={12}
        ry={12}
        fill={tone.fill}
        stroke={tone.stroke}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        className="transition-opacity hover:opacity-80"
      />
      <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
        <div className="h-full px-3 py-2 flex items-center gap-2">
          <DollAvatar variant="PLACEHOLDER" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${tone.chip}`}>{n.badge}</span>
            </div>
            <div className={`mt-0.5 text-sm font-semibold leading-tight ${tone.text}`}>
              Add member
            </div>
            <div className="text-[10px] text-muted-foreground">
              {n.placeholderSide} slot · click to register
            </div>
          </div>
        </div>
      </foreignObject>
    </a>
  );
}
