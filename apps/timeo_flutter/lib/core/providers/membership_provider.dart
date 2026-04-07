import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client_provider.dart';

class MembershipData {
  final String id;
  final String planName;
  final double? price;
  final String status;
  final DateTime? periodStart;
  final DateTime? periodEnd;
  final bool isActive;

  const MembershipData({
    required this.id,
    required this.planName,
    required this.status,
    this.price,
    this.periodStart,
    this.periodEnd,
    this.isActive = false,
  });
}

/// Fetches the current user's subscriptions for a given tenant.
/// API: GET /api/tenants/:tenantId/memberships/subscriptions/mine
final membershipProvider =
    FutureProvider.family<MembershipData?, String>((ref, tenantId) async {
  final api = ref.read(apiClientProvider);
  try {
    final r =
        await api.get('/api/tenants/$tenantId/memberships/subscriptions/mine');
    final body = r.data as Map<String, dynamic>;
    final list = body['data'] as List<dynamic>? ?? [];

    if (list.isEmpty) return null;

    // Find the most recent active subscription, or fall back to the first
    Map<String, dynamic>? best;
    for (final item in list) {
      final sub = (item is Map<String, dynamic>)
          ? item['subscription'] as Map<String, dynamic>? ?? item
          : item as Map<String, dynamic>;
      if (sub['status'] == 'active') {
        best = item as Map<String, dynamic>;
        break;
      }
      best ??= item as Map<String, dynamic>;
    }

    if (best == null) return null;

    final sub = best['subscription'] as Map<String, dynamic>? ?? best;
    final plan = best['plan'] as Map<String, dynamic>? ?? {};

    final status = sub['status'] as String? ?? 'unknown';
    DateTime? periodEnd;
    if (sub['current_period_end'] != null) {
      periodEnd = DateTime.tryParse(sub['current_period_end'].toString());
    }

    return MembershipData(
      id: sub['id']?.toString() ?? '',
      planName: plan['name'] as String? ?? 'Membership',
      price: (plan['price'] is num) ? (plan['price'] as num).toDouble() : null,
      status: status,
      periodStart: sub['current_period_start'] != null
          ? DateTime.tryParse(sub['current_period_start'].toString())
          : null,
      periodEnd: periodEnd,
      isActive: status == 'active' &&
          (periodEnd == null || periodEnd.isAfter(DateTime.now())),
    );
  } catch (_) {
    return null;
  }
});

String _getDemoPlanName(String tenantId) {
  if (tenantId == '7Kw87VeAnXg4qDXi6UTbu') return 'All-Access Monthly';
  if (tenantId.contains('b1b1')) return 'All-Access Member';
  if (tenantId.contains('c2c2')) return 'Resident Member';
  if (tenantId.contains('d3d3')) return 'Premium Member';
  return 'Active Member';
}
