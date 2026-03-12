import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client_provider.dart';

class UserStats {
  final int visitsThisMonth;
  final int visitsThisWeek;
  final int visitsToday;

  const UserStats({
    this.visitsThisMonth = 0,
    this.visitsThisWeek = 0,
    this.visitsToday = 0,
  });
}

/// Fetches check-in stats for a tenant.
/// API: GET /api/tenants/:tenantId/check-ins/stats
/// Note: This endpoint requires admin/staff role.
/// For regular members, it will return null gracefully.
final statsProvider =
    FutureProvider.family<UserStats?, String>((ref, tenantId) async {
  final api = ref.read(apiClientProvider);
  try {
    final r = await api.get('/api/tenants/$tenantId/check-ins/stats');
    final body = r.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>? ?? {};

    return UserStats(
      visitsThisMonth: (data['monthCount'] as num?)?.toInt() ?? 0,
      visitsThisWeek: (data['thisWeek'] as num?)?.toInt() ?? 0,
      visitsToday: (data['today'] as num?)?.toInt() ?? 0,
    );
  } catch (_) {
    // Endpoint may require admin role — return null for regular members
    return null;
  }
});
