import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Save, Loader2, AlertCircle, Eye, Code } from 'lucide-react';
import { legalApi, CreateDocumentRequest, UpdateDocumentRequest } from '../../api/legal';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import MarkdownEditor from '../../components/MarkdownEditor';

const DOCUMENT_TYPES = [
  { value: 'TERMS_OF_SERVICE', label: 'Terms of Service' },
  { value: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'THIRD_PARTY', label: 'Third Party' },
  { value: 'LOCATION', label: 'Location' },
] as const;

const LOCALES = [
  { value: 'ko', label: 'Korean' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
];

export default function DocumentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [type, setType] = useState<CreateDocumentRequest['type']>('TERMS_OF_SERVICE');
  const [version, setVersion] = useState('1.0.0');
  const [locale, setLocale] = useState('ko');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const fetchDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const doc = await legalApi.getDocument(id!);
      setType(doc.type);
      setVersion(doc.version);
      setLocale(doc.locale);
      setTitle(doc.title);
      setContent(doc.content);
      setSummary(doc.summary || '');
      setEffectiveDate(doc.effectiveDate.split('T')[0]);
      setIsActive(doc.isActive);
    } catch (err) {
      setError('Failed to load document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        const data: CreateDocumentRequest = {
          type,
          version,
          locale,
          title,
          content,
          summary: summary || undefined,
          effectiveDate: new Date(effectiveDate).toISOString(),
        };
        await legalApi.createDocument(data);
      } else {
        const data: UpdateDocumentRequest = {
          title,
          content,
          summary: summary || undefined,
          effectiveDate: new Date(effectiveDate).toISOString(),
          isActive,
        };
        await legalApi.updateDocument(id!, data);
      }

      navigate('/legal/documents');
    } catch (err) {
      setError(isNew ? 'Failed to create document' : 'Failed to update document');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = isNew ? hasPermission('legal:create') : hasPermission('legal:update');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/legal/documents"
          className="p-2 hover:bg-theme-bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text-secondary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-theme-text-primary">
            {isNew ? 'Create Document' : 'Edit Document'}
          </h1>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-4 py-2 border border-theme-border-default rounded-lg transition-colors ${
            showPreview ? 'bg-theme-primary text-btn-primary-text' : 'hover:bg-theme-bg-secondary'
          }`}
        >
          {showPreview ? <Code size={18} /> : <Eye size={18} />}
          <span>{showPreview ? 'Edit' : 'Preview'}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadata */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">Document Metadata</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text-primary mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CreateDocumentRequest['type'])}
                disabled={!isNew}
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary disabled:opacity-50"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text-primary mb-2">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={!isNew}
                placeholder="1.0.0"
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text-primary mb-2">
                Locale
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                disabled={!isNew}
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary disabled:opacity-50"
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text-primary mb-2">
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
              />
            </div>
          </div>

          {!isNew && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-theme-border-default text-theme-primary"
              />
              <label htmlFor="isActive" className="text-sm text-theme-text-primary">
                Active (visible to users)
              </label>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-text-primary">Content</h2>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter document title"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              Summary (optional)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Brief summary of the document"
              className="w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              Content (Markdown)
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              showPreview={showPreview}
              placeholder="Write document content in Markdown..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/legal/documents"
            className="px-6 py-3 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary transition-colors"
          >
            Cancel
          </Link>
          {canEdit && (
            <button
              type="submit"
              disabled={saving || !title || !content}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
