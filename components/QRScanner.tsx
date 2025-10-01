import * as React from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure: (error: string) => void;
}

const qrcodeRegionId = "html5qr-code-full-region";

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
    const scannerRef = React.useRef<any | null>(null);

    React.useEffect(() => {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                qrcodeRegionId, 
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [] // Use all supported scan types
                },
                /* verbose= */ false
            );
            
            const handleSuccess = (decodedText: string) => {
                scanner.clear();
                onScanSuccess(decodedText);
            };

            scanner.render(handleSuccess, onScanFailure);
            scannerRef.current = scanner;
        }

        // Cleanup function to clear the scanner
        return () => {
            // Check if the scanner instance exists and then clear it.
            // The clear() method from the library handles various states gracefully.
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode-scanner.", error);
                });
            }
        };
    }, [onScanSuccess, onScanFailure]);

    return <div id={qrcodeRegionId} />;
};
