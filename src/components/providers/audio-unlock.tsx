"use client";

import { useEffect } from "react";

import { bindAudioUnlock } from "@/lib/audio";

export function AudioUnlock(): null {
  useEffect(() => bindAudioUnlock(), []);
  return null;
}
