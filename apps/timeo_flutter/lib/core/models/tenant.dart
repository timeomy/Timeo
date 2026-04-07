class Tenant {
  final String id;
  final String name;
  final String? logoUrl;
  final String? slug;
  final String role; // 'admin', 'staff', 'customer'
  final Map<String, dynamic>? branding;

  const Tenant({
    required this.id,
    required this.name,
    this.logoUrl,
    this.slug,
    required this.role,
    this.branding,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    final tenant = json['tenant'] as Map<String, dynamic>? ?? json;
    return Tenant(
      id: json['tenantId'] as String? ?? tenant['id'] as String,
      name: tenant['name'] as String? ?? 'Unknown',
      logoUrl:
          (tenant['branding'] as Map<String, dynamic>?)?['logoUrl'] as String?,
      slug: tenant['slug'] as String?,
      role: json['role'] as String? ?? 'customer',
      branding: tenant['branding'] as Map<String, dynamic>?,
    );
  }
}
