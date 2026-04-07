import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client_provider.dart';

class UserStats {
  final int visitsThisMonth;
  final int visitsThisWeek;
  final int totalVisits;
  final DateTime? lastVisit;

  const UserStats({
    this.visitsThisMonth = 0,
    this.visitsThisWeek = 0,
    this.totalVisits = 0,
    this.lastVisit,
  });
}

/// Fetches check-in stats for the authenticated member.
/// API: GET /api/tenants/:tenantId/check-ins/stats/me
final statsProvider =
    FutureProvider.family<UserStats?, String>((ref, tenantId) async {
  final api = ref.read(apiClientProvider);
  try {
    final r = await api.get('/api/tenants/$tenantId/check-ins/stats/me');
    final body = r.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>? ?? {};

    final lastVisitStr = data['lastVisit'] as String?;
    final lastVisit = lastVisitStr != null ? DateTime.tryParse(lastVisitStr) : null;

    return UserStats(
      visitsThisMonth: (data['thisMonth'] as num?)?.toInt() ?? 0,
      visitsThisWeek: (data['thisWeek'] as num?)?.toInt() ?? 0,
      totalVisits: (data['totalVisits'] as num?)?.toInt() ?? 0,
      lastVisit: lastVisit,
    );
  } catch (_) {
    return null;
  }
});
