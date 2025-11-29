# Mobile App (Flutter)

> Cross-platform mobile application for my-girok built with Flutter

## Purpose

Single codebase mobile app for both iOS and Android using Flutter for maximum code reuse, rapid development, and consistent UX across platforms.

## Tech Stack

- **Framework**: Flutter 3.24+
- **Language**: Dart 3.5+
- **State Management**: Riverpod (recommended) or Provider
- **Networking**: Dio with interceptors
- **Storage**: flutter_secure_storage, Hive/Isar
- **Navigation**: go_router
- **Min iOS**: 12.0+
- **Min Android SDK**: 21 (Android 5.0)

## Project Structure

```
apps/mobile-flutter/
├── lib/
│   ├── main.dart              # App entry point
│   ├── app.dart               # Root widget with MaterialApp
│   ├── core/                  # Core utilities
│   │   ├── api/              # API client, interceptors
│   │   ├── storage/          # Secure storage, local DB
│   │   ├── routing/          # Navigation config
│   │   └── constants/        # Constants, config
│   ├── features/             # Feature-based organization
│   │   ├── auth/
│   │   │   ├── data/        # Repositories, data sources
│   │   │   ├── domain/      # Entities, use cases
│   │   │   └── presentation/# Pages, widgets, providers
│   │   ├── home/
│   │   ├── resume/
│   │   └── profile/
│   ├── shared/               # Shared widgets, utilities
│   │   ├── widgets/         # Reusable UI components
│   │   ├── models/          # Data models
│   │   └── utils/           # Helper functions
│   └── theme/               # App theme, colors
├── test/                     # Unit & widget tests
├── integration_test/         # Integration tests
├── pubspec.yaml
├── android/
├── ios/
└── web/                     # Optional web support
```

## Dependencies

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.5.0

  # Networking
  dio: ^5.4.0
  retrofit: ^4.1.0

  # Local Storage
  flutter_secure_storage: ^9.0.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0

  # Navigation
  go_router: ^13.2.0

  # UI
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.10

  # Utilities
  freezed_annotation: ^2.4.1
  json_annotation: ^4.8.1
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.8
  freezed: ^2.4.7
  json_serializable: ^6.7.1
  retrofit_generator: ^8.1.0
```

## API Client (Dio + Retrofit)

```dart
// core/api/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String baseUrl = 'https://mobile-bff.mygirok.dev/api';

  late final Dio _dio;
  final FlutterSecureStorage _storage;

  ApiClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add JWT token
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 - refresh token
          if (error.response?.statusCode == 401) {
            if (await _refreshToken()) {
              // Retry the original request
              final opts = error.requestOptions;
              final token = await _storage.read(key: 'access_token');
              opts.headers['Authorization'] = 'Bearer $token';

              try {
                final response = await _dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final accessToken = response.data['accessToken'];
      final newRefreshToken = response.data['refreshToken'];

      await _storage.write(key: 'access_token', value: accessToken);
      if (newRefreshToken != null) {
        await _storage.write(key: 'refresh_token', value: newRefreshToken);
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  Dio get dio => _dio;
}

// core/api/endpoints.dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';

part 'endpoints.g.dart';

@RestApi()
abstract class ApiEndpoints {
  factory ApiEndpoints(Dio dio, {String baseUrl}) = _ApiEndpoints;

  // Auth
  @POST('/auth/login')
  Future<LoginResponse> login(@Body() LoginRequest request);

  @POST('/auth/register')
  Future<LoginResponse> register(@Body() RegisterRequest request);

  @POST('/auth/refresh')
  Future<TokenResponse> refresh(@Body() RefreshRequest request);

  // Home Feed
  @GET('/home')
  Future<HomeFeed> getHomeFeed();

  // Resume
  @GET('/resume/my')
  Future<List<Resume>> getMyResumes();

  @GET('/resume/{id}')
  Future<Resume> getResume(@Path('id') String id);

  @POST('/resume')
  Future<Resume> createResume(@Body() CreateResumeRequest request);

  @PUT('/resume/{id}')
  Future<Resume> updateResume(
    @Path('id') String id,
    @Body() UpdateResumeRequest request,
  );

  @DELETE('/resume/{id}')
  Future<void> deleteResume(@Path('id') String id);
}
```

## Secure Storage

```dart
// core/storage/secure_storage_service.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService(this._storage);

  // iOS: Keychain
  // Android: EncryptedSharedPreferences (AES256)
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _accessTokenKey, value: token);
  }

  Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null;
  }
}
```

## Data Models (Freezed)

```dart
// shared/models/user.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String email,
    String? name,
    String? avatar,
    required DateTime createdAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

// shared/models/resume.dart
@freezed
class Resume with _$Resume {
  const factory Resume({
    required String id,
    required String userId,
    required String title,
    String? description,
    required bool isDefault,
    required PaperSize paperSize,
    required String name,
    String? email,
    String? phone,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Resume;

  factory Resume.fromJson(Map<String, dynamic> json) => _$ResumeFromJson(json);
}

enum PaperSize {
  @JsonValue('A4')
  a4,
  @JsonValue('LETTER')
  letter,
}
```

## State Management (Riverpod)

```dart
// features/auth/presentation/providers/auth_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(secureStorageProvider),
  );
});

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState.initial()) {
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    final isAuth = await _repository.isAuthenticated();
    if (isAuth) {
      state = const AuthState.authenticated();
    } else {
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> login(String email, String password) async {
    state = const AuthState.loading();

    try {
      final response = await _repository.login(email, password);
      await _repository.saveTokens(
        response.accessToken,
        response.refreshToken,
      );
      state = const AuthState.authenticated();
    } catch (e) {
      state = AuthState.error(e.toString());
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState.unauthenticated();
  }
}

@freezed
class AuthState with _$AuthState {
  const factory AuthState.initial() = _Initial;
  const factory AuthState.loading() = _Loading;
  const factory AuthState.authenticated() = _Authenticated;
  const factory AuthState.unauthenticated() = _Unauthenticated;
  const factory AuthState.error(String message) = _Error;
}
```

## UI Screens

```dart
// features/auth/presentation/pages/login_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (_formKey.currentState!.validate()) {
      ref.read(authStateProvider.notifier).login(
        _emailController.text,
        _passwordController.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    // Navigate to home when authenticated
    ref.listen(authStateProvider, (previous, next) {
      next.whenOrNull(
        authenticated: () => context.go('/home'),
      );
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              if (authState is _Error)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: Text(
                    authState.message,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: authState is _Loading ? null : _handleLogin,
                  child: authState is _Loading
                      ? const CircularProgressIndicator()
                      : const Text('Login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// features/home/presentation/pages/home_page.dart
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedAsync = ref.watch(homeFeedProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Girok'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              ref.read(authStateProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: feedAsync.when(
        data: (feed) => RefreshIndicator(
          onRefresh: () => ref.refresh(homeFeedProvider.future),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              UserProfileCard(user: feed.user),
              const SizedBox(height: 16),
              StatsCard(stats: feed.stats),
              const SizedBox(height: 16),
              ...feed.posts.map((post) => PostCard(post: post)),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }
}
```

## Routing (go_router)

```dart
// core/routing/app_router.dart
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuth = authState is _Authenticated;
      final isLoggingIn = state.location == '/login';

      // Not authenticated and not on login page -> redirect to login
      if (!isAuth && !isLoggingIn) {
        return '/login';
      }

      // Authenticated and on login page -> redirect to home
      if (isAuth && isLoggingIn) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/resume',
        builder: (context, state) => const MyResumePage(),
        routes: [
          GoRoute(
            path: 'edit/:id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ResumeEditPage(id: id);
            },
          ),
        ],
      ),
    ],
  );
});
```

## Theme

```dart
// theme/app_theme.dart
import 'package:flutter/material.dart';

class AppTheme {
  // Library/book theme colors matching web design
  static const Color primaryAmber900 = Color(0xFF78350F);
  static const Color primaryAmber700 = Color(0xFFB45309);
  static const Color primaryAmber600 = Color(0xFFD97706);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryAmber700,
      primary: primaryAmber700,
      secondary: primaryAmber600,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: primaryAmber900,
      elevation: 0,
    ),
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),
  );
}
```

## Integration Points

### Outgoing
- **mobile-bff**: Primary API (`https://mobile-bff.mygirok.dev/api`)

### Environment Config

```dart
// core/constants/config.dart
class Config {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://mobile-bff.mygirok.dev/api',
  );

  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'production',
  );
}
```

## Performance

- **Image Caching**: CachedNetworkImage with memory & disk cache
- **Pagination**: Infinite scroll with ListView.builder
- **Offline First**: Hive for local data persistence
- **Lazy Loading**: Deferred loading of heavy features
- **Code Splitting**: Separate bundles for web

## Security

- **Secure Storage**:
  - iOS: Keychain (kSecAttrAccessibleWhenUnlocked)
  - Android: EncryptedSharedPreferences (AES256-GCM)
- **Network Security**: Certificate pinning (optional)
- **Biometric Auth**: local_auth package (Face ID/Touch ID/Fingerprint)
- **Code Obfuscation**: Built-in Dart obfuscation

## Platform-Specific Features

```dart
// Check platform
import 'dart:io' show Platform;

if (Platform.isIOS) {
  // iOS-specific code
} else if (Platform.isAndroid) {
  // Android-specific code
}

// Or use flutter/foundation
import 'package:flutter/foundation.dart';

if (defaultTargetPlatform == TargetPlatform.iOS) {
  // iOS
} else if (defaultTargetPlatform == TargetPlatform.android) {
  // Android
}
```

## Testing

```dart
// test/features/auth/auth_repository_test.dart
void main() {
  group('AuthRepository', () {
    late AuthRepository repository;
    late MockApiClient mockApi;
    late MockSecureStorage mockStorage;

    setUp(() {
      mockApi = MockApiClient();
      mockStorage = MockSecureStorage();
      repository = AuthRepository(mockApi, mockStorage);
    });

    test('login saves tokens on success', () async {
      // Arrange
      when(() => mockApi.login(any()))
          .thenAnswer((_) async => LoginResponse(
                accessToken: 'access',
                refreshToken: 'refresh',
              ));

      // Act
      await repository.login('test@test.com', 'password');

      // Assert
      verify(() => mockStorage.saveAccessToken('access')).called(1);
      verify(() => mockStorage.saveRefreshToken('refresh')).called(1);
    });
  });
}
```

## Build & Run

```bash
# Install dependencies
flutter pub get

# Run code generation
flutter pub run build_runner build --delete-conflicting-outputs

# Run on iOS
flutter run -d ios

# Run on Android
flutter run -d android

# Build release
flutter build apk --release  # Android
flutter build ipa --release  # iOS

# Run tests
flutter test
flutter test integration_test/
```

## Deployment

### iOS (App Store)
- Build with `flutter build ipa`
- Upload to App Store Connect via Xcode or Transporter
- TestFlight for beta testing

### Android (Play Store)
- Build with `flutter build appbundle`
- Upload to Google Play Console
- Internal testing track for beta

### CI/CD
- GitHub Actions for automated builds
- Fastlane for deployment automation
- CodeMagic or Codemagic for Flutter-specific CI/CD
