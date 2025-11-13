import { gql } from "apollo-server-express";

export const typeDefs = gql`
    scalar Upload
    scalar JSON

    type Point {
        id: ID!
        layer: String!
        properties: JSON
        geom: JSON!
    }

    type PointsLayer {
        layer: String!
        points: [Point!]!
    }

    type Query {
        getPoints: [Point!]!
        # getPolygons: JSON
        getPointsLayers: [PointsLayer!]!
    }

    type Mutation {
        initializeDB: String
        insertGeoJSON(file: Upload!): String
    }
`;
