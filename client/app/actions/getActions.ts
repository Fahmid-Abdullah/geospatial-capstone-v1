"use server"

export async function getPointsLayers() {
  try {
    const res = await fetch("http://localhost:4000/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
            query GetPointsLayers {
            getPointsLayers {
                layer
                points {
                id
                name
                layer
                geom
                }
            }
            }
        `
      })
    });

    if (!res.ok) {
      throw new Error(`Network response was not ok: ${res.statusText}`);
    }

    const data = await res.json();
    return data.data.getPointsLayers;
  } catch (err) {
    console.error("Failed to fetch points:", err);
    return null;
  }
}
