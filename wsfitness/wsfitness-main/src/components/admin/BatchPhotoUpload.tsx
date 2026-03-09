import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Check, X, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberMatch {
  file: File;
  memberId?: string;
  memberName?: string;
  userId?: string;
  status: 'pending' | 'matched' | 'unmatched' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BatchPhotoUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Array<{
    user_id: string;
    profiles: {
      name: string;
      email: string | null;
      member_id: string | null;
    } | null;
  }>;
  onComplete?: () => void;
}

export function BatchPhotoUpload({ open, onOpenChange, members, onComplete }: BatchPhotoUploadProps) {
  const [files, setFiles] = useState<MemberMatch[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processFiles(droppedFiles);
  }, [members]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    processFiles(selectedFiles);
    e.target.value = '';
  }, [members]);

  const processFiles = (newFiles: File[]) => {
    const matches: MemberMatch[] = newFiles.map(file => {
      // Extract filename without extension
      const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
      
      // Try to match by Member ID (WS-2025-001 format)
      const memberIdMatch = members.find(m => 
        m.profiles?.member_id?.toLowerCase() === baseName.toLowerCase()
      );
      
      if (memberIdMatch) {
        return {
          file,
          memberId: memberIdMatch.profiles?.member_id || undefined,
          memberName: memberIdMatch.profiles?.name,
          userId: memberIdMatch.user_id,
          status: 'matched' as const,
        };
      }

      // Try to match by email (before @)
      const emailMatch = members.find(m => {
        const emailPrefix = m.profiles?.email?.split('@')[0]?.toLowerCase();
        return emailPrefix && baseName.toLowerCase().includes(emailPrefix);
      });

      if (emailMatch) {
        return {
          file,
          memberId: emailMatch.profiles?.member_id || undefined,
          memberName: emailMatch.profiles?.name,
          userId: emailMatch.user_id,
          status: 'matched' as const,
        };
      }

      // Try to match by name (fuzzy)
      const nameMatch = members.find(m => {
        const memberName = m.profiles?.name?.toLowerCase().replace(/\s+/g, '');
        const fileName = baseName.toLowerCase().replace(/[_-]/g, '').replace(/\s+/g, '');
        return memberName && (memberName.includes(fileName) || fileName.includes(memberName));
      });

      if (nameMatch) {
        return {
          file,
          memberId: nameMatch.profiles?.member_id || undefined,
          memberName: nameMatch.profiles?.name,
          userId: nameMatch.user_id,
          status: 'matched' as const,
        };
      }

      return {
        file,
        status: 'unmatched' as const,
        error: 'No matching member found',
      };
    });

    setFiles(prev => [...prev, ...matches]);
  };

  const handleUpload = async () => {
    const matchedFiles = files.filter(f => f.status === 'matched' && f.userId);
    if (matchedFiles.length === 0) {
      toast.error('No matched files to upload');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      const match = updatedFiles[i];
      if (match.status !== 'matched' || !match.userId) continue;

      updatedFiles[i] = { ...match, status: 'uploading' };
      setFiles([...updatedFiles]);

      try {
        const fileExt = match.file.name.split('.').pop();
        const filePath = `${match.userId}/${Date.now()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, match.file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', match.userId);

        if (updateError) throw updateError;

        updatedFiles[i] = { ...match, status: 'success' };
        successCount++;
      } catch (error: any) {
        updatedFiles[i] = { ...match, status: 'error', error: error.message };
        errorCount++;
      }

      setFiles([...updatedFiles]);
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} photo${successCount !== 1 ? 's' : ''} successfully`);
      onComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} photo${errorCount !== 1 ? 's' : ''}`);
    }
  };

  const handleClear = () => {
    setFiles([]);
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  const matchedCount = files.filter(f => f.status === 'matched').length;
  const unmatchedCount = files.filter(f => f.status === 'unmatched').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Batch Upload Photos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              "hover:border-primary/50 hover:bg-muted/50",
              files.length > 0 ? "border-muted" : "border-muted-foreground/30"
            )}
          >
            <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop images here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Name files with Member ID (WS-2025-001.jpg) or email for auto-matching
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>
                  <span className="text-emerald-500 font-medium">{matchedCount} matched</span>
                  {unmatchedCount > 0 && (
                    <span className="text-destructive ml-2">{unmatchedCount} unmatched</span>
                  )}
                </span>
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={uploading}>
                  Clear All
                </Button>
              </div>

              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2 space-y-2">
                  {files.map((match, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md text-sm",
                        match.status === 'matched' && "bg-emerald-500/10",
                        match.status === 'unmatched' && "bg-destructive/10",
                        match.status === 'uploading' && "bg-primary/10",
                        match.status === 'success' && "bg-emerald-500/20",
                        match.status === 'error' && "bg-destructive/20"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {match.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                        {match.status === 'success' && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {match.status === 'error' && <X className="h-4 w-4 text-destructive shrink-0" />}
                        {match.status === 'matched' && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                        {match.status === 'unmatched' && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                        
                        <span className="truncate">{match.file.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 ml-2">
                        {match.memberName ? (
                          <span className="text-foreground">{match.memberName}</span>
                        ) : match.error ? (
                          <span className="text-destructive">{match.error}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={uploading || matchedCount === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {matchedCount} Photo{matchedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
