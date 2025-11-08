import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to My-Girok Auth Test
        </h1>

        {isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              Hello, <span className="font-semibold">{user?.name || user?.email}</span>!
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h2 className="font-semibold text-blue-800 mb-2">Your Account Info</h2>
              <ul className="space-y-1 text-sm text-gray-700">
                <li><strong>Email:</strong> {user?.email}</li>
                <li><strong>Role:</strong> <span className="bg-blue-100 px-2 py-0.5 rounded">{user?.role}</span></li>
                <li><strong>User ID:</strong> <code className="bg-gray-100 px-1">{user?.id}</code></li>
              </ul>
            </div>
            <div className="flex gap-4 mt-6">
              <Link
                to="/public"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md"
              >
                Visit Public Page
              </Link>
              <Link
                to="/protected"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
              >
                Visit Protected Page
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              This is a test application for My-Girok authentication system.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h2 className="font-semibold text-yellow-800 mb-2">Features</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>User Registration & Login</li>
                <li>JWT Token-based Authentication</li>
                <li>Role-based Access Control (GUEST, USER, MANAGER, MASTER)</li>
                <li>OAuth Provider Management (Google, Kakao, Naver)</li>
                <li>Public and Protected Pages</li>
              </ul>
            </div>
            <div className="flex gap-4 mt-6">
              <Link
                to="/register"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
              >
                Get Started - Register
              </Link>
              <Link
                to="/login"
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md"
              >
                Already have an account? Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
