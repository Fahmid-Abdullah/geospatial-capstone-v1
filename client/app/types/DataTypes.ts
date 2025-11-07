export type Point = {
    id: number;
    layer: string;
    properties : Record<string, any>,
    geom: {
        type: "Point" | "MultiPoint",
        coordinates: [number, number]
    }
    isVisible?: boolean
}

export type PointsLayer = {
    layer: string,
    isVisible?: boolean
    points: Point[]
}

export type Polygon = {
    id: number;
    name: string;
    layer: string;
    geom: string;
}