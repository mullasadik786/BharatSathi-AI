import { useCallback, useEffect, useState } from 'react';
import { useLiveVoice } from './audio/useLiveVoice.ts';
import { ClimateResiliencePlaybook } from './components/ClimateResiliencePlaybook.tsx';
import { CycloneDisasterSection } from './components/CycloneDisasterSection.tsx';
import { FarmerProfileModal } from './components/FarmerProfileModal.tsx';
import { FarmRecordsSection, type RecordsTab } from './components/FarmRecordsSection.tsx';
import { PerformanceArchitectureSection } from './components/PerformanceArchitectureSection.tsx';
import { TopNav, type ActiveSection } from './components/TopNav.tsx';
import { VoiceAssistantPanel } from './components/VoiceAssistantPanel.tsx';
import { WeatherMandiSection } from './components/WeatherMandiSection.tsx';
import type {
  AppDatabaseState,
  FarmExpense,
  FarmerProfile,
  SupportedLanguage,
} from './types.ts';

export default function App() {
  const [dbState, setDbState] = useState<AppDatabaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<ActiveSection>('voice');
  const [recordsTab, setRecordsTab] = useState<RecordsTab>('expenses');
  const [language, setLanguage] = useState<SupportedLanguage>('auto');
  const [noiseFilterEnabled, setNoiseFilterEnabled] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Unable to load farm database');
      const data = (await res.json()) as AppDatabaseState;
      setDbState(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load application state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const liveVoice = useLiveVoice({
    language,
    noiseFilterEnabled,
    onDatabaseUpdate: (nextState) => {
      setDbState(nextState);
    },
  });

  const handleGrantConsent = async (consent: boolean) => {
    const res = await fetch('/api/farmer/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent_given: consent }),
    });
    const data = await res.json();
    if (data.state) setDbState(data.state);
  };

  const handleSaveProfile = async (payload: Partial<FarmerProfile>) => {
    const res = await fetch('/api/farmer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update profile');
    }
    if (data.state) setDbState(data.state);
  };

  const handleAddExpense = async (payload: {
    amount: number;
    category: FarmExpense['category'];
    date: string;
    description: string;
  }) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add expense');
    }
    if (data.state) setDbState(data.state);
  };

  const handleAddReminder = async (payload: { task: string; date: string; time: string }) => {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create reminder');
    }
    if (data.state) setDbState(data.state);
  };

  const handleCompleteReminder = async (id: string) => {
    const res = await fetch(`/api/reminders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    const data = await res.json();
    if (data.state) setDbState(data.state);
  };

  const handleCancelReminder = async (id: string) => {
    const res = await fetch(`/api/reminders/${encodeURIComponent(id)}?confirmed=true`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.state) setDbState(data.state);
  };

  const handleAddCropReport = async (payload: {
    crop: string;
    symptoms: string;
    location: string;
    severity: 'low' | 'moderate' | 'high';
  }) => {
    const res = await fetch('/api/crop-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to record crop report');
    }
    if (data.state) setDbState(data.state);
  };

  const handleQuickAction = (
    action: 'expense' | 'reminder' | 'crop' | 'weather' | 'market' | 'records'
  ) => {
    if (action === 'expense') {
      setRecordsTab('expenses');
      setActiveSection('records');
    } else if (action === 'reminder') {
      setRecordsTab('reminders');
      setActiveSection('records');
    } else if (action === 'crop') {
      setRecordsTab('crops');
      setActiveSection('records');
    } else if (action === 'records') {
      setRecordsTab('activity');
      setActiveSection('records');
    } else if (action === 'weather' || action === 'market') {
      setActiveSection('market');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-44 rounded-xl bg-slate-200" />
            <div className="h-80 rounded-xl bg-slate-200" />
          </div>
        ) : loadError || !dbState ? (
          <div className="bg-white border border-red-200 rounded-xl p-6 text-sm text-red-800 space-y-3">
            <div className="font-semibold">Failed to load BharatSathi AI backend state</div>
            <p>{loadError || 'Unknown error'}</p>
            <button
              type="button"
              onClick={() => void fetchState()}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeSection === 'voice' && (
              <>
                <VoiceAssistantPanel
                  farmer={dbState.farmer}
                  status={liveVoice.status}
                  errorMessage={liveVoice.errorMessage}
                  transcript={liveVoice.transcript}
                  micLevel={liveVoice.micLevel}
                  speakerLevel={liveVoice.speakerLevel}
                  lastLatencyMs={liveVoice.lastLatencyMs}
                  language={language}
                  onLanguageChange={setLanguage}
                  noiseFilterEnabled={noiseFilterEnabled}
                  onToggleNoiseFilter={() => setNoiseFilterEnabled((v) => !v)}
                  isMicMuted={liveVoice.isMicMuted}
                  onToggleMute={() => liveVoice.setIsMicMuted((m) => !m)}
                  onGrantConsent={handleGrantConsent}
                  onStartVoice={liveVoice.startConversation}
                  onStopVoice={liveVoice.stopConversation}
                  onInterrupt={liveVoice.interruptAssistant}
                  onSendPrompt={liveVoice.sendVoiceOrTextPrompt}
                  onClearTranscript={liveVoice.clearTranscript}
                  onQuickAction={handleQuickAction}
                />

                {/* Compact Live Snapshot right below Voice Studio for immediate visibility */}
                <FarmRecordsSection
                  state={dbState}
                  activeTab={recordsTab}
                  onTabChange={setRecordsTab}
                  onAddExpense={handleAddExpense}
                  onAddReminder={handleAddReminder}
                  onCompleteReminder={handleCompleteReminder}
                  onCancelReminder={handleCancelReminder}
                  onAddCropReport={handleAddCropReport}
                />
              </>
            )}

            {activeSection === 'records' && (
              <FarmRecordsSection
                state={dbState}
                activeTab={recordsTab}
                onTabChange={setRecordsTab}
                onAddExpense={handleAddExpense}
                onAddReminder={handleAddReminder}
                onCompleteReminder={handleCompleteReminder}
                onCancelReminder={handleCancelReminder}
                onAddCropReport={handleAddCropReport}
              />
            )}

            {activeSection === 'market' && (
              <div className="space-y-8">
                <CycloneDisasterSection
                  defaultLocation={`${dbState.farmer.district}, ${dbState.farmer.state}`}
                  onAskAssistant={async (prompt, langLabel) => {
                    setActiveSection('voice');
                    await liveVoice.sendVoiceOrTextPrompt(prompt, langLabel);
                  }}
                />
                <ClimateResiliencePlaybook
                  onAskAssistant={async (prompt, langLabel) => {
                    setActiveSection('voice');
                    await liveVoice.sendVoiceOrTextPrompt(prompt, langLabel);
                  }}
                />
                <WeatherMandiSection
                  defaultLocation={`${dbState.farmer.district}, ${dbState.farmer.state}`}
                  marketPrices={dbState.marketPrices}
                />
              </div>
            )}

            {activeSection === 'impact' && (
              <PerformanceArchitectureSection state={dbState} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <span>
            BharatSathi AI · Team Bharat Innovation (Leader: Shaik Mulla Sadik)
          </span>
          <span>
            Open Innovation — Real-Time Multilingual Voice AI with Google Gemini
          </span>
        </div>
      </footer>

      {dbState && (
        <FarmerProfileModal
          farmer={dbState.farmer}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
