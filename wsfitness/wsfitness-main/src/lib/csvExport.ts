/**
 * Converts an array of objects to CSV string and triggers download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
) {
  if (data.length === 0) {
    return;
  }

  // Determine columns from data keys if not provided
  const cols = columns || Object.keys(data[0]).map(key => ({ 
    key: key as keyof T, 
    header: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) 
  }));

  // Create CSV header
  const header = cols.map(c => `"${c.header}"`).join(',');

  // Create CSV rows
  const rows = data.map(row => 
    cols.map(col => {
      const value = row[col.key];
      
      // Handle nested objects (like profiles)
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""';
      }
      
      // Handle strings with special characters
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return `"${value}"`;
    }).join(',')
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Flatten nested profile data for export
 */
export function flattenMemberData(members: any[]) {
  return members.map(m => ({
    member_id: m.profiles?.member_id || '',
    name: m.profiles?.name || 'N/A',
    email: m.profiles?.email || 'N/A',
    phone: m.profiles?.phone_number || '',
    avatar_url: m.profiles?.avatar_url || '',
    role: m.role || 'member',
    plan_type: m.plan_type || 'N/A',
    status: m.status || 'N/A',
    expiry_date: m.expiry_date || '',
    created_at: m.created_at,
  }));
}

export function flattenVendorData(vendors: any[]) {
  return vendors.map(v => ({
    business_name: v.business_name,
    contact_name: v.profiles?.name || 'N/A',
    email: v.profiles?.email || 'N/A',
    phone: v.profiles?.phone_number || '',
    total_redeemed: v.total_redeemed_count || 0,
    created_at: v.created_at,
  }));
}

/**
 * Flatten member data for Turnstile/Biometrics export
 */
export function flattenTurnstileData(members: any[]) {
  return members.filter(m => m.status === 'active').map(m => ({
    member_id: m.profiles?.member_id || 'Not Assigned',
    full_name: m.profiles?.name || 'N/A',
    phone_number: m.profiles?.phone_number || '',
    biometric_status: 'Not Enrolled',
    profile_photo_url: m.profiles?.avatar_url || '',
  }));
}

/**
 * Flatten voucher data for export
 */
export function flattenVoucherData(vouchers: any[]) {
  return vouchers.map(v => ({
    code: v.code,
    title: v.title,
    description: v.description || '',
    value: v.value,
    vendor: v.vendors?.business_name || 'N/A',
    status: v.status,
    current_redemptions: v.current_redemptions || 0,
    max_redemptions: v.max_redemptions || 'Unlimited',
    valid_from: v.valid_from ? new Date(v.valid_from).toLocaleDateString() : '',
    expires_at: v.expires_at ? new Date(v.expires_at).toLocaleDateString() : '',
    created_at: v.created_at ? new Date(v.created_at).toLocaleDateString() : '',
  }));
}