class PublicTenant {
  final String id;
  final String name;
  final String? slug;
  final String? logoUrl;
  final String? description;
  final String? industry;
  final String? address;
  final String? hours;
  final Map<String, dynamic>? branding;
  final List<PublicPlan> plans;

  const PublicTenant({
    required this.id,
    required this.name,
    this.slug,
    this.logoUrl,
    this.description,
    this.industry,
    this.address,
    this.hours,
    this.branding,
    this.plans = const [],
  });

  factory PublicTenant.fromJson(Map<String, dynamic> json) {
    final brandingMap = json['branding'] as Map<String, dynamic>?;
    final plansRaw = json['plans'] as List<dynamic>? ?? [];

    return PublicTenant(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown',
      slug: json['slug'] as String?,
      logoUrl: brandingMap?['logoUrl'] as String?,
      description: json['description'] as String?,
      industry: brandingMap?['industry'] as String? ??
          json['industry'] as String?,
      address: json['address'] as String?,
      hours: json['hours'] as String?,
      branding: brandingMap,
      plans: plansRaw
          .map((p) => PublicPlan.fromJson(p as Map<String, dynamic>))
          .toList(),
    );
  }

  String get primaryColor =>
      (branding?['primaryColor'] as String?) ?? '#0066FF';
}

class PublicPlan {
  final String id;
  final String name;
  final double price;
  final String currency;
  final String? interval;
  final String? description;

  const PublicPlan({
    required this.id,
    required this.name,
    required this.price,
    this.currency = 'MYR',
    this.interval,
    this.description,
  });

  factory PublicPlan.fromJson(Map<String, dynamic> json) {
    return PublicPlan(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'MYR',
      interval: json['interval'] as String?,
      description: json['description'] as String?,
    );
  }
}
