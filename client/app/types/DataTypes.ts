export type Point = {
    id: number;
    name: string;
    layer: string;
    geom: {
        type: string,
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