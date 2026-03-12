import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/api_client_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

class _Subscription {
  final String id;
  final String planName;
  final double amount;
  final String currency;
  final String status;
  final DateTime? createdAt;

  const _Subscription({
    required this.id,
    required this.planName,
    required this.amount,
    required this.currency,
    required this.status,
    this.createdAt,
  });

  factory _Subscription.fromJson(Map<String, dynamic> json) {
    final planMap = json['plan'] as Map<String, dynamic>? ?? {};
    return _Subscription(
      id: json['id']?.toString() ?? '',
      planName: planMap['name'] as String? ??
          json['plan_name'] as String? ??
          'Plan',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse(json['amount']?.toString() ?? '0') ?? 0,
      currency: json['currency'] as String? ?? 'RM',
      status: json['status'] as String? ?? 'active',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

final _orderHistoryProvider =
    FutureProvider.autoDispose.family<List<_Subscription>, String>(
  (ref, tenantId) async {
    final api = ref.read(apiClientProvider);
    final r = await api.get('/api/subscriptions?tenantId=$tenantId');
    final body = r.data as Map<String, dynamic>;
    final list = body['data'] as List<dynamic>? ?? [];
    return list
        .map((e) => _Subscription.fromJson(e as Map<String, dynamic>))
        .toList();
  },
);

class OrderHistoryScreen extends ConsumerWidget {
  const OrderHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tenantId = ref.watch(activeTenantIdProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        title: const Text(
          'Order History',
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: tenantId == null
          ? const Center(
              child: Text(
                'No gym selected',
                style: TextStyle(color: AppTheme.onSurfaceMuted),
              ),
            )
          : ref.watch(_orderHistoryProvider(tenantId)).when(
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppTheme.error, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        'Failed to load orders',
                        style: const TextStyle(color: Colors.white),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () =>
                            ref.invalidate(_orderHistoryProvider(tenantId)),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
                data: (orders) {
                  if (orders.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.receipt_long_rounded,
                            size: 64,
                            color: AppTheme.onSurfaceMuted.withValues(alpha: 0.4),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'No orders yet',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Your purchase history will appear here.',
                            style: TextStyle(color: AppTheme.onSurfaceMuted),
                          ),
                        ],
                      ),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: orders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final order = orders[i];
                      return _OrderCard(order: order);
                    },
                  );
                },
              ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final _Subscription order;
  const _OrderCard({required this.order});

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return AppTheme.success;
      case 'expired':
        return AppTheme.onSurfaceMuted;
      case 'cancelled':
        return AppTheme.error;
      case 'pending':
        return AppTheme.warning;
      default:
        return AppTheme.onSurfaceMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = order.createdAt != null
        ? '${order.createdAt!.day}/${order.createdAt!.month}/${order.createdAt!.year}'
        : '-';
    final symbol = order.currency == 'MYR' ? 'RM' : order.currency;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.surfaceVariant),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.receipt_rounded,
                color: AppTheme.primary, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.planName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  dateStr,
                  style: const TextStyle(
                    color: AppTheme.onSurfaceMuted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$symbol ${order.amount.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _statusColor(order.status).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  order.status.toUpperCase(),
                  style: TextStyle(
                    color: _statusColor(order.status),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
