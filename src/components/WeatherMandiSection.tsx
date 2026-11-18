import { useEffect, useState } from 'react';
import {
  CloudRain,
  Droplets,
  Gauge,
  Info,
  RefreshCw,
  Search,
  Sprout,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { MarketPrice, WeatherData } from '../types.ts';

interface WeatherMandiSectionProps {
  defaultLocation: string;
  marketPrices: MarketPrice[];
}

export function WeatherMandiSection({
  defaultLocation,
  marketPrices,
}: WeatherMandiSectionProps) {
  const [locationInput, setLocationInput] = useState(defaultLocation);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [cropSearch, setCropSearch] = useState('');
  const [marketSearch, setMarketSearch] = useState('');

  const loadWeather = async (loc: string) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Weather service unavailable');
      }
      setWeather(data.weather);
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Unable to fetch weather');
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    void loadWeather(defaultLocation);
  }, [defaultLocation]);

  const filteredPrices = marketPrices.filter((item) => {
    const c = cropSearch.trim().toLowerCase();
    const m = marketSearch.trim().toLowerCase();
    const cropOk = !c || item.crop.toLowerCase().includes(c);
    const marketOk =
      !m || item.market.toLowerCase().includes(m) || item.state.toLowerCase().includes(m);
    return cropOk && marketOk;
  });

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Top-Class Agricultural Weather & Field Preparedness (Open-Meteo 7-Day) */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="relative h-36 bg-slate-900">
          <img
            src="/src/assets/images/heat_resilience_farmers_1794973746278.jpg"
            alt="Community weather station and farmer field advisory"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
            <div>
              <h2 className="font-display text-base font-semibold">
                7-Day Precision Agricultural Weather
              </h2>
              <p className="text-xs text-slate-200">
                Evapotranspiration (ET₀), spraying window, pressure & rain forecast
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadWeather(locationInput)}
              disabled={weatherLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-xs font-medium text-slate-900 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadWeather(locationInput);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Village, town, or district (e.g., Guntur, Visakhapatnam)"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={weatherLoading}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium"
            >
              Check
            </button>
          </form>

          {weatherError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {weatherError}
            </div>
          )}

          {weatherLoading && !weather && (
            <div className="space-y-3 animate-pulse">
              <div className="h-24 bg-slate-100 rounded-lg" />
              <div className="h-32 bg-slate-100 rounded-lg" />
            </div>
          )}

          {weather && (
            <div className="space-y-4">
              {/* Current Conditions + Pressure/Gusts */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{weather.resolved_name}</div>
                    <div className="text-xs text-slate-600">
                      {weather.condition_label} · Feels like {weather.apparent_temperature_c}°C
                    </div>
                  </div>
                  <div className="font-display text-3xl font-bold text-slate-900 tabular-nums">
                    {weather.temperature_c}°C
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    <span className="tabular-nums">{weather.humidity_percent}% RH</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Wind className="w-3.5 h-3.5 text-slate-600" />
                    <span className="tabular-nums">{weather.wind_speed_kmh} / G {weather.wind_gusts_kmh}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Gauge className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="tabular-nums">{weather.surface_pressure_hpa} hPa</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CloudRain className="w-3.5 h-3.5 text-blue-700" />
                    <span className="tabular-nums">{weather.precipitation_mm} mm</span>
                  </div>
                </div>
              </div>

              {/* Farmer Decision Cards: Spraying & Evapotranspiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                      <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                      Spraying Window
                    </span>
                    <span
                      className={`font-semibold ${
                        weather.agri_advisory.spraying_suitability === 'Good'
                          ? 'text-emerald-700'
                          : weather.agri_advisory.spraying_suitability === 'Caution'
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {weather.agri_advisory.spraying_suitability}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {weather.agri_advisory.spraying_reason}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-600" />
                      Crop Water Loss (ET₀)
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {weather.agri_advisory.evapotranspiration_today_mm} mm/d
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    {weather.agri_advisory.irrigation_guidance}
                  </p>
                </div>
              </div>

              {/* 7-Day Agri Forecast Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2 pr-2">Day</th>
                      <th className="py-2 px-2">Temp</th>
                      <th className="py-2 px-2">Rain</th>
                      <th className="py-2 px-2">Wind / Gust</th>
                      <th className="py-2 pl-2 text-right">ET₀ / UV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {weather.daily_forecast.map((day) => (
                      <tr key={day.date}>
                        <td className="py-2 pr-2 text-slate-600">{day.date.slice(5)}</td>
                        <td className="py-2 px-2 text-slate-900 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-amber-600" />
                            {day.temp_max_c}°/{day.temp_min_c}°
                          </span>
                        </td>
                        <td className="py-2 px-2 text-blue-700">
                          {day.rain_prob_percent}% ({day.precip_mm}mm)
                        </td>
                        <td className="py-2 px-2 text-slate-700">
                          {day.wind_max_kmh}/{day.wind_gust_max_kmh} km/h
                        </td>
                        <td className="py-2 pl-2 text-right text-slate-700">
                          {day.et0_mm.toFixed(1)}mm · UV {day.uv_index_max.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mandatory Source Attribution */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono tabular-nums">
                Source: {weather.source} · Updated {new Date(weather.last_updated).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Mandi Market Prices (Explicitly Labeled Demo Dataset) */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="relative h-36 bg-slate-900">
          <img
            src="/src/assets/images/mandi_rural_commerce_1794973747487.jpg"
            alt="Indian agricultural mandi market grain sacks and farmers"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h2 className="font-display text-base font-semibold">
              Mandi Market Prices
            </h2>
            <p className="text-xs text-slate-200">
              Search commodity rates by crop and regional mandi
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-700" />
            <span>
              <strong>Data Attribution Notice:</strong> Market prices shown below are served from the{' '}
              <strong>BharatSathi Demo Dataset (Agmarknet Reference Snapshot)</strong> for prototype verification, distinct from live exchange feeds.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                placeholder="Filter by crop (Paddy, Cotton, Chilli...)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                placeholder="Filter by mandi or state (Guntur, Warangal...)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {filteredPrices.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              No matching crop or market found in the reference dataset.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Crop</th>
                    <th className="py-2.5 px-3">Mandi / Market</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPrices.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{row.crop}</td>
                      <td className="py-2.5 px-3 text-slate-700">{row.market}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">{row.state}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800 tabular-nums whitespace-nowrap">
                        ₹{row.price.toLocaleString('en-IN')} / qtl
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
