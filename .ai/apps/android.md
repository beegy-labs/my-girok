# Android App

> Native Android application for my-girok

## Purpose

Native Android app built with Kotlin Multiplatform and Jetpack Compose for modern, reactive UI.

## Tech Stack

- **Language**: Kotlin
- **UI**: Jetpack Compose
- **Architecture**: MVVM + Clean Architecture
- **Networking**: Ktor Client
- **DI**: Koin
- **Storage**: EncryptedSharedPreferences, Room
- **Min SDK**: 24 (Android 7.0)

## Project Structure

```
apps/mobile/android/
├── app/
│   └── src/
│       ├── main/
│       │   ├── java/com/girok/
│       │   │   ├── ui/          # Compose UI
│       │   │   │   ├── home/
│       │   │   │   ├── login/
│       │   │   │   └── posts/
│       │   │   ├── viewmodel/   # ViewModels
│       │   │   ├── data/        # Repositories
│       │   │   └── di/          # Koin modules
│       │   └── AndroidManifest.xml
│       └── build.gradle.kts
└── shared/                      # KMP shared code
    └── src/
        ├── commonMain/          # Shared business logic
        ├── androidMain/         # Android-specific
        └── iosMain/             # iOS-specific (future)
```

## API Service (Ktor)

```kotlin
// data/api/ApiService.kt
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.auth.*
import io.ktor.client.plugins.auth.providers.*
import io.ktor.serialization.kotlinx.json.*

class ApiService(
    private val tokenManager: TokenManager
) {
    private val baseUrl = "https://mobile-bff.mygirok.dev/api"

    private val client = HttpClient {
        install(ContentNegotiation) {
            json()
        }

        install(Auth) {
            bearer {
                loadTokens {
                    val accessToken = tokenManager.getAccessToken()
                    val refreshToken = tokenManager.getRefreshToken()

                    BearerTokens(
                        accessToken = accessToken ?: "",
                        refreshToken = refreshToken ?: ""
                    )
                }

                refreshTokens {
                    val refreshToken = tokenManager.getRefreshToken() ?: return@refreshTokens null

                    val response: TokenResponse = client.post("$baseUrl/auth/refresh") {
                        setBody(RefreshRequest(refreshToken))
                    }.body()

                    tokenManager.saveAccessToken(response.accessToken)
                    response.refreshToken?.let { tokenManager.saveRefreshToken(it) }

                    BearerTokens(
                        accessToken = response.accessToken,
                        refreshToken = response.refreshToken ?: refreshToken
                    )
                }
            }
        }
    }

    suspend inline fun <reified T> get(endpoint: String): T {
        return client.get("$baseUrl$endpoint").body()
    }

    suspend inline fun <reified T, reified R> post(endpoint: String, body: R): T {
        return client.post("$baseUrl$endpoint") {
            setBody(body)
        }.body()
    }

    suspend inline fun <reified T> delete(endpoint: String): T {
        return client.delete("$baseUrl$endpoint").body()
    }
}
```

## Token Manager (EncryptedSharedPreferences)

```kotlin
// data/local/TokenManager.kt
import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveAccessToken(token: String) {
        sharedPreferences.edit().putString(KEY_ACCESS_TOKEN, token).apply()
    }

    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    fun saveRefreshToken(token: String) {
        sharedPreferences.edit().putString(KEY_REFRESH_TOKEN, token).apply()
    }

    fun getRefreshToken(): String? {
        return sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
    }

    fun clearTokens() {
        sharedPreferences.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .apply()
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
    }
}
```

## Data Models

```kotlin
// data/model/User.kt
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String?,
    val avatar: String?,
    val createdAt: String
)

@Serializable
data class Post(
    val id: String,
    val title: String,
    val excerpt: String?,
    val thumbnail: String?,
    val createdAt: String
)

@Serializable
data class HomeFeed(
    val user: User,
    val posts: List<Post>,
    val stats: UserStats
)

@Serializable
data class UserStats(
    val posts: Int,
    val notes: Int
)
```

## Repository

```kotlin
// data/repository/HomeRepository.kt
class HomeRepository(private val apiService: ApiService) {
    suspend fun getHomeFeed(): Result<HomeFeed> {
        return try {
            val feed = apiService.get<HomeFeed>("/home")
            Result.success(feed)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

## ViewModel

```kotlin
// viewmodel/HomeViewModel.kt
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HomeViewModel(
    private val repository: HomeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadFeed()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading

            repository.getHomeFeed()
                .onSuccess { feed ->
                    _uiState.value = HomeUiState.Success(feed)
                }
                .onFailure { error ->
                    _uiState.value = HomeUiState.Error(error.message ?: "Unknown error")
                }
        }
    }
}

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(val feed: HomeFeed) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}
```

## Compose UI

```kotlin
// ui/home/HomeScreen.kt
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.koin.androidx.compose.koinViewModel

@Composable
fun HomeScreen(
    viewModel: HomeViewModel = koinViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("My Girok") })
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when (val state = uiState) {
                is HomeUiState.Loading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.fillMaxSize()
                    )
                }
                is HomeUiState.Success -> {
                    HomeFeedContent(feed = state.feed)
                }
                is HomeUiState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun HomeFeedContent(feed: HomeFeed) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // User profile
        item {
            UserProfileCard(user = feed.user)
        }

        // Stats
        item {
            StatsRow(stats = feed.stats)
        }

        // Posts
        items(feed.posts) { post ->
            PostCard(post = post)
        }
    }
}

@Composable
fun PostCard(post: Post) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Load image with Coil
            if (post.thumbnail != null) {
                AsyncImage(
                    model = post.thumbnail,
                    contentDescription = post.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = post.title,
                style = MaterialTheme.typography.titleMedium
            )

            post.excerpt?.let { excerpt ->
                Text(
                    text = excerpt,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
```

## Login Screen

```kotlin
// ui/login/LoginScreen.kt
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = koinViewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Login",
            style = MaterialTheme.typography.headlineLarge
        )

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )

        Spacer(modifier = Modifier.height(24.dp))

        if (uiState is LoginUiState.Error) {
            Text(
                text = (uiState as LoginUiState.Error).message,
                color = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        Button(
            onClick = { viewModel.login(email, password) },
            modifier = Modifier.fillMaxWidth(),
            enabled = uiState !is LoginUiState.Loading
        ) {
            if (uiState is LoginUiState.Loading) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Login")
            }
        }
    }

    LaunchedEffect(uiState) {
        if (uiState is LoginUiState.Success) {
            onLoginSuccess()
        }
    }
}
```

## Dependency Injection (Koin)

```kotlin
// di/AppModule.kt
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

val appModule = module {
    // Services
    single { TokenManager(get()) }
    single { ApiService(get()) }

    // Repositories
    single { HomeRepository(get()) }
    single { AuthRepository(get(), get()) }

    // ViewModels
    viewModel { HomeViewModel(get()) }
    viewModel { LoginViewModel(get()) }
}

// Application.kt
class MyGirokApp : Application() {
    override fun onCreate() {
        super.onCreate()

        startKoin {
            androidContext(this@MyGirokApp)
            modules(appModule)
        }
    }
}
```

## Integration Points

### Outgoing
- **mobile-bff**: Primary API (`/api/*`)

### Environment

```kotlin
// BuildConfig or local.properties
object Config {
    const val API_BASE_URL = "https://mobile-bff.mygirok.dev/api"
}
```

## Performance

- Image loading with Coil (caching)
- Paging 3 for lists
- Offline caching with Room
- Coroutines for async operations

## Security

- EncryptedSharedPreferences for tokens (AES256)
- Network Security Config
- ProGuard/R8 obfuscation
- Biometric authentication (BiometricPrompt)
