import test from "node:test";
import assert from "node:assert/strict";
import { globSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.ARC_TEST_URL ?? "http://localhost:3000";
const output = "generated-artifacts/arc-tests";

test("demo onboarding, navigation, advice, and persistent progress", { timeout: 120000 }, async () => {
  mkdirSync(output, { recursive: true });
  const nixChrome = globSync("/nix/store/*playwright-browsers*/chromium-*/chrome-linux/chrome")[0];
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || nixChrome
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || nixChrome } : {}),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.getByRole("button", { name: "Try the demo", exact: true }).first().click();
    const start = page.getByRole("button", { name: "Start my arc" });
    await start.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const input = document.querySelector('input[value="Alex Chen"]');
      return input || [...document.querySelectorAll("input")].some((el) => el.value.length > 0);
    });
    const majorInput = page.getByRole("combobox", { name: "Major" });
    await majorInput.fill("");
    const majorList = page.getByRole("listbox", { name: "USC majors" });
    assert.equal(await majorList.getByRole("option").count(), 206, "Show all USC undergraduate programs and existing graduate choices");
    await majorList.getByRole("option", { name: "MS Computer Science", exact: true }).waitFor();
    const dropdownPosition = await page.evaluate(() => {
      const input = document.querySelector('[role="combobox"][aria-label="Major"]');
      const popup = document.querySelector('[role="listbox"][aria-label="USC majors"]');
      const field = input.getBoundingClientRect();
      const menu = popup.getBoundingClientRect();
      return { fieldLeft: field.left, fieldBottom: field.bottom, menuLeft: menu.left, menuTop: menu.top };
    });
    assert.ok(Math.abs(dropdownPosition.fieldLeft - dropdownPosition.menuLeft) < 2, "Dropdown aligns with the major field");
    assert.ok(dropdownPosition.menuTop >= dropdownPosition.fieldBottom, "Dropdown opens directly beneath the major field");
    await page.screenshot({ path: `${output}/major-dropdown.jpg` });
    await majorInput.fill("Aerospace Engineering");
    await majorInput.press("ArrowDown");
    await majorInput.press("Enter");
    assert.equal(await majorInput.inputValue(), "Aerospace Engineering (BS)");
    await page.setViewportSize({ width: 390, height: 844 });
    await majorInput.fill("");
    const mobilePosition = await page.evaluate(() => {
      const field = document.querySelector('[role="combobox"][aria-label="Major"]').getBoundingClientRect();
      const menu = document.querySelector('[role="listbox"][aria-label="USC majors"]').getBoundingClientRect();
      return { fieldLeft: field.left, fieldTop: field.top, fieldBottom: field.bottom, menuLeft: menu.left, menuRight: menu.right, menuTop: menu.top, menuBottom: menu.bottom };
    });
    assert.ok(mobilePosition.menuLeft >= 0 && mobilePosition.menuRight <= 390, "Major options fit within the phone viewport");
    assert.ok(Math.abs(mobilePosition.fieldLeft - mobilePosition.menuLeft) < 2, "Phone dropdown stays aligned with the major field");
    assert.ok(
      mobilePosition.menuTop >= mobilePosition.fieldBottom || mobilePosition.menuBottom <= mobilePosition.fieldTop,
      "Phone dropdown stays directly above or below the major field",
    );
    await page.screenshot({ path: `${output}/major-dropdown-mobile.jpg` });
    await majorInput.press("Escape");
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Back", exact: true }).click();
    }
    const linkedinInput = page.getByRole("textbox", { name: "LinkedIn profile link" });
    await linkedinInput.waitFor();
    await linkedinInput.fill("https://example.com/in/alex-chen");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByText("Enter a LinkedIn profile link like linkedin.com/in/your-name.", { exact: true }).waitFor();
    await linkedinInput.fill("linkedin.com/in/alex-chen");
    await page.screenshot({ path: `${output}/linkedin-profile-input.jpg` });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /This semester/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Start my arc" }).waitFor();
    await start.click();
    const nav = page.getByRole("navigation", { name: "Main", exact: true }).filter({ visible: true });
    await nav.getByRole("button", { name: "Quest map", exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("trojan-arc:v1") ?? "{}").quests?.length > 0);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("trojan-arc:v1") ?? "{}").profile?.linkedinUrl === "https://www.linkedin.com/in/alex-chen");
    await nav.getByRole("button", { name: "Character", exact: true }).click();
    const profileLink = page.getByRole("link", { name: "View LinkedIn profile" });
    await profileLink.waitFor();
    assert.equal(await profileLink.getAttribute("href"), "https://www.linkedin.com/in/alex-chen");
    const beforeRescan = await page.evaluate(() => JSON.parse(localStorage.getItem("trojan-arc:v1")));
    let submittedBody = "";
    await page.route("**/api/onboard", async (route) => {
      submittedBody = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode: "live",
          profile: {
            name: "", major: "", minor: "", school: "", year: "Junior", gradTerm: "May 2028", gpa: 3.9,
            goal: "", goalTags: [], timeline: "", preferences: "",
            courses: [{ code: "CSCI 102", title: "Data Structures", grade: "A", term: "Fall 2026" }],
            skills: ["Rust"], projects: [], experience: [], clubs: [], github: "",
            interests: [], awards: [], certifications: [], languages: [], links: [],
            remainingRequirements: [], unitsCompleted: null,
          },
          found: ["Updated transcript"],
          missing: [],
        }),
      });
    });
    await page.getByRole("button", { name: "Re-scan my documents" }).click();
    const rescanDialog = page.getByRole("dialog", { name: "Scan new documents or links" });
    await rescanDialog.waitFor();
    await rescanDialog.locator('input[type="file"]').setInputFiles({
      name: "updated-transcript.pdf", mimeType: "application/pdf", buffer: Buffer.from("test PDF content"),
    });
    await rescanDialog.getByRole("textbox", { name: "LinkedIn profile link" }).fill("linkedin.com/in/alex-chen-updated");
    await rescanDialog.getByRole("button", { name: "Scan and update" }).click();
    await rescanDialog.getByText("Character updated", { exact: true }).waitFor();
    assert.match(submittedBody, /updated-transcript\.pdf/, "The rescan submits the newly selected document");
    assert.doesNotMatch(submittedBody, /Alex Chen|Summer 2027/, "The rescan does not resubmit or rebuild onboarding answers");
    await page.waitForFunction(() => {
      const profile = JSON.parse(localStorage.getItem("trojan-arc:v1") ?? "{}").profile;
      return profile?.gpa === 3.9 && profile?.skills?.includes("Rust");
    });
    const afterRescan = await page.evaluate(() => JSON.parse(localStorage.getItem("trojan-arc:v1")));
    assert.equal(afterRescan.profile.name, beforeRescan.profile.name);
    assert.equal(afterRescan.profile.major, beforeRescan.profile.major);
    assert.equal(afterRescan.profile.goal, beforeRescan.profile.goal);
    assert.deepEqual(afterRescan.profile.answers, beforeRescan.profile.answers);
    assert.deepEqual(afterRescan.quests, beforeRescan.quests, "Existing quest progress is preserved");
    assert.equal(afterRescan.xp, beforeRescan.xp, "Existing XP is preserved");
    assert.ok(afterRescan.profile.courses.some((course) => course.code === "CSCI 102"));
    await rescanDialog.getByRole("button", { name: "Back to My Character" }).click();
    await page.getByRole("link", { name: "View LinkedIn profile" }).waitFor();
    assert.equal(await page.getByRole("link", { name: "View LinkedIn profile" }).getAttribute("href"), "https://www.linkedin.com/in/alex-chen-updated");
    await page.screenshot({ path: `${output}/linkedin-profile-card.jpg`, fullPage: true });
    await page.screenshot({ path: `${output}/quest-map.jpg`, fullPage: true });
    for (const tab of ["Today", "Quest map", "Week", "Radar", "Network", "Character"]) {
      await nav.getByRole("button", { name: tab, exact: true }).click();
      await page.waitForTimeout(150);
      assert.ok(await page.locator("#main").innerText(), `${tab} should render content`);
    }
    await nav.getByRole("button", { name: "Network", exact: true }).click();
    await page.getByPlaceholder("Ask the Trojan network anything…").fill("How should I prepare for internships?");
    const adviceResponse = page.waitForResponse((response) => response.url().endsWith("/api/advice") && response.status() === 200);
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    const advice = await (await adviceResponse).json();
    await page.getByText(advice.advice.verdict, { exact: true }).waitFor();
    await nav.getByRole("button", { name: "Today", exact: true }).click();
    const initialXp = await page.evaluate(() => JSON.parse(localStorage.getItem("trojan-arc:v1")).xp);
    await page.getByRole("button", { name: "Mark done", exact: true }).click();
    await page.waitForFunction((xp) => JSON.parse(localStorage.getItem("trojan-arc:v1")).xp > xp, initialXp);
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("trojan-arc:v1")));
    await page.reload();
    await nav.getByRole("button", { name: "Character", exact: true }).waitFor();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem("trojan-arc:v1")));
    assert.equal(after.profile.name, before.profile.name);
    assert.equal(after.quests.length, before.quests.length);
    assert.equal(after.xp, before.xp);
    assert.ok(after.quests.some((quest) => quest.status === "done"));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${output}/desktop.jpg`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNav = page.getByRole("navigation", { name: "Main", exact: true }).filter({ visible: true });
    await mobileNav.getByRole("button", { name: "Week", exact: true }).click();
    await page.getByRole("button", { name: "Use a sample week", exact: true }).click();
    await page.waitForTimeout(1000);
    assert.ok(await page.locator("#main").innerText());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.screenshot({ path: `${output}/mobile.jpg`, fullPage: true });
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("trojan-arc:v1"));
      const items = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + 2 + Math.floor(index / 2));
        const deadline = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return {
          id: `close-deadline-${index}`,
          kind: "internship",
          title: `Deadline headline ${index + 1}: an opportunity title that needs room to wrap onto another line`,
          org: `USC partner ${index + 1}`,
          location: "Los Angeles",
          url: "",
          deadline,
          posted: "",
          tags: ["internship"],
          source: "USC sample",
          details: `Readable description for deadline ${index + 1}. This is adjacent to other dates and should stay separate rather than overlap its neighbors.`,
        };
      });
      state.radar = {
        items,
        fits: items.map((item) => ({
          id: item.id, fit: 90, verdict: "strong", reason: "A good fit.",
          blocker: "", nextAction: "Review the details.",
        })),
        scanned: items.length,
        at: new Date().toISOString(),
      };
      localStorage.setItem("trojan-arc:v1", JSON.stringify(state));
    });
    await page.reload();
    const radarNav = page.getByRole("navigation", { name: "Main", exact: true }).filter({ visible: true });
    await radarNav.getByRole("button", { name: "Radar", exact: true }).click();
    const deadlineList = page.getByTestId("deadline-list");
    const deadlineCards = page.getByTestId("deadline-item");
    assert.equal(await deadlineCards.count(), 6);
    for (let i = 1; i <= 6; i++) {
      await deadlineList.getByRole("heading", { name: new RegExp(`Deadline headline ${i}:`) }).waitFor();
      await deadlineList.getByText(`Readable description for deadline ${i}.`, { exact: false }).waitFor();
    }
    const assertCardsDoNotOverlap = async () => {
      const rects = await deadlineCards.evaluateAll((cards) => cards.map((card) => {
        const { x, y, width, height } = card.getBoundingClientRect();
        return { left: x, top: y, right: x + width, bottom: y + height };
      }));
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
            `Deadline cards ${i + 1} and ${j + 1} should not overlap`);
        }
      }
    };
    await assertCardsDoNotOverlap();
    await page.screenshot({ path: `${output}/deadlines-mobile.jpg`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await assertCardsDoNotOverlap();
    await page.screenshot({ path: `${output}/deadlines-desktop.jpg`, fullPage: true });
    assert.deepEqual(errors, [], "No browser runtime errors");
  } finally {
    await browser.close();
  }
});
