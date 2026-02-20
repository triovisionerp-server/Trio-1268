/**
 * Barcode & QR Code Scanner Component
 * Camera-based scanning for inventory management
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, ZapOff } from 'lucide-react';

export interface ScanResult {
  code: string;
  format: string;
  timestamp: Date;
data?: any; // Material/product data if found
}

export interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onClose: () => void;
  scanType?: 'barcode' | 'qr' | 'both';
  autoLookup?: boolean; // Auto-lookup material in Firebase
  continuousMode?: boolean; // Keep scanning after first scan
}

/**
 * Barcode Scanner Component
 * Uses device camera to scan barcodes and QR codes
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
  scanType = 'both',
  autoLookup = true,
  continuousMode = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  /**
   * Start camera stream
   */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasPermission(true);
        setIsScanning(true);
        
        // Start scanning loop
        scanIntervalRef.current = setInterval(scanFrame, 500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please enable camera permissions.');
      setHasPermission(false);
    }
  };

  /**
   * Stop camera and cleanup
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  /**
   * Scan current video frame for barcodes
   * Uses browser BarcodeDetector API (Chrome, Edge, Safari 17+)
   */
  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Check if BarcodeDetector is supported
      if ('BarcodeDetector' in window) {
        // @ts-ignore - BarcodeDetector is not in TypeScript definitions yet
        const barcodeDetector = new BarcodeDetector({
          formats: scanType === 'barcode' 
            ? ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
            : scanType === 'qr'
            ? ['qr_code']
            : ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
        });

        const barcodes = await barcodeDetector.detect(canvas);

        if (barcodes.length > 0) {
          const barcode = barcodes[0];
          const code = barcode.rawValue;

          // Avoid duplicate scans
          if (code !== lastScanned) {
            handleScanSuccess(code, barcode.format);
            setLastScanned(code);
          }
        }
      } else {
        // Fallback: Use ZXing library or show manual entry
        setError('Barcode scanning not supported in this browser. Use Chrome, Edge, or Safari 17+');
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  /**
   * Handle successful scan
   */
  const handleScanSuccess = async (code: string, format: string) => {
    setScanSuccess(true);
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }

    // Play success sound (optional)
    playBeep();

    let materialData = null;

    // Auto-lookup in Firebase if enabled
    if (autoLookup) {
      materialData = await lookupMaterial(code);
    }

    const result: ScanResult = {
      code,
      format,
      timestamp: new Date(),
      data: materialData
    };

    // Call parent callback
    onScan(result);

    // If not continuous mode, stop after first scan
    if (!continuousMode) {
      setTimeout(() => {
        stopCamera();
        onClose();
      }, 1000);
    } else {
      // Reset success indicator
      setTimeout(() => {
        setScanSuccess(false);
        setLastScanned(null);
      }, 2000);
    }
  };

  /**
   * Lookup material in Firebase by code
   */
  const lookupMaterial = async (code: string) => {
    try {
      const { db } = await import('@/lib/firebase/client');
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const materialsRef = collection(db, 'materials');
      const q = query(materialsRef, where('code', '==', code));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.error('Lookup error:', err);
      return null;
    }
  };

  /**
   * Play beep sound on successful scan
   */
  const playBeep = () => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      // Silently fail if audio not supported
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {scanType === 'qr' ? 'Scan QR Code' : scanType === 'barcode' ? 'Scan Barcode' : 'Scan Code'}
          </h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64 border-4 border-white/30 rounded-lg">
            {/* Scanning Line Animation */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan" />
            </div>

            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg" />

            {/* Success Indicator */}
            {scanSuccess && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-20 h-20 text-green-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
        {hasPermission === null && (
          <div className="text-center text-white flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Requesting camera permission...</span>
          </div>
        )}

        {hasPermission === false && error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-white flex items-center gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Camera Access Denied</p>
              <p className="text-sm text-white/80">{error}</p>
            </div>
          </div>
        )}

        {hasPermission === true && isScanning && (
          <div className="text-center text-white space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Scanning... Position code within frame</span>
            </div>
            {lastScanned && (
              <div className="text-xs text-white/60">
                Last scanned: {lastScanned}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * Manual Barcode Entry Component
 * Fallback for browsers without BarcodeDetector
 */
export const ManualBarcodeEntry: React.FC<{
  onScan: (code: string) => void;
  onClose: () => void;
}> = ({ onScan, onClose }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onScan(code.trim());
      setCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Enter Barcode Manually</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter barcode or QR code"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Export convenience hooks
export const useBarcode = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const handleScan = (result: ScanResult) => {
    setLastResult(result);
  };

  return {
    isOpen,
    open,
    close,
    lastResult,
    handleScan,
    ScannerComponent: isOpen ? (
      <BarcodeScanner onScan={handleScan} onClose={close} />
    ) : null
  };
};
