import { useAuthStore } from '../stores/authStore';

export default function PublicPage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">🌍</span>
          <h1 className="text-3xl font-bold text-gray-800">Public Page</h1>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-green-800 font-medium">
            ✅ This page is accessible to everyone (including guests)
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-700">
            This is a public page that can be accessed by anyone, whether they are logged in or not.
          </p>

          {isAuthenticated ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-blue-800 font-medium mb-2">You are logged in as:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li><strong>Name:</strong> {user?.name}</li>
                <li><strong>Email:</strong> {user?.email}</li>
                <li><strong>Role:</strong> <span className="bg-blue-100 px-2 py-0.5 rounded">{user?.role}</span></li>
              </ul>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-800 font-medium">
                You are currently browsing as a guest.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Register or login to access protected features!
              </p>
            </div>
          )}

          <div className="border-t pt-4 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Public Content
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600">
                This section contains publicly available information that anyone can view.
                No authentication is required to see this content.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Public announcements</li>
                <li>General information</li>
                <li>Frequently asked questions</li>
                <li>Contact information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
