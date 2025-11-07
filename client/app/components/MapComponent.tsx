"use client";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ChangeEvent, useEffect, useState } from "react";
import { getPointsLayers } from "../actions/getActions";
import { Point, PointsLayer, Polygon } from "../types/DataTypes";
import L, { Icon, LatLngExpression } from "leaflet";
import { Feature, FeatureCollection, Geometry, Point as GeoPoint } from "geojson";
import insertGeoJSON from "../actions/setActions";

function truncateProperties(obj: any, maxLength = 50) {
  const truncated: any = {};

  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string") {
      truncated[key] = value.length > maxLength ? value.slice(0, maxLength) + "..." : value;
    } else if (typeof value === "object" && value !== null) {
      truncated[key] = truncateProperties(value, maxLength);
    } else {
      truncated[key] = value;
    }
  }

  return truncated;
}

type FitBoundsOnDataProps = {
  pointsLayers: PointsLayer[];
};

export function FitBoundsOnData({ pointsLayers }: FitBoundsOnDataProps) {
  const map = useMap();

  useEffect(() => {
    if (!pointsLayers || pointsLayers.length === 0) return;

    try {
      const coords: LatLngExpression[] = [];

      // Collect coordinates of all visible points
      pointsLayers.forEach(layer => {
        if (!layer.isVisible) return;
        layer.points.forEach(point => {
          if (point.isVisible && point.geom?.coordinates) {
            const [lng, lat] = point.geom.coordinates;
            coords.push([lat, lng]); // Leaflet expects [lat, lng]
          }
        });
      });

      if (coords.length === 0) return;

      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [30, 30] });
    } catch (err) {
      console.error("Could not fit bounds:", err);
    }
  }, [pointsLayers, map]);

  return null;
}

export default function MapComponent() {
  const [isClient, setIsClient] = useState(false);
  const [pointsLayers, setPointsLayers] = useState<PointsLayer[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

    const loadPointsLayers = async () => {
    try {
        const data = await getPointsLayers();

        if (!data || !Array.isArray(data)) {
        console.warn("No points layers returned from API");
        setPointsLayers([]);
        return;
        }

        const updated = data.map(layer => {
        const existingLayer = pointsLayers.find(l => l.layer === layer.layer);
        return {
            ...layer,
            isVisible: existingLayer?.isVisible ?? true,
            points: (layer.points ?? []).map((point: { id: number; }) => {
            const existingPoint = existingLayer?.points?.find(p => p.id === point.id);
            return { ...point, isVisible: existingPoint?.isVisible ?? true };
            }),
        };
        });

        setPointsLayers(updated);
    } catch (err) {
        console.error(err);
        setPointsLayers([]);
    }
    };


  useEffect(() => {
    loadPointsLayers();
    console.log("Layers loaded on load.");
  }, [isClient]);

    const updateLayers = async (e: ChangeEvent<HTMLInputElement>) => {
    const success = await insertGeoJSON({ e, loadPointsLayers });
    if (success) {
        console.log("Layers updated after upload");
    }
    };

  const customIcon = new Icon({
    iconUrl: "/pin.png",
    iconSize: [38, 38],
  });

  const pointToLayer = (_feature: any, latlng: L.LatLngExpression) =>
    L.marker(latlng, { icon: customIcon });

  return (
    <div className="h-screen w-screen grid grid-cols-5 text-black">
        
        {/* Map */}
        <div className="col-span-4 h-full">
        {isClient && (
            <MapContainer
            center={[50.847573, -96.108398]}
            zoom={5}
            style={{ width: "100%", height: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                // Mapping points
                {pointsLayers && pointsLayers.map(layer => (
                    layer.isVisible && layer.points.map(point => {
                        const feature: Feature<GeoPoint> = {
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: point.geom.coordinates,
                            },
                            properties: { 
                                ...point.properties
                            },
                        };

                        return (
                            <div key={point.id}>
                                { point.isVisible && <GeoJSON 
                                        data={feature}
                                        pointToLayer={pointToLayer}
                                        onEachFeature={(feature, layer) => {
                                            layer.bindPopup(
                                            `<pre style="max-height:200px; overflow:auto;">${JSON.stringify(point.properties, null, 2)}</pre>`
                                            );
                                        }} 
                                    />
                                }
                            </div>
                        );
                    })
                ))}

                <FitBoundsOnData pointsLayers={pointsLayers} />

            </MapContainer>
        )}
        </div>

        {/* Sidebar */}
        <div className="col-span-1 bg-white p-4 overflow-y-auto h-full border-l border-gray-200">
        
        <label>
            Upload GeoJSON:
            <input 
                type="file"
                accept=".geojson,application/geo+json"
                onChange={(e) => updateLayers(e)}
                className="p-2 border rounded-md bg-blue-500 text-white"
            />
        </label>

        <h2 className="mt-8 text-lg font-semibold mb-4">Layers</h2>
        <div className="flex flex-col gap-4">
            {pointsLayers.length > 0 ? (pointsLayers.map(layer => (
            <div key={layer.layer} className="flex flex-col">
                <label className="flex items-center gap-2 text-black font-medium mb-1 cursor-pointer">
                <input
                    type="checkbox"
                    checked={layer.isVisible}
                    onChange={() =>
                    setPointsLayers(prevLayers =>
                        prevLayers.map(l =>
                        l.layer === layer.layer
                            ? { ...l, isVisible: !l.isVisible }
                            : l
                        )
                    )}
                    className="w-4 h-4 accent-blue-500"
                />
                <span>{layer.layer}</span>
                </label>

                <div className="ml-6 flex flex-col gap-1">
                {layer.points.map(point => (
                    <div key={point.id}>
                        <label className="flex items-center gap-2 text-black font-medium mb-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={point.isVisible}
                                onChange={() =>
                                setPointsLayers(prevLayers =>
                                    prevLayers.map(l => ({
                                        ...l,
                                        points: l.points.map(p => 
                                            p.id === point.id
                                                ? { ...p, isVisible: !p.isVisible }
                                                : p
                                        )
                                    }))
                                )}
                                className="w-4 h-4 accent-blue-500"
                            />
                            <span>{point.id}</span>
                        </label>
                    </div>
                ))}
                </div>
            </div>
            ))) : (
                <div className="text-black text-sm">
                    No layers found. Please upload a geojson file.
                </div>
            )}
        </div>
        </div>
    </div>
  );
}
