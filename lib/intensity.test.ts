import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyStory,
  computeIntensity,
  computeIntensityHistory,
  type Intensity,
} from "./intensity.ts";
import type { NewsItem } from "./news.ts";

function item(
  title: string,
  date: string,
  summary = "",
  extra: Partial<NewsItem> = {}
): NewsItem {
  return {
    title,
    summary,
    date,
    link: extra.link ?? `https://news.usni.org/${date}/${encodeURIComponent(title.slice(0, 40))}`,
    source: "USNI News",
    mentionsShip: extra.mentionsShip ?? false,
  };
}

const AS_OF = Date.parse("2026-08-16T12:00:00Z");

describe("classifyStory — false positives that used to read as all-out war", () => {
  it("ignores World War II wreck / museum stories", () => {
    assert.equal(
      classifyStory(
        "World War II Wreck Hunter RV Petrel Reborn as Navy Survey Ship Sarah Lynn",
        "The former WWII wreck hunter is being converted."
      ).cls,
      "ignore"
    );
    assert.equal(
      classifyStory(
        "Conservationists Working to Recover WWII Torpedo Plane from Pacific Sea Floor",
        ""
      ).cls,
      "ignore"
    );
    assert.equal(
      classifyStory(
        "France Dedicates First Super Carrier to WWII Resistance Forces",
        ""
      ).cls,
      "ignore"
    );
  });

  it("ignores nuclear attack boats (SSNs) and weapons-program CRS reports", () => {
    assert.equal(
      classifyStory(
        "South Korea Announces Plan to Build Domestic Nuclear Attack Boat",
        ""
      ).cls,
      "ignore"
    );
    assert.equal(
      classifyStory(
        "Navy to Inactivate Attack Boat USS Boise After $1.6B Repair Effort",
        ""
      ).cls,
      "ignore"
    );
    assert.equal(
      classifyStory(
        "Report to Congress on North Korea’s Nuclear Weapons and Missile Programs",
        "From the Report: North Korea continues to expand its nuclear weapons programs."
      ).cls,
      "ignore"
    );
    assert.equal(
      classifyStory(
        "Chinese Navy Expanding Nuclear Attack Boat Fleet and Missile Strike Capabilities, ONI Commander Says",
        ""
      ).cls,
      "ignore"
    );
  });

  it("ignores a submarine contract that merely mentions ballistic missiles", () => {
    assert.equal(
      classifyStory(
        "Navy Awards $76.6B for 9 Virginia, 5 Columbia Subs to General Dynamics, HII",
        "The award covers Virginia-class attack boats and Columbia-class ballistic missile submarines."
      ).cls,
      "ignore"
    );
  });

  it("does not treat an intel 'not invading Taiwan' assessment as great-power war", () => {
    const c = classifyStory(
      "China Not Committed to 2027 Taiwan Invasion, U.S. Intel Report Says",
      "The assessment says Beijing is not committed to a 2027 invasion of Taiwan."
    );
    assert.notEqual(c.cls, "great-power");
    assert.notEqual(c.cls, "all-out");
  });
});

describe("classifyStory — real events", () => {
  it("scores the Aug 7 Iran–U.S. trapped-ships story as regional war", () => {
    const c = classifyStory(
      "70 Ships Trapped in Persian Gulf as Iran-U.S. Conflict Nears Six Months",
      "At least 70 ships remain trapped in the Persian Gulf nearly six months into the Iran-U.S. conflict with more ships now being stalled after the ceasefire between the countries broke down."
    );
    assert.equal(c.cls, "regional");
    assert.ok(c.severity >= 55 && c.severity < 75);
  });

  it("scores Hormuz blockade stories as regional war", () => {
    assert.equal(
      classifyStory(
        "U.S. Reinstates Naval Blockade in Strait of Hormuz",
        "The blockade of Iran is back in effect."
      ).cls,
      "regional"
    );
  });

  it("scores live kinetic headlines, including 'drones attack' and a sub torpedo shot", () => {
    assert.equal(
      classifyStory(
        "VIDEO: 3 Lethal U.S. Drones Attack Iranian Sub, Port Facility",
        ""
      ).cls,
      "kinetic"
    );
    assert.equal(
      classifyStory(
        "NATO Shoots Down Iranian Missile Headed for Turkey",
        ""
      ).cls,
      "kinetic"
    );
    assert.equal(
      classifyStory(
        "VIDEO: U.S. Attack Boat Torpedoes Iranian Frigate off Sri Lanka",
        ""
      ).cls,
      "kinetic"
    );
  });

  it("reserves all-out for nuclear use or a world war, not WWII", () => {
    const war = classifyStory(
      "United States and China in All-Out War After Nuclear Strike on Guam",
      "A thermonuclear detonation was reported."
    );
    assert.equal(war.cls, "all-out");
    assert.ok(war.severity >= 90);
  });
});

describe("computeIntensity — the '7 days ago was not all-out war' case", () => {
  const week = [
    item(
      "70 Ships Trapped in Persian Gulf as Iran-U.S. Conflict Nears Six Months",
      "2026-08-07T18:52:44Z",
      "At least 70 ships remain trapped in the Persian Gulf nearly six months into the Iran-U.S. conflict with more ships now being stalled after the ceasefire between the countries broke down."
    ),
    item(
      "New White House Memo Calls for Foreign-Built Warships, Return to Steam Catapults on Ford Carriers",
      "2026-08-13T12:00:00Z",
      "President Donald Trump has ordered the Pentagon to consider foreign-built warships."
    ),
    item(
      "Marine Corps Recruit Dies After Collapsing During Training",
      "2026-08-13T14:00:00Z",
      "A recruit died after collapsing during a physical fitness test."
    ),
    item(
      "USS George Washington Heading West, Lincoln Deployment Nears 9 Months",
      "2026-08-13T16:00:00Z",
      "The forward-deployed George Washington Carrier Strike Group was in the Strait of Malacca.",
      { mentionsShip: true }
    ),
    item(
      "World War II Wreck Hunter RV Petrel Reborn as Navy Survey Ship Sarah Lynn",
      "2026-06-29T12:00:00Z",
      "The former WWII wreck hunter is being converted for Navy survey work."
    ),
  ];

  function assertRegionalNotAllOut(reading: Intensity, label: string) {
    assert.ok(
      reading.score >= 52 && reading.score < 85,
      `${label}: expected High/War band, got ${reading.score} ${reading.level}`
    );
    assert.notEqual(reading.level, "all-out", label);
    assert.notEqual(reading.level, "calm", label);
  }

  it("7 days ago (Aug 9) is a regional war, not all-out and not calm", () => {
    const reading = computeIntensity(week, Date.parse("2026-08-09T12:00:00Z"));
    assertRegionalNotAllOut(reading, "Aug 9");
    assert.match(reading.drivers[0]?.title ?? "", /Iran-U\.S\. Conflict/i);
  });

  it("today still reflects the unfinished Iran war instead of dropping to Calm 16", () => {
    const reading = computeIntensity(week, AS_OF);
    assertRegionalNotAllOut(reading, "Aug 16");
    assert.ok(
      reading.score >= 58,
      `persistence/recency should keep a 9-day-old regional war in High, got ${reading.score}`
    );
  });

  it("a WWII wreck-hunter week cannot peg the needle at 97 / all-out", () => {
    const news = [
      item(
        "World War II Wreck Hunter RV Petrel Reborn as Navy Survey Ship Sarah Lynn",
        "2026-06-29T12:00:00Z",
        "The former WWII wreck hunter is being converted."
      ),
      item(
        "Russia, China Fly Joint Bomber Missions Near Japan, South Korea",
        "2026-06-30T12:00:00Z",
        "The flight was a close encounter near Japan."
      ),
    ];
    const reading = computeIntensity(news, Date.parse("2026-07-05T12:00:00Z"));
    assert.notEqual(reading.level, "all-out");
    assert.ok(reading.score < 70, `got ${reading.score}`);
  });

  it("volume of watch/threat stories cannot reach all-out", () => {
    const spam = Array.from({ length: 20 }, (_, i) =>
      item(
        `Analysts say tensions rise in contested waters (${i})`,
        `2026-08-10T0${i % 9}:00:00Z`,
        "A warning about a threat in contested waters."
      )
    );
    const reading = computeIntensity(spam, AS_OF);
    assert.ok(reading.score < 40, `got ${reading.score}`);
    assert.notEqual(reading.level, "all-out");
  });
});

describe("computeIntensityHistory", () => {
  it("does not write an all-out spike for the WWII wreck-hunter week", () => {
    const news = [
      item(
        "World War II Wreck Hunter RV Petrel Reborn as Navy Survey Ship Sarah Lynn",
        "2026-06-29T12:00:00Z",
        "WWII wreck hunter reborn as a survey ship."
      ),
      item(
        "70 Ships Trapped in Persian Gulf as Iran-U.S. Conflict Nears Six Months",
        "2026-08-07T15:00:00Z",
        "Iran-U.S. conflict nears six months."
      ),
    ];
    const history = computeIntensityHistory(news, AS_OF);
    const allOut = history.filter((s) => s.level === "all-out");
    assert.equal(allOut.length, 0, JSON.stringify(allOut.map((s) => [s.asOf, s.score])));
    const aroundAug9 = history.find((s) => s.asOf.startsWith("2026-08-09"));
    assert.ok(aroundAug9, "expected a snapshot near Aug 9");
    assert.notEqual(aroundAug9!.level, "all-out");
    assert.notEqual(aroundAug9!.level, "calm");
  });
});
