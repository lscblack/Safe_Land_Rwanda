async function getNearbyInfrastructure(lat:any, lng:any) {
  const radius = 1000; // meters

  const query = `
  [out:json];
  (
    node(around:${radius},${lat},${lng})["amenity"];
    node(around:${radius},${lat},${lng})["highway"];
    node(around:${radius},${lat},${lng})["shop"];
    node(around:${radius},${lat},${lng})["public_transport"];
  );
  out body;
  `;

  const url = "https://overpass-api.de/api/interpreter";

  const res = await fetch(url, {
    method: "POST",
    body: query
  });

  const data = await res.json();

  return data.elements;
}

export default getNearbyInfrastructure;
