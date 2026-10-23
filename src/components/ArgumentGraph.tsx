import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Message, Seat } from "../types";
import { Activity, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Chip, Panel, PanelHeader } from "./ui";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  role: string;
  color: string;
  kind: "topic" | "speaker" | "argument";
  text?: string;
  tokens?: number;
  round?: number;
  val: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  type: "sequence" | "citation" | "membership";
}

export function ArgumentGraph({
  messages,
  seats,
  topicTitle,
  className,
}: {
  messages: Message[];
  seats: Seat[];
  topicTitle?: string;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [interactionStats, setInteractionStats] = useState({ nodes: 0, links: 0, exchanges: 0 });

  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // ── Build Graph Data from Live Messages & Seats ──
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // 1. Topic Center Node
    nodes.push({
      id: "topic_center",
      name: topicTitle ? topicTitle.slice(0, 32) : "Gündem Çekirdeği",
      role: "Gündem",
      color: "#38bdf8",
      kind: "topic",
      val: 28,
      text: topicTitle || "Konsey Tartışması",
    });

    // 2. Speaker Nodes
    const speakerMap = new Map<string, GraphNode>();

    // Operator
    const opNode: GraphNode = {
      id: "speaker_human",
      name: "İnsan Operatör",
      role: "Operatör",
      color: "#ffffff",
      kind: "speaker",
      val: 22,
    };
    nodes.push(opNode);
    speakerMap.set("human", opNode);
    links.push({
      source: "speaker_human",
      target: "topic_center",
      weight: 3,
      type: "membership",
    });

    // Council Seats
    seats.forEach((s) => {
      const sNode: GraphNode = {
        id: `speaker_${s.id}`,
        name: s.name,
        role: s.roleTitle,
        color: s.color,
        kind: "speaker",
        val: 20,
      };
      nodes.push(sNode);
      speakerMap.set(s.id, sNode);
      links.push({
        source: `speaker_${s.id}`,
        target: "topic_center",
        weight: 2.5,
        type: "membership",
      });
    });

    // 3. Argument / Turn Nodes and Interaction Links
    let previousTurnNodeId: string | null = null;
    let turnCount = 0;

    messages.forEach((m, idx) => {
      if (!m.content) return;
      turnCount++;

      const isHuman = m.speaker === "human";
      const speakerId = isHuman ? "speaker_human" : `speaker_${m.seatId}`;
      const color = m.color || (isHuman ? "#ffffff" : "#c084fc");
      const argId = `turn_${m.id || idx}`;

      const argNode: GraphNode = {
        id: argId,
        name: `${m.authorName} (${m.round ? `Tur ${m.round}` : "Girdi"})`,
        role: m.roleTitle || "Müdahale",
        color,
        kind: "argument",
        tokens: m.tokens,
        round: m.round,
        text: m.content.slice(0, 160),
        val: Math.min(18, Math.max(10, Math.round((m.tokens || 100) / 30))),
      };
      nodes.push(argNode);

      // Link to its speaker
      links.push({
        source: speakerId,
        target: argId,
        weight: 2,
        type: "citation",
      });

      // Link to previous turn (argüman akış zinciri)
      if (previousTurnNodeId) {
        links.push({
          source: previousTurnNodeId,
          target: argId,
          weight: 1.5,
          type: "sequence",
        });
      }
      previousTurnNodeId = argId;
    });

    setInteractionStats({
      nodes: nodes.length,
      links: links.length,
      exchanges: turnCount,
    });

    // ── SVG Setup & Layers ──
    const g = svg.append("g").attr("class", "graph-root");

    // Glow Filter Defs
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "neon-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // ── D3 Force Simulation ──
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => (d.type === "membership" ? 110 : d.type === "citation" ? 60 : 75))
      )
      .force("charge", d3.forceManyBody().strength(-240))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<GraphNode>().radius((d) => d.val + 14)
      );

    // ── Render Links ──
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) =>
        d.type === "sequence"
          ? "rgba(56, 189, 248, 0.4)"
          : d.type === "membership"
          ? "rgba(192, 132, 252, 0.3)"
          : "rgba(255, 255, 255, 0.2)"
      )
      .attr("stroke-width", (d) => d.weight)
      .attr("stroke-dasharray", (d) => (d.type === "sequence" ? "3 3" : null));

    // ── Render Nodes ──
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node outer circle (glowing halo on hover/select)
    node
      .append("circle")
      .attr("r", (d) => d.val)
      .attr("fill", (d) => `${d.color}22`)
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.kind === "topic" ? 3 : d.kind === "speaker" ? 2.5 : 1.5))
      .attr("filter", "url(#neon-glow)");

    // Inner core dot
    node
      .append("circle")
      .attr("r", (d) => (d.kind === "topic" ? 6 : d.kind === "speaker" ? 4 : 2.5))
      .attr("fill", (d) => d.color);

    // Node Label
    node
      .append("text")
      .text((d) => d.name)
      .attr("dy", (d) => d.val + 13)
      .attr("text-anchor", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-family", "var(--font-disp)")
      .attr("font-size", (d) => (d.kind === "topic" ? "11px" : "9.5px"))
      .attr("font-weight", (d) => (d.kind === "topic" || d.kind === "speaker" ? "bold" : "normal"))
      .attr("pointer-events", "none");

    // Click on node to inspect
    node.on("click", (_event, d) => {
      setSelectedNode(d);
    });

    // ── Simulation Tick ──
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [messages, seats, topicTitle]);

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  return (
    <Panel className={className} glowColor="#38bdf8">
      <PanelHeader
        accent="#38bdf8"
        icon={<Activity size={15} />}
        title="D3.JS ARGÜMAN AKIŞI & MODELLER ARASI ETKİLEŞİM AĞI"
        right={
          <div className="flex items-center gap-2">
            <Chip color="#38bdf8">
              <span>{interactionStats.nodes} Düğüm</span> · <span>{interactionStats.links} Bağlantı</span>
            </Chip>
            <div className="flex gap-1 border-l border-[#222a35] pl-2">
              <button
                onClick={handleZoomIn}
                className="rounded p-1 text-[#8b949e] hover:bg-white/5 hover:text-white"
                title="Yakınlaş"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={handleZoomOut}
                className="rounded p-1 text-[#8b949e] hover:bg-white/5 hover:text-white"
                title="Uzaklaş"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={handleResetZoom}
                className="rounded p-1 text-[#8b949e] hover:bg-white/5 hover:text-white"
                title="Sıfırla"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        }
      />

      <div ref={containerRef} className="relative h-[340px] w-full bg-[#070b10] overflow-hidden">
        {/* Tactical Crosshair Background Watermark */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

        {/* Top-right coordinate telemetry */}
        <div className="pointer-events-none absolute top-2.5 right-3 flex items-center gap-2 font-mono text-[9px] text-[#64748b]">
          <span>COORD: 39.92°N / 32.85°E</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">RADAR AKTİF</span>
        </div>

        <svg ref={svgRef} className="h-full w-full select-none" />

        {/* Selected Node Details Floating HUD Box */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 z-10 max-w-sm rounded-xl border border-[#334155] bg-[#0b1017]/95 p-3.5 shadow-2xl backdrop-blur-md animate-fade-up">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
              <div className="flex items-center gap-2 font-disp text-xs font-bold" style={{ color: selectedNode.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: selectedNode.color }} />
                <span>{selectedNode.name}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-[10px] text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#8b9bb4]">
              <span>Rol: <b className="text-white">{selectedNode.role}</b></span>
              {selectedNode.tokens ? <span>{selectedNode.tokens} tok</span> : null}
            </div>
            {selectedNode.text && (
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#cbd5e1] border-l-2 pl-2" style={{ borderColor: selectedNode.color }}>
                “{selectedNode.text}...”
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="pointer-events-none absolute bottom-2.5 right-3 flex flex-wrap gap-2 text-[10px] font-mono text-[#8b9bb4]">
          <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 border border-[#1e293b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" /> Gündem
          </span>
          <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 border border-[#1e293b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" /> Modeller
          </span>
          <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 border border-[#1e293b]">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Operatör
          </span>
          <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 border border-[#1e293b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" /> Argüman Düğümleri
          </span>
        </div>
      </div>
    </Panel>
  );
}
