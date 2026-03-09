import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Upload, RotateCcw, Check, Loader2, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BiometricPhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => Promise<void>;
  currentAvatarUrl?: string | null;
}

// Declare FaceDetector type for TypeScript
declare global {
  interface Window {
    FaceDetector?: new () => {
      detect: (image: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
    };
  }
}

export function BiometricPhotoCapture({ 
  open, 
  onOpenChange, 
  onCapture,
  currentAvatarUrl 
}: BiometricPhotoCaptureProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview'>('select');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [brightnessWarning, setBrightnessWarning] = useState(false);
  const [faceValidation, setFaceValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [validatingFace, setValidatingFace] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup camera stream on close
  useEffect(() => {
    if (!open && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setMode('select');
      setCapturedImage(null);
      setCapturedFile(null);
      setBrightnessWarning(false);
      setFaceValidation(null);
      setCameraError(false);
    }
  }, [open, stream]);

  const startCamera = async () => {
    setCameraError(false);
    
    // Try multiple constraint configurations for Android compatibility
    const constraintOptions = [
      // Most flexible - just front camera, no resolution requirements
      { video: { facingMode: 'user' } },
      // Fallback to any camera
      { video: true },
    ];

    for (const constraints of constraintOptions) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        setMode('camera');
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        return; // Success - exit the function
      } catch (error) {
        console.log('Camera constraint failed:', constraints, error);
        continue; // Try next constraint option
      }
    }

    // All attempts failed - show error and fallback to file upload
    console.error('All camera access attempts failed');
    setCameraError(true);
    toast.error('Camera access failed. Please upload a photo instead.');
  };

  // Face detection using browser's Shape Detection API
  const detectFaces = async (imageSource: ImageBitmapSource): Promise<number> => {
    try {
      // Check if FaceDetector is available (Chrome/Android)
      if (!window.FaceDetector) {
        console.log('FaceDetector not supported, skipping validation');
        return -1; // -1 means unsupported, skip validation
      }

      const faceDetector = new window.FaceDetector();
      const faces = await faceDetector.detect(imageSource);
      return faces.length;
    } catch (error) {
      console.log('Face detection error (likely unsupported browser):', error);
      return -1; // Skip validation on error
    }
  };

  const validateImage = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    setValidatingFace(true);
    setFaceValidation(null);

    // Check brightness
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let totalBrightness = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      totalBrightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / (imageData.data.length / 4);
    setBrightnessWarning(avgBrightness < 50);

    // Detect faces
    try {
      const imageBitmap = await createImageBitmap(canvas);
      const faceCount = await detectFaces(imageBitmap);

      if (faceCount === -1) {
        // Browser doesn't support face detection, allow upload
        setFaceValidation({ valid: true, message: '' });
      } else if (faceCount === 0) {
        setFaceValidation({ valid: false, message: 'No face detected. Please center your face in the frame.' });
      } else if (faceCount > 1) {
        setFaceValidation({ valid: false, message: 'Multiple faces detected. Please ensure only one person is in frame.' });
      } else {
        setFaceValidation({ valid: true, message: 'Face detected successfully!' });
      }
    } catch (error) {
      console.error('Face validation error:', error);
      // Allow upload if validation fails
      setFaceValidation({ valid: true, message: '' });
    }

    setValidatingFace(false);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and validate
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `biometric-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedFile(file);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
        setMode('preview');
        
        // Stop camera
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);

        // Validate the captured image
        await validateImage(canvas, ctx);
      }
    }, 'image/jpeg', 0.9);
  }, [stream]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    // Create preview URL and validate
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      setCapturedFile(file);
      setMode('preview');

      // Create an image element and validate face
      const img = new Image();
      img.onload = async () => {
        // Create canvas for face detection
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          await validateImage(canvas, ctx);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setBrightnessWarning(false);
    setMode('select');
  };

  const handleConfirm = async () => {
    if (!capturedFile) return;
    
    setUploading(true);
    try {
      await onCapture(capturedFile);
      onOpenChange(false);
    } catch (error) {
      // Error is handled in parent
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Biometric Photo Capture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
            <p className="font-medium text-foreground">📷 Position your face inside the frame</p>
            <p className="text-muted-foreground mt-1">Use a clean, plain background for best results</p>
          </div>

          {/* Camera/Preview Area */}
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            {mode === 'select' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/50">
                {currentAvatarUrl ? (
                  <img 
                    src={currentAvatarUrl} 
                    alt="Current photo" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                
                {/* Camera error fallback message */}
                {cameraError && (
                  <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2 text-sm max-w-[90%]">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Camera access failed. Please upload a photo instead.</span>
                  </div>
                )}

                <div className="flex gap-3">
                  {!cameraError && (
                    <Button onClick={startCamera} variant="default">
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </Button>
                  )}
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    variant={cameraError ? "default" : "outline"}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {mode === 'camera' && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Face Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Semi-transparent overlay with oval cutout */}
                  <svg className="absolute inset-0 w-full h-full">
                    <defs>
                      <mask id="faceMask">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse cx="50%" cy="45%" rx="28%" ry="40%" fill="black" />
                      </mask>
                    </defs>
                    <rect 
                      width="100%" 
                      height="100%" 
                      fill="rgba(0,0,0,0.5)" 
                      mask="url(#faceMask)" 
                    />
                    {/* Oval outline */}
                    <ellipse 
                      cx="50%" 
                      cy="45%" 
                      rx="28%" 
                      ry="40%" 
                      fill="none" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth="3"
                      strokeDasharray="10,5"
                      className="animate-pulse"
                    />
                  </svg>
                  {/* Guide text */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      Align face within oval
                    </span>
                  </div>
                </div>
                {/* File upload fallback link */}
                <div className="absolute bottom-12 left-0 right-0 text-center z-10">
                  <button 
                    onClick={() => {
                      stream?.getTracks().forEach(track => track.stop());
                      setStream(null);
                      setMode('select');
                      setTimeout(() => fileInputRef.current?.click(), 100);
                    }}
                    className="text-white/80 hover:text-white text-xs underline underline-offset-2"
                  >
                    Having trouble? Upload a file instead
                  </button>
                </div>
              </>
            )}

            {mode === 'preview' && capturedImage && (
              <img 
                src={capturedImage} 
                alt="Captured preview" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Validation Feedback */}
          {mode === 'preview' && (
            <div className="space-y-2">
              {validatingFace && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-lg p-3 text-sm">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Validating photo...</span>
                </div>
              )}
              
              {!validatingFace && faceValidation && !faceValidation.valid && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-sm">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>{faceValidation.message}</span>
                </div>
              )}

              {!validatingFace && faceValidation?.valid && faceValidation.message && (
                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 rounded-lg p-3 text-sm">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{faceValidation.message}</span>
                </div>
              )}

              {brightnessWarning && (
                <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 rounded-lg p-3 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Image appears too dark. Consider retaking with better lighting.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {mode === 'camera' && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={capturePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </>
          )}

          {mode === 'preview' && (
            <>
              <Button variant="ghost" onClick={handleRetake}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={uploading || validatingFace || (faceValidation !== null && !faceValidation.valid)}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Use Photo'}
              </Button>
            </>
          )}

          {mode === 'select' && (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
