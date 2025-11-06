import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { getCurrentUser } from '../api/auth';

export default function ProtectedPage() {
  const { user } = useAuthStore();
  const [serverUser, setServerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await getCurrentUser();
        setServerUser(userData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">🔒</span>
          <h1 className="text-3xl font-bold text-gray-800">Protected Page</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p className="text-blue-800 font-medium">
            🔐 This page requires authentication - Only logged-in users can access this page
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h2 className="font-semibold text-green-800 mb-3">
              ✅ Authentication Successful
            </h2>
            <p className="text-sm text-gray-700 mb-3">
              You successfully accessed this protected page. Here's your user information:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded p-3">
                <h3 className="font-medium text-gray-700 mb-2">Client-side (Zustand Store)</h3>
                <ul className="space-y-1 text-sm">
                  <li><strong>Name:</strong> {user?.name}</li>
                  <li><strong>Email:</strong> {user?.email}</li>
                  <li><strong>Role:</strong> <span className="bg-blue-100 px-2 py-0.5 rounded">{user?.role}</span></li>
                  <li><strong>ID:</strong> <code className="bg-gray-100 px-1 text-xs">{user?.id}</code></li>
                </ul>
              </div>

              <div className="bg-white rounded p-3">
                <h3 className="font-medium text-gray-700 mb-2">Server-side (API Response)</h3>
                {loading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : error ? (
                  <p className="text-sm text-red-600">{error}</p>
                ) : serverUser ? (
                  <ul className="space-y-1 text-sm">
                    <li><strong>Name:</strong> {serverUser.name}</li>
                    <li><strong>Email:</strong> {serverUser.email}</li>
                    <li><strong>Role:</strong> <span className="bg-green-100 px-2 py-0.5 rounded">{serverUser.role}</span></li>
                    <li><strong>Verified:</strong> {serverUser.emailVerified ? '✅ Yes' : '❌ No'}</li>
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Protected Content
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600">
                This is a protected area that only authenticated users can access.
                The content here might include:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>User dashboard</li>
                <li>Personal settings</li>
                <li>Private messages</li>
                <li>Account management</li>
                <li>Exclusive content</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
            <h3 className="font-medium text-purple-800 mb-2">🔐 Access Control</h3>
            <p className="text-sm text-gray-700">
              If you weren't logged in, you would have been redirected to the login page.
              This is implemented using React Router's <code className="bg-purple-100 px-1">PrivateRoute</code> component.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
