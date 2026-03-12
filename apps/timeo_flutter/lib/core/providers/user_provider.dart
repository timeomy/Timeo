import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client_provider.dart';

class UserProfile {
  final String id;
  final String email;
  final String name;
  final String? role;
  final String? avatarUrl;
  final bool forcePasswordReset;
  final DateTime? createdAt;

  const UserProfile({
    required this.id,
    required this.email,
    required this.name,
    this.role,
    this.avatarUrl,
    this.forcePasswordReset = false,
    this.createdAt,
  });
}

/// Fetches current user profile.
/// API: GET /api/users/me
final userProfileProvider = FutureProvider<UserProfile?>((ref) async {
  final api = ref.read(apiClientProvider);
  try {
    final r = await api.get('/api/users/me');
    final body = r.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>? ?? {};

    return UserProfile(
      id: data['id']?.toString() ?? '',
      email: data['email'] as String? ?? '',
      name: data['name'] as String? ?? '',
      role: data['role'] as String?,
      avatarUrl: data['avatar_url'] as String?,
      forcePasswordReset: data['force_password_reset'] as bool? ?? false,
      createdAt: data['created_at'] != null
          ? DateTime.tryParse(data['created_at'].toString())
          : null,
    );
  } catch (_) {
    return null;
  }
});
