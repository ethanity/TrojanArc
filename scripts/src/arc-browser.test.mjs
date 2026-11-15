import test from "node:test";
import assert from "node:assert/strict";
import { globSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.ARC_TEST_URL ?? "http://localhost:80";
const output = "../generated-artifacts/arc-tests";

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
    await start.click();
    const nav = page.getByRole("navigation", { name: "Main", exact: true }).filter({ visible: true });
    await nav.getByRole("button", { name: "Quest map", exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("trojan-arc:v1") ?? "{}").quests?.length > 0);
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
    assert.deepEqual(errors, [], "No browser runtime errors");
  } finally {
    await browser.close();
  }
});
