import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/public_tenant.dart';

const _baseUrl = 'https://api.timeo.my';

final _publicDio = Dio(BaseOptions(baseUrl: _baseUrl));

/// Fetches publicly listed tenants. No auth required.
/// Pass a search query string, or null for all.
final publicTenantsProvider =
    FutureProvider.family<List<PublicTenant>, String?>((ref, search) async {
  final params = <String, dynamic>{};
  if (search != null && search.trim().isNotEmpty) {
    params['search'] = search.trim();
  }

  final response =
      await _publicDio.get('/api/tenants/public', queryParameters: params);

  final data = response.data;
  List<dynamic> tenants;

  if (data is List) {
    tenants = data;
  } else if (data is Map<String, dynamic>) {
    tenants = data['data'] as List<dynamic>? ??
        data['tenants'] as List<dynamic>? ??
        [];
  } else {
    tenants = [];
  }

  return tenants
      .map((t) => PublicTenant.fromJson(t as Map<String, dynamic>))
      .toList();
});

/// Fetches a single public tenant by slug.
final publicTenantBySlugProvider =
    FutureProvider.family<PublicTenant?, String>((ref, slug) async {
  try {
    final response = await _publicDio.get('/api/tenants/by-slug/$slug');
    final data = response.data;

    if (data is Map<String, dynamic>) {
      final tenantData = data['data'] as Map<String, dynamic>? ?? data;
      return PublicTenant.fromJson(tenantData);
    }
    return null;
  } on DioException {
    return null;
  }
});

/// Join a tenant (requires auth). Called after sign-up/login.
final joinTenantProvider =
    FutureProvider.family<bool, String>((ref, slug) async {
  try {
    // This needs auth, so use the api client with cookies
    final response = await _publicDio.post(
      '/api/tenants/join',
      data: {'slug': slug},
    );
    return response.statusCode == 200 || response.statusCode == 201;
  } catch (_) {
    return false;
  }
});
