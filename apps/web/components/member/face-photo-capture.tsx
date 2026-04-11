"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "@timeo/ui/web";
import { Camera, Check, FlipHorizontal, Loader2, RotateCcw } from "lucide-react";

type CapturedPhoto = {
  file: File;
  previewUrl: string;
};

interface FacePhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => Promise<void> | void;
  isSubmitting?: boolean;
  title?: string;
}

export function FacePhotoCapture({
  open,
  onOpenChange,
  onCapture,
  isSubmitting = false,
  title = "Take profile photo",
}: FacePhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const stopCamera = useCallback(() => {
    if (!streamRef.current) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  const clearCapturedPhoto = useCallback(() => {
    setCapturedPhoto((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      return null;
    });
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not supported on this browser.");
      return;
    }

    setCameraError(null);
    setCameraReady(false);
    stopCamera();

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }

      streamRef.current = stream;

      if (!videoRef.current) {
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
    } catch {
      setCameraError("Unable to access camera. Please allow permission and try again.");
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      clearCapturedPhoto();
      setCameraError(null);
      setCameraReady(false);
      setFacingMode("user");
      return;
    }

    void startCamera();

    return () => {
      stopCamera();
    };
  }, [clearCapturedPhoto, open, startCamera, stopCamera]);

  async function handleCapturePhoto() {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setCameraError("Camera is still loading. Try again in a moment.");
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Could not capture photo. Please try again.");
      return;
    }

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Could not capture photo. Please try again.");
      return;
    }

    const file = new File([blob], `face-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    const previewUrl = URL.createObjectURL(blob);

    setCapturedPhoto({ file, previewUrl });
    setCameraError(null);
    stopCamera();
  }

  async function handleUsePhoto() {
    if (!capturedPhoto || isSubmitting) {
      return;
    }

    setCameraError(null);

    try {
      await onCapture(capturedPhoto.file);
      onOpenChange(false);
    } catch (error) {
      setCameraError((error as Error).message ?? "Failed to use this photo.");
    }
  }

  async function handleRetake() {
    clearCapturedPhoto();
    await startCamera();
  }

  function handleSwitchCamera() {
    setFacingMode((previous) =>
      previous === "user" ? "environment" : "user",
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100dvw] max-w-none rounded-none border-none bg-black p-0 text-white sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:rounded-2xl sm:border sm:border-white/10">
        <DialogHeader className="px-4 pb-2 pt-4 text-left sm:px-5">
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/65">
            Center your face in the frame for best results.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 sm:px-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 sm:aspect-video">
            {capturedPhoto ? (
              <img
                src={capturedPhoto.previewUrl}
                alt="Captured face preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="absolute right-3 top-3 z-10 inline-flex h-9 items-center gap-1 rounded-lg border border-white/25 bg-black/55 px-2 text-xs font-medium text-white backdrop-blur-sm"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  Flip
                </button>

                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-[68%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  <div
                    className={cn(
                      "absolute left-1/2 top-1/2 h-[68%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-transparent transition-colors",
                      cameraReady ? "border-emerald-400/70" : "border-transparent",
                    )}
                  />
                </div>

                <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-black/60 p-3 text-xs text-white/85">
                  <p>Center your face in the frame</p>
                  <p>Keep a neutral expression</p>
                  <p>Ensure good lighting</p>
                </div>
              </>
            )}
          </div>

          {cameraError ? <p className="mt-3 text-sm text-red-300">{cameraError}</p> : null}

          {!capturedPhoto ? (
            <div className="mt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!cameraReady}
                className="inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-black shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera className="h-9 w-9" />
                <span className="sr-only">Capture photo</span>
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                disabled={isSubmitting}
                className="h-11 border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>

              <Button
                type="button"
                onClick={handleUsePhoto}
                disabled={isSubmitting}
                className="h-11 bg-emerald-500 font-semibold text-black hover:bg-emerald-500/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Use This Photo
                  </>
                )}
              </Button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
