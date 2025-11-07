import { ChangeEvent } from "react";
import { Feature, Geometry } from "geojson";

// Future function 
// function logFeatureElements(obj: Record<string, any>, prefix = "") {
//   for (const [key, value] of Object.entries(obj)) {
//     const fullKey = prefix ? `${prefix}.${key}` : key;

//     if (value && typeof value === "object" && !Array.isArray(value)) {
//       logFeatureElements(value, fullKey); // Adds prefix if goes deeper into an object
//     } else if (Array.isArray(value)) {
//       console.log(`${fullKey}: [${value.map(v => JSON.stringify(v)).join(", ")}]`);
//     } else {
//       console.log(`${fullKey}: ${value}`);
//     }
//   }
// }

// Promise<Feature<Geometry> | undefined>

type InsertGeoJSONProps = {
  e: ChangeEvent<HTMLInputElement>;
  loadPointsLayers: () => Promise<void>;
}

export default async function insertGeoJSON({
  e,
  loadPointsLayers,
}: InsertGeoJSONProps) {
  const file = e.target.files?.[0];
  if (!file) {
    console.warn("No file selected.");
    return false;
  }

  console.log("File uploaded successfully:", file.name);

  try {
    // Optional: validate GeoJSON client-side
    const text = await file.text();
    const geojson = JSON.parse(text);

    if (
      geojson.type !== "FeatureCollection" &&
      geojson.type !== "Feature"
    ) {
      console.error("Invalid GeoJSON format.");
      return false;
    }

    // Prepare GraphQL multipart/form-data request
    const formData = new FormData();
    formData.append(
      "operations",
      JSON.stringify({
        query: `
          mutation InsertGeoJSON($file: Upload!) {
            insertGeoJSON(file: $file)
          }
        `,
        variables: { file: null },
      })
    );
    formData.append(
      "map",
      JSON.stringify({ "0": ["variables.file"] })
    );
    formData.append("0", file);


    const res = await fetch("http://localhost:4000/graphql", {
      method: "POST",
      body: formData,
    });

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
      return false;
    }

    console.log("GeoJSON uploaded successfully!");
    await loadPointsLayers(); // refresh layers on map

    return true;
  } catch (err) {
    console.error("Error processing GeoJSON:", err);
    return false;
  }
}