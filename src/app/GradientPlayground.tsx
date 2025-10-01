"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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

// Helper function to convert hex/rgb/rgba colors to rgba with specified opacity
function convertToRgba(color: string, opacity: number): string {
  // If already rgba, extract rgb part and apply new opacity
  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbaMatch) {
    const values = rgbaMatch[1].split(',').map(v => v.trim());
    if (values.length >= 3) {
      const r = values[0];
      const g = values[1]; 
      const b = values[2];
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    let r: number, g: number, b: number;
    
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return color; // fallback for invalid hex
    }
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // For other color formats, return as-is (fallback)
  return color;
}

// Helper function to convert any color format to hex for color picker
function colorToHex(color: string): string {
  // If already hex, return as-is
  if (color.startsWith('#')) {
    return color;
  }
  
  // Handle rgba/rgb colors
  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbaMatch) {
    const values = rgbaMatch[1].split(',').map(v => parseInt(v.trim()));
    if (values.length >= 3) {
      const r = Math.max(0, Math.min(255, values[0]));
      const g = Math.max(0, Math.min(255, values[1])); 
      const b = Math.max(0, Math.min(255, values[2]));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }
  
  // Fallback: return black
  return '#000000';
}

// Helper function to extract alpha from rgba color
function getColorAlpha(color: string): number {
  const rgbaMatch = color.match(/rgba\(([^)]+)\)/);
  if (rgbaMatch) {
    const values = rgbaMatch[1].split(',').map(v => v.trim());
    if (values.length >= 4) {
      return parseFloat(values[3]) || 1;
    }
  }
  return 1; // Default to fully opaque
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

// Hash-based state management functions
function encodeStateToHash(state: AppState): string {
  try {
    const compressed = JSON.stringify(state);
    return btoa(compressed);
  } catch (e) {
    console.error("Failed to encode state:", e);
    return "";
  }
}

function decodeStateFromHash(hash?: string): AppState | null {
  try {
    const hashValue = hash || window.location.hash;
    // Remove the # from the hash
    const stateParam = hashValue.replace('#', '');
    if (!stateParam) return null;

    const decoded = atob(stateParam);
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
    console.error("Failed to decode state from hash:", e);
    return null;
  }
}

export default function GradientPlayground() {
  // Initialize state from hash or defaults (only on first load)
  const [isInitialized, setIsInitialized] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [previewW, setPreviewW] = useState(300);
  const [previewH, setPreviewH] = useState(180);
  const [selectedLayerId, setSelectedLayerId] = useState(1);
  const [cssText, setCssText] = useState("");
  const [tailwindText, setTailwindText] = useState("");
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);
  const [isDraggingStop, setIsDraggingStop] = useState(false);
  const [previewContainerHeight, setPreviewContainerHeight] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromHashRef = useRef(false);
  
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Initialize from hash on first load only
  useEffect(() => {
    if (isInitialized) return;

    const hashState = decodeStateFromHash();
    if (hashState) {
      setLayers(hashState.layers);
      setPreviewW(hashState.previewW);
      setPreviewH(hashState.previewH);
      setSelectedLayerId(hashState.selectedLayerId);
    }
    setIsInitialized(true);
  }, [isInitialized]);

  // Listen for hash changes (for browser back/forward navigation)
  useEffect(() => {
    if (!isInitialized) return;

    const handleHashChange = () => {
      const hashState = decodeStateFromHash();
      if (hashState) {
        // Set flag to prevent hash update loop
        isUpdatingFromHashRef.current = true;
        
        // Update state to match hash without triggering another hash update
        setLayers(hashState.layers);
        setPreviewW(hashState.previewW);
        setPreviewH(hashState.previewH);
        setSelectedLayerId(hashState.selectedLayerId);
        
        // Reset flag after state updates
        setTimeout(() => {
          isUpdatingFromHashRef.current = false;
        }, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isInitialized]);

  // Function to update hash with current state (debounced)
  const updateHashWithState = useCallback((state: AppState) => {
    try {
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce hash updates to prevent too many history entries
      updateTimeoutRef.current = setTimeout(() => {
        const encoded = encodeStateToHash(state);
        
        // Use history.pushState to create history entries for undo/redo
        // This allows back/forward navigation while keeping the hash
        const newUrl = `${window.location.pathname}${window.location.search}#${encoded}`;
        history.pushState(null, '', newUrl);
      }, 300); // 300ms debounce for better responsiveness
    } catch (e) {
      console.error("Failed to update hash:", e);
    }
  }, []);

  // Update CSS when state changes
  useEffect(() => {
    if (!isInitialized) return;
    setCssText(generateCss());
    setTailwindText(generateTailwindCss());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, previewW, previewH, isInitialized]);

  // Update hash when state changes (but not during initial load or hash updates)
  useEffect(() => {
    if (!isInitialized || isUpdatingFromHashRef.current) return;

    const state: AppState = {
      layers,
      previewW,
      previewH,
      selectedLayerId,
    };

    updateHashWithState(state);
  }, [layers, previewW, previewH, selectedLayerId, isInitialized, updateHashWithState]);

  // Measure preview container height
  useEffect(() => {
    const measureHeight = () => {
      if (previewContainerRef.current) {
        const height = previewContainerRef.current.getBoundingClientRect().height;
        setPreviewContainerHeight(height);
      }
    };

    measureHeight();
    window.addEventListener('resize', measureHeight);

    return () => {
      window.removeEventListener('resize', measureHeight);
      // Cleanup timeout on unmount
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [previewW, previewH]);

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for undo/redo shortcuts
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      if (isMac) {
        // Mac: Cmd+Z for undo, Cmd+Shift+Z for redo
        if (e.metaKey && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            window.history.forward();
          } else {
            window.history.back();
          }
        }
        // Mac: Cmd+← for back, Cmd+→ for forward
        else if (e.metaKey && e.key === 'ArrowLeft') {
          e.preventDefault();
          window.history.back();
        }
        else if (e.metaKey && e.key === 'ArrowRight') {
          e.preventDefault();
          window.history.forward();
        }
      } else {
        // Windows/Linux: Ctrl+Z for undo, Ctrl+Y for redo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          window.history.back();
        }
        else if (e.ctrlKey && e.key === 'y') {
          e.preventDefault();
          window.history.forward();
        }
        // Windows/Linux: Alt+← for back, Alt+→ for forward
        else if (e.altKey && e.key === 'ArrowLeft') {
          e.preventDefault();
          window.history.back();
        }
        else if (e.altKey && e.key === 'ArrowRight') {
          e.preventDefault();
          window.history.forward();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function generateCss() {
    // Generate each layer CSS with opacity support
    const layerCss = layers
      .filter((L) => L.enabled)
      .map((L) => {
        const fromPart = L.from != null ? `from ${L.from}deg ` : "";
        const atPart = L.at ? `at ${L.at.x}% ${L.at.y}%` : "";
        
        // Convert colors to rgba if opacity is less than 1
        const stopList = L.stops
          .map((s) => {
            if (L.opacity < 1) {
              const color = convertToRgba(s.color, L.opacity);
              return `${color} ${formatNumber(s.pos)}deg`;
            }
            return `${s.color} ${formatNumber(s.pos)}deg`;
          })
          .join(", ");
        
        return `${L.type}-gradient(${fromPart}${atPart}, ${stopList})`;
      })
      .join(",\n");

    return `background: ${layerCss};`;
  }

  function generateTailwindCss() {
    // Generate Tailwind CSS class with opacity support
    const layerCss = layers
      .filter((L) => L.enabled)
      .map((L) => {
        const fromPart = L.from != null ? `from_${L.from}deg_` : "";
        const atPart = L.at ? `at_${L.at.x}%_${L.at.y}%` : "";
        
        // Convert colors to rgba if opacity is less than 1
        const stopList = L.stops
          .map((s) => {
            if (L.opacity < 1) {
              const color = convertToRgba(s.color, L.opacity);
              // Escape special characters for Tailwind
              const escapedColor = color.replace(/[(),\s]/g, '_');
              return `${escapedColor}_${formatNumber(s.pos)}deg`;
            }
            return `${s.color}_${formatNumber(s.pos)}deg`;
          })
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
      prev.map((L) => {
        if (L.id === layerId) {
          const newStops = [...L.stops, { color: "#ffffff", pos: 50 }];
          // Focus the newly created stop
          setSelectedStopIndex(newStops.length - 1);
          return { ...L, stops: newStops };
        }
        return L;
      })
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

  function moveLayerUp(id: number) {
    const currentIndex = layers.findIndex(l => l.id === id);
    if (currentIndex <= 0) return; // Already at top or not found
    
    const newLayers = [...layers];
    const temp = newLayers[currentIndex];
    newLayers[currentIndex] = newLayers[currentIndex - 1];
    newLayers[currentIndex - 1] = temp;
    setLayers(newLayers);
  }

  function moveLayerDown(id: number) {
    const currentIndex = layers.findIndex(l => l.id === id);
    if (currentIndex >= layers.length - 1 || currentIndex === -1) return; // Already at bottom or not found
    
    const newLayers = [...layers];
    const temp = newLayers[currentIndex];
    newLayers[currentIndex] = newLayers[currentIndex + 1];
    newLayers[currentIndex + 1] = temp;
    setLayers(newLayers);
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

        stops.push({ color, pos }, );
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
      const newStop = { color: "#ffffff", pos: newPos };
      const newStops = [...layer.stops, newStop];
      
      // Update the layer with the new stop
      updateLayer(layer.id, { stops: newStops });
      
      // Focus the newly created stop
      setSelectedStopIndex(newStops.length - 1);
    };

    const handleStopDrag = (
      index: number,
      e: React.MouseEvent<HTMLDivElement>
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedStopIndex(index);
      setIsDraggingStop(true);

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
        setIsDraggingStop(false);
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
              .map((s) => {
                if (layer.opacity < 1) {
                  const color = convertToRgba(s.color, layer.opacity);
                  return `${color} ${formatNumber(s.pos)}deg`;
                }
                return `${s.color} ${formatNumber(s.pos)}deg`;
              })
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
            <div className="text-xs text-gray-500 hidden sm:block">
              Undo/Redo: Cmd+Z/Cmd+Shift+Z (Mac) or Ctrl+Z/Ctrl+Y (Windows) • Browser back/forward also works
            </div>
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

      <div className="px-4 pt-4 max-w-7xl mx-auto">
        {/* Sticky Preview Section */}
        <div ref={previewContainerRef} className="bg-white rounded-lg shadow sticky top-0 z-50 mb-4">
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

            <div className="bg-gray-100 p-3 rounded-lg relative min-h-72 flex items-center justify-center">
              {/* Large gradient overlay when dragging stops */}
              {isDraggingStop && (
                <div 
                  className="absolute inset-0 pointer-events-none z-10 rounded-lg"
                  style={{
                    background: layers
                      .filter((L) => L.enabled)
                      .map((L) => {
                        const fromPart =
                          L.from != null ? `from ${L.from}deg ` : "";
                        
                        // Calculate the overlay container dimensions (full container minus padding)
                        const overlayContainer = document.querySelector('.bg-gray-100.p-3.rounded-lg');
                        
                        let atPart = "at 50% 50%"; // fallback
                        
                        if (overlayContainer && L.at) {
                          const overlayRect = overlayContainer.getBoundingClientRect();
                          
                          const overlayWidth = overlayRect.width;
                          const overlayHeight = overlayRect.height;
                          
                          // Calculate the relative position of the gradient center
                          // The preview is centered within the overlay container
                          const previewX = (overlayWidth - previewW) / 2;
                          const previewY = (overlayHeight - previewH) / 2;
                          
                          // Calculate where the gradient center should be in overlay coordinates
                          const gradientCenterX = previewX + (L.at.x / 100) * previewW;
                          const gradientCenterY = previewY + (L.at.y / 100) * previewH;
                          
                          // Convert to percentages of the overlay container
                          const overlayAtX = (gradientCenterX / overlayWidth) * 100;
                          const overlayAtY = (gradientCenterY / overlayHeight) * 100;
                          
                          atPart = `at ${overlayAtX.toFixed(2)}% ${overlayAtY.toFixed(2)}%`;
                        } else if (L.at) {
                          // Fallback: use the original at position if we can't calculate
                          atPart = `at ${L.at.x}% ${L.at.y}%`;
                        }
                        
                        const stopList = L.stops
                          .map((s) => {
                            if (L.opacity < 1) {
                              const color = convertToRgba(s.color, L.opacity);
                              return `${color} ${formatNumber(s.pos)}deg`;
                            }
                            return `${s.color} ${formatNumber(s.pos)}deg`;
                          })
                          .join(", ");
                        return `${L.type}-gradient(${fromPart}${atPart}, ${stopList})`;
                      })
                      .join(", "),
                    opacity: 0.7,
                  }}
                />
              )}
              
              <div
                className="rounded-lg shadow-inner border border-gray-200 overflow-hidden relative z-20"
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
                          .map((s) => {
                            if (L.opacity < 1) {
                              const color = convertToRgba(s.color, L.opacity);
                              return `${color} ${formatNumber(s.pos)}deg`;
                            }
                            return `${s.color} ${formatNumber(s.pos)}deg`;
                          })
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
        <div 
          className="space-y-4"
          style={{
            paddingBottom: previewContainerHeight > 0 
              ? `calc(100dvh - ${previewContainerHeight + 170}px)` 
              : '0px'
          }}
        >
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
              {layers.map((layer, index) => (
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
                        .map((s) => {
                          if (layer.opacity < 1) {
                            const color = convertToRgba(s.color, layer.opacity);
                            return `${color} ${formatNumber(s.pos)}deg`;
                          }
                          return `${s.color} ${formatNumber(s.pos)}deg`;
                        })
                        .join(", ")})`,
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}{" "}
                      Gradient
                    </div>
                    <div className="text-xs text-gray-500">
                      {layer.stops.length} stops • {Math.round(layer.opacity * 100)}% opacity
                    </div>
                  </div>
                  
                  {/* Layer Controls */}
                  <div className="flex items-center gap-1">
                    {/* Opacity Control */}
                    <div className="flex items-center gap-1">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={layer.opacity}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateLayer(layer.id, { opacity: parseFloat(e.target.value) });
                        }}
                        className="w-12 h-1"
                        title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(layer.opacity * 100)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const value = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                          updateLayer(layer.id, { opacity: value / 100 });
                        }}
                        className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
                        title="Opacity percentage"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                    
                    {/* Reorder Buttons */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayerUp(layer.id);
                      }}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayerDown(layer.id);
                      }}
                      disabled={index === layers.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                      title="Delete layer"
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Opacity (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round(selectedLayer.opacity * 100)}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, {
                          opacity: Math.max(0, Math.min(100, Number(e.target.value))) / 100,
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
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={colorToHex(selectedLayer.stops[selectedStopIndex].color)}
                              onChange={(e) => {
                                const currentColor = selectedLayer.stops[selectedStopIndex].color;
                                const alpha = getColorAlpha(currentColor);
                                
                                // If alpha is less than 1, convert to rgba
                                if (alpha < 1) {
                                  const hex = e.target.value;
                                  const r = parseInt(hex.slice(1, 3), 16);
                                  const g = parseInt(hex.slice(3, 5), 16);
                                  const b = parseInt(hex.slice(5, 7), 16);
                                  const newColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                                  updateStop(selectedLayer.id, selectedStopIndex, {
                                    color: newColor,
                                  });
                                } else {
                                  updateStop(selectedLayer.id, selectedStopIndex, {
                                    color: e.target.value,
                                  });
                                }
                              }}
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
                              placeholder="e.g. #ff0000, rgba(255,0,0,0.5)"
                            />
                          </div>
                          
                          {/* Alpha slider for rgba colors */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 w-12">Alpha:</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={getColorAlpha(selectedLayer.stops[selectedStopIndex].color)}
                              onChange={(e) => {
                                const currentColor = selectedLayer.stops[selectedStopIndex].color;
                                const alpha = parseFloat(e.target.value);
                                
                                // Convert to rgba format
                                const hex = colorToHex(currentColor);
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                
                                const newColor = alpha === 1 ? hex : `rgba(${r}, ${g}, ${b}, ${alpha})`;
                                updateStop(selectedLayer.id, selectedStopIndex, {
                                  color: newColor,
                                });
                              }}
                              className="flex-1 h-1"
                            />
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={Math.round(getColorAlpha(selectedLayer.stops[selectedStopIndex].color) * 100)}
                              onChange={(e) => {
                                const currentColor = selectedLayer.stops[selectedStopIndex].color;
                                const alpha = Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100;
                                
                                // Convert to rgba format
                                const hex = colorToHex(currentColor);
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                
                                const newColor = alpha === 1 ? hex : `rgba(${r}, ${g}, ${b}, ${alpha})`;
                                updateStop(selectedLayer.id, selectedStopIndex, {
                                  color: newColor,
                                });
                              }}
                              className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
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
