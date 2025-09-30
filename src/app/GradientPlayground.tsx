"use client";

import { useState, useEffect } from 'react';

// Type definitions
interface GradientStop {
  color: string;
  pos: number;
}

interface GradientLayer {
  id: number;
  type: 'conic' | 'linear' | 'radial';
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
    console.error('Failed to encode state:', e);
    return '';
  }
}

function decodeStateFromUrl(): AppState | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const hash = window.location.hash.slice(1); // Remove #
    if (!hash) return null;
    
    const decoded = atob(hash);
    const state = JSON.parse(decoded) as AppState;
    
    // Validate the state structure
    if (!state.layers || !Array.isArray(state.layers) || 
        typeof state.previewW !== 'number' || 
        typeof state.previewH !== 'number' ||
        typeof state.selectedLayerId !== 'number') {
      return null;
    }
    
    return state;
  } catch (e) {
    console.error('Failed to decode state from URL:', e);
    return null;
  }
}

function updateUrlWithState(state: AppState) {
  try {
    if (typeof window === 'undefined') return;
    
    const encoded = encodeStateToUrl(state);
    const newUrl = `${window.location.pathname}${window.location.search}#${encoded}`;
    
    // Use replaceState to avoid adding to browser history for every change
    window.history.replaceState(null, '', newUrl);
  } catch (e) {
    console.error('Failed to update URL:', e);
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
      selectedLayerId
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
    setLayers((prev) => prev.map((L) => (L.id === id ? { ...L, ...patch } : L)));
  }

  function updateStop(layerId: number, stopIdx: number, patch: Partial<GradientStop>) {
    setLayers((prev) =>
      prev.map((L) => {
        if (L.id !== layerId) return L;
        const stops = L.stops.map((s, i) => (i === stopIdx ? { ...s, ...patch } : s));
        return { ...L, stops };
      })
    );
  }

  function addStop(layerId: number) {
    setLayers((prev) =>
      prev.map((L) => (L.id === layerId ? { ...L, stops: [...L.stops, { color: "#ffffff", pos: 50 }] } : L))
    );
  }

  function removeStop(layerId: number, idx: number) {
    setLayers((prev) => prev.map((L) => (L.id === layerId ? { ...L, stops: L.stops.filter((_, i) => i !== idx) } : L)));
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
        stops: [ { color: "#ff0000", pos: 0 }, { color: "#0000ff", pos: 360 } ],
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
    const cleanCss = cssText.replace(/\s+/g, ' ').trim();
    
    // Try to extract from background property first
    const backgroundMatch = cleanCss.match(/background\s*:\s*([^;]+)/i);
    const gradientText = backgroundMatch ? backgroundMatch[1] : cleanCss;
    
    const gradientRegex = /(conic-gradient|linear-gradient|radial-gradient)\s*\([^)]+\)/gi;
    const matches = gradientText.match(gradientRegex);
    
    if (!matches) return [];

    return matches.map((match, index) => {
      const type = match.match(/^(conic|linear|radial)/i)?.[1].toLowerCase() as 'conic' | 'linear' | 'radial' || 'conic';
      
      // Extract parameters
      const paramsMatch = match.match(/\(([^)]+)\)/);
      if (!paramsMatch) return createDefaultLayer(Date.now() + index, type);
      
      const params = paramsMatch[1];
      
      // Parse stops - improved regex to handle various color formats
      const stopRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))\s*([0-9.-]+(?:deg|%|px)?)?/g;
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
          if (type === 'conic' && posStr.includes('%')) {
            pos = pos * 3.6; // 100% = 360deg
          } else if (type === 'conic' && !posStr.includes('deg')) {
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
        stops.push({ color: "#ff0000", pos: 0 }, { color: "#0000ff", pos: type === 'conic' ? 360 : 100 });
      } else if (stops.length === 1) {
        stops.push({ color: "#0000ff", pos: type === 'conic' ? 360 : 100 });
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

  function createDefaultLayer(id: number, type: 'conic' | 'linear' | 'radial'): GradientLayer {
    return {
      id,
      type,
      from: 0,
      at: { x: 50, y: 50 },
      stops: [{ color: "#ff0000", pos: 0 }, { color: "#0000ff", pos: 360 }],
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
      alert("No valid gradients found in the pasted CSS. Please paste CSS containing conic-gradient, linear-gradient, or radial-gradient.");
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

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];

  return (
    <div className="p-2 max-w-[1400px] mx-auto">
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Gradient Playground — Conic CSS Editor</h1>
        <div>
          <button
            className="px-2 py-1 rounded-md border mr-2 text-sm"
            onClick={() => {
              setLayers(DEFAULT_LAYERS);
              setPreviewW(300);
              setPreviewH(180);
              setSelectedLayerId(DEFAULT_LAYERS[0].id);
            }}
          >
            Reset example
          </button>
          <button
            className="px-2 py-1 rounded-md border mr-2 text-sm"
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
          <button className="px-2 py-1 rounded-md bg-slate-800 text-white text-sm" onClick={addLayer}>
            + Add layer
          </button>
        </div>
      </header>

      <main className="space-y-3">
        {/* Sticky Preview Section */}
        <div className="bg-white p-3 rounded-lg shadow sticky top-2 z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-sm">Preview</h2>
            <div className="text-xs text-slate-600">{previewW}px × {previewH}px</div>
          </div>

          <div className="p-2 border rounded" style={{ background: "#f8fafc" }}>
            <div
              className="mx-auto rounded shadow-inner overflow-hidden"
              style={{ width: previewW, height: previewH, transition: "all .15s" }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: layers
                    .filter((L) => L.enabled)
                    .map((L) => {
                      const fromPart = L.from != null ? `from ${L.from}deg ` : "";
                      const atPart = L.at ? `at ${L.at.x}% ${L.at.y}%` : "";
                      const stopList = L.stops.map((s) => `${s.color} ${formatNumber(s.pos)}deg`).join(", ");
                      return `${L.type}-gradient(${fromPart}${atPart}, ${stopList})`;
                    })
                    .join(", ") ,
                  opacity: 1,
                }}
              />
            </div>
          </div>

          <div className="flex gap-1 mt-2">
            <button className="px-2 py-1 border rounded text-xs" onClick={copyToClipboard}>
              Copy CSS
            </button>
            <button className="px-2 py-1 border rounded text-xs" onClick={copyTailwindToClipboard}>
              Copy Tailwind
            </button>
            <button
              className="px-2 py-1 border rounded text-xs"
              onClick={() => {
                const blob = new Blob([cssText], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "gradient.css";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </button>
            <button
              className="px-2 py-1 border rounded text-xs"
              onClick={() => {
                const full = `/* ${previewW}px × ${previewH}px */\n${cssText}`;
                navigator.clipboard.writeText(full).then(() => alert("CSS + size copied"), () => alert("Copy failed"));
              }}
            >
              Copy with size
            </button>
          </div>
        </div>

        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Preview Size */}
          <div className="bg-white p-3 rounded-lg shadow">
            <h2 className="font-medium mb-2 text-sm">Preview Size</h2>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <label className="text-xs w-12">Width</label>
                <input
                  type="range"
                  min={50}
                  max={1600}
                  value={previewW}
                  onChange={(e) => setPreviewW(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  className="w-16 px-1 border rounded text-xs"
                  value={previewW}
                  onChange={(e) => setPreviewW(Number(e.target.value || 0))}
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs w-12">Height</label>
                <input
                  type="range"
                  min={50}
                  max={1200}
                  value={previewH}
                  onChange={(e) => setPreviewH(Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  className="w-16 px-1 border rounded text-xs"
                  value={previewH}
                  onChange={(e) => setPreviewH(Number(e.target.value || 0))}
                />
              </div>
            </div>
          </div>

          {/* Paste CSS */}
          <div className="bg-white p-3 rounded-lg shadow">
            <h2 className="font-medium mb-2 text-sm">Paste CSS from Figma</h2>
            <div className="space-y-2">
              <textarea
                id="css-input"
                placeholder="Paste CSS containing gradient properties here..."
                rows={2}
                className="w-full p-2 border rounded text-xs"
                onPaste={(e) => {
                  setTimeout(() => {
                    const target = e.currentTarget;
                    if (target && target.value) {
                      const pastedText = target.value;
                      if (pastedText.trim()) {
                        handlePasteCss(pastedText);
                        target.value = '';
                      }
                    }
                  }, 10);
                }}
              />
              <div className="flex gap-1">
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => {
                    const textarea = document.getElementById('css-input') as HTMLTextAreaElement;
                    const cssText = textarea.value.trim();
                    if (cssText) {
                      handlePasteCss(cssText);
                      textarea.value = '';
                    } else {
                      alert('Please paste some CSS first');
                    }
                  }}
                >
                  Parse CSS
                </button>
                <button
                  className="px-2 py-1 border rounded text-xs"
                  onClick={() => {
                    const textarea = document.getElementById('css-input') as HTMLTextAreaElement;
                    textarea.value = '';
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Generated CSS & Tailwind */}
          <div className="bg-white p-3 rounded-lg shadow">
            <h2 className="font-medium mb-2 text-sm">Generated Code</h2>
            <div className="space-y-3">
              {/* CSS Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium">CSS</label>
                  <button
                    className="px-2 py-1 border rounded text-xs"
                    onClick={copyToClipboard}
                  >
                    Copy CSS
                  </button>
                </div>
                <textarea
                  readOnly
                  value={cssText}
                  rows={2}
                  className="w-full p-2 border rounded font-mono text-xs"
                />
              </div>
              
              {/* Tailwind Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium">Tailwind CSS</label>
                  <button
                    className="px-2 py-1 border rounded text-xs"
                    onClick={copyTailwindToClipboard}
                  >
                    Copy Tailwind
                  </button>
                </div>
                <textarea
                  readOnly
                  value={tailwindText}
                  rows={2}
                  className="w-full p-2 border rounded font-mono text-xs break-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Layers Section */}
        <div className="bg-white p-3 rounded-lg shadow">
          <h2 className="font-medium mb-2 text-sm">Layers</h2>
          <div className="space-y-1">
            {layers.map((L) => (
              <div key={L.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <input
                  type="radio"
                  name="selectedLayer"
                  checked={selectedLayerId === L.id}
                  onChange={() => setSelectedLayerId(L.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">Layer {L.id} — {L.type}</div>
                  <div className="text-xs text-slate-500 truncate">{L.stops.length} stops • from {L.from}° • at {L.at.x}% {L.at.y}%</div>
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={L.enabled}
                    onChange={(e) => updateLayer(L.id, { enabled: e.target.checked })}
                  />
                  enabled
                </label>
                <button
                  className="px-2 py-1 text-xs border rounded"
                  onClick={() => removeLayer(L.id)}
                  title="Remove layer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Layer Editor - Ultra Compact */}
        {selectedLayer && (
          <div className="bg-white p-3 rounded-lg shadow">
            <h2 className="font-medium mb-3 text-lg">Edit Layer {selectedLayer.id}</h2>
            
            {/* Layer Settings - Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              <label className="text-xs">Type
                <select
                  value={selectedLayer.type}
                  onChange={(e) => updateLayer(selectedLayer.id, { type: e.target.value as 'conic' | 'linear' | 'radial' })}
                  className="w-full mt-1 p-1 border rounded text-xs"
                >
                  <option value="conic">conic</option>
                  <option value="linear">linear</option>
                  <option value="radial">radial</option>
                </select>
              </label>
              <label className="text-xs">From (deg)
                <input
                  type="number"
                  value={selectedLayer.from}
                  onChange={(e) => updateLayer(selectedLayer.id, { from: Number(e.target.value) })}
                  className="w-full mt-1 p-1 border rounded text-xs"
                />
              </label>
              <label className="text-xs">At X (%)
                <input
                  type="number"
                  value={selectedLayer.at.x}
                  onChange={(e) => updateLayer(selectedLayer.id, { at: { ...selectedLayer.at, x: Number(e.target.value) } })}
                  className="w-full mt-1 p-1 border rounded text-xs"
                />
              </label>
              <label className="text-xs">At Y (%)
                <input
                  type="number"
                  value={selectedLayer.at.y}
                  onChange={(e) => updateLayer(selectedLayer.id, { at: { ...selectedLayer.at, y: Number(e.target.value) } })}
                  className="w-full mt-1 p-1 border rounded text-xs"
                />
              </label>
              <label className="text-xs">Opacity
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={selectedLayer.opacity}
                  onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                  className="w-full mt-1 p-1 border rounded text-xs"
                />
              </label>
              <div className="flex items-end gap-1">
                <button className="px-2 py-1 border rounded text-xs flex-1" onClick={() => addStop(selectedLayer.id)}>
                  + Stop
                </button>
                <button
                  className="px-2 py-1 border rounded text-xs flex-1"
                  onClick={() => {
                    updateLayer(selectedLayer.id, {
                      stops: [...selectedLayer.stops].sort((a, b) => Number(a.pos) - Number(b.pos)),
                    });
                  }}
                >
                  Sort
                </button>
              </div>
            </div>

            {/* Ultra Compact Stops Section */}
            <div>
              <h3 className="font-medium text-sm mb-2">Color Stops ({selectedLayer.stops.length})</h3>
              
              <div className="space-y-1">
                {selectedLayer.stops.map((s, i) => (
                  <div key={i} className="bg-gray-50 p-2 rounded flex items-center gap-2">
                    <span className="text-xs font-mono w-8 text-center">{i + 1}</span>
                    <input
                      type="color"
                      value={s.color}
                      onChange={(e) => updateStop(selectedLayer.id, i, { color: e.target.value })}
                      className="w-8 h-8 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={s.color}
                      onChange={(e) => updateStop(selectedLayer.id, i, { color: e.target.value })}
                      className="w-20 px-2 py-1 border rounded text-xs font-mono"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={-360}
                        max={720}
                        step={0.1}
                        value={s.pos}
                        onChange={(e) => updateStop(selectedLayer.id, i, { pos: Number(e.target.value) })}
                        className="flex-1 h-1"
                      />
                      <input
                        type="number"
                        value={s.pos}
                        onChange={(e) => updateStop(selectedLayer.id, i, { pos: Number(e.target.value) })}
                        className="w-16 px-1 py-1 border rounded text-xs"
                        step="0.1"
                      />
                      <span className="text-xs text-gray-500 w-6">°</span>
                    </div>
                    <button
                      className="px-2 py-1 border rounded text-xs text-red-600 hover:bg-red-50"
                      onClick={() => removeStop(selectedLayer.id, i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-white p-3 rounded-lg shadow">
          <h2 className="font-medium mb-2 text-sm">Quick tips</h2>
          <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">
            <li>Each color stop is now displayed in a single compact row with all controls.</li>
            <li>Click &quot;Add layer&quot; to add more gradients stacked on top of each other.</li>
            <li>The preview updates in real-time as you edit the selected layer.</li>
            <li>Paste CSS from Figma or other design tools to quickly import gradients.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}