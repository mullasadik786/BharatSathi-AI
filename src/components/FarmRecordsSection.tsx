import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  ActivityLog,
  AppDatabaseState,
  FarmExpense,
} from '../types.ts';

export type RecordsTab = 'expenses' | 'reminders' | 'crops' | 'activity';

interface FarmRecordsSectionProps {
  state: AppDatabaseState;
  activeTab: RecordsTab;
  onTabChange: (tab: RecordsTab) => void;
  onAddExpense: (payload: {
    amount: number;
    category: FarmExpense['category'];
    date: string;
    description: string;
  }) => Promise<void>;
  onAddReminder: (payload: { task: string; date: string; time: string }) => Promise<void>;
  onCompleteReminder: (id: string) => Promise<void>;
  onCancelReminder: (id: string) => Promise<void>;
  onAddCropReport: (payload: {
    crop: string;
    symptoms: string;
    location: string;
    severity: 'low' | 'moderate' | 'high';
  }) => Promise<void>;
}

const EXPENSE_CATEGORIES: FarmExpense['category'][] = [
  'Fertilizer',
  'Seeds',
  'Labor',
  'Irrigation',
  'Pesticide',
  'Equipment',
  'Transport',
  'Other',
];

export function FarmRecordsSection({
  state,
  activeTab,
  onTabChange,
  onAddExpense,
  onAddReminder,
  onCompleteReminder,
  onCancelReminder,
  onAddCropReport,
}: FarmRecordsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showCropForm, setShowCropForm] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  // Expense Form State
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<FarmExpense['category']>('Fertilizer');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expDesc, setExpDesc] = useState('');

  // Reminder Form State
  const [remTask, setRemTask] = useState('');
  const [remDate, setRemDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [remTime, setRemTime] = useState('06:30');

  // Crop Form State
  const [cropName, setCropName] = useState('');
  const [cropSymptoms, setCropSymptoms] = useState('');
  const [cropLocation, setCropLocation] = useState(`${state.farmer.village} Plot`);
  const [cropSeverity, setCropSeverity] = useState<'low' | 'moderate' | 'high'>('moderate');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const upcomingReminders = state.reminders.filter((r) => r.status === 'upcoming');

  const filteredExpenses = state.expenses.filter((e) => {
    const catOk = categoryFilter === 'ALL' || e.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const qOk =
      !q ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q);
    return catOk && qOk;
  });

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(expAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setFormError('Please enter a valid positive INR amount.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddExpense({
        amount: num,
        category: expCategory,
        date: expDate,
        description: expDesc.trim() || `${expCategory} purchase`,
      });
      setExpAmount('');
      setExpDesc('');
      setShowExpenseForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTask.trim()) {
      setFormError('Please enter an irrigation task description.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddReminder({ task: remTask.trim(), date: remDate, time: remTime });
      setRemTask('');
      setShowReminderForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCropSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim() || !cropSymptoms.trim()) {
      setFormError('Crop name and observed symptoms are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddCropReport({
        crop: cropName.trim(),
        symptoms: cropSymptoms.trim(),
        location: cropLocation.trim(),
        severity: cropSeverity,
      });
      setCropName('');
      setCropSymptoms('');
      setShowCropForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to record crop report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* 4-Column Tabular KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Recorded Expenses</div>
          <div className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {state.expenses.length} ledger transactions
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Upcoming Irrigation Tasks</div>
          <div className="mt-1.5 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {upcomingReminders.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {state.reminders.filter((r) => r.status === 'completed').length} completed
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Crop Issue Reports</div>
          <div className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {state.cropReports.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Educational guidance & KVK referral
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Completed Backend Actions</div>
          <div className="mt-1.5 font-display text-2xl font-bold text-blue-700 tabular-nums">
            {state.metrics.successful_actions}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Avg execution: {state.metrics.avg_action_latency_ms} ms
          </div>
        </div>
      </div>

      {/* Main Records Workspace */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Interactive Segmented Tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'expenses', label: 'Expenses Ledger' },
                { id: 'reminders', label: 'Irrigation Tasks' },
                { id: 'crops', label: 'Crop Reports' },
                { id: 'activity', label: 'Activity History' },
              ] as Array<{ id: RecordsTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onTabChange(tab.id);
                  setFormError(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'expenses' && (
              <button
                type="button"
                onClick={() => setShowExpenseForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            )}
            {activeTab === 'reminders' && (
              <button
                type="button"
                onClick={() => setShowReminderForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Reminder</span>
              </button>
            )}
            {activeTab === 'crops' && (
              <button
                type="button"
                onClick={() => setShowCropForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Report Crop Issue</span>
              </button>
            )}
          </div>
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {formError}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {showExpenseForm && (
              <form
                onSubmit={handleExpenseSubmit}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount (INR)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as FarmExpense['category'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Urea / DAP fertilizer"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search expenses by description, category, or ID..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                No matching expenses found. Add an entry above or speak an expense to BharatSathi AI.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-2.5 px-3">Txn ID</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-500 tabular-nums">{exp.id}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-700 tabular-nums">{exp.date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{exp.category}</td>
                        <td className="py-2.5 px-3 text-slate-600">{exp.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* IRRIGATION REMINDERS TAB */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            {showReminderForm && (
              <form
                onSubmit={handleReminderSubmit}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
              >
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Irrigation / Field Task</label>
                  <input
                    type="text"
                    required
                    value={remTask}
                    onChange={(e) => setRemTask(e.target.value)}
                    placeholder="Irrigate South Paddy Block"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date & Time</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      required
                      value={remDate}
                      onChange={(e) => setRemDate(e.target.value)}
                      className="flex-1 px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      type="time"
                      required
                      value={remTime}
                      onChange={(e) => setRemTime(e.target.value)}
                      className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"
                  >
                    {submitting ? 'Saving...' : 'Schedule'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReminderForm(false)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {pendingCancelId && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>
                    Confirm cancelling irrigation reminder <strong>{pendingCancelId}</strong>? This action updates the reminder status to cancelled.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const target = pendingCancelId;
                      setPendingCancelId(null);
                      await onCancelReminder(target);
                    }}
                    className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    Confirm Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingCancelId(null)}
                    className="px-3 py-1.5 rounded-md border border-amber-300 bg-white text-amber-900 font-medium"
                  >
                    Keep Task
                  </button>
                </div>
              </div>
            )}

            {state.reminders.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                No irrigation reminders scheduled yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {state.reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">{rem.task}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {rem.id} · {rem.date} at {rem.time} · Status:{' '}
                        <span
                          className={
                            rem.status === 'completed'
                              ? 'text-emerald-700 font-semibold'
                              : rem.status === 'cancelled'
                                ? 'text-red-700 font-semibold'
                                : 'text-blue-700 font-semibold'
                          }
                        >
                          {rem.status}
                        </span>
                      </div>
                    </div>

                    {rem.status === 'upcoming' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void onCompleteReminder(rem.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingCancelId(rem.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CROP REPORTS TAB */}
        {activeTab === 'crops' && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900 h-32">
              <img
                src="/src/assets/images/crop_diagnostics_field_1794973746432.jpg"
                alt="Agricultural officer and farmer inspecting paddy and chilli leaves"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                <div className="text-sm font-semibold">Crop Health Log & KVK Expert Guidance</div>
                <p className="text-xs text-slate-200 max-w-xl">
                  AI guidance is strictly educational; serious leaf, stem, or pest symptoms are flagged for verified Krishi Vigyan Kendra (KVK) inspection.
                </p>
              </div>
            </div>

            {showCropForm && (
              <form
                onSubmit={handleCropSubmit}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Crop Name</label>
                  <input
                    type="text"
                    required
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    placeholder="Paddy / Cotton / Chilli"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Observed Symptoms</label>
                  <input
                    type="text"
                    required
                    value={cropSymptoms}
                    onChange={(e) => setCropSymptoms(e.target.value)}
                    placeholder="Yellowing lower leaves / spots"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location & Severity</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cropLocation}
                      onChange={(e) => setCropLocation(e.target.value)}
                      className="flex-1 px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                    <select
                      value={cropSeverity}
                      onChange={(e) => setCropSeverity(e.target.value as 'low' | 'moderate' | 'high')}
                      className="px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"
                  >
                    {submitting ? 'Saving...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCropForm(false)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {state.cropReports.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                No crop issues reported yet.
              </div>
            ) : (
              <div className="space-y-3">
                {state.cropReports.map((rep) => (
                  <div key={rep.id} className="p-4 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-sm text-slate-900">
                        {rep.crop} · {rep.location}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500">
                        {rep.id} · {rep.date} · Severity:{' '}
                        <span
                          className={
                            rep.severity === 'high'
                              ? 'text-red-700 font-semibold'
                              : rep.severity === 'moderate'
                                ? 'text-amber-700 font-semibold'
                                : 'text-emerald-700 font-semibold'
                          }
                        >
                          {rep.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong className="font-medium text-slate-900">Symptoms:</strong> {rep.symptoms}
                    </p>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5 leading-relaxed">
                      {rep.guidance}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY HISTORY TAB */}
        {activeTab === 'activity' && (
          <div className="overflow-x-auto">
            {state.activityLogs.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No backend activity recorded yet.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Tool</th>
                    <th className="py-2.5 px-3">Summary</th>
                    <th className="py-2.5 px-3">Language</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {state.activityLogs.map((log: ActivityLog) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {log.transaction_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-800 whitespace-nowrap">{log.tool_name}</td>
                      <td className="py-2.5 px-3 text-slate-800">{log.summary}</td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{log.language}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={
                            log.status === 'success' || log.status === 'recovered'
                              ? 'text-emerald-700 font-semibold'
                              : log.status === 'needs_confirmation'
                                ? 'text-amber-700 font-semibold'
                                : 'text-red-700 font-semibold'
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {log.latency_ms} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
