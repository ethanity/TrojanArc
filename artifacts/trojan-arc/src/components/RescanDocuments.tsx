"use client";

import { useRef, useState } from "react";
import { ArrowsClockwise, CheckCircle, FilePdf, LinkedinLogo, UploadSimple, X } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import type { OnboardResult, Profile } from "@/lib/types";

function mergeStrings(current: string[] = [], incoming: string[] = []) {
  const values = new Map<string, string>();
  for (const value of [...current, ...incoming]) {
    const cleaned = value.trim();
    if (cleaned) values.set(cleaned.toLowerCase(), cleaned);
  }
  return [...values.values()];
}

function mergeRecords<T extends object>(current: T[], incoming: T[], identity: (item: T) => string): T[] {
  const records = new Map<string, T>();
  for (const item of current) {
    const key = identity(item).toLowerCase();
    if (key) records.set(key, item);
  }
  for (const item of incoming) {
    const key = identity(item).toLowerCase();
    if (key) records.set(key, { ...records.get(key), ...item });
  }
  return [...records.values()];
}

/** Refresh only document-derived data; retain the student's identity and planning choices. */
export function mergeRescanProfile(current: Profile, scanned: Profile, newSources: string[]): Profile {
  return {
    ...current,
    // These are user-owned settings, so scans must not replace them.
    name: current.name,
    major: current.major,
    minor: current.minor,
    school: current.school,
    goal: current.goal,
    goalTags: current.goalTags,
    timeline: current.timeline,
    preferences: current.preferences,
    year: scanned.year?.trim() || current.year,
    gradTerm: scanned.gradTerm?.trim() || current.gradTerm,
    gpa: scanned.gpa ?? current.gpa,
    courses: mergeRecords(current.courses, scanned.courses, (course) => `${course.code || course.title}|${course.term}`),
    skills: mergeStrings(current.skills, scanned.skills),
    projects: mergeRecords(current.projects, scanned.projects, (project) => project.name),
    experience: mergeRecords(current.experience, scanned.experience, (role) => `${role.role}|${role.org}`),
    clubs: mergeStrings(current.clubs, scanned.clubs),
    github: scanned.github?.trim() || current.github,
    githubStats: scanned.githubStats ?? current.githubStats,
    interests: mergeStrings(current.interests, scanned.interests),
    awards: mergeStrings(current.awards, scanned.awards),
    certifications: mergeStrings(current.certifications, scanned.certifications),
    languages: mergeStrings(current.languages, scanned.languages),
    links: mergeStrings(current.links, [...(scanned.links ?? []), ...newSources.filter((source) => /^https?:\/\//i.test(source))]),
    remainingRequirements: mergeStrings(current.remainingRequirements, scanned.remainingRequirements),
    unitsCompleted: scanned.unitsCompleted ?? current.unitsCompleted,
    sources: mergeStrings(current.sources, newSources),
  };
}

function normalizeLinkedIn(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!["linkedin.com", "www.linkedin.com"].includes(url.hostname.toLowerCase()) || !/^\/in\/[^/]+\/?$/i.test(url.pathname)) return "";
    return `https://www.linkedin.com${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
}

export default function RescanDocuments({ onClose }: { onClose: () => void }) {
  const { profile, setProfile, toast } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  if (!profile) return null;
  const currentProfile = profile;

  const linkedInUrl = normalizeLinkedIn(linkedin);
  const badLinkedIn = linkedin.trim().length > 0 && !linkedInUrl;

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const added = Array.from(list);
    if (added.some((file) => /\.zip$/i.test(file.name))) {
      setError("ZIP exports are not supported. Add a PDF or image, or enter a profile link.");
    } else {
      setError("");
    }
    setFiles((existing) => [...existing, ...added.filter((file) => !/\.zip$/i.test(file.name))].slice(0, 6));
    if (fileInput.current) fileInput.current.value = "";
  }

  async function rescan() {
    if (badLinkedIn) {
      setError("Enter a valid LinkedIn profile link, such as linkedin.com/in/your-name.");
      return;
    }
    const username = github.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "");
    const site = website.trim();
    const sourceNames = [
      ...files.map((file) => file.name),
      ...(username ? [`GitHub: ${username}`] : []),
      ...(site ? [site] : []),
      ...(linkedInUrl ? ["LinkedIn profile link"] : []),
    ];
    if (!sourceNames.length) {
      setError("Add at least one new or updated document or link to scan.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      let refreshed = currentProfile;
      let message = "New findings were merged with your existing information. Your onboarding answers and progress were not reset.";
      const hasExtractableSources = files.length > 0 || !!username || !!site;

      if (hasExtractableSources) {
        const form = new FormData();
        for (const file of files) form.append("files", file);
        if (username) form.append("github", username);
        if (site) form.append("website", site);
        const response = await fetch("/api/onboard", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not read the new sources.");

        const result = data as OnboardResult & { mode?: string };
        if (result.mode === "demo") {
          message = "This workspace is in demo mode, so document contents could not be analyzed. The links you added were saved; switch to live AI mode to extract profile updates.";
        } else {
          refreshed = mergeRescanProfile(currentProfile, result.profile, sourceNames);
        }
      }
      if (username) refreshed.github = username;
      if (site) refreshed.links = mergeStrings(refreshed.links, [site]);
      if (linkedInUrl) refreshed.linkedinUrl = linkedInUrl;
      refreshed.sources = mergeStrings(refreshed.sources, sourceNames);
      setProfile(refreshed);
      setSuccessMessage(message);
      setSuccess(true);
      toast("Character updated", "Your existing profile and progress were kept.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the new sources.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-ink/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rescan-title"
        className="card rise my-auto w-full max-w-xl p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Update your character</p>
            <h2 id="rescan-title" className="mt-1 text-2xl font-semibold tracking-tight">Scan new documents or links</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Only the sources you add here will be scanned. Your existing profile, goals, answers, and progress stay in place.
            </p>
          </div>
          <button className="btn btn-quiet btn-sm -mr-2 -mt-2 shrink-0" aria-label="Close rescan" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>

        {success ? (
          <div className="mt-6 rounded-2xl border border-good/30 bg-good/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-good"><CheckCircle size={19} weight="fill" /> Character updated</p>
            <p className="mt-1 text-sm text-muted">{successMessage}</p>
            <button className="btn btn-primary mt-4" onClick={onClose}>Back to My Character</button>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FilePdf size={19} className="text-cardinal" />
                    <div>
                      <p className="text-sm font-semibold">Documents</p>
                      <p className="text-xs text-muted">Add a new or replacement resume, transcript, or report.</p>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm shrink-0" onClick={() => fileInput.current?.click()}><UploadSimple size={15} /> Add files</button>
                </div>
                <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md" multiple onChange={(event) => addFiles(event.target.files)} />
                {files.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-xs text-muted">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">{file.name}</span>
                        <button className="text-cardinal hover:underline" onClick={() => setFiles((existing) => existing.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold">GitHub username or profile link</span>
                <input className="field w-full" value={github} onChange={(event) => setGithub(event.target.value)} placeholder={currentProfile.github || "github.com/your-name"} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Personal website or portfolio</span>
                <input className="field w-full" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://yourportfolio.com" />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><LinkedinLogo size={16} /> LinkedIn profile link</span>
                <input className="field w-full" value={linkedin} onChange={(event) => setLinkedin(event.target.value)} placeholder={currentProfile.linkedinUrl || "linkedin.com/in/your-name"} />
                <span className="mt-1 block text-xs text-muted">The link is saved to your profile; LinkedIn does not provide profile details from a URL alone.</span>
              </label>
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl bg-cardinal/5 px-3 py-2 text-sm text-cardinal">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button className="btn btn-quiet" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={rescan} disabled={busy}>
                <ArrowsClockwise size={16} className={busy ? "animate-spin" : ""} />
                {busy ? "Scanning new sources…" : "Scan and update"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
