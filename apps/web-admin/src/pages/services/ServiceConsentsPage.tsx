import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { logger } from '../../utils/logger';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import {
  servicesApi,
  Service,
  ConsentRequirement,
  ConsentRequirementListResponse,
  CreateConsentRequirementDto,
  UpdateConsentRequirementDto,
} from '../../api/services';

const CONSENT_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'MARKETING',
  'DATA_COLLECTION',
  'THIRD_PARTY_SHARING',
  'COOKIES',
  'AGE_VERIFICATION',
  'NEWSLETTER',
  'PUSH_NOTIFICATION',
  'LOCATION_TRACKING',
];

const DOCUMENT_TYPES = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'COOKIE_POLICY',
  'DATA_PROCESSING_AGREEMENT',
  'MARKETING_CONSENT',
  'THIRD_PARTY_DATA_SHARING',
  'AGE_VERIFICATION',
  'NEWSLETTER_SUBSCRIPTION',
  'PUSH_NOTIFICATION_CONSENT',
  'LOCATION_CONSENT',
];

const COUNTRY_CODES = ['KR', 'US', 'JP', 'EU', 'GLOBAL'];

interface EditingRequirement {
  id?: string;
  countryCode: string;
  consentType: string;
  isRequired: boolean;
  documentType: string;
  displayOrder: number;
  labelKey: string;
  descriptionKey: string;
}

const emptyRequirement: EditingRequirement = {
  countryCode: 'KR',
  consentType: 'TERMS_OF_SERVICE',
  isRequired: true,
  documentType: 'TERMS_OF_SERVICE',
  displayOrder: 0,
  labelKey: '',
  descriptionKey: '',
};

export default function ServiceConsentsPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [data, setData] = useState<ConsentRequirementListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRequirement>(emptyRequirement);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serviceId) {
      fetchData();
    }
  }, [serviceId, selectedCountry]);

  const fetchData = async () => {
    if (!serviceId) return;
    setLoading(true);
    setError(null);

    try {
      const [serviceResult, requirementsResult] = await Promise.all([
        servicesApi.getService(serviceId),
        servicesApi.listConsentRequirements(serviceId, selectedCountry || undefined),
      ]);
      setService(serviceResult);
      setData(requirementsResult);
    } catch (err) {
      setError('Failed to load service data');
      logger.error('Operation failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAdd = () => {
    setEditForm({ ...emptyRequirement });
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (req: ConsentRequirement) => {
    setEditForm({
      id: req.id,
      countryCode: req.countryCode,
      consentType: req.consentType,
      isRequired: req.isRequired,
      documentType: req.documentType,
      displayOrder: req.displayOrder,
      labelKey: req.labelKey,
      descriptionKey: req.descriptionKey,
    });
    setEditingId(req.id);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setEditForm(emptyRequirement);
  };

  const handleSave = async () => {
    if (!serviceId) return;
    setSaving(true);

    try {
      if (isAdding) {
        const dto: CreateConsentRequirementDto = {
          countryCode: editForm.countryCode,
          consentType: editForm.consentType,
          isRequired: editForm.isRequired,
          documentType: editForm.documentType,
          displayOrder: editForm.displayOrder,
          labelKey: editForm.labelKey,
          descriptionKey: editForm.descriptionKey,
        };
        await servicesApi.createConsentRequirement(serviceId, dto);
      } else if (editingId) {
        const dto: UpdateConsentRequirementDto = {
          isRequired: editForm.isRequired,
          documentType: editForm.documentType,
          displayOrder: editForm.displayOrder,
          labelKey: editForm.labelKey,
          descriptionKey: editForm.descriptionKey,
        };
        await servicesApi.updateConsentRequirement(serviceId, editingId, dto);
      }
      handleCancelEdit();
      await fetchData();
    } catch (err) {
      logger.error('Operation failed', err);
      setError('Failed to save consent requirement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!serviceId || !confirm('Are you sure you want to delete this consent requirement?')) return;

    try {
      await servicesApi.deleteConsentRequirement(serviceId, id);
      await fetchData();
    } catch (err) {
      logger.error('Operation failed', err);
      setError('Failed to delete consent requirement');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/services"
          className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {service?.name || 'Service'} - Consent Requirements
          </h1>
          <p className="text-theme-text-secondary mt-1">
            Manage required and optional consents for this service
          </p>
        </div>
        <button
          onClick={handleStartAdd}
          disabled={isAdding}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus size={18} />
          <span>Add Consent</span>
        </button>
      </div>

      {/* Country Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-theme-text-secondary">Filter by country:</label>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
        >
          <option value="">All Countries</option>
          {COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
          <h2 className="text-lg font-semibold text-theme-text-primary mb-4">
            Add New Consent Requirement
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Country Code
              </label>
              <select
                value={editForm.countryCode}
                onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value })}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Consent Type
              </label>
              <select
                value={editForm.consentType}
                onChange={(e) => setEditForm({ ...editForm, consentType: e.target.value })}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              >
                {CONSENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Document Type
              </label>
              <select
                value={editForm.documentType}
                onChange={(e) => setEditForm({ ...editForm, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Required
              </label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={editForm.isRequired}
                    onChange={() => setEditForm({ ...editForm, isRequired: true })}
                    className="w-4 h-4"
                  />
                  <span className="text-theme-text-primary">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!editForm.isRequired}
                    onChange={() => setEditForm({ ...editForm, isRequired: false })}
                    className="w-4 h-4"
                  />
                  <span className="text-theme-text-primary">Optional</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={editForm.displayOrder}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })
                }
                min="0"
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Label Key
              </label>
              <input
                type="text"
                value={editForm.labelKey}
                onChange={(e) => setEditForm({ ...editForm, labelKey: e.target.value })}
                placeholder="e.g., consent.terms.label"
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                Description Key
              </label>
              <input
                type="text"
                value={editForm.descriptionKey}
                onChange={(e) => setEditForm({ ...editForm, descriptionKey: e.target.value })}
                placeholder="e.g., consent.terms.description"
                className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-bg-card text-theme-text-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editForm.labelKey || !editForm.descriptionKey}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save</span>
            </button>
          </div>
        </div>
      )}

      {/* Consent Requirements Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Consent Type</th>
                <th>Document Type</th>
                <th>Required</th>
                <th>Order</th>
                <th>Label Key</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((req) =>
                editingId === req.id ? (
                  <tr key={req.id} className="bg-theme-bg-secondary">
                    <td>
                      <code className="px-2 py-1 bg-theme-bg-page rounded text-sm">
                        {req.countryCode}
                      </code>
                    </td>
                    <td>
                      <code className="px-2 py-1 bg-theme-bg-page rounded text-sm">
                        {req.consentType}
                      </code>
                    </td>
                    <td>
                      <select
                        value={editForm.documentType}
                        onChange={(e) => setEditForm({ ...editForm, documentType: e.target.value })}
                        className="px-2 py-1 border border-theme-border-default rounded bg-theme-bg-card text-theme-text-primary text-sm"
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={editForm.isRequired}
                            onChange={() => setEditForm({ ...editForm, isRequired: true })}
                            className="w-3 h-3"
                          />
                          <span className="text-sm">Yes</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={!editForm.isRequired}
                            onChange={() => setEditForm({ ...editForm, isRequired: false })}
                            className="w-3 h-3"
                          />
                          <span className="text-sm">No</span>
                        </label>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={editForm.displayOrder}
                        onChange={(e) =>
                          setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                        className="w-16 px-2 py-1 border border-theme-border-default rounded bg-theme-bg-card text-theme-text-primary text-sm"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={editForm.labelKey}
                        onChange={(e) => setEditForm({ ...editForm, labelKey: e.target.value })}
                        className="w-full px-2 py-1 border border-theme-border-default rounded bg-theme-bg-card text-theme-text-primary text-sm"
                      />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 hover:bg-theme-bg-page rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={req.id}>
                    <td>
                      <code className="px-2 py-1 bg-theme-bg-secondary rounded text-sm">
                        {req.countryCode}
                      </code>
                    </td>
                    <td>
                      <span className="text-theme-text-primary">
                        {req.consentType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="text-theme-text-secondary text-sm">
                        {req.documentType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {req.isRequired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                          <CheckCircle size={14} />
                          Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          <XCircle size={14} />
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="text-theme-text-secondary">{req.displayOrder}</td>
                    <td>
                      <code className="px-2 py-1 bg-theme-bg-secondary rounded text-xs">
                        {req.labelKey}
                      </code>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEdit(req)}
                          className="p-1.5 hover:bg-theme-bg-secondary rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-theme-text-secondary">
                    No consent requirements found. Click "Add Consent" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
