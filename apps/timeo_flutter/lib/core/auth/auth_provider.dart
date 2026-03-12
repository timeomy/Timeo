import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'auth_state.dart';

const _baseUrl = 'https://api.timeo.my';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final Dio _dio = Dio(BaseOptions(baseUrl: _baseUrl));

  AuthNotifier() : super(const AuthState()) {
    _checkExistingSession();
  }

  Future<void> _safeWrite(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (_) {}
  }

  Future<String?> _safeRead(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  Future<void> _checkExistingSession() async {
    final cookie = await _safeRead('session_cookie');
    final userId = await _safeRead('user_id');
    final memberName = await _safeRead('member_name');
    final role = await _safeRead('user_role');
    if (cookie != null && cookie.isNotEmpty) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        token: cookie,
        memberId: userId,
        memberName: memberName,
        role: role,
      );
    } else {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  /// Extract the session cookie from Set-Cookie headers
  String? _extractSessionCookie(Headers headers) {
    final cookies = headers.map['set-cookie'];
    if (cookies == null) return null;
    for (final c in cookies) {
      // Look for the session token cookie (handles both prefixed and plain)
      if (c.contains('better-auth.session_token=')) {
        // Extract cookie name=value before the first ';'
        final parts = c.split(';').first;
        return parts;
      }
    }
    return null;
  }

  Future<void> signIn(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);

    try {
      final response = await _dio.post(
        '/api/auth/sign-in/email',
        data: {'email': email, 'password': password},
        options: Options(
          headers: {'Content-Type': 'application/json'},
          validateStatus: (s) => s != null && s < 500,
        ),
      );

      final body = response.data as Map<String, dynamic>?;

      if (response.statusCode == 200 && body != null) {
        // Extract session cookie from response headers
        final sessionCookie = _extractSessionCookie(response.headers);

        final user = body['user'] as Map<String, dynamic>? ?? {};
        final userId = user['id'] as String? ?? '';
        final name = user['name'] as String? ?? email;
        // Role is determined post-login via /api/tenants/mine
        final userRole = user['role'] as String? ?? 'customer';

        if (sessionCookie != null && sessionCookie.isNotEmpty) {
          await _safeWrite('session_cookie', sessionCookie);
        }
        await _safeWrite('user_id', userId);
        await _safeWrite('member_name', name);
        await _safeWrite('user_role', userRole);

        state = state.copyWith(
          status: AuthStatus.authenticated,
          token: sessionCookie ?? '',
          memberId: userId,
          memberName: name,
          role: userRole,
        );
      } else {
        final message = body?['message'] as String? ??
            body?['error']?['message'] as String? ??
            body?['error'] as String? ??
            'Invalid email or password.';
        state = state.copyWith(
          status: AuthStatus.unauthenticated,
          error: message,
        );
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] as String? ??
          e.response?.data?['error'] as String? ??
          'Could not connect to server.';
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: msg,
      );
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: 'Sign in failed. Please try again.',
      );
    }
  }

  Future<void> signOut() async {
    try {
      await _storage.deleteAll();
    } catch (_) {}
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}
