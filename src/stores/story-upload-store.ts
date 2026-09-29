"use client";

import { create } from "zustand";

export interface StoryUploadJob {
  id: string;
  title: string;
  progress: number;
  status: "uploading" | "failed";
  error: string | null;
}

interface StoryUploadState {
  jobs: StoryUploadJob[];
  enqueue: (formData: FormData, onSuccess: () => void) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
}

const payloads = new Map<string, { formData: FormData; onSuccess: () => void }>();
const requests = new Map<string, XMLHttpRequest>();

function readError(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: string };
    if (body.error) {
      return body.error;
    }
  } catch {
    // The server did not return JSON.
  }
  return "Upload failed.";
}

function sendJob(
  id: string,
  set: (partial: Partial<StoryUploadState> | ((state: StoryUploadState) => Partial<StoryUploadState>)) => void,
): void {
  const payload = payloads.get(id);
  if (!payload) {
    return;
  }

  requests.get(id)?.abort();
  const xhr = new XMLHttpRequest();
  requests.set(id, xhr);
  xhr.open("POST", "/api/vendor/stories");
  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable || event.total <= 0) {
      return;
    }
    const progress = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, progress, status: "uploading", error: null } : job,
      ),
    }));
  };
  xhr.onerror = () => {
    if (requests.get(id) === xhr) {
      requests.delete(id);
    }
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, status: "failed", error: "Upload failed." } : job,
      ),
    }));
  };
  xhr.onabort = () => {
    if (requests.get(id) === xhr) {
      requests.delete(id);
    }
  };
  xhr.onload = () => {
    if (requests.get(id) === xhr) {
      requests.delete(id);
    }
    if (xhr.status >= 200 && xhr.status < 300) {
      payloads.delete(id);
      set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) }));
      payload.onSuccess();
      return;
    }
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, status: "failed", error: readError(xhr) } : job,
      ),
    }));
  };
  xhr.send(payload.formData);
}

export const useStoryUploadStore = create<StoryUploadState>()((set) => ({
  jobs: [],
  enqueue: (formData, onSuccess) => {
    const id = `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const titleValue = formData.get("title");
    const title = typeof titleValue === "string" && titleValue.trim() ? titleValue.trim() : "Story";
    payloads.set(id, { formData, onSuccess });
    set((state) => ({
      jobs: [...state.jobs, { id, title, progress: 0, status: "uploading", error: null }],
    }));
    sendJob(id, set);
  },
  retry: (id) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, progress: 0, status: "uploading", error: null } : job,
      ),
    }));
    sendJob(id, set);
  },
  dismiss: (id) => {
    requests.get(id)?.abort();
    requests.delete(id);
    payloads.delete(id);
    set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) }));
  },
}));
