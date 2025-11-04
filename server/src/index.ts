import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "../graphql/schema";
import { resolvers } from "../graphql/resolvers";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers
    });

    await server.start();

    server.applyMiddleware({ app, path: "/graphql" })

    // Initialize the DB before the server starts listening
    try {
        console.log("Initializing database...");
        await resolvers.Mutation.initializeDB();
        console.log("Database initialized successfully.");
    } catch (err) {
        console.error("Database initialization failed:", err);
        process.exit(1); // stop startup if DB setup fails
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    });
}

startServer().catch((err) => console.log(err));
