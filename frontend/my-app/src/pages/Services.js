import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getServices } from "../api/services";

const CATEGORY_ICONS = {
  Appointments: "📅",
  Documents: "📄",
  Transport: "🚗",
  Citizenship: "🏛️",
  Health: "💊",
  General: "⚙️",
};

export default function Services() {
  const [catalogue, setCatalogue] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getServices().then(setCatalogue).catch(() => {});
  }, []);

  const askAbout = (serviceName) => {
    navigate("/assistant", { state: { initialMessage: `Tell me about: ${serviceName}` } });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Services</h2>
        <p className="text-gray-400 mt-1">All connected government services, organised by category.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {catalogue.map(({ category, services }) => (
          <div key={category} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
              <span className="text-lg">{CATEGORY_ICONS[category] || "📋"}</span>
              <h3 className="text-white font-semibold">{category}</h3>
              <span className="ml-auto text-xs text-gray-500">{services.length} services</span>
            </div>
            <div className="divide-y divide-gray-800">
              {services.map((s) => (
                <div key={s.name} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                  <div>
                    <p className="text-sm text-white">{s.name}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-green-400 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => askAbout(s.name)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-800 hover:border-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Ask AI
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
