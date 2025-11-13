import pool from "../lib/pool.js";
import { GraphQLUpload } from "../types/FileUpload.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OLD getPoints
        // getPoints: async () => {
        //     const { rows } = await pool.query(`
        //     SELECT json_build_object(
        //         'type', 'FeatureCollection',
        //         'features', json_agg(
        //         json_build_object(
        //             'type', 'Feature',
        //             'geometry', ST_AsGeoJSON(geom)::json,
        //             'properties', json_build_object(
        //             'id', id,
        //             'name', name,
        //             'layer', layer
        //             )
        //         )
        //         )
        //     ) AS geojson
        //     FROM points;
        //     `);

        //     // Return the single GeoJSON object
        //     return rows[0].geojson;
        // }

export const resolvers = {
    Query: {
        getPoints: async () => {
            const { rows: points } = await pool.query(`
                SELECT id, layer, properties::JSONB, ST_AsGeoJSON(geom)::json AS geom FROM points;
            `);

            return points;
        },

        getPointsLayers: async () => {
            const { rows: layers } = await pool.query(`
            SELECT DISTINCT layer FROM points;
            `);

            const { rows: points } = await pool.query(`
            SELECT id, layer, properties::JSONB, ST_AsGeoJSON(geom)::json AS geom FROM points;
            `);

            const grouped  = layers.map(l => ({
                layer: l.layer,
                points: points.filter(p => p.layer === l.layer)
            }));

            return grouped;
        }
    },

    Mutation: {
        initializeDB: async () => {
            // Ensure PostGIS and tables exist
            await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS points (
                    id SERIAL PRIMARY KEY,
                    layer TEXT,
                    properties JSONB,
                    geom GEOMETRY(Geometry, 4326)
                );

                CREATE TABLE IF NOT EXISTS polygons (
                    id SERIAL PRIMARY KEY,
                    layer TEXT,
                    properties JSONB,
                    geom GEOMETRY(Polygon, 4326)
                );
            `);

            // Insert demo data only if not already there
            // await pool.query(`
            //     INSERT INTO points (name, layer, geom)
            //     VALUES
            //         ('Toronto', 'example_group1', ST_SetSRID(ST_MakePoint(-79.38318, 43.65323), 4326)),
            //         ('Montreal', 'example_group1', ST_SetSRID(ST_MakePoint(-73.5673, 45.5017), 4326)),
            //         ('Vancouver', 'example_group1', ST_SetSRID(ST_MakePoint(-123.1207, 49.2827), 4326)),
            //         ('Calgary', 'example_group2', ST_SetSRID(ST_MakePoint(-114.0719, 51.0447), 4326)),
            //         ('Ottawa', 'example_group2', ST_SetSRID(ST_MakePoint(-75.6972, 45.4215), 4326)),
            //         ('Edmonton', 'example_group2', ST_SetSRID(ST_MakePoint(-113.4909, 53.5444), 4326)),
            //         ('Quebec City', 'example_group2', ST_SetSRID(ST_MakePoint(-71.2082, 46.8139), 4326))
            //     ON CONFLICT (name) DO NOTHING;
            // `);

            // Verify tables exist
            const { rows } = await pool.query(`
                SELECT 
                    (to_regclass('public.points') IS NOT NULL) AS points_exists,
                    (to_regclass('public.polygons') IS NOT NULL) AS polygons_exists;
            `);

            const { points_exists, polygons_exists } = rows[0];

            if (points_exists && polygons_exists) {
                return JSON.stringify({ message: "✅ Points and Polygons tables are ready." });
            } else {
                return JSON.stringify({ message: "⚠️ Could not verify Points/Polygons tables." });
            }
        },

        insertGeoJSON: async (_: any, { file }: { file: Promise<GraphQLUpload> }) => {
            // await the Promise<Upload> to get the actual FileUpload
            const { createReadStream, filename } = await (await file).promise;

            if (!filename) throw new Error("Filename is missing!");

            const uploadsDir = path.join(__dirname, "../../uploads");

            // Ensure uploads folder exists
            fs.mkdirSync(uploadsDir, { recursive: true });

            const uploadPath = path.join(uploadsDir, filename);
            const stream = createReadStream();

            // Save file to uploads folder
            await new Promise<void>((resolve, reject) => {
                const out = fs.createWriteStream(uploadPath);
                stream.pipe(out);
                out.on("finish", resolve);
                out.on("error", reject);
            });

            const geojson = JSON.parse(fs.readFileSync(uploadPath, "utf8"));
            const features = geojson.type === "FeatureCollection" ? geojson.features : [geojson];

            for (const feature of features) {
                const { geometry, properties } = feature;
                if (!geometry) continue;

                if (geometry.type === "Point") {
                    await pool.query(`
                        INSERT INTO points (layer, properties, geom)
                        VALUES ($1, $2::jsonb, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))`,
                        [filename, properties, JSON.stringify(geometry)]
                    );
                } else if (geometry.type === "MultiPoint") {
                    for (const coords of geometry.coordinates) {
                        const pointGeom = { type: "Point", coordinates: coords };
                        await pool.query(`
                            INSERT INTO points (layer, properties, geom)
                            VALUES ($1, $2::jsonb, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))`,
                            [filename, properties, JSON.stringify(pointGeom)]
                        );
                    }
                } else {
                    console.log("Invalid feature type:", feature);
                }
            }

            await fs.promises.unlink(uploadPath);
            return "GeoJSON uploaded!";
        }

    }
}