import { gql } from "apollo-server-express";
import GraphQLJSON from 'graphql-type-json';

export const typeDefs = gql`
    scalar JSON

    type Point {
        id: ID!
        name: String!
        layer: String!
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
    }
`;
