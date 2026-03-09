import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileJson, CheckCircle2, XCircle, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegacyMember {
  id: string;
  name: string;
  reg_images?: Array<{ image_data: string }>;
  [key: string]: unknown;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

type ProcessResult = {
  status: 'created' | 'updated' | 'skipped' | 'failed';
  message?: string;
};

export function LegacyMemberImport({ onComplete }: { onComplete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const base64ToBlob = (base64: string, mimeType = 'image/jpeg'): Blob => {
    let base64Data = base64;
    if (base64.includes(',')) {
      base64Data = base64.split(',')[1];
    }
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const uploadImageToStorage = async (base64: string, identifier: string): Promise<string | null> => {
    try {
      const blob = base64ToBlob(base64);
      const fileName = `legacy-${identifier}-${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Image processing error:', error);
      return null;
    }
  };

  const processMember = async (member: LegacyMember): Promise<ProcessResult> => {
    const memberName = member.name?.trim();
    if (!memberName) {
      return { status: 'skipped', message: 'No name provided' };
    }

    try {
      // Check if user with same NAME already exists
      const { data: existingByName } = await supabase
        .from('profiles')
        .select('id, avatar_url, legacy_id')
        .ilike('name', memberName)
        .maybeSingle();

      // SCENARIO A: User exists by name
      if (existingByName) {
        // Check if they already have legacy_id set (already processed)
        if (existingByName.legacy_id) {
          return { status: 'skipped', message: `${memberName} already processed` };
        }

        // Check if they have a photo
        const hasPhoto = !!existingByName.avatar_url;
        
        let avatarUrl: string | null = null;
        
        // Only upload photo if user doesn't have one
        if (!hasPhoto && member.reg_images?.[0]?.image_data) {
          setCurrentAction('Uploading photo...');
          avatarUrl = await uploadImageToStorage(member.reg_images[0].image_data, member.id);
        }

        // Update profile with legacy_id (and photo if uploaded)
        const updateData: Record<string, unknown> = {
          legacy_id: member.id
        };
        
        if (avatarUrl) {
          updateData.avatar_url = avatarUrl;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', existingByName.id);

        if (updateError) {
          return { status: 'failed', message: `Failed to update ${memberName}: ${updateError.message}` };
        }

        return { 
          status: 'updated', 
          message: avatarUrl ? `${memberName} - photo added` : `${memberName} - linked` 
        };
      }

      // SCENARIO B: New user - create them
      setCurrentAction('Creating new user...');
      
      // Handle profile image
      let avatarUrl: string | null = null;
      if (member.reg_images?.[0]?.image_data) {
        setCurrentAction('Uploading photo...');
        avatarUrl = await uploadImageToStorage(member.reg_images[0].image_data, member.id);
      }

      // Generate email and password
      const generatedEmail = `legacy_${member.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@wsfitness.my`;
      const generatedPassword = `WS${member.id}2024!`;

      // Calculate 1 year expiry
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const expiryStr = expiryDate.toISOString().split('T')[0];

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: generatedEmail,
          password: generatedPassword,
          name: memberName,
          role: 'member',
          legacy_id: member.id,
          avatar_url: avatarUrl,
          skip_email: true,
          expiry_date: expiryStr
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        return { status: 'failed', message: `Failed to create ${memberName}: ${response.error.message}` };
      }

      return { status: 'created', message: `${memberName} created` };
    } catch (error) {
      return { 
        status: 'failed', 
        message: `Error with ${memberName}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a .json file');
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);
    setCurrentAction('');

    try {
      const text = await file.text();
      const members: LegacyMember[] = JSON.parse(text);

      if (!Array.isArray(members)) {
        toast.error('Invalid JSON format: expected an array of members');
        setImporting(false);
        return;
      }

      setTotalCount(members.length);
      
      const importResult: ImportResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      };

      // Process one at a time to prevent browser crash
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        setCurrentIndex(i + 1);
        setCurrentName(member.name || `Member ${i + 1}`);
        setCurrentAction('Checking...');
        setProgress(Math.round(((i + 1) / members.length) * 100));

        const result = await processMember(member);
        
        switch (result.status) {
          case 'created':
            importResult.created++;
            break;
          case 'updated':
            importResult.updated++;
            break;
          case 'skipped':
            importResult.skipped++;
            break;
          case 'failed':
            importResult.failed++;
            if (importResult.errors.length < 30) {
              importResult.errors.push(result.message || 'Unknown error');
            }
            break;
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      setResult(importResult);
      toast.success(`Import complete: ${importResult.created} created, ${importResult.updated} updated`);
      onComplete?.();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to parse JSON file');
    } finally {
      setImporting(false);
      setCurrentAction('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Allow opening always, prevent closing only during import
    if (open) {
      setIsOpen(true);
    } else if (!importing) {
      setIsOpen(false);
      setProgress(0);
      setResult(null);
      setCurrentIndex(0);
      setTotalCount(0);
      setCurrentName('');
      setCurrentAction('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileJson className="h-4 w-4 mr-2" />
          Import Legacy Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Legacy Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!importing && !result && (
            <>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Smart Import Rules:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Existing users</strong> (matched by name) - only update photo if missing</li>
                  <li><strong>New users</strong> - create with photo and 1-year membership</li>
                  <li>Legacy ID is preserved for reference</li>
                  <li>Existing photos are never overwritten</li>
                </ul>
              </div>

              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Click to upload JSON file</p>
                <p className="text-sm text-muted-foreground mt-1">WS_Fitness_FULL_BACKUP_370.json</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {importing && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-lg font-medium">Processing Members...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentIndex} of {totalCount}
                </p>
              </div>

              <Progress value={progress} className="h-3" />

              <div className="text-center space-y-1">
                <p className="font-medium truncate">{currentName}</p>
                <p className="text-xs text-muted-foreground">{currentAction}</p>
              </div>

              <div className="bg-amber-500/10 text-amber-500 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Please keep this window open until import completes</span>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <p className="text-lg font-medium">Import Complete!</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-green-500/10 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <UserPlus className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-500">{result.created}</p>
                  <p className="text-xs text-muted-foreground">New Users Created</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{result.updated}</p>
                  <p className="text-xs text-muted-foreground">Users Updated</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-amber-500/10 rounded-lg p-3">
                  <p className="text-xl font-bold text-amber-500">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3">
                  <p className="text-xl font-bold text-red-500">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium mb-2">Error Details (first 30):</p>
                  <div className="space-y-1">
                    {result.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                        <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => handleOpenChange(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
