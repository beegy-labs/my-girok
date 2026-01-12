/**
 * PrivacyControls Component
 *
 * Advanced privacy controls for session recordings
 */

import { useState } from 'react';
import { Eye, EyeOff, Plus, X, Save } from 'lucide-react';
import { Card } from './atoms/Card';

export interface PrivacyRule {
  id: string;
  selector: string;
  maskType: 'block' | 'blur' | 'redact';
  enabled: boolean;
  description?: string;
}

export interface PrivacyControlsProps {
  serviceSlug: string;
  rules: PrivacyRule[];
  onSave: (rules: PrivacyRule[]) => Promise<void>;
}

export function PrivacyControls({
  serviceSlug,
  rules: initialRules,
  onSave,
}: PrivacyControlsProps) {
  const [rules, setRules] = useState<PrivacyRule[]>(initialRules);
  const [newRule, setNewRule] = useState<Partial<PrivacyRule>>({
    selector: '',
    maskType: 'block',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddRule = () => {
    if (!newRule.selector) return;

    const rule: PrivacyRule = {
      id: `rule-${Date.now()}`,
      selector: newRule.selector,
      maskType: newRule.maskType || 'block',
      enabled: true,
      description: newRule.description,
    };

    setRules([...rules, rule]);
    setNewRule({ selector: '', maskType: 'block', enabled: true });
    setShowAddForm(false);
  };

  const handleRemoveRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rules);
    } finally {
      setSaving(false);
    }
  };

  const presetRules: Array<{ label: string; selector: string; maskType: PrivacyRule['maskType'] }> =
    [
      { label: 'All Inputs', selector: 'input', maskType: 'redact' },
      { label: 'Passwords', selector: 'input[type="password"]', maskType: 'block' },
      { label: 'Email Fields', selector: 'input[type="email"]', maskType: 'redact' },
      { label: 'Credit Card Fields', selector: 'input[data-card]', maskType: 'block' },
      { label: 'SSN Fields', selector: 'input[data-ssn]', maskType: 'block' },
      { label: 'Phone Numbers', selector: 'input[type="tel"]', maskType: 'redact' },
    ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-theme-text-primary">Privacy Controls</h2>
          <p className="text-sm text-theme-text-secondary mt-1">
            Configure which elements are masked in session recordings for {serviceSlug}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
      </div>

      {/* Preset Rules */}
      <Card>
        <h3 className="text-sm font-medium text-theme-text-primary mb-3">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {presetRules.map((preset) => (
            <button
              key={preset.selector}
              onClick={() => {
                const exists = rules.some((r) => r.selector === preset.selector);
                if (!exists) {
                  setRules([
                    ...rules,
                    {
                      id: `rule-${Date.now()}-${Math.random()}`,
                      ...preset,
                      enabled: true,
                    },
                  ]);
                }
              }}
              className="px-3 py-1.5 text-sm border border-theme-border-default rounded-lg hover:bg-theme-background-secondary transition-colors"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Active Rules */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-theme-text-primary">
            Active Rules ({rules.length})
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-theme-border-default rounded-lg hover:bg-theme-background-secondary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Custom Rule
          </button>
        </div>

        {/* Add Rule Form */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-theme-background-secondary rounded-lg border border-theme-border-default">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-theme-text-primary mb-1">
                  CSS Selector
                </label>
                <input
                  type="text"
                  value={newRule.selector}
                  onChange={(e) => setNewRule({ ...newRule, selector: e.target.value })}
                  placeholder="e.g., .sensitive-data, #credit-card"
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-primary mb-1">
                  Mask Type
                </label>
                <select
                  value={newRule.maskType}
                  onChange={(e) =>
                    setNewRule({ ...newRule, maskType: e.target.value as PrivacyRule['maskType'] })
                  }
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary"
                >
                  <option value="block">Block (Hide completely)</option>
                  <option value="blur">Blur (Obscure)</option>
                  <option value="redact">Redact (Replace with ****)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-primary mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newRule.description || ''}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="e.g., Masks credit card input fields"
                  className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.selector}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Add Rule
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-background-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="space-y-2">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-theme-text-tertiary text-sm">
              No privacy rules configured. Add rules to protect sensitive data.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 p-3 border border-theme-border-default rounded-lg hover:bg-theme-background-secondary transition-colors"
              >
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  {rule.enabled ? (
                    <Eye className="w-5 h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-red-600" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-theme-text-primary">
                      {rule.selector}
                    </code>
                    <span className="px-2 py-0.5 bg-theme-background-tertiary text-theme-text-secondary text-xs rounded">
                      {rule.maskType}
                    </span>
                  </div>
                  {rule.description && (
                    <div className="text-xs text-theme-text-tertiary mt-1">{rule.description}</div>
                  )}
                </div>

                <button
                  onClick={() => handleRemoveRule(rule.id)}
                  className="text-theme-text-tertiary hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* PII Detection */}
      <Card>
        <h3 className="text-sm font-medium text-theme-text-primary mb-3">
          Automatic PII Detection
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-theme-border-default rounded-lg cursor-pointer hover:bg-theme-background-secondary transition-colors">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <div className="flex-1">
              <div className="text-sm font-medium text-theme-text-primary">
                Detect and redact email addresses
              </div>
              <div className="text-xs text-theme-text-tertiary">
                Automatically redacts text matching email patterns
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-theme-border-default rounded-lg cursor-pointer hover:bg-theme-background-secondary transition-colors">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <div className="flex-1">
              <div className="text-sm font-medium text-theme-text-primary">
                Detect and redact phone numbers
              </div>
              <div className="text-xs text-theme-text-tertiary">
                Automatically redacts text matching phone number patterns
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-theme-border-default rounded-lg cursor-pointer hover:bg-theme-background-secondary transition-colors">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <div className="flex-1">
              <div className="text-sm font-medium text-theme-text-primary">
                Detect and block credit card numbers
              </div>
              <div className="text-xs text-theme-text-tertiary">
                Automatically blocks text matching credit card patterns
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-theme-border-default rounded-lg cursor-pointer hover:bg-theme-background-secondary transition-colors">
            <input type="checkbox" className="w-4 h-4" />
            <div className="flex-1">
              <div className="text-sm font-medium text-theme-text-primary">
                Detect and redact SSN/Government IDs
              </div>
              <div className="text-xs text-theme-text-tertiary">
                Automatically redacts social security and government ID numbers
              </div>
            </div>
          </label>
        </div>
      </Card>
    </div>
  );
}
