import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  status: 'active' | 'coming-soon';
}

const apps: AppCard[] = [
  {
    id: 'resume',
    name: '이력서',
    description: '나의 커리어를 기록하고 관리하세요',
    icon: '📄',
    route: '/resume/my',
    color: 'bg-amber-700',
    status: 'active',
  },
  {
    id: 'blog',
    name: '블로그',
    description: '나의 생각과 글을 기록하세요',
    icon: '✍️',
    route: '/apps/blog',
    color: 'bg-amber-600',
    status: 'coming-soon',
  },
  {
    id: 'budget',
    name: '가계부',
    description: '나의 소비 내역을 기록하세요',
    icon: '💰',
    route: '/apps/budget',
    color: 'bg-amber-800',
    status: 'coming-soon',
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto">
      {isAuthenticated ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-2xl sm:text-3xl">📚</span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900 break-words">
                {user?.name || user?.username}님의 기록장
              </h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600 ml-8 sm:ml-10 lg:ml-12">
              오늘도 나에 대한 기록을 시작해보세요
            </p>
          </div>

          {/* Apps Grid */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-amber-900 mb-4 flex items-center gap-2">
              <span>📖</span>
              기록 종류
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={app.status === 'active' ? app.route : '#'}
                  className={`block bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-4 sm:p-6 transition-all ${
                    app.status === 'coming-soon'
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:shadow-xl hover:-translate-y-1 hover:border-amber-300'
                  }`}
                  onClick={(e) => app.status === 'coming-soon' && e.preventDefault()}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`text-4xl sm:text-5xl p-2 sm:p-3`}>
                      {app.icon}
                    </div>
                    {app.status === 'coming-soon' && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 rounded-full font-medium whitespace-nowrap">
                        준비중
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">{app.name}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">{app.description}</p>
                  {app.status === 'active' && (
                    <div className="mt-3 sm:mt-4 text-amber-700 font-semibold text-xs sm:text-sm flex items-center gap-1">
                      기록하러 가기 →
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-900 mb-3 sm:mb-4">빠른 링크</h2>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link
                to={`/${user?.username}`}
                className="text-amber-700 hover:text-amber-800 hover:underline font-medium text-sm sm:text-base flex items-center gap-1"
              >
                <span>🔗</span>
                내 공개 프로필 보기
              </Link>
              <Link
                to="/settings"
                className="text-gray-600 hover:text-gray-700 hover:underline font-medium text-sm sm:text-base flex items-center gap-1"
              >
                <span>⚙️</span>
                설정
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-xl p-6 sm:p-8 lg:p-12 text-center">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <span className="text-5xl sm:text-6xl">📚</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-amber-900 mb-3 sm:mb-4">
              My-Girok
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8">
              나에 대한 모든 것을 기록하세요<br />
              <span className="text-gray-600 text-sm sm:text-base">이력서, 블로그, 가계부를 한 곳에서</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold shadow-lg shadow-amber-700/30 transform hover:scale-105 transition-all"
              >
                기록장 만들기
              </Link>
              <Link
                to="/login"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold border border-gray-300 transform hover:scale-105 transition-all"
              >
                로그인
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-amber-900 mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
              <span>📖</span>
              기록할 수 있는 것들
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {apps.map((app) => (
                <div key={app.id} className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-4 sm:p-6">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{app.icon}</div>
                  <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">{app.name}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">{app.description}</p>
                  {app.status === 'coming-soon' && (
                    <span className="inline-block mt-2 sm:mt-3 text-xs bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 rounded-full font-medium">
                      준비중
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
