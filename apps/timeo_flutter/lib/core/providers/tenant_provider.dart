import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';
import '../models/tenant.dart';
import 'api_client_provider.dart';

// All tenants the user belongs to
final tenantsProvider = FutureProvider<List<Tenant>>((ref) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get('/api/tenants/mine');
  final data = response.data as Map<String, dynamic>;
  final payload = data['data'] as Map<String, dynamic>? ?? data;
  final tenants = payload['tenants'] as List<dynamic>? ?? [];
  return tenants
      .map((t) => Tenant.fromJson(t as Map<String, dynamic>))
      .toList();
});

// Currently active tenant
final activeTenantProvider = StateProvider<Tenant?>((ref) => null);

// Current tenant ID for API calls
final activeTenantIdProvider = Provider<String?>((ref) {
  return ref.watch(activeTenantProvider)?.id;
});

/// Mock tenants for demo mode — exported so other files can reuse.
List<Tenant> getDemoTenants() {
  return [
    Tenant(
      id: '7Kw87VeAnXg4qDXi6UTbu',
      name: 'WS Fitness',
      slug: 'ws-fitness',
      role: 'customer',
      branding: {'primaryColor': '#0066FF', 'industry': 'fitness'},
    ),
    Tenant(
      id: 'b1b1b1b1-0001-4001-b001-b1b1b1b1b101',
      name: 'Bloom Wellness Studio',
      slug: 'bloom-wellness',
      role: 'customer',
      branding: {'primaryColor': '#7C3AED', 'industry': 'wellness'},
    ),
    Tenant(
      id: 'c2c2c2c2-0002-4002-c002-c2c2c2c2c202',
      name: 'Velocity Coworks',
      slug: 'velocity-coworks',
      role: 'customer',
      branding: {'primaryColor': '#0EA5E9', 'industry': 'coworking'},
    ),
    Tenant(
      id: 'd3d3d3d3-0003-4003-d003-d3d3d3d3d303',
      name: 'Petal Beauty Salon',
      slug: 'petal-beauty',
      role: 'customer',
      branding: {'primaryColor': '#EC4899', 'industry': 'salon'},
    ),
  ];
}
