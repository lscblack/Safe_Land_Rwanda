
// import parse from "wellknown";
// import { MapContainer, TileLayer, Polygon } from "react-leaflet";
// import "leaflet/dist/leaflet.css";

// export default function App() {
//   // WKT from DB
//   const wktString =
//     "POLYGON((30.1 -1.9, 30.2 -1.9, 30.2 -2.0, 30.1 -1.9))";

//   // Convert WKT → GeoJSON
//   const geoJson = parse(wktString);

//   // Convert [lng, lat] → [lat, lng] for Leaflet
//   const positions = geoJson.coordinates[0].map(
//     ([lng, lat]) => [lat, lng]
//   );

//   return (
//     <MapContainer
//       center={[-1.95, 30.15]}
//       zoom={13}
//       style={{ height: "500px", width: "100%" }}
//     >
//       <TileLayer
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />

//       <Polygon positions={positions} pathOptions={{ color: "blue" }} />
//     </MapContainer>
//   );
// }

// // 3. Render it