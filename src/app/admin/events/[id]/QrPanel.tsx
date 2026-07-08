"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrPanel({ url, title }: { url: string; title: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 2 }).then(setDataUrl);
  }, [url]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR code untuk ${title}`} className="h-44 w-44 rounded-lg border border-gray-200" />
      ) : (
        <div className="h-44 w-44 animate-pulse rounded-lg bg-gray-100" />
      )}
      <code className="max-w-full break-all rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">{url}</code>
      <div className="flex gap-2">
        <button onClick={copyLink} className="btn-secondary text-xs px-3 py-1.5">
          {copied ? "Disalin ✓" : "Salin Pautan"}
        </button>
        {dataUrl && (
          <a href={dataUrl} download={`qr-${title.replace(/\s+/g, "-").toLowerCase()}.png`} className="btn-secondary text-xs px-3 py-1.5">
            Muat Turun QR
          </a>
        )}
      </div>
    </div>
  );
}
