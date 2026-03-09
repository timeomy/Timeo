import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { Camera, AlertTriangle } from 'lucide-react';

interface PhotoRequiredModalProps {
  open: boolean;
  userId: string;
  currentAvatarUrl: string | null;
  onPhotoUpdated: (url: string) => void;
}

export function PhotoRequiredModal({ 
  open, 
  userId, 
  currentAvatarUrl, 
  onPhotoUpdated 
}: PhotoRequiredModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-sm" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-xl font-display">Profile Photo Required</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Please upload a clear selfie with a plain background to continue using the member portal.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Photo Guidelines:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Use a clear, recent photo of yourself</li>
                <li>Ensure a plain, clean background</li>
                <li>Face the camera directly</li>
                <li>Good lighting is important</li>
              </ul>
            </div>
          </div>

          <ProfilePhotoUpload
            userId={userId}
            currentAvatarUrl={currentAvatarUrl}
            onPhotoUpdated={onPhotoUpdated}
            required={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
