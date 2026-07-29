"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/lib/utils/cropImage";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ProfileImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export function ProfileImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
}: ProfileImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Lock body scroll while modal is active
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      // fallback in case of error
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  const content = (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col bg-black/85 backdrop-blur-sm text-white"
      style={{ height: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 py-4 shrink-0">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white" 
          onClick={onCancel} 
          disabled={isProcessing}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold text-white">Crop your photo</h2>
        </div>
        <Button 
          className="rounded-full bg-primary text-primary-foreground font-medium px-6 hover:bg-primary/90" 
          onClick={handleSave} 
          disabled={isProcessing}
        >
          {isProcessing ? "Saving..." : "Save"}
        </Button>
      </div>
      
      <div className="relative flex-1 w-full">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={handleCropComplete}
          onZoomChange={setZoom}
          style={{
            containerStyle: { background: 'transparent' },
          }}
        />
      </div>
      
      <div className="flex items-center justify-center py-8 shrink-0">
        <p className="text-sm text-white/70">
          Drag to reposition • Pinch to zoom
        </p>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
