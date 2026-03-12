import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';

/// Shown briefly after login to fetch tenants and decide where to route.
class PostLoginScreen extends ConsumerStatefulWidget {
  const PostLoginScreen({super.key});

  @override
  ConsumerState<PostLoginScreen> createState() => _PostLoginScreenState();
}

class _PostLoginScreenState extends ConsumerState<PostLoginScreen> {
  bool _routed = false;

  /// Route to the correct home screen based on user role.
  static String _homeForRole(String? role) {
    switch (role) {
      case 'admin':
        return '/admin-home';
      case 'staff':
        return '/coach-home';
      default:
        return '/home';
    }
  }

  Future<void> _routeWhenReady(List<dynamic> tenants) async {
    if (_routed || !mounted) return;
    _routed = true;

    final authState = ref.read(authProvider);
    final role = authState.role;
    final storage = const FlutterSecureStorage();

    if (tenants.length == 1) {
      ref.read(activeTenantProvider.notifier).state = tenants.first;
      await storage.write(key: 'last_tenant_id', value: tenants.first.id);
      if (mounted) context.go(_homeForRole(role));
      return;
    }

    if (tenants.length > 1) {
      // Check for a previously saved tenant selection
      final lastTenantId = await storage.read(key: 'last_tenant_id');
      if (lastTenantId != null) {
        final saved = tenants.cast<dynamic>().where((t) => t.id == lastTenantId).toList();
        if (saved.isNotEmpty) {
          ref.read(activeTenantProvider.notifier).state = saved.first;
          if (mounted) context.go(_homeForRole(role));
          return;
        }
      }
      // Auto-select first tenant and go to home (user can switch later via header)
      ref.read(activeTenantProvider.notifier).state = tenants.first;
      await storage.write(key: 'last_tenant_id', value: tenants.first.id);
      if (mounted) context.go(_homeForRole(role));
      return;
    }

    // No tenants
    if (mounted) context.go(_homeForRole(role));
  }

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);

    return tenantsAsync.when(
      loading: () => const Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) {
        final role = ref.read(authProvider).role;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) context.go(_homeForRole(role));
        });
        return const Scaffold(
          backgroundColor: AppTheme.background,
          body: Center(child: CircularProgressIndicator()),
        );
      },
      data: (tenants) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _routeWhenReady(tenants));
        return const Scaffold(
          backgroundColor: AppTheme.background,
          body: Center(child: CircularProgressIndicator()),
        );
      },
    );
  }
}
