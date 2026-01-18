import { Suspense, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Briefcase, Phone, Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@my-girok/ui-components';
import { employeeApi } from '../../api/employees';

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-theme-primary" />
    </div>
  );
}

/**
 * Employee detail data component using Suspense
 */
function EmployeeDetailData({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { data: employee } = useSuspenseQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeeApi.getById(employeeId),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/hr/employees')}
          className="flex items-center gap-2 text-theme-text-secondary hover:text-theme-text-primary"
        >
          <ArrowLeft size={20} />
          <span>{t('hr.employees.backToEmployees')}</span>
        </button>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90"
        >
          {isEditing ? t('common.cancel') : t('common.edit')}
        </button>
      </div>

      {/* Employee Info */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-theme-bg-hover flex items-center justify-center">
              <User size={48} className="text-theme-text-tertiary" />
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-theme-text-primary">
                {employee.displayName || employee.userName || 'Unnamed Employee'}
              </h1>
              <p className="text-theme-text-secondary">{employee.email}</p>
              <div className="mt-2">
                <Badge variant={employee.active ? 'success' : 'default'}>
                  {employee.active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-theme-border-default">
              <InfoItem
                icon={<Briefcase size={18} />}
                label={t('hr.employees.employeeNumber')}
                value={employee.employeeNumber}
              />
              <InfoItem
                icon={<Briefcase size={18} />}
                label={t('hr.employees.department')}
                value={employee.department}
              />
              <InfoItem
                icon={<Briefcase size={18} />}
                label={t('hr.employees.title')}
                value={employee.title}
              />
              <InfoItem
                icon={<User size={18} />}
                label={t('hr.employees.organization')}
                value={employee.organization}
              />
              <InfoItem
                icon={<Phone size={18} />}
                label={t('hr.employees.phone')}
                value={employee.phoneNumber}
              />
              <InfoItem
                icon={<Phone size={18} />}
                label={t('hr.employees.mobile')}
                value={employee.mobileNumber}
              />
              <InfoItem
                icon={<Calendar size={18} />}
                label={t('hr.employees.locale')}
                value={employee.locale}
              />
              <InfoItem
                icon={<Calendar size={18} />}
                label={t('hr.employees.timezone')}
                value={employee.timezone}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
        <div className="border-b border-theme-border-default">
          <nav className="flex gap-4 px-6">
            <button className="px-4 py-3 border-b-2 border-theme-primary text-theme-primary font-medium">
              {t('hr.employees.personalInfo')}
            </button>
            <Link
              to={`/hr/attendance?employeeId=${employee.id}`}
              className="px-4 py-3 text-theme-text-secondary hover:text-theme-text-primary"
            >
              {t('menu.attendance')}
            </Link>
            <Link
              to={`/hr/leave?employeeId=${employee.id}`}
              className="px-4 py-3 text-theme-text-secondary hover:text-theme-text-primary"
            >
              {t('menu.leave')}
            </Link>
          </nav>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
            {t('hr.employees.personalInformation')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField label={t('hr.employees.givenName')} value={employee.givenName} />
            <InfoField label={t('hr.employees.familyName')} value={employee.familyName} />
            <InfoField label={t('hr.employees.middleName')} value={employee.middleName} />
            <InfoField label={t('hr.employees.nickName')} value={employee.nickName} />
            <InfoField label={t('hr.employees.honorificPrefix')} value={employee.honorificPrefix} />
            <InfoField label={t('hr.employees.honorificSuffix')} value={employee.honorificSuffix} />
            <InfoField
              label={t('hr.employees.preferredLanguage')}
              value={employee.preferredLanguage}
            />
            <InfoField label={t('hr.employees.costCenter')} value={employee.costCenter} />
            <InfoField label={t('hr.employees.division')} value={employee.division} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Employee detail page component
 */
export default function EmployeeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
        <User size={48} className="mb-4 opacity-50" />
        <p>{t('hr.employees.notFound')}</p>
        <Link
          to="/hr/employees"
          className="mt-4 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90"
        >
          {t('hr.employees.backToEmployees')}
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmployeeDetailData employeeId={id} />
    </Suspense>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-theme-text-tertiary">{icon}</div>
      <div>
        <div className="text-xs text-theme-text-tertiary">{label}</div>
        <div className="text-sm text-theme-text-primary">{value || '-'}</div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-theme-text-tertiary mb-1">{label}</label>
      <div className="text-sm text-theme-text-primary px-3 py-2 bg-theme-bg-secondary rounded-lg">
        {value || '-'}
      </div>
    </div>
  );
}
