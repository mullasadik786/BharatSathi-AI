import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  ExternalLink,
  Gauge,
  Languages,
  LifeBuoy,
  PhoneCall,
  ShieldAlert,
  Waves,
  Wind,
} from 'lucide-react';
import type { WeatherData } from '../types.ts';

interface CycloneDisasterSectionProps {
  defaultLocation: string;
  onAskAssistant: (prompt: string, langLabel: string) => Promise<void>;
}

type DisasterLang = 'en' | 'te' | 'hi';
type HazardTab = 'cyclone' | 'flood' | 'heatwave';

const COASTAL_MONITOR_DISTRICTS = [
  'Visakhapatnam, Andhra Pradesh',
  'Kakinada, Andhra Pradesh',
  'Machilipatnam, Andhra Pradesh',
  'Nellore, Andhra Pradesh',
  'Puri, Odisha',
  'Chennai, Tamil Nadu',
];

const HELPLINES = [
  { label: 'National Emergency', number: '112', scope: 'Police · Fire · Disaster' },
  { label: 'State Disaster Helpline', number: '1070', scope: 'Cyclone & Flood Relief' },
  { label: 'District Control Room', number: '1077', scope: 'Local Evacuation & Shelters' },
  { label: 'Emergency Ambulance', number: '108', scope: 'Medical Emergency' },
  { label: 'Kisan Call Centre', number: '1800-180-1551', scope: 'Farmer Relief & Crop Aid' },
];

const OFFICIAL_PORTALS = [
  {
    name: 'IMD Mausam Cyclone & Warnings',
    url: 'https://mausam.imd.gov.in',
    role: 'Official Cyclone Tracks & Red/Orange Alerts',
  },
  {
    name: 'NDMA Sachet (CAP Alerts)',
    url: 'https://sachet.ndma.gov.in',
    role: 'Geo-Targeted Disaster Bulletins',
  },
  {
    name: 'INCOIS Ocean & Storm Surge',
    url: 'https://incois.gov.in',
    role: 'Coastal Tide & Fishermen Advisories',
  },
  {
    name: 'National Disaster Management Authority',
    url: 'https://ndma.gov.in',
    role: 'National Preparedness & Shelter SOPs',
  },
];

const DISASTER_CHECKLISTS: Record<HazardTab, Record<DisasterLang, string[]>> = {
  cyclone: {
    en: [
      'Before Storm: Harvest mature paddy, pulses, or vegetables early if safe; store grain and fertilizer bags on raised wooden pallets under waterproof tarpaulins.',
      'Livestock & Equipment: Untie cattle from weak sheds and move them to elevated community shelters; switch off agricultural borewell mains and solar inverters.',
      '72-Hour Family Go-Bag: Seal Aadhaar, land passbooks, and bank cards in waterproof pouches alongside 3 days of drinking water, dry food, torch, power bank, and essential medicines.',
      'Shelter & Aftermath: Move immediately when District Collectorate / Panchayat issues evacuation orders; never touch fallen overhead wires or cross flooded causeways.',
    ],
    te: [
      'తుఫానుకు ముందు: కోతకు వచ్చిన వరి, పప్పుధాన్యాలు లేదా కూరగాయలను సురక్షితంగా కోసి, ఎత్తైన ప్రదేశంలో వాటర్‌ప్రూఫ్ టార్పాలిన్‌లతో కప్పి ఉంచండి.',
      'పశువులు & మోటార్లు: బలహీనమైన షెడ్ల నుండి పశువులను విడిపించి ఎత్తైన సురక్షిత షెల్టర్లకు తరలించండి; వ్యవసాయ బోరు మోటారు మెయిన్ స్విచ్ ఆఫ్ చేయండి.',
      '72-గంటల ఎమర్జెన్సీ కిట్: ఆధార్, పట్టాదారు పాస్‌బుక్‌లను వాటర్‌ప్రూఫ్ కవర్‌లో పెట్టి, 3 రోజులకు సరిపడా తాగునీరు, పొడి ఆహారం, టార్చ్, పవర్ బ్యాంక్ మరియు మందులు సిద్ధంగా ఉంచండి.',
      'పునరావాసం & జాగ్రత్తలు: 1070/1077 లేదా పంచాయతీ ఖాళీ చేసే సూచనలు వచ్చిన వెంటనే షెల్టర్లకు వెళ్లండి; తెగిపడిన విద్యుత్ తీగలను తాకవద్దు.',
    ],
    hi: [
      'तूफान से पहले: यदि सुरक्षित हो तो पकी हुई धान, दलहन या सब्जी की फसल काट लें और अनाज व खाद की बोरियों को ऊंचे स्थान पर वाटरप्रूफ तिरपाल से ढक दें।',
      'पशुधन और मोटर सुरक्षा: कमजोर छप्परों से पशुओं को खोलकर ऊंचे और सुरक्षित आश्रय में ले जाएं; कृषि बोरवेल की मुख्य बिजली सप्लाई बंद कर दें।',
      '72-घंटे का आपातकालीन बैग: आधार, जमीन के कागजात को वाटरप्रूफ बैग में रखें; साथ ही 3 दिन का पीने का पानी, सूखा राशन, टॉर्च, पावर बैंक और जरूरी दवाइयां रखें।',
      'निकासी और बाद की सावधानी: प्रशासन या पंचायत के निर्देश मिलते ही तुरंत सुरक्षित आश्रय में जाएं; गिरे हुए बिजली के तारों और बाढ़ वाले रास्तों से दूर रहें।',
    ],
  },
  flood: {
    en: [
      'Open field drainage outlets and clear silt from perimeter trenches before intense rainfall bands arrive.',
      'Elevate electric pump starters, oil engines, and seed stocks onto brick plinths above historical flood levels.',
      'Boil or chlorinate drinking water after floodwater recedes and keep children away from stagnant water.',
    ],
    te: [
      'భారీ వర్షాలు రాకముందే పొలం గట్ల అవుట్‌లెట్లు మరియు నీటి కాలువలలోని పూడికను తొలగించండి.',
      'విద్యుత్ పంప్ స్టార్టర్లు, ఆయిల్ ఇంజన్లు మరియు విత్తన బస్తాలను వరద నీరు చేరని ఎత్తైన ప్లాట్‌ఫారమ్‌పై ఉంచండి.',
      'వరద నీరు తగ్గిన తర్వాత తాగునీటిని మరిగించి లేదా క్లోరినేట్ చేసి వాడండి.',
    ],
    hi: [
      'तेज बारिश आने से पहले खेत के जल-निकासी मार्ग और मेड़ की नालियों की सफाई कर लें।',
      'बिजली के पंप स्टार्टर, डीजल इंजन और बीज की बोरियों को बाढ़ स्तर से ऊंचे चबूतरे पर रखें।',
      'बाढ़ का पानी उतरने के बाद पीने का पानी उबालकर या क्लोरीन मिलाकर ही उपयोग करें।',
    ],
  },
  heatwave: {
    en: [
      'Reschedule outdoor farm labor and school transit outside the 12:00 PM – 3:30 PM peak heat window.',
      'Use paddy straw or dry mulch in crop rows to reduce root-zone heat stress and moisture loss.',
      'Maintain shaded drinking water stations and ORS fluids for field workers, cattle, and elderly residents.',
    ],
    te: [
      'మధ్యాహ్నం 12:00 నుండి 3:30 గంటల మధ్య ఎండ తీవ్రత సమయంలో పొలం పనులు మరియు బయటి ప్రయాణాలను నివారించండి.',
      'నేల తేమను కాపాడటానికి మరియు వేడి ఒత్తిడిని తగ్గించడానికి మొక్కల వరుసలలో ఎండు గడ్డితో మల్చింగ్ చేయండి.',
      'రైతు కూలీలు, పశువులు మరియు వృద్ధుల కోసం నీడ ఉన్న తాగునీటి కేంద్రాలు మరియు ORS సిద్ధంగా ఉంచండి.',
    ],
    hi: [
      'दोपहर 12:00 से 3:30 बजे के चरम गर्मी समय में खेत की मेहनत और बाहरी आवाजाही टालें।',
      'जड़ों में नमी बचाने और गर्मी का तनाव कम करने के लिए फसलों की कतारों में सूखी पुआल से मल्चिंग करें।',
      'खेत मजदूरों, पशुओं और बुजुर्गों के लिए छायादार पेयजल और ORS की व्यवस्था रखें।',
    ],
  },
};

export function CycloneDisasterSection({
  defaultLocation,
  onAskAssistant,
}: CycloneDisasterSectionProps) {
  const [monitorLocation, setMonitorLocation] = useState(COASTAL_MONITOR_DISTRICTS[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<DisasterLang>('en');
  const [hazardTab, setHazardTab] = useState<HazardTab>('cyclone');
  const [asking, setAsking] = useState(false);

  const loadMonitor = async (loc: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setWeather(data.weather);
      }
    } catch {
      // Handled gracefully by displaying fallback official links & checklists
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMonitor(monitorLocation);
  }, [monitorLocation]);

  const watchTone =
    weather?.cyclone_watch.level === 'storm_watch'
      ? 'bg-red-50 border-red-300 text-red-900'
      : weather?.cyclone_watch.level === 'wind_advisory'
        ? 'bg-amber-50 border-amber-300 text-amber-900'
        : 'bg-emerald-50 border-emerald-200 text-emerald-900';

  const handleAskDisasterVoice = async () => {
    setAsking(true);
    try {
      const prompt =
        lang === 'te'
          ? `${monitorLocation} ప్రాంతంలో తుఫాను, గాలి వేగం మరియు వాయుగుండం పరిస్థితిని తనిఖీ చేసి, రైతులు మరియు కుటుంబాలకు తెలుగులో పూర్తి విపత్తు నివారణ సూచనలు ఇవ్వండి.`
          : lang === 'hi'
            ? `${monitorLocation} के लिए हवा, दबाव और चक्रवात की स्थिति जांचें और किसानों व परिवारों के लिए हिन्दी में आपदा प्रबंधन योजना बताएं।`
            : `Check live atmospheric pressure and wind gusts for ${monitorLocation} and give our community a cyclone and disaster preparedness action plan with official helplines.`;
      await onAskAssistant(prompt, lang === 'te' ? 'Telugu' : lang === 'hi' ? 'Hindi' : 'English');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-800">
            <Waves className="w-4 h-4" />
            <span>Cyclone Disturbance Watch & Community Disaster Management</span>
          </div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Coastal & Rural Disaster Preparedness Center
          </h2>
          <p className="text-xs text-slate-500">
            Live barometric pressure & wind-gust monitoring paired with multilingual emergency checklists, verified Indian helplines, and official IMD/NDMA portals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            {(
              [
                { id: 'en', label: 'English' },
                { id: 'te', label: 'తెలుగు' },
                { id: 'hi', label: 'हिन्दी' },
              ] as Array<{ id: DisasterLang; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLang(item.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  lang === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={asking}
            onClick={() => void handleAskDisasterVoice()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>{asking ? 'Asking...' : 'Ask BharatSathi Safety Plan'}</span>
          </button>
        </div>
      </div>

      {/* Coastal & Regional Barometric Monitor */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Monitor District:</span>
          {[...COASTAL_MONITOR_DISTRICTS, defaultLocation]
            .filter((v, idx, arr) => v && arr.indexOf(v) === idx)
            .map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setMonitorLocation(loc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  monitorLocation === loc
                    ? 'bg-blue-700 border-blue-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50'
                }`}
              >
                {loc.split(',')[0]}
              </button>
            ))}
        </div>

        <div className={`p-4 rounded-xl border ${watchTone} space-y-2`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {weather?.cyclone_watch.level === 'storm_watch' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              )}
              <span>
                {loading || !weather ? 'Checking live atmospheric telemetry...' : weather.cyclone_watch.label}
              </span>
            </div>
            {weather && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" />
                  {weather.surface_pressure_hpa} hPa
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" />
                  Wind {weather.wind_speed_kmh} km/h · Gusts {weather.wind_gusts_kmh} km/h
                </span>
              </div>
            )}
          </div>
          {weather && (
            <>
              <p className="text-xs leading-relaxed">{weather.cyclone_watch.barometric_note}</p>
              <p className="text-[11px] opacity-90">{weather.cyclone_watch.official_verification_note}</p>
            </>
          )}
        </div>
      </div>

      {/* Main Disaster Grid: Multilingual Checklists + Helplines & IMD/NDMA Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {(
              [
                { id: 'cyclone', label: 'Cyclone & Storm' },
                { id: 'flood', label: 'Flood & Heavy Rain' },
                { id: 'heatwave', label: 'Heatwave & Drought' },
              ] as Array<{ id: HazardTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHazardTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  hazardTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            {DISASTER_CHECKLISTS[hazardTab][lang].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-slate-800 leading-relaxed">
                <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Emergency Helplines */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <PhoneCall className="w-4 h-4 text-red-700" />
              <span>Verified Indian Emergency Helplines</span>
            </div>
            <div className="divide-y divide-slate-100">
              {HELPLINES.map((h) => (
                <div key={h.number} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{h.label}</div>
                    <div className="text-[11px] text-slate-500">{h.scope}</div>
                  </div>
                  <span className="font-mono font-bold text-red-700 tabular-nums text-sm">
                    {h.number}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Government Portals */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-900">
              Official Cyclone & Alert Authorities
            </div>
            <div className="space-y-2">
              {OFFICIAL_PORTALS.map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-blue-800">{p.name}</div>
                    <div className="text-[11px] text-slate-500">{p.role}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
