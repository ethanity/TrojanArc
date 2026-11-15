"use client";

import { useState } from "react";
import { ArrowsClockwise, Books, Briefcase, Code, Flag, GithubLogo, LinkedinLogo, SignOut, Trophy, UsersThree } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { resourceUrl } from "@/lib/data/resources";
import { useCalendar } from "@/lib/calendar";
import { completeness } from "@/lib/completeness";
import { computeStats, levelFromXp, rankFor } from "@/lib/game";
import { Avatar, Bar, Card, Chip, SectionTitle } from "./ui";
import { RankBadge, StatRadar } from "./viz";
import { RankLadder } from "./viz2";
import RescanDocuments from "./RescanDocuments";

export default function Character() {
  const { profile, reset, wins, xp, quests, storiesShared } = useStore();
  const cal = useCalendar();
  const [confirming, setConfirming] = useState(false);
  const [rescanOpen, setRescanOpen] = useState(false);
  if (!profile) return null;
  const lv = levelFromXp(xp);
  const stats = computeStats(profile, quests, storiesShared);

  return (
    <div className="space-y-5">
      <Card className="hero-cardinal rise overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#ffd36b]/30 blur-3xl" aria-hidden />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <div className="flex items-center gap-4">
              <Avatar name={profile.name || "Trojan"} size={68} />
              <div className="min-w-0">
                <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">{profile.name || "Trojan"}</h1>
                <p className="text-muted">{profile.year} · {profile.major}{profile.minor ? `, minor in ${profile.minor}` : ""}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              <Chip>{profile.school}</Chip>
              {profile.gradTerm && <Chip>Class of {profile.gradTerm}</Chip>}
              {profile.gpa ? <Chip tone="gold">GPA {profile.gpa.toFixed(2)}</Chip> : null}
              {profile.github && <Chip icon={<GithubLogo size={13} />}>{profile.github}</Chip>}
            </div>
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-white/85 underline-offset-2 hover:underline"
              >
                <LinkedinLogo size={15} weight="fill" /> View LinkedIn profile
              </a>
            )}
            <div className="mt-6 flex items-center gap-4">
              <RankBadge rank={rankFor(lv.level)} size={64} />
              <div>
                <p className="text-xl font-bold">{rankFor(lv.level).name} <span className="font-medium text-white/70">· Level {lv.level}</span></p>
                <p className="text-[13px] text-muted">{xp} XP · {lv.toNext} to level {lv.level + 1}</p>
              </div>
            </div>
                        <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="eyebrow flex items-center gap-1.5"><Flag size={13} weight="fill" className="text-gold" /> Main quest</p>
              <p className="mt-1.5 text-[15.5px]">{profile.goal}</p>
            </div>
          </div>
          <StatRadar stats={stats} size={240} onDark />
        </div>
      </Card>

      <Card className="rise p-5 sm:p-6" as="div">
        <SectionTitle>Your rank</SectionTitle>
        <RankLadder level={lv.level} levelProgress={lv.progress} />
      </Card>

      {(() => {
        const c = completeness(profile, cal.status !== "off");
        return (
          <Card className="rise p-5 sm:p-6" as="div">
            <SectionTitle right={<span className="game text-[15px] font-bold text-cardinal">{c.overall}% complete</span>}>What I know about you</SectionTitle>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {c.sections.map((sec) => (
                <div key={sec.key}>
                  <div className="flex justify-between text-[12.5px]"><span className="font-medium">{sec.label}</span><span className="game text-muted">{sec.pct}%</span></div>
                  <Bar value={sec.pct} thin className="mt-1" />
                </div>
              ))}
            </div>
            {(profile.sources?.length ?? 0) > 0 && (
              <p className="mt-4 text-[13px] text-muted">Built from: {profile.sources!.join(" · ")}</p>
            )}
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {(profile.network?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Your network · {profile.connectionsTotal ?? 0} connections</p>
                  <ul className="space-y-1.5">
                    {profile.network!.filter((n) => !/^usc$|university of southern california/i.test(n.company)).slice(0, 6).map((n) => (
                      <li key={n.company} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate">{n.company}</span><span className="game text-muted">{n.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(profile.remainingRequirements?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Still needed to graduate{profile.unitsCompleted ? ` · ${profile.unitsCompleted} units done` : ""}</p>
                  <ul className="space-y-1.5 text-[13px] text-muted">{profile.remainingRequirements!.slice(0, 6).map((r) => (
                    <li key={r}>
                      {resourceUrl(r) ? (
                        <a href={resourceUrl(r)} target="_blank" rel="noreferrer" className="underline decoration-hairline-2 underline-offset-2 hover:text-cardinal hover:decoration-cardinal" title="Look it up in the USC Schedule of Classes">
                          · {r} ↗
                        </a>
                      ) : (
                        <>· {r}</>
                      )}
                    </li>
                  ))}</ul>
                </div>
              )}
              <div>
                <p className="mb-2 text-[13px] font-semibold">What drives you</p>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.priorities ?? []).map((x) => <Chip key={x} tone="warn">{x}</Chip>)}
                  {(profile.interests ?? []).slice(0, 6).map((x) => <Chip key={x} tone="sky">{x}</Chip>)}
                  {profile.hoursPerWeek && <Chip>{profile.hoursPerWeek}/week</Chip>}
                  {profile.workAuth && <Chip>{profile.workAuth}</Chip>}
                  {(profile.awards ?? []).map((x) => <Chip key={x} tone="gold">🏆 {x}</Chip>)}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rise p-5 sm:p-6" as="div">
          <SectionTitle icon={<Books size={18} />}>Courses <span className="text-faint">· {profile.courses.length}</span></SectionTitle>
          <ul className="divide-y divide-hairline">
            {profile.courses.map((c) => (
              <li key={c.code + c.term} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px]"><span className="font-mono text-[12.5px] text-gold/90">{c.code}</span> <span className="text-text">{c.title}</span></p>
                  {c.term && <p className="text-[12px] text-faint">{c.term}</p>}
                </div>
                <span className={`game grid h-8 min-w-10 place-items-center rounded-lg px-2 text-[14px] font-semibold ${c.grade ? "bg-ink/[0.05]" : "text-faint"}`}>{c.grade || "IP"}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card className="rise p-5 sm:p-6" as="div">
            <SectionTitle icon={<Code size={18} />}>Skills</SectionTitle>
            <div className="flex flex-wrap gap-1.5">{profile.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>
            {profile.clubs.length > 0 && (
              <>
                <p className="mb-2 mt-5 flex items-center gap-2 text-[14px] font-semibold"><UsersThree size={18} className="text-muted" />Clubs</p>
                <div className="flex flex-wrap gap-1.5">{profile.clubs.map((s) => <Chip key={s}>{s}</Chip>)}</div>
              </>
            )}
          </Card>
          <Card className="rise p-5 sm:p-6" as="div">
            <SectionTitle icon={<Briefcase size={18} />}>Experience & projects</SectionTitle>
            <ul className="space-y-3.5">
              {profile.experience.map((e) => (
                <li key={e.role + e.org}>
                  <p className="text-[14.5px] font-medium">{e.role} <span className="font-normal text-muted">· {e.org}</span></p>
                  <p className="text-[13.5px] text-muted">{e.summary}</p>
                </li>
              ))}
              {profile.projects.map((p) => (
                <li key={p.name}>
                  <p className="text-[14.5px] font-medium">{p.name}</p>
                  <p className="text-[13.5px] text-muted">{p.summary}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {wins.length > 0 && (
        <Card className="rise p-5 sm:p-6" as="div">
          <SectionTitle icon={<Trophy size={18} weight="fill" className="text-gold" />}>Win log</SectionTitle>
          <ul className="divide-y divide-hairline">
            {wins.map((w) => (
              <li key={w.id} className="flex justify-between gap-3 py-2.5 text-[14px]">
                <span>{w.text}</span>
                <span className="shrink-0 text-[12.5px] text-faint">{new Date(w.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-secondary" onClick={() => setRescanOpen(true)}><ArrowsClockwise size={16} /> Re-scan my documents</button>
        {!confirming ? (
          <button className="btn btn-secondary" onClick={() => setConfirming(true)}><SignOut size={16} /> Sign out</button>
        ) : (
          <span className="flex items-center gap-2 text-[13.5px] text-muted">
            Sign out and clear your progress on this device?
            <button className="btn btn-primary btn-sm" onClick={() => { if (cal.status !== "off") cal.disconnect(); reset(); }}>Sign out</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
          </span>
        )}
      </div>
      {rescanOpen && <RescanDocuments onClose={() => setRescanOpen(false)} />}
    </div>
  );
}
