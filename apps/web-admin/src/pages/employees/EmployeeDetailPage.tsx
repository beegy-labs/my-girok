import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, User, Briefcase, Phone, Calendar, Loader2 } from 'lucide-react';
import { employeeApi, Employee } from '../../api/employees';
import { useApiError } from '../../hooks/useApiError';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { executeWithErrorHandling, isLoading: loading } = useApiError({
    context: 'EmployeeDetailPage.fetchEmployee',
    retry: true,
  });

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    if (!id) return;

    const data = await executeWithErrorHandling(async () => {
      return await employeeApi.getById(id);
    });

    if (data) {
      setEmployee(data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-theme-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-theme-text-tertiary">
        <User size={48} className="mb-4 opacity-50" />
        <p>Employee not found</p>
        <Link
          to="/hr/employees"
          className="mt-4 px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90"
        >
          Back to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/hr/employees')}
          className="flex items-center gap-2 text-theme-text-secondary hover:text-theme-text-primary"
        >
          <ArrowLeft size={20} />
          <span>Back to Employees</span>
        </button>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-theme-primary text-btn-primary-text rounded-lg hover:opacity-90"
        >
          {isEditing ? 'Cancel' : 'Edit'}
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
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {employee.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-theme-border-default">
              <InfoItem
                icon={<Briefcase size={18} />}
                label="Employee Number"
                value={employee.employeeNumber}
              />
              <InfoItem
                icon={<Briefcase size={18} />}
                label="Department"
                value={employee.department}
              />
              <InfoItem icon={<Briefcase size={18} />} label="Title" value={employee.title} />
              <InfoItem
                icon={<User size={18} />}
                label="Organization"
                value={employee.organization}
              />
              <InfoItem icon={<Phone size={18} />} label="Phone" value={employee.phoneNumber} />
              <InfoItem icon={<Phone size={18} />} label="Mobile" value={employee.mobileNumber} />
              <InfoItem icon={<Calendar size={18} />} label="Locale" value={employee.locale} />
              <InfoItem icon={<Calendar size={18} />} label="Timezone" value={employee.timezone} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-theme-bg-card border border-theme-border-default rounded-xl">
        <div className="border-b border-theme-border-default">
          <nav className="flex gap-4 px-6">
            <button className="px-4 py-3 border-b-2 border-theme-primary text-theme-primary font-medium">
              Personal Info
            </button>
            <Link
              to={`/hr/attendance?employeeId=${employee.id}`}
              className="px-4 py-3 text-theme-text-secondary hover:text-theme-text-primary"
            >
              Attendance
            </Link>
            <Link
              to={`/hr/leave?employeeId=${employee.id}`}
              className="px-4 py-3 text-theme-text-secondary hover:text-theme-text-primary"
            >
              Leave
            </Link>
          </nav>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-theme-text-primary mb-4">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField label="Given Name" value={employee.givenName} />
            <InfoField label="Family Name" value={employee.familyName} />
            <InfoField label="Middle Name" value={employee.middleName} />
            <InfoField label="Nick Name" value={employee.nickName} />
            <InfoField label="Honorific Prefix" value={employee.honorificPrefix} />
            <InfoField label="Honorific Suffix" value={employee.honorificSuffix} />
            <InfoField label="Preferred Language" value={employee.preferredLanguage} />
            <InfoField label="Cost Center" value={employee.costCenter} />
            <InfoField label="Division" value={employee.division} />
          </div>
        </div>
      </div>
    </div>
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
