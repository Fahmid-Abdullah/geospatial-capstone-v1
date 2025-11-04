"use client";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { getPointsLayers } from "../actions/getActions";
import { Point, PointsLayer, Polygon } from "../types/DataTypes";
import L, { Icon } from "leaflet";
import { Feature, Point as GeoPoint } from "geojson";

export default function MapComponent() {
  const [isClient, setIsClient] = useState(false);
  const [pointsLayers, setPointsLayers] = useState<PointsLayer[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const loadPoints = async () => {
        try {
            const data = await getPointsLayers();
            setPointsLayers(data);
            
            const addToggle = data.map((obj: PointsLayer) => ({
                ...obj,
                isVisible: true,
                points: obj.points.map(point => ({
                    ...point,
                    isVisible: true
                }))
            }));

            setPointsLayers(addToggle);
        } catch (err) {
            console.error(err);
        }
    }
    
    loadPoints();
  }, [isClient]);

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
                {pointsLayers.map(layer => (
                    layer.isVisible && layer.points.map(point => {
                        const feature: Feature<GeoPoint> = {
                            type: "Feature",
                            geometry: {
                                type: "Point",
                                coordinates: point.geom.coordinates,
                            },
                            properties: { 
                                name: point.name, 
                                layer: point.layer,
                            },
                        };

                        return (
                            <div key={point.id}>
                                { point.isVisible && <GeoJSON 
                                        data={feature}
                                        pointToLayer={pointToLayer}
                                        onEachFeature={(feature, layer) => {
                                            layer.bindPopup(`
                                                <p>${point.layer}: ${point.name}</p>   
                                            `)
                                        }} 
                                    />
                                }
                            </div>
                        );
                    })
                ))}

            </MapContainer>
        )}
        </div>

        {/* Sidebar */}
        <div className="col-span-1 bg-white p-4 overflow-y-auto h-full border-l border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Layers</h2>
        <div className="flex flex-col gap-4">
            {pointsLayers.map(layer => (
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
                                            p.name === point.name
                                                ? { ...p, isVisible: !p.isVisible }
                                                : p
                                        )
                                    }))
                                )}
                                className="w-4 h-4 accent-blue-500"
                            />
                            <span>{point.name}</span>
                        </label>
                    </div>
                ))}
                </div>
            </div>
            ))}
        </div>
        </div>
    </div>
  );
}
