import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { legalApi, LegalDocument, DocumentListResponse } from '../../api/legal';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { FilterBar } from '../../components/molecules/FilterBar';
import { Select } from '../../components/atoms/Select';
import { logger } from '../../utils/logger';
import { getDocumentTypeOptions, getLocaleOptions } from '../../config/legal.config';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuthStore();

  // SSOT: Use config-based options
  const documentTypeOptions = useMemo(() => getDocumentTypeOptions(t), [t]);
  const localeOptions = useMemo(() => getLocaleOptions(t), [t]);

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    documentId: string | null;
  }>({ isOpen: false, documentId: null });

  // Filters
  const [type, setType] = useState('');
  const [locale, setLocale] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: DocumentListResponse = await legalApi.listDocuments({
        page,
        limit: 20,
        type: type || undefined,
        locale: locale || undefined,
        isActive,
      });

      setDocuments(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(t('legal.loadFailed'));
      logger.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  }, [page, type, locale, isActive, t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteDialog({ isOpen: true, documentId: id });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.documentId) return;

    setDeleting(deleteDialog.documentId);
    try {
      await legalApi.deleteDocument(deleteDialog.documentId);
      fetchDocuments();
    } catch (err) {
      setError(t('legal.deleteFailed'));
      logger.error('Failed to delete document', err);
    } finally {
      setDeleting(null);
      setDeleteDialog({ isOpen: false, documentId: null });
    }
  }, [deleteDialog.documentId, fetchDocuments, t]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({ isOpen: false, documentId: null });
  }, []);

  const canCreate = hasPermission('legal:create');
  const canEdit = hasPermission('legal:update');
  const canDelete = hasPermission('legal:delete');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{t('legal.documents')}</h1>
          <p className="text-theme-text-secondary mt-1">{t('legal.documentsDescription')}</p>
        </div>
        {canCreate && (
          <Link
            to="/legal/documents/new"
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>{t('legal.newDocument')}</span>
          </Link>
        )}
      </div>

      {/* Filters */}
      <FilterBar summary={t('legal.documentCount', { count: total })}>
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          options={documentTypeOptions}
        />
        <Select
          value={locale}
          onChange={(e) => {
            setLocale(e.target.value);
            setPage(1);
          }}
          options={localeOptions}
        />
        <Select
          value={isActive === undefined ? '' : isActive.toString()}
          onChange={(e) => {
            setIsActive(e.target.value === '' ? undefined : e.target.value === 'true');
            setPage(1);
          }}
          options={[
            { value: '', label: t('common.allStatus') },
            { value: 'true', label: t('common.active') },
            { value: 'false', label: t('common.inactive') },
          ]}
        />
      </FilterBar>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-theme-status-error-bg text-theme-status-error-text rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('legal.type')}</th>
              <th>{t('legal.title')}</th>
              <th>{t('legal.version')}</th>
              <th>{t('legal.locale')}</th>
              <th>{t('common.status')}</th>
              <th>{t('legal.effectiveDate')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-theme-text-tertiary" />
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-theme-text-tertiary">
                  {t('legal.noDocuments')}
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="px-2 py-1 bg-theme-bg-secondary rounded text-xs font-medium">
                      {doc.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="font-medium text-theme-text-primary">{doc.title}</td>
                  <td className="text-theme-text-secondary">v{doc.version}</td>
                  <td className="uppercase text-theme-text-secondary">{doc.locale}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.isActive
                          ? 'bg-theme-status-success-bg text-theme-status-success-text'
                          : 'bg-theme-bg-secondary text-theme-text-secondary'
                      }`}
                    >
                      {doc.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="text-theme-text-secondary">
                    {new Date(doc.effectiveDate).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/legal/documents/${doc.id}`)}
                          className="p-2 text-theme-text-secondary hover:text-theme-primary hover:bg-theme-bg-secondary rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteClick(doc.id)}
                          disabled={deleting === doc.id}
                          className="p-2 text-theme-text-secondary hover:text-theme-status-error-text hover:bg-theme-status-error-bg rounded-lg transition-colors disabled:opacity-50"
                          title={t('common.delete')}
                        >
                          {deleting === doc.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.previous')}
          </button>
          <span className="px-4 py-2 text-theme-text-secondary">
            {t('common.page', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={t('legal.deleteConfirm')}
        message={t('legal.deleteMessage')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleting === deleteDialog.documentId}
      />
    </div>
  );
}
