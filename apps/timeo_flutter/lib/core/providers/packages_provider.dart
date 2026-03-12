import 'package:dio/dio.dart' as dio_pkg;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../auth/auth_provider.dart';
import 'api_client_provider.dart';

class MembershipPlan {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String currency;
  final String interval; // 'monthly' | 'yearly'
  final int? durationMonths;
  final String planType;
  final List<String> features;
  final bool isActive;

  const MembershipPlan({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.currency = 'MYR',
    this.interval = 'monthly',
    this.durationMonths,
    this.planType = 'all_access',
    this.features = const [],
    this.isActive = true,
  });

  factory MembershipPlan.fromJson(Map<String, dynamic> json) {
    final featuresList = json['features'];
    List<String> features = [];
    if (featuresList is List) {
      features = featuresList.map((f) => f.toString()).toList();
    }

    // Price is stored in cents — convert to ringgit
    final rawPrice = (json['price'] is num)
        ? (json['price'] as num).toDouble()
        : double.tryParse(json['price']?.toString() ?? '0') ?? 0;
    final priceInRinggit = rawPrice > 1000 ? rawPrice / 100 : rawPrice;

    final interval = json['interval'] as String? ?? 'monthly';
    // duration_months from DB or infer from interval
    int? durationMonths = json['duration_months'] as int?;
    if (durationMonths == null && interval == 'yearly') durationMonths = 12;

    return MembershipPlan(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? 'Plan',
      description: json['description'] as String?,
      price: priceInRinggit,
      currency: json['currency'] as String? ?? 'MYR',
      interval: interval,
      durationMonths: durationMonths,
      planType: json['access_level'] as String? ?? json['plan_type'] as String? ?? 'all_access',
      features: features,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  String get displayDuration {
    if (durationMonths != null) {
      if (durationMonths == 1) return '1 month';
      if (durationMonths == 12) return '1 year';
      return '$durationMonths months';
    }
    return interval == 'yearly' ? '1 year' : '1 month';
  }

  String get displayPrice {
    final symbol = currency == 'MYR' ? 'RM' : currency;
    return '$symbol ${price.toStringAsFixed(2)}';
  }
}

/// Fetches membership plans (packages) for a tenant.
/// API: GET /api/tenants/:tenantId/memberships (public — no auth required)
final packagesProvider =
    FutureProvider.family<List<MembershipPlan>, String>((ref, tenantId) async {
  try {
    // Use unauthenticated Dio call — plans endpoint is public
    final dio = dio_pkg.Dio(dio_pkg.BaseOptions(baseUrl: ApiClient.baseUrl));
    final r = await dio.get('/api/tenants/$tenantId/memberships');
    final body = r.data as Map<String, dynamic>;
    final list = body['data'] as List<dynamic>? ?? [];
    final plans = list
        .map((p) => MembershipPlan.fromJson(p as Map<String, dynamic>))
        .where((p) => p.isActive)
        .toList();
    if (plans.isNotEmpty) return plans;
  } catch (_) {}
  // Fallback to mock if API unreachable
  return _getDemoPackages(tenantId);
});

/// Real WS Fitness membership plans — exact data confirmed by gym owner.
List<MembershipPlan> _getDemoPackages(String tenantId) {
  return [
    // ── 🏋️ Gym Access ──
    MembershipPlan(id: 'OYXHkCMJNaINHCyiHn6D1', name: 'Gym · 1 Month',
        description: 'Unlimited gym access for 1 month', price: 158.0,
        interval: 'monthly', durationMonths: 1, planType: 'gym',
        features: ['Unlimited gym access', 'Locker room']),
    MembershipPlan(id: 'tayqnBblARHMsoSwnypqj', name: 'Gym · 3 Months',
        description: 'Unlimited gym access for 3 months', price: 388.0,
        interval: 'monthly', durationMonths: 3, planType: 'gym',
        features: ['Unlimited gym access', 'Locker room', 'RM129/month']),
    MembershipPlan(id: 'VGOFUn5Jgfz9Pv4yfyPc3', name: 'Gym · 6 Months',
        description: 'Unlimited gym access for 6 months', price: 728.0,
        interval: 'monthly', durationMonths: 6, planType: 'gym',
        features: ['Unlimited gym access', 'Locker room', 'RM121/month']),
    MembershipPlan(id: 'EbPRBPgKC0nRpiRcD20eg', name: 'Gym · 1 Year',
        description: 'Unlimited gym access for 12 months', price: 1440.0,
        interval: 'yearly', durationMonths: 12, planType: 'gym',
        features: ['Unlimited gym access', 'Locker room', 'RM120/month — best rate']),
    // ── 🎪 ALL-IN ──
    MembershipPlan(id: 'dZGNgyuh8QT6fndnBTqLx', name: 'ALL-IN · 1 Month',
        description: 'Gym + Yoga + Zumba + Spinning', price: 208.0,
        interval: 'monthly', durationMonths: 1, planType: 'all_in',
        features: ['Unlimited gym', 'Yoga classes', 'Zumba classes', 'Spinning classes']),
    MembershipPlan(id: 'iMLwByVtUm5mjdGexxfX5', name: 'ALL-IN · 3 Months',
        description: 'Gym + all studio classes for 3 months', price: 568.0,
        interval: 'monthly', durationMonths: 3, planType: 'all_in',
        features: ['Unlimited gym', 'All studio classes', 'RM189/month']),
    MembershipPlan(id: 'NqKHbQleuAJNDnu9FM2Le', name: 'ALL-IN · 6 Months',
        description: 'Gym + all studio classes for 6 months', price: 1128.0,
        interval: 'monthly', durationMonths: 6, planType: 'all_in',
        features: ['Unlimited gym', 'All studio classes', 'RM188/month']),
    // ── 🧘 Yoga ──
    MembershipPlan(id: 'QTZZeLBW1e1HZJ2P5D4v6', name: 'Yoga · 1 Day',
        description: 'Single yoga class entry', price: 40.0,
        interval: 'monthly', durationMonths: null, planType: 'yoga',
        features: ['1 yoga class entry']),
    MembershipPlan(id: 'vVzBJMSZhafZeWNoZhNfA', name: 'Yoga · x4',
        description: '4 yoga sessions, valid 1 month + 14 days', price: 140.0,
        interval: 'monthly', durationMonths: 1, planType: 'yoga',
        features: ['4 yoga class entries', 'Valid 1 month + 14 days']),
    MembershipPlan(id: '7N2l5WSiynszl9l9nN1Z7', name: 'Yoga · x8',
        description: '8 yoga sessions, valid 2 months + 14 days', price: 240.0,
        interval: 'monthly', durationMonths: 2, planType: 'yoga',
        features: ['8 yoga class entries', 'Valid 2 months + 14 days', 'Save vs x4']),
    // ── 💃 Zumba ──
    MembershipPlan(id: 'GguqoTI9gGL9zzzuVt2CN', name: 'Zumba · 1 Day',
        description: 'Single Zumba class entry', price: 15.0,
        interval: 'monthly', durationMonths: null, planType: 'zumba',
        features: ['1 Zumba class entry']),
    MembershipPlan(id: '6VoIO56HKQb2j96dclBA0', name: 'Zumba · x4',
        description: '4 Zumba sessions, valid 1 month + 14 days', price: 60.0,
        interval: 'monthly', durationMonths: 1, planType: 'zumba',
        features: ['4 Zumba entries', 'Valid 1 month + 14 days']),
    MembershipPlan(id: 'YXRCQavLDSzK78FnhexPz', name: 'Zumba · x10',
        description: '10 Zumba sessions, valid 3 months', price: 108.0,
        interval: 'monthly', durationMonths: 3, planType: 'zumba',
        features: ['10 Zumba entries', 'Valid 3 months', 'Best value']),
    // ── 🚴 Spinning ──
    MembershipPlan(id: 'HFmIAmgCTT5YeQx9TeX3B', name: 'Spinning · 1 Day',
        description: 'Single spinning class entry', price: 40.0,
        interval: 'monthly', durationMonths: null, planType: 'spinning',
        features: ['1 spinning class entry']),
    MembershipPlan(id: 'bW6XCW6gPHGv6QZU2vTND', name: 'Spinning · x4',
        description: '4 spinning sessions, valid 1 month + 14 days', price: 140.0,
        interval: 'monthly', durationMonths: 1, planType: 'spinning',
        features: ['4 spinning entries', 'Valid 1 month + 14 days']),
    MembershipPlan(id: 'LkKO5bQQYhNq0nZAyYtY4', name: 'Spinning · x8',
        description: '8 spinning sessions, valid 2 months + 14 days', price: 240.0,
        interval: 'monthly', durationMonths: 2, planType: 'spinning',
        features: ['8 spinning entries', 'Valid 2 months + 14 days', 'Save vs x4']),
    // ── 👶 WS Playzone ──
    MembershipPlan(id: '1clgM21DQXScK8XWHXVDA', name: 'Silver Package',
        description: '4 Playzone entries, valid 1 month', price: 128.0,
        interval: 'monthly', durationMonths: 1, planType: 'playzone',
        features: ['4 indoor playground entries', 'Valid 1 month']),
    MembershipPlan(id: 'fFVNDeCgAkAjXVDGZAIBY', name: 'Platinum Package',
        description: '12 Playzone entries, valid 3 months', price: 368.0,
        interval: 'monthly', durationMonths: 3, planType: 'playzone',
        features: ['12 indoor playground entries', 'Valid 3 months']),
    MembershipPlan(id: 'royal-king-001', name: 'Royal King Package',
        description: '24 Playzone entries, valid 6 months', price: 598.0,
        interval: 'monthly', durationMonths: 6, planType: 'playzone',
        features: ['24 indoor playground entries', 'Valid 6 months', 'Best value']),
    // ── 🎯 Coach Training ──
    MembershipPlan(id: 'ShMPc6BuTp31ow3SqUEGx', name: 'CT-1',
        description: '1 personal training session', price: 58.0,
        interval: 'monthly', durationMonths: 1, planType: 'coach',
        features: ['1 PT session with dedicated coach']),
    MembershipPlan(id: 'plPcZMO7bVLVGAoyYIr0n', name: 'CT-16',
        description: '16 PT sessions, valid ~1.5 months', price: 618.0,
        interval: 'monthly', durationMonths: 2, planType: 'coach',
        features: ['16 PT sessions', 'Valid 1 month + 14 days', 'RM38.6/session']),
    MembershipPlan(id: '0dVMLV3cAJynhZmvkF25p', name: 'CT-48',
        description: '48 PT sessions, valid ~5.5 months', price: 1518.0,
        interval: 'monthly', durationMonths: 6, planType: 'coach',
        features: ['48 PT sessions', 'Valid 5 months + 18 days', 'RM31.6/session']),
    MembershipPlan(id: 'DghdgJ1WSDpf2kVEl3D7d', name: 'CT-99',
        description: '99 PT sessions, valid 1 year', price: 2988.0,
        interval: 'yearly', durationMonths: 12, planType: 'coach',
        features: ['99 PT sessions', 'Valid 1 year', 'RM30.2/session — best rate']),
    // ── ⭐ Special Privilege ──
    MembershipPlan(id: 'oV5QRqaVN77df3VYoOEW1', name: 'CT Privilege Pass',
        description: 'Exclusive for CT-48 members. Includes all studio classes.',
        price: 188.0,
        interval: 'monthly', durationMonths: 3, planType: 'privilege',
        features: ['CT-48 members only', 'All studio classes included', 'Valid 3 months']),
  ];
}
