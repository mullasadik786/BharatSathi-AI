import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckSquare,
  CloudRain,
  Droplets,
  Info,
  Languages,
  MapPin,
  ShieldAlert,
  Thermometer,
  Users,
} from 'lucide-react';
import type { WeatherData } from '../types.ts';

interface ClimateResiliencePlaybookProps {
  onAskAssistant: (prompt: string, languageLabel: string) => Promise<void>;
}

type ResilienceLang = 'en' | 'te' | 'hi';
type AudienceGroup = 'farmers' | 'households' | 'students' | 'communities';

const AP_LOCATIONS = [
  'Guntur, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Anantapur, Andhra Pradesh',
  'Kurnool, Andhra Pradesh',
  'Visakhapatnam, Andhra Pradesh',
  'Tirupati, Andhra Pradesh',
];

const AUDIENCE_COPY: Record<
  AudienceGroup,
  Record<
    ResilienceLang,
    {
      label: string;
      steps: string[];
    }
  >
> = {
  farmers: {
    en: {
      label: 'Farmers',
      steps: [
        'Schedule irrigation during early morning (05:30–08:00) or late afternoon to minimize evaporation loss.',
        'Delay foliar pesticide spraying if rain probability exceeds 50% or winds exceed 15 km/h.',
        'Check field bunds and farm ponds for rainwater capture before forecasted showers.',
      ],
    },
    te: {
      label: 'రైతులు (Farmers)',
      steps: [
        'నీటి ఆవిరి నష్టాన్ని తగ్గించడానికి ఉదయం 5:30–8:00 లేదా సాయంత్రం వేళల్లో పొలానికి నీరు పెట్టండి.',
        'వర్ష సూచన 50% కంటే ఎక్కువ ఉన్నప్పుడు లేదా గాలి వేగం ఎక్కువగా ఉన్నప్పుడు మందుల పిచికారీ వాయిదా వేయండి.',
        'వర్షపు నీటిని నిల్వ చేయడానికి పొలం గట్లు మరియు కుంటలను ముందుగానే సరిచేసుకోండి.',
      ],
    },
    hi: {
      label: 'किसान (Farmers)',
      steps: [
        'वाष्पीकरण से पानी के नुकसान को कम करने के लिए सिंचाई सुबह 5:30–8:00 बजे या शाम को करें।',
        'यदि बारिश की संभावना 50% से अधिक या हवा तेज़ हो, तो कीटनाशक छिड़काव टालें।',
        'बारिश के पानी को संचित करने के लिए खेत की मेड़ और जल-कुंडों की समय पर जांच करें।',
      ],
    },
  },
  households: {
    en: {
      label: 'Households',
      steps: [
        'Store 48 hours of safe drinking water ahead of high-heat days or erratic supply windows.',
        'Avoid outdoor manual chores between 12:00 PM and 3:30 PM during peak heat alerts.',
        'Keep ORS / electrolyte fluids and shaded ventilation ready for elderly family members and children.',
      ],
    },
    te: {
      label: 'కుటుంబాలు (Households)',
      steps: [
        'ఎండ తీవ్రత ఎక్కువగా ఉన్న రోజుల్లో కనీసం 48 గంటలకు సరిపడా తాగునీటిని నిల్వ ఉంచుకోండి.',
        'మధ్యాహ్నం 12:00 నుండి 3:30 గంటల మధ్య ఎండలో బయటి పనులను తగ్గించండి.',
        'వృద్ధులు మరియు పిల్లల కోసం ఓఆర్ఎస్ (ORS) మరియు చల్లని గాలి ఉండేలా జాగ్రత్తలు తీసుకోండి.',
      ],
    },
    hi: {
      label: 'परिवार (Households)',
      steps: [
        'तेज़ गर्मी के दिनों से पहले कम से कम 48 घंटे के लिए सुरक्षित पीने का पानी स्टोर रखें।',
        'दोपहर 12:00 से 3:30 बजे के बीच बाहर के भारी काम करने से बचें।',
        'बुजुर्गों और बच्चों के लिए ओआरएस (ORS) और ठंडी हवादार जगह की व्यवस्था रखें।',
      ],
    },
  },
  students: {
    en: {
      label: 'Students & Educators',
      steps: [
        'Compare observed local temperature and humidity against 3-day model forecasts to understand uncertainty.',
        'Verify weather claims using official source timestamps before sharing advisories in school groups.',
        'Document local water-conservation practices around campus and nearby village tanks.',
      ],
    },
    te: {
      label: 'విద్యార్థులు (Students)',
      steps: [
        'ప్రస్తుత ఉష్ణోగ్రత మరియు తేమను 3 రోజుల అంచనాతో పోల్చి వాతావరణ అనిశ్చితిని అర్థం చేసుకోండి.',
        'ఏదైనా వాతావరణ సమాచారాన్ని ఇతరులకు పంపే ముందు అధికారిక మూలం మరియు సమయాన్ని తనిఖీ చేయండి.',
        'పాఠశాల మరియు గ్రామ చెరువుల నీటి సంరక్షణ పద్ధతులను నమోదు చేయండి.',
      ],
    },
    hi: {
      label: 'छात्र व शिक्षक (Students)',
      steps: [
        'वर्तमान तापमान और नमी की तुलना 3-दिवसीय पूर्वानुमान से करके मौसम की अनिश्चितता को समझें।',
        'किसी भी मौसम सलाह को साझा करने से पहले आधिकारिक स्रोत और अपडेट समय की पुष्टि करें।',
        'स्थानीय जल संरक्षण और तालाब प्रबंधन के तरीकों का अध्ययन और दस्तावेज़ीकरण करें।',
      ],
    },
  },
  communities: {
    en: {
      label: 'Community / FPOs',
      steps: [
        'Coordinate shared borewell / canal irrigation slots among neighbouring farmers to reduce peak load.',
        'Maintain a village-level cooling shelter & clean water point checklist during heatwaves.',
        'Relay verified district advisories in Telugu and Hindi to last-mile households without smartphones.',
      ],
    },
    te: {
      label: 'కమ్యూనిటీ / FPOలు',
      steps: [
        'విద్యుత్ మరియు నీటి ఒత్తిడిని తగ్గించడానికి పొరుగు రైతులతో కలిసి బోరు/కాలువ నీటి సమయాలను పంచుకోండి.',
        'వడగాల్పుల సమయంలో గ్రామ స్థాయిలో నీడ మరియు తాగునీటి కేంద్రాలను సిద్ధంగా ఉంచండి.',
        'ధృవీకరించబడిన వాతావరణ సూచనలను తెలుగులో అందరికీ చేరవేయండి.',
      ],
    },
    hi: {
      label: 'समुदाय / FPO',
      steps: [
        'बिजली और पानी के दबाव को कम करने के लिए पड़ोसी किसानों के साथ सिंचाई समय का समन्वय करें।',
        'लू के दौरान ग्राम स्तर पर छाया और स्वच्छ पेयजल केंद्रों की जांच सूची तैयार रखें।',
        'सत्यापित जिला मौसम सलाह को स्थानीय भाषा में सभी परिवारों तक पहुंचाएं।',
      ],
    },
  },
};

const QUICK_RESILIENCE_PROMPTS: Record<ResilienceLang, Array<{ title: string; prompt: string }>> = {
  en: [
    {
      title: 'Heat & Water Stress Check',
      prompt:
        'Check live weather for Guntur, Andhra Pradesh and give me a water preparedness and heat-safety action plan for paddy and chilli farmers with clear source and uncertainty notes.',
    },
    {
      title: 'Rainfall Variability Guidance',
      prompt:
        'What is the 3-day rainfall outlook for Anantapur, Andhra Pradesh, and how should our FPO prepare farm ponds and irrigation schedules?',
    },
  ],
  te: [
    {
      title: 'తెలుగు: ఎండ & నీటి సంరక్షణ ప్రణాళిక',
      prompt:
        'గుంటూరు (ఆంధ్రప్రదేశ్) ప్రస్తుత వాతావరణం చూసి, వరి మరియు మిర్చి రైతులకు నీటి సంరక్షణ మరియు ఎండ జాగ్రత్తలపై తెలుగులో స్పష్టమైన కార్యాచరణ ప్రణాళిక చెప్పండి.',
    },
    {
      title: 'తెలుగు: వర్షపాతం & కమ్యూనిటీ సూచనలు',
      prompt:
        'అనంతపురం జిల్లాలో రాబోయే 3 రోజుల వర్షపాతం అంచనా చూసి, రైతులు మరియు గ్రామ కమ్యూనిటీ తీసుకోవాల్సిన జాగ్రత్తలు చెప్పండి.',
    },
  ],
  hi: [
    {
      title: 'हिन्दी: गर्मी और जल तैयारी योजना',
      prompt:
        'गुंटूर (आंध्र प्रदेश) का लाइव मौसम देखकर किसानों और परिवारों के लिए गर्मी से बचाव और जल संरक्षण की स्पष्ट कार्ययोजना हिन्दी में बताएं।',
    },
    {
      title: 'हिन्दी: वर्षा अनिश्चितता सलाह',
      prompt:
        'विजयवाड़ा के अगले 3 दिनों के मौसम और बारिश के अनुमान के आधार पर सिंचाई और सामुदायिक तैयारी के कदम हिन्दी में बताएं।',
    },
  ],
};

export function ClimateResiliencePlaybook({
  onAskAssistant,
}: ClimateResiliencePlaybookProps) {
  const [selectedLocation, setSelectedLocation] = useState(AP_LOCATIONS[0]);
  const [uiLang, setUiLang] = useState<ResilienceLang>('en');
  const [audience, setAudience] = useState<AudienceGroup>('farmers');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askingPrompt, setAskingPrompt] = useState<string | null>(null);

  const loadClimateContext = async (loc: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Live weather feed unavailable');
      }
      setWeather(data.weather);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch climate context');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClimateContext(selectedLocation);
  }, [selectedLocation]);

  const computeHeatStatus = (w: WeatherData | null) => {
    if (!w) return { label: 'Loading...', tone: 'text-slate-600' };
    if (w.temperature_c >= 36) return { label: 'High Heat Stress Watch', tone: 'text-red-700' };
    if (w.temperature_c >= 31) return { label: 'Moderate Warmth Watch', tone: 'text-amber-700' };
    return { label: 'Nominal Thermal Range', tone: 'text-emerald-700' };
  };

  const computeWaterRisk = (w: WeatherData | null) => {
    if (!w) return { label: 'Loading...', tone: 'text-slate-600' };
    const total3DayRain = w.daily_forecast.reduce((acc, d) => acc + d.precip_mm, 0);
    if (total3DayRain < 2 && w.humidity_percent < 45) {
      return { label: 'Dry Window · Conserve Soil Moisture', tone: 'text-amber-700' };
    }
    if (total3DayRain >= 15) {
      return { label: 'Rain Expected · Check Field Drainage', tone: 'text-blue-700' };
    }
    return { label: 'Balanced Moisture Window', tone: 'text-emerald-700' };
  };

  const heatStatus = computeHeatStatus(weather);
  const waterStatus = computeWaterRisk(weather);
  const activeCopy = AUDIENCE_COPY[audience][uiLang];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Visual Header Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200">
        <div className="lg:col-span-5 relative min-h-[210px] bg-slate-900">
          <img
            src="/src/assets/images/climate_water_preparedness_1794973746103.jpg"
            alt="Andhra Pradesh farm water conservation pond and drip irrigation"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="text-xs font-medium text-emerald-300">
              Understand → Monitor → Prepare → Act → Build Resilience
            </div>
            <div className="font-display text-lg font-bold mt-0.5">
              Andhra Pradesh Climate Preparedness Desk
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Interactive Resilience Workflow & Multilingual Action Plan
              </h2>
              <p className="text-xs text-slate-500">
                Select an Andhra Pradesh district, review live indicators with uncertainty caveats, switch languages, and trigger BharatSathi AI.
              </p>
            </div>

            {/* Language Accessibility Toggle (EN / TE / HI) */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start">
              <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
              {(
                [
                  { id: 'en', label: 'English' },
                  { id: 'te', label: 'తెలుగు' },
                  { id: 'hi', label: 'हिन्दी' },
                ] as Array<{ id: ResilienceLang; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setUiLang(item.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    uiLang === item.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1: Select Location in Andhra Pradesh */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              Select AP Location:
            </span>
            {AP_LOCATIONS.map((loc) => {
              const shortLabel = loc.split(',')[0];
              const active = selectedLocation === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-emerald-700 border-emerald-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>

          {/* Step 2: Live Indicators + Uncertainty Disclosure */}
          {error ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Live feed unavailable ({error}). Following BharatSathi uncertainty protocol: no synthetic forecast numbers are fabricated—use the general preparedness checklist below.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                  <span>Observed Temp & Heat</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                  {loading || !weather ? '...' : `${weather.temperature_c}°C`}
                </div>
                <div className={`text-[11px] font-semibold mt-0.5 ${heatStatus.tone}`}>
                  {heatStatus.label}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  <span>Humidity & Water Stress</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                  {loading || !weather ? '...' : `${weather.humidity_percent}% RH`}
                </div>
                <div className={`text-[11px] font-semibold mt-0.5 ${waterStatus.tone}`}>
                  {waterStatus.label}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <CloudRain className="w-3.5 h-3.5 text-blue-700" />
                  <span>3-Day Rain Variability</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                  {loading || !weather
                    ? '...'
                    : `${Math.max(...weather.daily_forecast.map((d) => d.rain_prob_percent))}% Max Prob`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                  {weather ? `Updated ${new Date(weather.last_updated).toLocaleTimeString()}` : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Audience Playbooks (Awareness -> Preparedness -> Community Action) & AI Questions */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Preparedness & Community Action Checklist</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'farmers', label: 'Farmers' },
                  { id: 'households', label: 'Households' },
                  { id: 'students', label: 'Students' },
                  { id: 'communities', label: 'Community / FPOs' },
                ] as Array<{ id: AudienceGroup; label: string }>
              ).map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setAudience(grp.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    audience === grp.id
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {grp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-xs font-semibold text-emerald-800">{activeCopy.label}</div>
            <ul className="space-y-2">
              {activeCopy.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-800 leading-relaxed">
                  <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-blue-700" />
            <span>
              <strong>Uncertainty & Source Transparency:</strong> Observed telemetry comes from{' '}
              <strong>Open-Meteo Live Weather API</strong> ({weather?.resolved_name || selectedLocation}). Short-range rainfall probabilities carry local micro-climate uncertainty; always verify severe weather alerts with IMD / district disaster advisories.
            </span>
          </div>
        </div>

        {/* Ask BharatSathi Practical Resilience Questions */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-sm font-semibold text-slate-900">
            Ask BharatSathi AI About Heat, Rainfall & Water
          </div>
          <p className="text-xs text-slate-500">
            Trigger a real source-grounded conversation in {uiLang === 'en' ? 'English' : uiLang === 'te' ? 'Telugu' : 'Hindi'} (executes live tool calls and updates your transcript).
          </p>

          <div className="space-y-2.5">
            {QUICK_RESILIENCE_PROMPTS[uiLang].map((q) => {
              const busy = askingPrompt === q.title;
              return (
                <button
                  key={q.title}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setAskingPrompt(q.title);
                    try {
                      await onAskAssistant(
                        q.prompt,
                        uiLang === 'te' ? 'Telugu' : uiLang === 'hi' ? 'Hindi' : 'English'
                      );
                    } finally {
                      setAskingPrompt(null);
                    }
                  }}
                  className="w-full p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-blue-800">{q.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{q.prompt}</p>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
            <span>
              Workflow path: <strong>Awareness</strong> (Live AP climate indicators) → <strong>Preparedness</strong> (Multilingual checklist) → <strong>Community Action</strong> (Voice reminders & shared FPO scheduling).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
