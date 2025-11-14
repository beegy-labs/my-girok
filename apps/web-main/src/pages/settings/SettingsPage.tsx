import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/settings/ThemeToggle';
import SectionOrderManager from '../../components/settings/SectionOrderManager';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-amber-700 hover:text-amber-800 mb-4"
          >
            ← 돌아가기
          </Link>
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            ⚙️ 설정
          </h1>
          <p className="text-gray-700">
            사용자 환경을 설정합니다
          </p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="bg-white border border-amber-100 rounded-2xl shadow-md p-6">
            <ThemeToggle />
          </div>

          {/* Section Order Settings */}
          <div className="bg-white border border-amber-100 rounded-2xl shadow-md p-6">
            <SectionOrderManager />
          </div>
        </div>
      </div>
    </div>
  );
}
