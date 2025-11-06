# iOS App

> Native iOS application for my-girok

## Purpose

Native iOS app built with Swift and SwiftUI for optimal performance and native feel.

## Tech Stack

- **Language**: Swift 5.9+
- **UI**: SwiftUI
- **Networking**: URLSession with async/await
- **State**: @Observable (Swift 5.9)
- **Storage**: Keychain, Core Data
- **Min iOS**: 16.0+

## Project Structure

```
apps/mobile/ios/MyGirok/
├── MyGirok/
│   ├── Models/           # Data models
│   ├── Views/            # SwiftUI views
│   ├── ViewModels/       # MVVM view models
│   ├── Services/         # API, Storage services
│   ├── Utils/            # Helpers
│   └── MyGirokApp.swift  # App entry point
└── MyGirok.xcodeproj
```

## API Service

```swift
// Services/APIService.swift
import Foundation

class APIService {
    static let shared = APIService()

    private let baseURL = "https://mobile-bff.mygirok.dev/api"

    func request<T: Decodable>(
        _ endpoint: String,
        method: HTTPMethod = .get,
        body: Encodable? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add JWT token from Keychain
        if let token = KeychainService.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Handle 401 - refresh token
        if httpResponse.statusCode == 401 {
            if try await refreshToken() {
                return try await self.request(endpoint, method: method, body: body)
            }
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    private func refreshToken() async throws -> Bool {
        guard let refreshToken = KeychainService.shared.getRefreshToken() else {
            return false
        }

        struct RefreshRequest: Encodable {
            let refreshToken: String
        }

        struct RefreshResponse: Decodable {
            let accessToken: String
            let refreshToken: String?
        }

        let response: RefreshResponse = try await request(
            "/auth/refresh",
            method: .post,
            body: RefreshRequest(refreshToken: refreshToken)
        )

        KeychainService.shared.saveAccessToken(response.accessToken)
        if let newRefresh = response.refreshToken {
            KeychainService.shared.saveRefreshToken(newRefresh)
        }

        return true
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case httpError(Int)
}
```

## Keychain Service

```swift
// Services/KeychainService.swift
import Security
import Foundation

class KeychainService {
    static let shared = KeychainService()

    private let service = "dev.mygirok.app"

    func saveAccessToken(_ token: String) {
        save(token, forKey: "accessToken")
    }

    func getAccessToken() -> String? {
        return get(forKey: "accessToken")
    }

    func saveRefreshToken(_ token: String) {
        save(token, forKey: "refreshToken")
    }

    func getRefreshToken() -> String? {
        return get(forKey: "refreshToken")
    }

    func clearTokens() {
        delete(forKey: "accessToken")
        delete(forKey: "refreshToken")
    }

    private func save(_ value: String, forKey key: String) {
        let data = value.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    private func get(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    private func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
```

## Data Models

```swift
// Models/User.swift
struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let avatar: String?
    let createdAt: Date
}

// Models/Post.swift
struct Post: Codable, Identifiable {
    let id: String
    let title: String
    let excerpt: String?
    let thumbnail: String?
    let createdAt: Date
}

// Models/HomeFeed.swift
struct HomeFeed: Codable {
    let user: User
    let posts: [Post]
    let stats: UserStats
}

struct UserStats: Codable {
    let posts: Int
    let notes: Int
}
```

## View Models

```swift
// ViewModels/HomeViewModel.swift
import SwiftUI

@Observable
class HomeViewModel {
    var feed: HomeFeed?
    var isLoading = false
    var errorMessage: String?

    func loadFeed() async {
        isLoading = true
        errorMessage = nil

        do {
            feed = try await APIService.shared.request("/home")
        } catch {
            errorMessage = "Failed to load feed: \(error.localizedDescription)"
        }

        isLoading = false
    }
}
```

## Views

```swift
// Views/HomeView.swift
import SwiftUI

struct HomeView: View {
    @State private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let feed = viewModel.feed {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // User profile
                            UserProfileCard(user: feed.user)

                            // Stats
                            StatsRow(stats: feed.stats)

                            // Posts
                            ForEach(feed.posts) { post in
                                PostCard(post: post)
                            }
                        }
                        .padding()
                    }
                } else if let error = viewModel.errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                }
            }
            .navigationTitle("My Girok")
            .task {
                await viewModel.loadFeed()
            }
        }
    }
}

// Views/LoginView.swift
struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 20) {
            Text("Login")
                .font(.largeTitle)

            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)

            if let error = errorMessage {
                Text(error)
                    .foregroundColor(.red)
            }

            Button(action: login) {
                if isLoading {
                    ProgressView()
                } else {
                    Text("Login")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
        }
        .padding()
    }

    private func login() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                struct LoginRequest: Encodable {
                    let email: String
                    let password: String
                }

                struct LoginResponse: Decodable {
                    let accessToken: String
                    let refreshToken: String
                }

                let response: LoginResponse = try await APIService.shared.request(
                    "/auth/login",
                    method: .post,
                    body: LoginRequest(email: email, password: password)
                )

                KeychainService.shared.saveAccessToken(response.accessToken)
                KeychainService.shared.saveRefreshToken(response.refreshToken)

                // Navigate to home (handle via app state)
            } catch {
                errorMessage = error.localizedDescription
            }

            isLoading = false
        }
    }
}
```

## App Entry Point

```swift
// MyGirokApp.swift
import SwiftUI

@main
struct MyGirokApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var isAuthenticated = false

    var body: some View {
        Group {
            if isAuthenticated {
                HomeView()
            } else {
                LoginView()
            }
        }
        .onAppear {
            // Check if token exists
            isAuthenticated = KeychainService.shared.getAccessToken() != nil
        }
    }
}
```

## Image Loading (SDWebImage)

```swift
import SDWebImageSwiftUI

struct PostCard: View {
    let post: Post

    var body: some View {
        VStack(alignment: .leading) {
            if let thumbnail = post.thumbnail, let url = URL(string: thumbnail) {
                WebImage(url: url)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 200)
                    .clipped()
            }

            Text(post.title)
                .font(.headline)

            if let excerpt = post.excerpt {
                Text(excerpt)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}
```

## Integration Points

### Outgoing
- **mobile-bff**: Primary API (`/api/*`)

### Environment

```swift
// Config.swift
enum Config {
    static let apiBaseURL = "https://mobile-bff.mygirok.dev/api"
}
```

## Performance

- Lazy image loading (SDWebImage)
- Background data sync
- Offline caching (Core Data)
- Pagination for lists

## Security

- Keychain for token storage (`kSecAttrAccessibleWhenUnlocked`)
- SSL pinning (optional)
- Biometric authentication (Face ID/Touch ID)
