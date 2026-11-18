import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { FarmerProfile } from '../types.ts';

interface FarmerProfileModalProps {
  farmer: FarmerProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Partial<FarmerProfile>) => Promise<void>;
}

export function FarmerProfileModal({
  farmer,
  isOpen,
  onClose,
  onSave,
}: FarmerProfileModalProps) {
  const [name, setName] = useState(farmer.name);
  const [village, setVillage] = useState(farmer.village);
  const [district, setDistrict] = useState(farmer.district);
  const [stateName, setStateName] = useState(farmer.state);
  const [preferredLanguage, setPreferredLanguage] = useState(farmer.preferred_language);
  const [farmAcres, setFarmAcres] = useState(String(farmer.farm_acres));
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionConfirmed) {
      setError('Please confirm permission before updating the farmer profile.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        village: village.trim(),
        district: district.trim(),
        state: stateName.trim(),
        preferred_language: preferredLanguage,
        farm_acres: Number(farmAcres) || farmer.farm_acres,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-profile-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src="/src/assets/images/avatar_farmer_profile_1794973152441.jpg"
              alt={farmer.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <h2 id="farmer-profile-title" className="font-display text-lg font-semibold text-slate-900">
                Farmer Profile & Preferences
              </h2>
              <p className="text-xs text-slate-500">
                ID {farmer.id} · Updated {new Date(farmer.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Farmer Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) =>
                  setPreferredLanguage(e.target.value as FarmerProfile['preferred_language'])
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="English">English</option>
                <option value="Telugu-English">Telugu-English (Code-Switched)</option>
                <option value="Hinglish">Hinglish (Hindi-English)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Village</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">District</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
              <input
                type="text"
                required
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Farm Size (Acres)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={farmAcres}
                onChange={(e) => setFarmAcres(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={permissionConfirmed}
              onChange={(e) => setPermissionConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              <strong className="font-semibold text-slate-900">Permission Confirmation:</strong> I authorize BharatSathi AI to update and store my farmer profile and language preferences in the farm database.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
