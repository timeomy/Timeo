import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/auth/auth_state.dart';
import '../../../core/providers/tenant_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/timeo_logo.dart';

class PostLoginScreen extends ConsumerStatefulWidget {
  const PostLoginScreen({super.key});

  @override
  ConsumerState<PostLoginScreen> createState() => _PostLoginScreenState();
}

class _PostLoginScreenState extends ConsumerState<PostLoginScreen>
    with SingleTickerProviderStateMixin {
  bool _routed = false;
  String _statusText = 'Connecting...';
  double _progress = 0.0;
  late AnimationController _progressController;

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

    setState(() {
      _statusText = 'Setting up your account...';
      _progress = 0.7;
    });

    final storage = const FlutterSecureStorage();

    Future<void> selectTenant(dynamic tenant) async {
      ref.read(activeTenantProvider.notifier).state = tenant;
      await storage.write(key: 'last_tenant_id', value: tenant.id);
      final tenantRole = tenant.role as String?;
      if (tenantRole != null) {
        await ref.read(authProvider.notifier).updateRole(tenantRole);
      }
    }

    if (tenants.isNotEmpty) {
      if (tenants.length == 1) {
        await selectTenant(tenants.first);
      } else {
        final lastTenantId = await storage.read(key: 'last_tenant_id');
        if (lastTenantId != null) {
          final saved = tenants.cast<dynamic>().where((t) => t.id == lastTenantId).toList();
          if (saved.isNotEmpty) {
            await selectTenant(saved.first);
          } else {
            await selectTenant(tenants.first);
          }
        } else {
          await selectTenant(tenants.first);
        }
      }
    }

    if (!mounted) return;
    setState(() {
      _statusText = 'Almost ready...';
      _progress = 0.9;
    });

    await Future.delayed(const Duration(milliseconds: 300));

    if (!mounted) return;
    final role = ref.read(authProvider).role;
    context.go(_homeForRole(role));
  }

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..forward();

    // Animate progress text
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) setState(() { _statusText = 'Loading your businesses...'; _progress = 0.3; });
    });
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted && !_routed) setState(() { _statusText = 'Fetching your data...'; _progress = 0.5; });
    });

    // Safety timeout — 4 seconds max
    Future.delayed(const Duration(seconds: 2), () {
      if (!_routed && mounted) {
        _routed = true;
        debugPrint('[PostLogin] Timeout — routing');
        final authState = ref.read(authProvider);
        if (authState.status == AuthStatus.authenticated) {
          context.go(_homeForRole(authState.role));
        } else {
          context.go('/explore');
        }
      }
    });
  }

  @override
  void dispose() {
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tenantsAsync = ref.watch(tenantsProvider);

    // Trigger routing when data arrives
    tenantsAsync.whenData((tenants) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _routeWhenReady(tenants));
    });

    // On error, route anyway
    if (tenantsAsync.hasError && !_routed) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_routed && mounted) {
          _routed = true;
          final role = ref.read(authProvider).role;
          context.go(_homeForRole(role));
        }
      });
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const TimeoLogo(size: 72),
            const SizedBox(height: 32),
            // Progress bar
            SizedBox(
              width: 200,
              child: AnimatedBuilder(
                animation: _progressController,
                builder: (context, child) {
                  final animProgress = _progress > 0 ? _progress : _progressController.value * 0.3;
                  return Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: animProgress,
                          backgroundColor: Colors.white.withValues(alpha: 0.1),
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                          minHeight: 4,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _statusText,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${(animProgress * 100).toInt()}%',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.3),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
