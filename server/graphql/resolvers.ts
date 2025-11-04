import pool from "../lib/pool";

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
                SELECT id, name, layer, ST_AsGeoJSON(geom)::json AS geom FROM points;
            `);

            return points;
        },

        getPointsLayers: async () => {
            const { rows: layers } = await pool.query(`
            SELECT DISTINCT layer FROM points;
            `);

            const { rows: points } = await pool.query(`
            SELECT id, name, layer, ST_AsGeoJSON(geom)::json AS geom FROM points;
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
                    name TEXT UNIQUE,
                    layer TEXT,
                    geom GEOMETRY(Point, 4326)
                );

                CREATE TABLE IF NOT EXISTS polygons (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    layer TEXT,
                    geom GEOMETRY(Polygon, 4326)
                );
            `);

            // Insert demo data only if not already there
            await pool.query(`
                INSERT INTO points (name, layer, geom)
                VALUES
                    ('Toronto', 'example_group1', ST_SetSRID(ST_MakePoint(-79.38318, 43.65323), 4326)),
                    ('Montreal', 'example_group1', ST_SetSRID(ST_MakePoint(-73.5673, 45.5017), 4326)),
                    ('Vancouver', 'example_group1', ST_SetSRID(ST_MakePoint(-123.1207, 49.2827), 4326)),
                    ('Calgary', 'example_group2', ST_SetSRID(ST_MakePoint(-114.0719, 51.0447), 4326)),
                    ('Ottawa', 'example_group2', ST_SetSRID(ST_MakePoint(-75.6972, 45.4215), 4326)),
                    ('Edmonton', 'example_group2', ST_SetSRID(ST_MakePoint(-113.4909, 53.5444), 4326)),
                    ('Quebec City', 'example_group2', ST_SetSRID(ST_MakePoint(-71.2082, 46.8139), 4326))
                ON CONFLICT (name) DO NOTHING;
            `);

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
        }
    }
}