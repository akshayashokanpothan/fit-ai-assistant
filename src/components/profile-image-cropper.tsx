"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "@/lib/utils/cropImage";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Crop your photo</h2>
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={isProcessing}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="relative flex-1 bg-black/90">
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
        />
      </div>
      
      <div className="p-6 bg-background space-y-6">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted font-medium">-</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted font-medium">+</span>
        </div>
        
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSave}
            disabled={isProcessing}
          >
            {isProcessing ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
