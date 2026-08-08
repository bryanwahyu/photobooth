"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraStatus = "idle" | "starting" | "ready" | "error";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Browser tidak mendukung kamera, atau halaman tidak dibuka via https/localhost.");
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch (err) {
      const name = err instanceof Error ? err.name : "UnknownError";
      setStatus("error");
      setError(
        name === "NotAllowedError"
          ? "Akses kamera ditolak. Izinkan lewat setelan browser, lalu coba lagi."
          : name === "NotFoundError"
            ? "Kamera tidak ditemukan di perangkat ini."
            : `Kamera gagal dibuka: ${name}`,
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { videoRef, status, error, start, stop };
}
