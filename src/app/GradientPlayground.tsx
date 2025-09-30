"use client";

import { useState, useEffect } from "react";

// Type definitions
interface GradientStop {
  color: string;
  pos: number;
}

interface GradientLayer {
  id: number;
  type: "conic" | "linear" | "radial";
  from: number;
  at: { x: number; y: number };
  stops: GradientStop[];
  enabled: boolean;
  opacity: number;
}

interface AppState {
  layers: GradientLayer[];
  previewW: number;
  previewH: number;
  selectedLayerId: number;
}

// Default gradient layers parsed from the user's example (kept as structured data)
const DEFAULT_LAYERS: GradientLayer[] = [
  {
    id: 1,
    type: "conic",
    from: 252.02,
    at: { x: 54, y: 278.75 },
    stops: [
      { color: "#152275", pos: -193.01 },
      { color: "#E33B94", pos: 18.24 },
      { color: "#B61B6D", pos: 31.32 },
      { color: "#E33B94", pos: 55.63 },
      { color: "#152275", pos: 85.18 },
      { color: "#152275", pos: 94.34 },
      { color: "#144B8C", pos: 110.28 },
      { color: "#007BA7", pos: 130.18 },
      { color: "#007BA7", pos: 134.69 },
      { color: "#152275", pos: 166.99 },
      { color: "#E33B94", pos: 378.24 },
    ],
    enabled: true,
    opacity: 1,
  },
  {
    id: 2,
    type: "conic",
    from: 103.86,
    at: { x: -4.6, y: 50 },
    stops: [
      { color: "#152275", pos: 0 },
      { color: "#152275", pos: 360 },
    ],
    enabled: true,
    opacity: 1,
  },
];

// URL state management functions
function encodeStateToUrl(state: AppState): string {
  try {
    const compressed = JSON.stringify(state);
    return btoa(compressed);
  } catch (e) {
    console.error("Failed to encode state:", e);
    return "";
  }
}

function decodeStateFromUrl(): AppState | null {
  try {
    if (typeof window === "undefined") return null;

    const hash = window.location.hash.slice(1); // Remove #
    if (!hash) return null;

    const decoded = atob(hash);
    const state = JSON.parse(decoded) as AppState;

    // Validate the state structure
    if (
      !state.layers ||
      !Array.isArray(state.layers) ||
      typeof state.previewW !== "number" ||
      typeof state.previewH !== "number" ||
      typeof state.selectedLayerId !== "number"
    ) {
      return null;
    }

    return state;
  } catch (e) {
    console.error("Failed to decode state from URL:", e);
    return null;
  }
}

function updateUrlWithState(state: AppState) {
  try {
    if (typeof window === "undefined") return;

    const encoded = encodeStateToUrl(state);
    const newUrl = `${window.location.pathname}${window.location.search}#${encoded}`;

    // Use replaceState to avoid adding to browser history for every change
    window.history.replaceState(null, "", newUrl);
  } catch (e) {
    console.error("Failed to update URL:", e);
  }
}

export default function GradientPlayground() {
  // Initialize state from URL or defaults (only on first load)
  const [isInitialized, setIsInitialized] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [previewW, setPreviewW] = useState(300);
  const [previewH, setPreviewH] = useState(180);
  const [selectedLayerId, setSelectedLayerId] = useState(1);
  const [cssText, setCssText] = useState("");
  const [tailwindText, setTailwindText] = useState("");
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);

  // Initialize from URL on first load only
  useEffect(() => {
    if (isInitialized) return;

    const urlState = decodeStateFromUrl();
    if (urlState) {
      setLayers(urlState.layers);
      setPreviewW(urlState.previewW);
      setPreviewH(urlState.previewH);
      setSelectedLayerId(urlState.selectedLayerId);
    }
    setIsInitialized(true);
  }, [isInitialized]);

  // Update CSS when state changes
  useEffect(() => {
    if (!isInitialized) return;
    setCssText(generateCss());
    setTailwindText(generateTailwindCss());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, previewW, previewH, isInitialized]);

  // Update URL when state changes (but not during initial load)
  useEffect(() => {
    if (!isInitialized) return;

    const state: AppState = {
      layers,
      previewW,
      previewH,
      selectedLayerId,
    };

    updateUrlWithState(state);
  }, [layers, previewW, previewH, selectedLayerId, isInitialized]);

  function generateCss() {
    // Generate each layer CSS
    const layerCss = layers
      .filter((L) => L.enabled)
      .map((L) => {
        const fromPart = L.from != null ? `from ${L.from}deg ` : "";
        const atPart = L.at ? `at ${L.at.x}% ${L.at.y}%` : "";
        const stopList = L.stops
          .map((s) => `${s.color} ${formatNumber(s.pos)}deg`)
          .join(", ");
        return `${L.type}-gradient(${fromPart}${atPart}, ${stopList})`;
      })
      .join(",\n");

    return `background: ${layerCss};`;
  }

  function generateTailwindCss() {
    // Generate Tailwind CSS class
    const layerCss = layers
      .filter((L) => L.enabled)
      .map((L) => {
        const fromPart = L.from != null ? `from_${L.from}deg_` : "";
        const atPart = L.at ? `at_${L.at.x}%_${L.at.y}%` : "";
        const stopList = L.stops
          .map((s) => `${s.color}_${formatNumber(s.pos)}deg`)
          .join(",_");
        return `${L.type}-gradient(${fromPart}${atPart},_${stopList})`;
      })
      .join(",");

    return `bg-[${layerCss}]`;
  }

  function updateLayer(id: number, patch: Partial<GradientLayer>) {
    setLayers((prev) =>
      prev.map((L) => (L.id === id ? { ...L, ...patch } : L))
    );
  }

  function updateStop(
    layerId: number,
    stopIdx: number,
    patch: Partial<GradientStop>
  ) {
    setLayers((prev) =>
      prev.map((L) => {
        if (L.id !== layerId) return L;
        const stops = L.stops.map((s, i) =>
          i === stopIdx ? { ...s, ...patch } : s
        );
        return { ...L, stops };
      })
    );
  }

  function addStop(layerId: number) {
    setLayers((prev) =>
      prev.map((L) =>
        L.id === layerId
          ? { ...L, stops: [...L.stops, { color: "#ffffff", pos: 50 }] }
          : L
      )
    );
  }

  function removeStop(layerId: number, idx: number) {
    setLayers((prev) =>
      prev.map((L) =>
        L.id === layerId
          ? { ...L, stops: L.stops.filter((_, i) => i !== idx) }
          : L
      )
    );
  }

  function addLayer() {
    const id = Math.max(...layers.map((l) => l.id)) + 1;
    setLayers((prev) => [
      ...prev,
      {
        id,
        type: "conic",
        from: 0,
        at: { x: 50, y: 50 },
        stops: [
          { color: "#ff0000", pos: 0 },
          { color: "#0000ff", pos: 360 },
        ],
        enabled: true,
        opacity: 1,
      },
    ]);
    setSelectedLayerId(id);
  }

  function removeLayer(id: number) {
    if (layers.length === 1) return;

    const newLayers = layers.filter((l) => l.id !== id);
    setLayers(newLayers);

    // If the removed layer was selected, select the first remaining layer
    if (selectedLayerId === id) {
      setSelectedLayerId(newLayers[0].id);
    }
  }

  function formatNumber(n: number | null | undefined): string {
    if (n == null) return "0";
    return Number(n).toFixed(2).replace(/\.00$/, "");
  }

  // Function to parse CSS gradients from pasted text (e.g., from Figma)
  function parseCssGradient(cssText: string): GradientLayer[] {
    // Clean up the CSS text and extract background properties
    const cleanCss = cssText.replace(/\s+/g, " ").trim();

    // Try to extract from background property first
    const backgroundMatch = cleanCss.match(/background\s*:\s*([^;]+)/i);
    const gradientText = backgroundMatch ? backgroundMatch[1] : cleanCss;

    const gradientRegex =
      /(conic-gradient|linear-gradient|radial-gradient)\s*\([^)]+\)/gi;
    const matches = gradientText.match(gradientRegex);

    if (!matches) return [];

    return matches.map((match, index) => {
      const type =
        (match.match(/^(conic|linear|radial)/i)?.[1].toLowerCase() as
          | "conic"
          | "linear"
          | "radial") || "conic";

      // Extract parameters
      const paramsMatch = match.match(/\(([^)]+)\)/);
      if (!paramsMatch) return createDefaultLayer(Date.now() + index, type);

      const params = paramsMatch[1];

      // Parse stops - improved regex to handle various color formats
      const stopRegex =
        /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))\s*([0-9.-]+(?:deg|%|px)?)?/g;
      const stops: GradientStop[] = [];
      let stopMatch;
      let currentPos = 0;

      while ((stopMatch = stopRegex.exec(params)) !== null) {
        const color = stopMatch[1];
        const posStr = stopMatch[2];
        let pos = currentPos;

        if (posStr) {
          pos = parseFloat(posStr);
          // Convert percentage to degrees for conic gradients
          if (type === "conic" && posStr.includes("%")) {
            pos = pos * 3.6; // 100% = 360deg
          } else if (type === "conic" && !posStr.includes("deg")) {
            // If no unit specified for conic, assume degrees
            pos = parseFloat(posStr);
          }
        }

        stops.push({ color, pos });
        currentPos = pos + 45; // Default increment for next stop if no position specified
      }

      // Parse from angle for conic gradients
      let from = 0;
      const fromMatch = params.match(/from\s+([0-9.-]+)deg/i);
      if (fromMatch) {
        from = parseFloat(fromMatch[1]);
      }

      // Parse at position
      let at = { x: 50, y: 50 };
      const atMatch = params.match(/at\s+([0-9.-]+)%\s+([0-9.-]+)%/i);
      if (atMatch) {
        at = { x: parseFloat(atMatch[1]), y: parseFloat(atMatch[2]) };
      }

      // Ensure we have at least 2 stops
      if (stops.length === 0) {
        stops.push(
          { color: "#ff0000", pos: 0 },
          { color: "#0000ff", pos: type === "conic" ? 360 : 100 }
        );
      } else if (stops.length === 1) {
        stops.push({ color: "#0000ff", pos: type === "conic" ? 360 : 100 });
      }

      return {
        id: Date.now() + index,
        type,
        from,
        at,
        stops,
        enabled: true,
        opacity: 1,
      };
    });
  }

  function createDefaultLayer(
    id: number,
    type: "conic" | "linear" | "radial"
  ): GradientLayer {
    return {
      id,
      type,
      from: 0,
      at: { x: 50, y: 50 },
      stops: [
        { color: "#ff0000", pos: 0 },
        { color: "#0000ff", pos: 360 },
      ],
      enabled: true,
      opacity: 1,
    };
  }

  function handlePasteCss(pastedText: string) {
    const parsedLayers = parseCssGradient(pastedText);
    if (parsedLayers.length > 0) {
      setLayers(parsedLayers);
      setSelectedLayerId(parsedLayers[0].id);
    } else {
      alert(
        "No valid gradients found in the pasted CSS. Please paste CSS containing conic-gradient, linear-gradient, or radial-gradient."
      );
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(cssText);
      alert("CSS copied to clipboard");
    } catch (e) {
      console.error(e);
      alert("Copy failed — please select & copy manually.");
    }
  }

  async function copyTailwindToClipboard() {
    try {
      await navigator.clipboard.writeText(tailwindText);
      alert("Tailwind CSS copied to clipboard");
    } catch (e) {
      console.error(e);
      alert("Copy failed — please select & copy manually.");
    }
  }

  const selectedLayer =
    layers.find((l) => l.id === selectedLayerId) || layers[0];

  // Figma-style gradient bar component
  function GradientBar({ layer }: { layer: GradientLayer }) {
    const sortedStops = [...layer.stops].sort((a, b) => a.pos - b.pos);
    const minPos = Math.min(...sortedStops.map((s) => s.pos));
    const maxPos = Math.max(...sortedStops.map((s) => s.pos));
    const range = maxPos - minPos || 360;

    const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const newPos = minPos + (percentage / 100) * range;

      // Add new stop at clicked position
      addStop(layer.id);
      // Update the new stop's position
      setTimeout(() => {
        const newStops = [...layer.stops, { color: "#ffffff", pos: newPos }];
        updateLayer(layer.id, { stops: newStops });
      }, 0);
    };

    const handleStopDrag = (
      index: number,
      e: React.MouseEvent<HTMLDivElement>
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const barRect = e.currentTarget.parentElement!.getBoundingClientRect();
      const startPos = layer.stops[index].pos;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaPercentage = (deltaX / barRect.width) * 100;
        const deltaPos = (deltaPercentage / 100) * range;
        const newPos = startPos + deltaPos;

        updateStop(layer.id, index, { pos: newPos });
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    return (
      <div
        className="relative h-8 bg-gray-100 rounded overflow-hidden cursor-crosshair"
        onClick={handleBarClick}
      >
        {/* Gradient preview */}
        <div
          className="absolute inset-0 rounded pointer-events-none"
          style={{
            background: `${layer.type}-gradient(${
              layer.from != null ? `from ${layer.from}deg ` : ""
            }${
              layer.at ? `at ${layer.at.x}% ${layer.at.y}%` : ""
            }, ${sortedStops
              .map((s) => `${s.color} ${formatNumber(s.pos)}deg`)
              .join(", ")})`,
          }}
        />

        {/* Stop handles */}
        {layer.stops.map((stop, index) => {
          const percentage = ((stop.pos - minPos) / range) * 100;
          return (
            <div
              key={index}
              className="absolute top-0 h-full w-3 cursor-grab active:cursor-grabbing transform -translate-x-1/2 group z-10"
              style={{ left: `${Math.max(6, Math.min(94, percentage))}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStopIndex(index);
              }}
              onMouseDown={(e) => handleStopDrag(index, e)}
            >
              <div
                className={`w-3 h-full border-2 rounded-sm shadow-sm transition-colors ${
                  selectedStopIndex === index
                    ? "border-blue-500"
                    : "border-white bg-gray-300"
                } group-hover:border-blue-400`}
              >
                <div
                  className="w-full h-full rounded-sm"
                  style={{ backgroundColor: stop.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 bg-white border-b border-gray-200">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              CSS Gradient Playground
            </h1>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 cursor-pointer"
                onClick={() => {
                  setLayers(DEFAULT_LAYERS);
                  setPreviewW(300);
                  setPreviewH(180);
                  setSelectedLayerId(DEFAULT_LAYERS[0].id);
                }}
              >
                Reset
              </button>
              <button
                className="px-3 py-1.5 text-sm text-white bg-[conic-gradient(from_252.02deg_at_54%_278.75%,_#152275_-193.01deg,_#E33B94_18.24deg,_#B61B6D_31.32deg,_#E33B94_55.63deg,_#152275_85.18deg,_#152275_94.34deg,_#144B8C_110.28deg,_#007BA7_130.18deg,_#007BA7_134.69deg,_#152275_166.99deg,_#E33B94_378.24deg),conic-gradient(from_103.86deg_at_-4.6%_50%,_#152275_0deg,_#152275_360deg)] rounded-md cursor-pointer"
                onClick={async () => {
                  try {
                    const url = window.location.href;
                    await navigator.clipboard.writeText(url);
                    alert("Share URL copied to clipboard!");
                  } catch (e) {
                    console.error(e);
                    alert("Failed to copy URL");
                  }
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-[calc(100dvh-430px)] max-w-7xl mx-auto">
        {/* Sticky Preview Section */}
        <div className="bg-white rounded-lg shadow sticky top-0 z-50 mb-4">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">Preview</h2>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={previewW}
                  onChange={(e) =>
                    setPreviewW(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                />
                <span className="text-xs text-gray-400">×</span>
                <input
                  type="number"
                  min={1}
                  value={previewH}
                  onChange={(e) =>
                    setPreviewH(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                />
                <span className="text-xs text-gray-500">px</span>
              </div>
            </div>

            <div className="bg-gray-100 p-3 rounded-lg">
              <div
                className="mx-auto rounded-lg shadow-inner border border-gray-200 overflow-hidden"
                style={{ width: previewW, height: previewH }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    background: layers
                      .filter((L) => L.enabled)
                      .map((L) => {
                        const fromPart =
                          L.from != null ? `from ${L.from}deg ` : "";
                        const atPart = L.at ? `at ${L.at.x}% ${L.at.y}%` : "";
                        const stopList = L.stops
                          .map((s) => `${s.color} ${formatNumber(s.pos)}deg`)
                          .join(", ");
                        return `${L.type}-gradient(${fromPart}${atPart}, ${stopList})`;
                      })
                      .join(", "),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Single Column */}
        <div className="space-y-4">
          {/* Import & Export Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Import */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">
                  Import CSS
                </h3>
              </div>
              <div className="p-3">
                <div className="space-y-3">
                  <textarea
                    id="css-input"
                    placeholder="Paste CSS gradient here, e.g. from Figma..."
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onPaste={(e) => {
                      setTimeout(() => {
                        const target = e.currentTarget;
                        if (target && target.value) {
                          const pastedText = target.value;
                          if (pastedText.trim()) {
                            handlePasteCss(pastedText);
                            target.value = "";
                          }
                        }
                      }, 10);
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      className="px-3 py-1.5 text-sm text-white bg-[conic-gradient(from_252.02deg_at_54%_278.75%,_#152275_-193.01deg,_#E33B94_18.24deg,_#B61B6D_31.32deg,_#E33B94_55.63deg,_#152275_85.18deg,_#152275_94.34deg,_#144B8C_110.28deg,_#007BA7_130.18deg,_#007BA7_134.69deg,_#152275_166.99deg,_#E33B94_378.24deg),conic-gradient(from_103.86deg_at_-4.6%_50%,_#152275_0deg,_#152275_360deg)] rounded-md cursor-pointer"
                      onClick={() => {
                        const textarea = document.getElementById(
                          "css-input"
                        ) as HTMLTextAreaElement;
                        const cssText = textarea.value.trim();
                        if (cssText) {
                          handlePasteCss(cssText);
                          textarea.value = "";
                        } else {
                          alert("Please paste some CSS first");
                        }
                      }}
                    >
                      Import
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">
                  Export Code
                </h3>
              </div>
              <div className="p-3 space-y-3">
                {/* CSS */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      CSS
                    </label>
                    <button
                      onClick={copyToClipboard}
                      className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={cssText}
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded font-mono text-xs bg-gray-50"
                  />
                </div>

                {/* Tailwind */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      Tailwind CSS
                    </label>
                    <button
                      onClick={copyTailwindToClipboard}
                      className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={tailwindText}
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded font-mono text-xs bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Layers Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Layers</h3>
                <button
                  className="px-3 py-1.5 text-sm text-white bg-[conic-gradient(from_252.02deg_at_54%_278.75%,_#152275_-193.01deg,_#E33B94_18.24deg,_#B61B6D_31.32deg,_#E33B94_55.63deg,_#152275_85.18deg,_#152275_94.34deg,_#144B8C_110.28deg,_#007BA7_130.18deg,_#007BA7_134.69deg,_#152275_166.99deg,_#E33B94_378.24deg),conic-gradient(from_103.86deg_at_-4.6%_50%,_#152275_0deg,_#152275_360deg)] rounded-md cursor-pointer"
                  onClick={addLayer}
                >
                  Add
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${
                    selectedLayerId === layer.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <input
                    type="checkbox"
                    checked={layer.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { enabled: e.target.checked });
                    }}
                    className="rounded"
                  />
                  <div
                    className="w-12 h-6 rounded border border-gray-300"
                    style={{
                      background: `${layer.type}-gradient(${
                        layer.from != null ? `from ${layer.from}deg ` : ""
                      }${
                        layer.at ? `at ${layer.at.x}% ${layer.at.y}%` : ""
                      }, ${layer.stops
                        .map((s) => `${s.color} ${formatNumber(s.pos)}deg`)
                        .join(", ")})`,
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}{" "}
                      Gradient
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.stops.length} stops
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLayer(layer.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Gradient Editor Panel */}
          {selectedLayer && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">
                  Edit{" "}
                  {selectedLayer.type.charAt(0).toUpperCase() +
                    selectedLayer.type.slice(1)}{" "}
                  Gradient
                </h3>
              </div>

              <div className="p-3 space-y-4">
                {/* Gradient Controls */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={selectedLayer.type}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          type: e.target.value as "conic" | "linear" | "radial",
                        })
                      }
                      className="w-full p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                      <option value="conic">Conic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Angle (°)
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.from}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          from: Number(e.target.value),
                        })
                      }
                      className="w-full p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Position X (%)
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.at.x}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          at: {
                            ...selectedLayer.at,
                            x: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Position Y (%)
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.at.y}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          at: {
                            ...selectedLayer.at,
                            y: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Full-Width Gradient Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Gradient Stops
                    </label>
                    <button
                      onClick={() => addStop(selectedLayer.id)}
                      className="px-3 py-1.5 text-sm text-white bg-[conic-gradient(from_252.02deg_at_54%_278.75%,_#152275_-193.01deg,_#E33B94_18.24deg,_#B61B6D_31.32deg,_#E33B94_55.63deg,_#152275_85.18deg,_#152275_94.34deg,_#144B8C_110.28deg,_#007BA7_130.18deg,_#007BA7_134.69deg,_#152275_166.99deg,_#E33B94_378.24deg),conic-gradient(from_103.86deg_at_-4.6%_50%,_#152275_0deg,_#152275_360deg)] rounded-md cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <GradientBar layer={selectedLayer} />
                </div>

                {/* Selected Stop Controls */}
                {selectedLayer.stops[selectedStopIndex] && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">
                      Stop {selectedStopIndex + 1} Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={selectedLayer.stops[selectedStopIndex].color}
                            onChange={(e) =>
                              updateStop(selectedLayer.id, selectedStopIndex, {
                                color: e.target.value,
                              })
                            }
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={selectedLayer.stops[selectedStopIndex].color}
                            onChange={(e) =>
                              updateStop(selectedLayer.id, selectedStopIndex, {
                                color: e.target.value,
                              })
                            }
                            className="flex-1 p-1.5 border border-gray-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Position (°)
                        </label>
                        <input
                          type="number"
                          value={selectedLayer.stops[selectedStopIndex].pos}
                          onChange={(e) =>
                            updateStop(selectedLayer.id, selectedStopIndex, {
                              pos: Number(e.target.value),
                            })
                          }
                          className="w-full p-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          step="0.1"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() =>
                            removeStop(selectedLayer.id, selectedStopIndex)
                          }
                          className="w-full px-2 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 cursor-pointer"
                        >
                          Remove Stop
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
