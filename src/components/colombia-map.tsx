import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Icono personalizado para Leaflet usando divIcon (evita problemas de assets de Vite)
const pinIcon = L.divIcon({
  className: "custom-leaflet-pin",
  html: `<div style="background-color: #2563eb; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.4);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const cities: Array<{ name: string; coordinates: [number, number] }> = [
  { name: "Medellín", coordinates: [6.2518, -75.5652] },
  { name: "Cali", coordinates: [3.4516, -76.5225] },
  { name: "Cartagena", coordinates: [10.3910, -75.4794] },
  { name: "Barranquilla", coordinates: [10.9685, -74.7813] },
  { name: "Santa Marta", coordinates: [11.2408, -74.1990] },
  { name: "Maicao", coordinates: [11.3786, -72.2383] },
  { name: "Bucaramanga", coordinates: [7.1193, -73.1227] },
  { name: "Cúcuta", coordinates: [7.8939, -72.5078] },
  { name: "Riohacha", coordinates: [11.5444, -72.9072] },
  { name: "Sincelejo", coordinates: [9.3047, -75.3978] },
  { name: "Montería", coordinates: [8.7480, -75.8814] },
  { name: "Popayán", coordinates: [2.4382, -76.6132] },
  { name: "Pasto", coordinates: [1.2136, -77.2811] },
  { name: "Ipiales", coordinates: [0.8303, -77.6444] },
  { name: "Yopal", coordinates: [5.3378, -72.3959] },
  { name: "Aguazul", coordinates: [5.1728, -72.5471] },
  { name: "Istmina", coordinates: [5.1581, -76.6847] },
  { name: "Quibdó", coordinates: [5.6947, -76.6611] },
  { name: "Tadó", coordinates: [5.2678, -76.5311] },
  { name: "Turbo", coordinates: [8.0944, -76.7281] },
  { name: "Apartadó", coordinates: [7.8825, -76.6267] },
  { name: "Chigorodó", coordinates: [7.6694, -76.6811] },
  { name: "Carepa", coordinates: [7.7600, -76.6481] },
  { name: "Necoclí", coordinates: [8.4217, -76.7861] },
  { name: "Mocoa", coordinates: [1.1522, -76.6508] },
  { name: "Puerto Asís", coordinates: [0.5133, -76.5008] },
  { name: "La Hormiga", coordinates: [0.4194, -76.8986] },
];

export function ColombiaMap() {
  return (
    <div className="w-full flex justify-center items-center p-4 relative z-0">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-2">
        <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-slate-100">
          <MapContainer 
            center={[4.5709, -74.2973]} 
            zoom={6} 
            scrollWheelZoom={false}
            style={{ width: "100%", height: "100%", zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {cities.map((city) => (
              <Marker key={city.name} position={city.coordinates} icon={pinIcon}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <span className="font-bold">{city.name}</span>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
