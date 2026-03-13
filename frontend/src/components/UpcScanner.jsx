import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanBarcode, X, Loader2, AlertTriangle } from 'lucide-react'

export default function UpcScanner({ onResult }) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [looking, setLooking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const scannerRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  async function startScanner() {
    setOpen(true)
    setError(null)
    setResult(null)
    setScanning(true)

    // Wait for DOM to render the container
    await new Promise((r) => setTimeout(r, 100))

    try {
      const scanner = new Html5Qrcode('upc-scanner-region')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 2.0,
          formatsToSupport: [
            0,  // QR_CODE
            2,  // UPC_A
            3,  // UPC_E
            4,  // EAN_13
            5,  // EAN_8
            10, // CODE_128
          ],
        },
        handleScan,
        () => {} // ignore errors during scanning
      )
    } catch (err) {
      setError('Could not access camera. Please allow camera permissions.')
      setScanning(false)
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  function handleClose() {
    stopScanner()
    setOpen(false)
    setResult(null)
    setError(null)
  }

  async function handleScan(decodedText) {
    // Prevent double-scans
    if (looking) return

    await stopScanner()
    setLooking(true)

    const upc = decodedText.trim()

    // No catalog lookup in self-hosted — just return the UPC
    setResult({ upc })
    onResult({ upc })

    setLooking(false)
  }

  async function handleManualEntry() {
    const upc = prompt('Enter UPC barcode number:')
    if (!upc || !upc.trim()) return

    setResult({ upc: upc.trim() })
    onResult({ upc: upc.trim() })
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={startScanner}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-bd-input hover:border-accent rounded-lg text-sm text-fg-muted hover:text-accent transition-colors cursor-pointer"
        >
          <ScanBarcode size={18} />
          Scan UPC
        </button>
        <button
          type="button"
          onClick={handleManualEntry}
          className="px-3 py-2.5 bg-surface border border-bd-input hover:border-accent rounded-lg text-xs text-fg-faint hover:text-accent transition-colors cursor-pointer"
        >
          Enter manually
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4">
      <div className="bg-card border border-bd rounded-xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bd">
          <h3 className="text-sm font-medium text-fg">Scan Barcode</h3>
          <button
            onClick={handleClose}
            className="text-fg-muted hover:text-fg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scanner area */}
        {scanning && (
          <div id="upc-scanner-region" ref={containerRef} className="w-full" />
        )}

        {/* Looking up */}
        {looking && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={28} className="text-accent animate-spin" />
            <p className="text-sm text-fg-muted">Processing barcode...</p>
          </div>
        )}

        {/* Result */}
        {result && !looking && (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm font-medium text-fg">Barcode scanned</p>
                <p className="text-xs text-fg-muted">UPC {result.upc} saved. Fill in details below.</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  startScanner()
                }}
                className="flex-1 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
              >
                Scan Again
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-warn flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warn">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
