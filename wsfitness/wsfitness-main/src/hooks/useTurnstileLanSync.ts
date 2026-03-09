import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncMember {
  id: string;
  name: string;
  member_id: string | null;
  avatar_url: string | null;
}

interface SyncResult {
  success: boolean;
  code?: number;
  desc?: string;
  error?: string;
}

/**
 * Resize and compress an image to Base64 for turnstile upload
 * Target: 640x640 max, JPEG quality 60%, under 200KB
 */
async function imageToBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate target dimensions (max 640x640, maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        const maxSize = 640;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to get under 200KB
        let quality = 0.6;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // If still too large, reduce quality
        while (dataUrl.length > 200 * 1024 && quality > 0.2) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Extract base64 data (remove data:image/jpeg;base64, prefix)
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Get the turnstile device IP from company settings
 */
async function getTurnstileDeviceIp(): Promise<string> {
  const { data } = await supabase
    .from('company_settings')
    .select('turnstile_device_ip')
    .limit(1)
    .single();
  
  return (data as { turnstile_device_ip?: string })?.turnstile_device_ip || '192.168.1.201';
}

/**
 * Hook for syncing members to turnstile device via direct LAN HTTP POST
 */
export function useTurnstileLanSync() {
  const [syncing, setSyncing] = useState(false);

  /**
   * Sync a single member to the turnstile device via LAN
   * 
   * Payload format per protocol:
   * {
   *   cmd: "upload person",
   *   id: "<member_id string, <=19 bytes>",
   *   name: "",
   *   role: 1,
   *   upload_mode: 0,  // 0 = auto add-or-overwrite
   *   reg_image: "<base64 jpg/png>"
   * }
   */
  const syncMemberToTurnstile = async (member: SyncMember): Promise<SyncResult> => {
    setSyncing(true);
    
    try {
      // Get device IP
      const deviceIp = await getTurnstileDeviceIp();
      const deviceUrl = `http://${deviceIp}`;

      // Prepare member ID (use member_id if available, otherwise use id truncated to 19 bytes)
      let memberId = member.member_id || member.id;
      if (memberId.length > 19) {
        memberId = memberId.substring(0, 19);
      }

      // Convert photo to base64 if available
      let regImage = '';
      if (member.avatar_url) {
        try {
          regImage = await imageToBase64(member.avatar_url);
        } catch (imgError) {
          console.warn('Failed to convert image, syncing without photo:', imgError);
          // Continue without image
        }
      }

      // Build protocol-compliant payload
      const payload = {
        cmd: 'upload person',
        id: memberId,
        name: '', // Per protocol - leave empty
        role: 1,
        upload_mode: 0, // 0 = auto add-or-overwrite
        reg_image: regImage,
      };

      console.log('[LAN-SYNC] Sending to device:', deviceUrl);
      console.log('[LAN-SYNC] Payload (without image):', { ...payload, reg_image: regImage ? `[${regImage.length} bytes]` : '' });

      // Send HTTP POST directly to device
      const response = await fetch(deviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors', // May be needed for direct device access
      });

      // With no-cors, we can't read the response body
      // But if the request doesn't throw, it was sent
      // The device typically returns: { code: 0, desc: "success" }
      
      try {
        const result = await response.json();
        console.log('[LAN-SYNC] Device response:', result);
        
        if (result.code === 0) {
          return { success: true, code: 0, desc: result.desc };
        } else {
          return { 
            success: false, 
            code: result.code, 
            desc: result.desc,
            error: `Sync failed (code: ${result.code})${result.desc ? `: ${result.desc}` : ''}`
          };
        }
      } catch {
        // If we can't parse response (likely due to no-cors), assume success if no error
        console.log('[LAN-SYNC] Could not parse response (no-cors mode), assuming sent');
        return { success: true, desc: 'Request sent (no-cors mode)' };
      }
    } catch (error: any) {
      console.error('[LAN-SYNC] Error:', error);
      
      // Provide helpful error message for common issues
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return {
          success: false,
          error: 'Connection failed. Ensure you are on the same WiFi as the Turnstile and the device is reachable at its IP.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncing,
    syncMemberToTurnstile,
    getTurnstileDeviceIp,
  };
}
