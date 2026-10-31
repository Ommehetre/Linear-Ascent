"use client";

import React, { useState } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  Source,
  Layer,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FarmLocation, SentinelScene } from "@/types";
import { FARM_PRESETS, BHUVAN_LULC_LAYERS } from "@/lib/constants";
import { Layers, MapPin, Eye } from "lucide-react";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface TerraPulseMapProps {
  selectedLocation: FarmLocation;
  onLocationChange: (loc: FarmLocation) => void;
  scenes: SentinelScene[];
  showBhuvanLayer: boolean;
  onToggleBhuvan: (val: boolean) => void;
}

export default function TerraPulseMap({
  selectedLocation,
  onLocationChange,
  scenes,
  showBhuvanLayer,
  onToggleBhuvan,
}: TerraPulseMapProps) {
  const [viewState, setViewState] = useState({
    longitude: selectedLocation.lon,
    latitude: selectedLocation.lat,
    zoom: 7.5,
  });

  const [activePopup, setActivePopup] = useState<SentinelScene | null>(null);

  // Sync viewstate when selectedLocation changes
  React.useEffect(() => {
    setViewState((prev) => ({
      ...prev,
      longitude: selectedLocation.lon,
      latitude: selectedLocation.lat,
    }));
  }, [selectedLocation.lat, selectedLocation.lon]);

  // Handle map click for custom coordinate selection
  const handleMapClick = (e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;
    onLocationChange({
      name: `Farm Point (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
      lat: Number(lat.toFixed(4)),
      lon: Number(lng.toFixed(4)),
      bbox: [
        Number((lng - 0.15).toFixed(4)),
        Number((lat - 0.15).toFixed(4)),
        Number((lng + 0.15).toFixed(4)),
        Number((lat + 0.15).toFixed(4)),
      ],
      state: selectedLocation.state,
      crop: selectedLocation.crop,
    });
  };

  const bhuvanLayerCode =
    BHUVAN_LULC_LAYERS[selectedLocation.state] || BHUVAN_LULC_LAYERS["Default"];

  return (
    <div className="relative w-full h-[520px] overflow-hidden border border-[#2a2a2a] bg-[#121212] rounded-none">
      {/* Top Map Toolbar Controls - Solid Opaque Surfaces */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#1a1a1a] p-1.5 border border-[#2a2a2a] rounded-none">
        <button
          type="button"
          onClick={() => onToggleBhuvan(!showBhuvanLayer)}
          className={`flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 transition-colors rounded-none ${
            showBhuvanLayer
              ? "bg-[#9CAF88] text-[#121212] font-bold"
              : "bg-[#121212] text-[#A7A7A7] hover:text-[#F4F4F4] border border-[#2a2a2a]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>ISRO Bhuvan LULC {showBhuvanLayer ? "[Active]" : "[Off]"}</span>
        </button>

        {scenes[0] && (
          <button
            type="button"
            onClick={() => setActivePopup(scenes[0])}
            className="flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 bg-[#121212] text-[#A7A7A7] hover:text-[#9CAF88] border border-[#2a2a2a] transition-colors rounded-none"
          >
            <Eye className="w-3.5 h-3.5 text-[#9CAF88]" />
            <span>Scene Details</span>
          </button>
        )}
      </div>

      {/* Coordinate Chip */}
      <div className="absolute top-3 right-14 z-10 bg-[#1a1a1a] px-3 py-1.5 border border-[#2a2a2a] text-[11px] font-mono text-[#A7A7A7] rounded-none">
        {selectedLocation.lat.toFixed(3)}°N, {selectedLocation.lon.toFixed(3)}°E
      </div>

      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        cursor="crosshair"
      >
        <NavigationControl position="top-right" />

        {/* ISRO Bhuvan LULC WMS Raster Layer */}
        {showBhuvanLayer && (
          <Source
            id="bhuvan-wms-source"
            type="raster"
            tiles={[
              `/api/proxy/bhuvan?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${bhuvanLayerCode}&STYLES=&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&FORMAT=image/png&BBOX={bbox-epsg-3857}`,
            ]}
            tileSize={256}
          >
            <Layer
              id="bhuvan-wms-layer"
              type="raster"
              paint={{ "raster-opacity": 0.65 }}
            />
          </Source>
        )}

        {/* Preset Farm Location Markers */}
        {FARM_PRESETS.map((preset) => {
          const isSelected =
            Math.abs(preset.lat - selectedLocation.lat) < 0.01 &&
            Math.abs(preset.lon - selectedLocation.lon) < 0.01;

          return (
            <Marker
              key={preset.name}
              longitude={preset.lon}
              latitude={preset.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onLocationChange(preset);
              }}
            >
              <div className="group relative cursor-pointer flex flex-col items-center">
                <div
                  className={`w-7 h-7 flex items-center justify-center transition-colors rounded-none ${
                    isSelected
                      ? "bg-[#9CAF88] text-[#121212] border-2 border-[#121212]"
                      : "bg-[#1a1a1a] text-[#9CAF88] border border-[#2a2a2a] hover:border-[#9CAF88]"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-medium bg-[#121212] text-[#E6E6E6] px-1.5 py-0.5 border border-[#2a2a2a] mt-1 whitespace-nowrap rounded-none">
                  {preset.name.split(" ")[0]}
                </span>
              </div>
            </Marker>
          );
        })}

        {/* Selected Location Target Pin (if custom coordinate clicked) */}
        {!FARM_PRESETS.some(
          (p) =>
            Math.abs(p.lat - selectedLocation.lat) < 0.01 &&
            Math.abs(p.lon - selectedLocation.lon) < 0.01
        ) && (
          <Marker
            longitude={selectedLocation.lon}
            latitude={selectedLocation.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 bg-[#CC5500] text-[#121212] border-2 border-[#121212] flex items-center justify-center rounded-none">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-medium bg-[#121212] text-[#CC5500] px-1.5 py-0.5 border border-[#CC5500] mt-1 rounded-none">
                Custom Point
              </span>
            </div>
          </Marker>
        )}

        {/* Sentinel-2 Scene Popup */}
        {activePopup && (
          <Popup
            longitude={selectedLocation.lon}
            latitude={selectedLocation.lat}
            anchor="top"
            onClose={() => setActivePopup(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-2 text-[#E6E6E6] max-w-xs font-mono text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#2a2a2a] mb-2">
                <span className="font-bold text-[#9CAF88] text-[11px] uppercase">
                  Sentinel-2 L2A Asset
                </span>
                <span className="text-[10px] bg-[#242A20] text-[#9CAF88] border border-[#9CAF88] px-1.5 py-0.2 rounded-none">
                  {activePopup.cloudCover.toFixed(1)}% Cloud
                </span>
              </div>
              {activePopup.thumbnailHref && (
                <img
                  src={activePopup.thumbnailHref}
                  alt="Sentinel-2 Optical Preview"
                  className="w-full h-32 object-cover border border-[#2a2a2a] mb-2 rounded-none"
                />
              )}
              <div className="text-[10px] space-y-1 text-[#A7A7A7]">
                <p className="truncate">
                  <span className="text-[#F4F4F4]">ID:</span> {activePopup.id}
                </p>
                <p>
                  <span className="text-[#F4F4F4]">Acquired:</span> {activePopup.datetime.replace("T", " ").slice(0, 19)} UTC
                </p>
                <p className="text-[#707070] pt-1 border-t border-[#262626]">
                  Spectral bands Red (B04) and NIR (B08) verified active.
                </p>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
