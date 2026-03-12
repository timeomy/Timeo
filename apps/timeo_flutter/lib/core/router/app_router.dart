import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_state.dart';
import '../theme/app_theme.dart';
import '../../features/auth/screens/sign_in_screen.dart';
import '../../features/auth/screens/sign_up_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/qr_code/screens/qr_screen.dart';
import '../../features/membership/screens/membership_screen.dart';
import '../../features/membership/screens/plan_selection_screen.dart';
import '../../features/membership/screens/payment_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/select_shop/screens/select_shop_screen.dart';
import '../../features/auth/screens/post_login_screen.dart';
import '../../features/profile/screens/edit_profile_screen.dart';
import '../../features/profile/screens/order_history_screen.dart';
import '../../features/profile/screens/change_password_screen.dart';
import '../../features/bookings/screens/bookings_screen.dart';
import '../../features/membership/screens/package_detail_screen.dart';
import '../../features/admin/screens/admin_home_screen.dart';
import '../../features/admin/screens/admin_members_screen.dart';
import '../../features/admin/screens/admin_checkins_screen.dart';
import '../../features/coach/screens/coach_home_screen.dart';
import '../providers/packages_provider.dart' show MembershipPlan;

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuthenticated = authState.status == AuthStatus.authenticated;
      final isSplash = state.matchedLocation == '/splash';
      final isAuthRoute = state.matchedLocation == '/sign-in' ||
          state.matchedLocation == '/sign-up';
      final isSelectShop = state.matchedLocation == '/select-shop';
      final isPostLogin = state.matchedLocation == '/post-login';
      final isAdminRoute = state.matchedLocation.startsWith('/admin');
      final isCoachRoute = state.matchedLocation.startsWith('/coach');

      if (isSplash) return null;
      if (!isAuthenticated && !isAuthRoute) {
        return '/sign-in';
      }
      if (isAuthenticated && isAuthRoute) {
        return '/post-login';
      }
      if (isAuthenticated && state.matchedLocation == '/') {
        final role = authState.role;
        if (role == 'admin') return '/admin-home';
        if (role == 'staff') return '/coach-home';
        return '/home';
      }
      // Allow role-specific, select-shop, and post-login routes
      if (isAuthenticated &&
          (isSelectShop || isPostLogin || isAdminRoute || isCoachRoute)) {
        return null;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => SplashScreen(
          onComplete: () => context.go('/sign-in'),
        ),
      ),
      GoRoute(
        path: '/',
        redirect: (_, __) => '/home',
      ),
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: '/sign-up',
        builder: (context, state) => const SignUpScreen(),
      ),
      // Standalone routes (no bottom nav)
      GoRoute(
        path: '/plans',
        builder: (context, state) => const PlanSelectionScreen(),
      ),
      GoRoute(
        path: '/payment',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return PaymentScreen(
            planName: extra?['planName'] ?? 'Membership Plan',
            amount: (extra?['amount'] as num?)?.toDouble() ?? 0.0,
            currency: extra?['currency'] ?? 'RM',
          );
        },
      ),
      // Post-login: fetch tenants and decide routing
      GoRoute(
        path: '/post-login',
        builder: (context, state) => const PostLoginScreen(),
      ),
      // Select shop (post-login, multiple tenants)
      GoRoute(
        path: '/select-shop',
        builder: (context, state) => const SelectShopScreen(),
      ),
      // Profile sub-screens
      GoRoute(
        path: '/edit-profile',
        builder: (context, state) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/order-history',
        builder: (context, state) => const OrderHistoryScreen(),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: '/bookings',
        builder: (context, state) => const BookingsScreen(),
      ),
      GoRoute(
        path: '/package-detail',
        builder: (context, state) {
          final plan = state.extra as MembershipPlan?;
          if (plan == null) {
            return const Scaffold(
              body: Center(child: Text('Plan not found')),
            );
          }
          return PackageDetailScreen(plan: plan);
        },
      ),
      // Admin routes
      GoRoute(
        path: '/admin-home',
        builder: (context, state) => const AdminHomeScreen(),
      ),
      GoRoute(
        path: '/admin-members',
        builder: (context, state) => const AdminMembersScreen(),
      ),
      GoRoute(
        path: '/admin-checkins',
        builder: (context, state) => const AdminCheckinsScreen(),
      ),
      // Coach routes
      GoRoute(
        path: '/coach-home',
        builder: (context, state) => const CoachHomeScreen(),
      ),
      // Shell with bottom nav
      ShellRoute(
        builder: (context, state, child) => HomeShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: '/membership',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MembershipScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
    ],
  );
});

/// Shell widget with bottom nav bar + center QR FAB
class HomeShell extends StatelessWidget {
  final Widget child;
  const HomeShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final currentIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      extendBody: true,
      floatingActionButton: _buildQrFab(context),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        color: const Color(0xFF111120),
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        padding: EdgeInsets.zero,
        height: 64,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavItem(
              icon: Icons.home_rounded,
              label: 'Home',
              isActive: currentIndex == 0,
              onTap: () => context.go('/home'),
            ),
            _NavItem(
              icon: Icons.calendar_today_rounded,
              label: 'Bookings',
              isActive: false,
              onTap: () => context.push('/bookings'),
            ),
            // Spacer for center FAB
            const SizedBox(width: 48),
            _NavItem(
              icon: Icons.card_membership_rounded,
              label: 'Membership',
              isActive: currentIndex == 1,
              onTap: () => context.go('/membership'),
            ),
            _NavItem(
              icon: Icons.person_rounded,
              label: 'Profile',
              isActive: currentIndex == 2,
              onTap: () => context.go('/profile'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQrFab(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.5),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: FloatingActionButton(
        onPressed: () {
          // Show QR as a modal bottom sheet
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: AppTheme.background,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            builder: (_) => SizedBox(
              height: MediaQuery.of(context).size.height * 0.85,
              child: const QrScreen(),
            ),
          );
        },
        backgroundColor: AppTheme.primary,
        elevation: 0,
        shape: const CircleBorder(),
        child: const Icon(Icons.qr_code_rounded, color: Colors.white, size: 30),
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/membership')) return 1;
    if (location.startsWith('/profile')) return 2;
    return 0;
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? AppTheme.primary : AppTheme.onSurfaceMuted,
              size: 22,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppTheme.primary : AppTheme.onSurfaceMuted,
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
