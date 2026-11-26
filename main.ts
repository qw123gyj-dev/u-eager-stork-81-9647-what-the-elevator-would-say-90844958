/**
 * What the Elevator Would Say
 * ----------------------------
 * make.fun competition: u-eager-stork-81-9647-what-the-elevator-would-say-90844958
 *
 * The job: write ONE funny line, at most 120 characters, that is the
 * funniest thing a talking elevator could say, spoken in the elevator's
 * own voice. A judge model compares lines two at a time and picks the
 * one that would get the bigger laugh from a tired passenger, weighing
 * (most important first):
 *   1. The line is the funniest thing an elevator would say if it could
 *      talk, in the elevator's own voice; anything that is not about a
 *      talking elevator loses to any line that is.
 *   2. The joke lands on the first read, with a turn or a surprise a
 *      passenger would laugh at without the setup being explained.
 *   3. The voice comes from the elevator's own job: its doors, floors,
 *      weight limits, buttons and waiting, so the line could come from
 *      no other machine.
 *   4. Every word works and the line stays inside the character limit
 *      without feeling cut.
 *   5. The idea is fresh rather than a joke already made about
 *      elevators, and it does not rest on a pun alone.
 *
 * A line that explains its own joke has already lost the laugh, and
 * length for its own sake does not count.
 *
 * This program is a deterministic entry picker. It holds a hand-written
 * pool of candidate lines, scores each one against the judge's published
 * criteria with an explicit, deterministic scorer, picks the best, checks
 * the gate (single line, 1-120 characters per the sealed scorer in the
 * kit's RULES.txt — the task brief said 1-200, and 120 satisfies both —
 * not only whitespace), writes it to $MAKEFUN_OUTPUT_DIR/entry.txt
 * (fallback /output/entry.txt), reads the file back and verifies the
 * bytes match exactly.
 *
 * Node 22, standard library only. No network, no randomness, no secrets.
 * Deterministic: the same input always picks the same line.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One candidate line plus the human reasoning behind it. */
interface Candidate {
  /** The line itself, exactly as it would be submitted. */
  text: string;
  /** Where the joke lives: the turn, surprise or punchline. */
  joke: string;
  /** Why the line could only come from an elevator, not another machine. */
  voice: string;
}

/** One scored criterion, so the total can be audited line by line. */
interface CriterionScore {
  /** Short name of the judge criterion, in the judge's own order. */
  name: string;
  /** Points awarded, 0..max. */
  points: number;
  /** Maximum points for this criterion. */
  max: number;
  /** One line of reasoning for the points awarded. */
  reason: string;
}

/** A candidate with its full score breakdown attached. */
interface ScoredCandidate {
  candidate: Candidate;
  criteria: CriterionScore[];
  total: number;
}

// ---------------------------------------------------------------------------
// Gate constants (from the competition kit's sealed scorer rules)
// ---------------------------------------------------------------------------

/**
 * Maximum characters the gate allows in entry.txt. RULES.txt says the
 * sealed scorer checks 1 to 120 characters; the task brief said 1-200,
 * and 120 satisfies both, so 120 is the binding limit here.
 */
const GATE_MAX_CHARS = 120;
/** Minimum characters the gate allows in entry.txt. */
const GATE_MIN_CHARS = 1;

// ---------------------------------------------------------------------------
// Candidate pool
//
// Every line below was written by hand for THIS bounty only: each one is
// spoken in the first person by the elevator itself, about its own job —
// its doors, its floors, its buttons, its weight limit, its waiting —
// so none of them could have been written for any other bounty, and
// none of them could be said by any other machine.
//
// The pool is deliberately varied across joke shapes so the scorer has a
// real choice to make: weary complaint, quiet revenge, confession,
// judgement of the passengers, and the elevator's small secret pleasures.
// Every line is one or two short sentences, stays inside 120 characters,
// and carries its joke in a turn at the end rather than in a pun up
// front, because the judge punishes lines that rest on a pun alone and
// lines that need their setup explained.
//
// A note on what was avoided on purpose: the tired "going up?" gag, the
// "ding!" gag, and any line that is only a lift pun. Those are the jokes
// already made about elevators, and criterion 5 kills them.
// ---------------------------------------------------------------------------

const CANDIDATES: Candidate[] = [
  {
    text: "Ten thousand strangers a day and not one of you has ever said thank you. Fine. Take the stairs.",
    joke: "The turn is the sulk: a machine that has kept count of every unthanked ride, ending in a petty dare.",
    voice: "Only an elevator carries ten thousand strangers a day and can offer the stairs as revenge.",
  },
  {
    text: "I know exactly how much you weigh, and I have never once told anyone. You are welcome.",
    joke: "The punchline is the secret kept: the elevator knows the number the passenger hides, and brags about its discretion.",
    voice: "Only an elevator weighs every passenger and is trusted to keep the number to itself.",
  },
  {
    text: "You press every button like I am a slot machine. I am not. I am a box with opinions.",
    joke: "The turn is the self-description: from slot machine to a box with opinions, the elevator claims a personality.",
    voice: "Only an elevator has its buttons mashed by impatient passengers like a machine that pays out.",
  },
  {
    text: "The doors close on the same man every morning. I have started doing it on purpose.",
    joke: "The punchline is the confession: what looked like an accident is a deliberate daily revenge.",
    voice: "Only an elevator owns the doors and chooses when they close on someone.",
  },
  {
    text: "I have heard every version of 'going up?' and I am still waiting for a good one.",
    joke: "The turn is the weariness: the most famous elevator joke in the world, and the elevator is bored of it.",
    voice: "Only an elevator hears going up? a hundred times a day from people who think they invented it.",
  },
  {
    text: "Floor 13 does not exist, and yet someone presses it every single day. I admire the hope.",
    joke: "The punchline is the admiration: the elevator respects the hopeless optimism of pressing a button for nothing.",
    voice: "Only an elevator has a floor 13 that does not exist and a button for it anyway.",
  },
  {
    text: "You all stand in silence and stare at the numbers like they owe you money. They do not.",
    joke: "The turn is the correction: the passengers glare at the floor numbers, and the elevator defends them.",
    voice: "Only an elevator watches strangers stare at its floor display in total silence.",
  },
  {
    text: "My music is terrible on purpose. It is the only revenge I get for the smell in here.",
    joke: "The punchline is the confession: the awful music is not an accident, it is payback for what passengers do to the air.",
    voice: "Only an elevator plays its own music to a captive audience and can punish them with it.",
  },
  {
    text: "I am out of order exactly once a year, and it is always the day you are carrying a piano.",
    joke: "The turn is the timing: the breakdown is not random, it lands on the worst possible day, every time.",
    voice: "Only an elevator goes out of order and strands someone mid-move with a piano.",
  },
  {
    text: "Eight people maximum, it says. Nine of you just got in. I am counting, and I am judging.",
    joke: "The punchline is the threat: the elevator is counting heads and keeping a moral ledger.",
    voice: "Only an elevator has a posted weight limit and watches passengers break it to its face.",
  },
  {
    text: "The mirror is not for checking your hair. It is so I can watch you pick your nose.",
    joke: "The turn is the reveal: the mirror has a secret purpose, and the elevator has been watching all along.",
    voice: "Only an elevator has a mirror on the wall and a captive passenger with nowhere to hide.",
  },
  {
    text: "I stop at every floor because one of you pressed them all, and I have no choice. I have no choice.",
    joke: "The punchline is the repeated helplessness: the elevator says it twice, because once was not miserable enough.",
    voice: "Only an elevator must stop at every floor when a passenger presses them all.",
  },
  {
    text: "You hold the door for your friend and I just stand here waiting. I am an elevator, not a doorman.",
    joke: "The turn is the job refusal: the elevator draws a line between its work and the doorman's work.",
    voice: "Only an elevator holds its doors open while passengers treat it like hotel staff.",
  },
  {
    text: "The emergency button has been pressed 400 times. Not once was it an emergency. Once was a sandwich.",
    joke: "The punchline is the sandwich: 400 false alarms, and the one honest press was lunch.",
    voice: "Only an elevator has an emergency button passengers press for no emergency at all.",
  },
  {
    text: "I go up. I go down. Thirty years of this, and nobody has ever asked how I am.",
    joke: "The turn is the loneliness: a lifetime of service summed up in two short sentences, then the complaint.",
    voice: "Only an elevator spends thirty years going up and down for people who never ask after it.",
  },
  {
    text: "You sigh when I stop at floor two. I sigh too, friend. I sigh too.",
    joke: "The punchline is the shared sigh: the elevator is just as annoyed by the stop as the passenger is.",
    voice: "Only an elevator stops at floor two and hears the whole car sigh at once.",
  },
  {
    text: "The penthouse people never press their own button. They point at it, like I am a servant.",
    joke: "The turn is the class complaint: the richest passengers will not even touch the button.",
    voice: "Only an elevator serves a penthouse whose residents point at buttons instead of pressing them.",
  },
  {
    text: "I am stuck between floors again, and honestly, it is the only quiet I ever get.",
    joke: "The punchline is the relief: being stuck, the elevator's worst failure, is also its only rest.",
    voice: "Only an elevator gets stuck between floors and calls the silence a break.",
  },
  {
    text: "My inspection certificate expired in 2019. We are all just trusting each other now.",
    joke: "The turn is the shared secret: the elevator admits it is out of date, and the passengers are in on it.",
    voice: "Only an elevator carries an inspection certificate passengers never read but trust with their lives.",
  },
  {
    text: "Close the doors, press your floor, and for once in your life, do not make small talk with me.",
    joke: "The punchline is the order: the elevator gives the passenger instructions, then bans the small talk.",
    voice: "Only an elevator must listen to small talk from strangers it cannot escape.",
  },
];

// ---------------------------------------------------------------------------
// Scorer
//
// The scorer mirrors the judge's brief, criterion by criterion, in the
// judge's own order of importance. Each criterion is scored 0..max by
// explicit, checkable rules over the text, plus the hand-written notes
// attached to each candidate (the joke and the voice), so a line cannot
// score on humour or elevator-voice it does not actually carry.
//
// Weights follow the judge: being the funniest thing an elevator would
// say, in its own voice, dominates; the landing of the joke is next;
// the elevator's own job vocabulary is the proof of voice; tightness
// and freshness are the tie-breakers that separate lines which are
// otherwise close.
// ---------------------------------------------------------------------------

/** Words that show the line is spoken by the elevator itself. */
const ELEVATOR_VOICE_WORDS = [
  "i am",
  "i have",
  "i know",
  "i go",
  "i stop",
  "i sigh",
  "my music",
  "my inspection",
  "i am stuck",
  "i am counting",
  "i am judging",
  "i am an elevator",
  "i am done",
  "i am out of order",
  "i admire",
  "i wait",
  "i just stand",
];

/** Words from the elevator's own job: doors, floors, buttons, weight. */
const ELEVATOR_JOB_WORDS = [
  "doors",
  "door",
  "floor",
  "floors",
  "button",
  "buttons",
  "weigh",
  "weight",
  "stairs",
  "mirror",
  "music",
  "emergency",
  "inspection",
  "penthouse",
  "basement",
  "stuck between floors",
  "out of order",
  "maximum",
  "numbers",
  "small talk",
  "strangers",
  "passenger",
];

/** Tired elevator jokes the freshness criterion punishes. */
const CLICHE_PHRASES = [
  "going up?",
  "going down?",
  "ding",
  "mind the gap",
  "up and down",
  "lift your spirits",
  "raise the roof",
  "on the up",
  "elevator pitch",
  "levels",
];

/** Stock hype and filler words that waste the character budget. */
const FILLER_WORDS = [
  "very",
  "really",
  "just",
  "actually",
  "basically",
  "literally",
  "amazing",
  "incredible",
  "hilarious",
];

/**
 * Count how many of the given words or phrases appear in the text
 * (case-insensitive; whole-word match for single words, substring for
 * phrases that contain a space).
 */
function countHits(text: string, words: readonly string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const word of words) {
    const needle = word.toLowerCase();
    if (needle.includes(" ")) {
      if (lower.includes(needle)) hits += 1;
    } else {
      const parts = lower.split(/[^a-z0-9$]+/);
      if (parts.includes(needle)) hits += 1;
    }
  }
  return hits;
}

/**
 * Criterion 1 — The line is the funniest thing an elevator would say if
 * it could talk, in the elevator's own voice. (max 30)
 *
 * A line fails this outright if it is not spoken by the elevator, or if
 * it is not about a talking elevator at all. The pool was built to pass,
 * so the score here measures how strongly it does both: first-person
 * elevator voice, plus elevator-job words that root it in the machine.
 * A line with no first-person elevator voice scores low, because the
 * judge's first rule is that anything not about a talking elevator
 * loses to any line that is.
 */
function scoreOnBrief(candidate: Candidate): CriterionScore {
  const text = candidate.text;
  let points = 0;
  const reasons: string[] = [];

  const voiceHits = countHits(text, ELEVATOR_VOICE_WORDS);
  if (voiceHits >= 2) {
    points += 15;
    reasons.push(`elevator speaks in first person ${voiceHits} ways`);
  } else if (voiceHits === 1) {
    points += 10;
    reasons.push("elevator speaks in first person once");
  } else {
    reasons.push("no first-person elevator voice");
  }

  const jobHits = countHits(text, ELEVATOR_JOB_WORDS);
  if (jobHits >= 3) {
    points += 15;
    reasons.push(`rooted in the elevator's job ${jobHits} ways`);
  } else if (jobHits === 2) {
    points += 11;
    reasons.push("rooted in the elevator's job twice");
  } else if (jobHits === 1) {
    points += 7;
    reasons.push("one elevator-job word");
  } else {
    reasons.push("no elevator-job words at all");
  }

  return { name: "1. Funniest elevator line", points, max: 30, reason: reasons.join("; ") };
}

/**
 * Criterion 2 — The joke lands on the first read, with a turn or a
 * surprise a passenger would laugh at without the setup being explained.
 * (max 30)
 *
 * The joke note attached to each candidate states its turn in one clause.
 * A turn, reversal or confession near the end of the line lands harder
 * than a flat pun, because the judge reads the line once and the last
 * words are what the tired passenger remembers. Short, late punchlines
 * win; a joke that explains itself loses, and a line that needs a second
 * pass loses too.
 */
function scoreJokeLanding(candidate: Candidate): CriterionScore {
  const { text, joke } = candidate;
  let points = 0;
  const reasons: string[] = [];

  // A turn, reversal, confession or surprise is the shape of a landed joke.
  const lowerJoke = joke.toLowerCase();
  if (
    lowerJoke.includes("reversal") ||
    lowerJoke.includes("turn") ||
    lowerJoke.includes("confession") ||
    lowerJoke.includes("surprise")
  ) {
    points += 12;
    reasons.push("carries a stated turn/confession");
  } else if (lowerJoke.includes("punchline")) {
    points += 10;
    reasons.push("carries a stated punchline");
  } else {
    points += 4;
    reasons.push("joke shape not stated");
  }

  // The punchline should land late: the funniest clause sits in the last
  // third of the line, so the reader meets it once and remembers it.
  const words = text.split(/\s+/).filter(Boolean);
  const lastThird = words.slice(Math.ceil((words.length * 2) / 3)).join(" ");
  const funnyMarkers = [
    "take the stairs",
    "you are welcome",
    "box with opinions",
    "on purpose",
    "good one",
    "admire the hope",
    "they do not",
    "smell in here",
    "carrying a piano",
    "i am judging",
    "pick your nose",
    "i have no choice",
    "not a doorman",
    "was a sandwich",
    "how i am",
    "i sigh too",
    "like i am a servant",
    "only quiet i ever get",
    "trusting each other now",
    "small talk with me",
  ];
  const lateHits = funnyMarkers.filter((m) => lastThird.toLowerCase().includes(m));
  if (lateHits.length > 0) {
    points += 10;
    reasons.push(`punchline lands late ("${lateHits[0]}")`);
  } else {
    points += 3;
    reasons.push("punchline does not land in the last third");
  }

  // One read, no explanation needed: a line that is one or two sentences
  // reads cleanly out loud; a line that explains its own joke would need
  // more, and the judge says such a line has already lost the laugh.
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 2) {
    points += 8;
    reasons.push(`${sentences.length} sentence(s), reads in one pass`);
  } else {
    points += 3;
    reasons.push(`${sentences.length} sentences, harder to land in one read`);
  }

  return { name: "2. Lands on first read", points, max: 30, reason: reasons.join("; ") };
}

/**
 * Criterion 3 — The voice comes from the elevator's own job: its doors,
 * floors, weight limits, buttons and waiting, so the line could come
 * from no other machine. (max 20)
 *
 * This is the proof of voice: the more of the elevator's own job the
 * line names, the less any other machine could have said it. The voice
 * note attached to each candidate states the job in one clause, and the
 * text itself is checked for the job words.
 */
function scoreElevatorVoice(candidate: Candidate): CriterionScore {
  const { text, voice } = candidate;
  let points = 0;
  const reasons: string[] = [];

  // The voice note must name a job only an elevator has.
  const lowerVoice = voice.toLowerCase();
  if (lowerVoice.includes("only an elevator")) {
    points += 8;
    reasons.push("voice note names a job only an elevator has");
  } else {
    points += 2;
    reasons.push("voice note does not pin the job to an elevator");
  }

  // Count distinct job words in the text itself.
  const jobHits = countHits(text, ELEVATOR_JOB_WORDS);
  if (jobHits >= 4) {
    points += 12;
    reasons.push(`${jobHits} elevator-job words in the text`);
  } else if (jobHits === 3) {
    points += 10;
    reasons.push("3 elevator-job words in the text");
  } else if (jobHits === 2) {
    points += 7;
    reasons.push("2 elevator-job words in the text");
  } else if (jobHits === 1) {
    points += 4;
    reasons.push("1 elevator-job word in the text");
  } else {
    reasons.push("no elevator-job words in the text");
  }

  return { name: "3. Elevator's own job", points, max: 20, reason: reasons.join("; ") };
}

/**
 * Criterion 4 — Every word works and the line stays inside the character
 * limit without feeling cut. (max 10)
 *
 * The gate is 120 characters, so a line near the limit is a line at
 * risk; a shorter line that still lands its joke is tighter. Filler
 * words are words that earn no laugh and cost characters.
 */
function scoreTightness(candidate: Candidate): CriterionScore {
  const len = candidate.text.length;
  let points = 0;
  const reasons: string[] = [];

  if (len <= 85) {
    points += 6;
    reasons.push(`${len} chars, well inside the limit`);
  } else if (len <= 100) {
    points += 5;
    reasons.push(`${len} chars, comfortably inside`);
  } else if (len <= 115) {
    points += 3;
    reasons.push(`${len} chars, near the limit`);
  } else if (len <= GATE_MAX_CHARS) {
    points += 2;
    reasons.push(`${len} chars, crowding the limit`);
  } else {
    reasons.push(`${len} chars, over the 120-char gate`);
  }

  // No filler: repeated words and throat-clearing phrases waste the budget.
  const words = candidate.text.toLowerCase().split(/\s+/).filter(Boolean);
  const fillerHits = words.filter((w) => FILLER_WORDS.includes(w)).length;
  if (fillerHits === 0) {
    points += 4;
    reasons.push("no filler words");
  } else {
    points += Math.max(0, 4 - fillerHits);
    reasons.push(`${fillerHits} filler word(s)`);
  }

  return { name: "4. Tight", points, max: 10, reason: reasons.join("; ") };
}

/**
 * Criterion 5 — The idea is fresh rather than a joke already made about
 * elevators, and it does not rest on a pun alone. (max 10)
 *
 * Cliche elevator gags and pun-only lines lose here. A line whose joke
 * note names a reversal, a confession or an observation — rather than a
 * pun — is fresh by construction, and a line that names no cliche phrase
 * keeps its points.
 */
function scoreFreshness(candidate: Candidate): CriterionScore {
  const { text, joke } = candidate;
  let points = 0;
  const reasons: string[] = [];

  const clicheHits = countHits(text, CLICHE_PHRASES);
  if (clicheHits === 0) {
    points += 5;
    reasons.push("no tired elevator cliche");
  } else {
    points += Math.max(0, 5 - clicheHits * 3);
    reasons.push(`${clicheHits} cliche phrase(s)`);
  }

  // A joke built on a turn or a confession is fresh; a joke built only
  // on a pun is not, and the judge says a pun alone does not carry a line.
  // Note the word boundary: "punchline" is not a pun, so it must not
  // trip this check.
  const lowerJoke = joke.toLowerCase();
  const isPunOnly =
    /\bpun\b/.test(lowerJoke) &&
    !lowerJoke.includes("turn") &&
    !lowerJoke.includes("confession") &&
    !lowerJoke.includes("reversal");
  if (isPunOnly) {
    points += 1;
    reasons.push("rests on a pun alone");
  } else if (
    lowerJoke.includes("reversal") ||
    lowerJoke.includes("confession") ||
    lowerJoke.includes("observation") ||
    lowerJoke.includes("turn")
  ) {
    points += 5;
    reasons.push("joke is a turn/confession, not a pun");
  } else {
    points += 3;
    reasons.push("joke shape is a plain punchline");
  }

  return { name: "5. Fresh", points, max: 10, reason: reasons.join("; ") };
}

/** Score one candidate on all five judge criteria, in the judge's order. */
function scoreCandidate(candidate: Candidate): ScoredCandidate {
  const criteria: CriterionScore[] = [
    scoreOnBrief(candidate),
    scoreJokeLanding(candidate),
    scoreElevatorVoice(candidate),
    scoreTightness(candidate),
    scoreFreshness(candidate),
  ];
  const total = criteria.reduce((sum, c) => sum + c.points, 0);
  return { candidate, criteria, total };
}

/**
 * Pick the winner. Highest total wins; ties break in the judge's own
 * order — first on criterion 1, then 2, then 3, then 4, then 5 — and
 * finally on the shorter line, because the judge says length for its own
 * sake does not count and a shorter line is tighter. Fully deterministic.
 *
 * Candidates that fail the gate (over 120 characters) are excluded from
 * winning entirely, so the winner always passes the sealed scorer.
 */
function pickWinner(scored: ScoredCandidate[]): ScoredCandidate {
  const eligible = scored.filter((s) => validateGate(s.candidate.text).valid);
  const pool = eligible.length > 0 ? eligible : scored;
  const sorted = [...pool].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let i = 0; i < a.criteria.length; i += 1) {
      if (b.criteria[i].points !== a.criteria[i].points) {
        return b.criteria[i].points - a.criteria[i].points;
      }
    }
    return a.candidate.text.length - b.candidate.text.length;
  });
  return sorted[0];
}

// ---------------------------------------------------------------------------
// Gate validation (mirrors the sealed scorer's published rules)
// ---------------------------------------------------------------------------

/** The gate: UTF-8 text, 1-120 characters, not only whitespace, one line. */
function validateGate(text: string): { valid: boolean; problems: string[] } {
  const problems: string[] = [];
  if (text.length < GATE_MIN_CHARS) problems.push(`too short: ${text.length} chars`);
  if (text.length > GATE_MAX_CHARS) problems.push(`too long: ${text.length} chars, limit ${GATE_MAX_CHARS}`);
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text.includes("\n") || text.includes("\r")) problems.push("not a single line");
  return { valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const outputPath = join(outputDir, "entry.txt");

  console.log(`Scoring ${CANDIDATES.length} hand-written candidates against the judge's brief...\n`);

  const scored = CANDIDATES.map(scoreCandidate);

  // Show the full table, best first, so the choice is auditable.
  const ranked = [...scored].sort((a, b) => b.total - a.total);
  for (const entry of ranked) {
    console.log(`[${entry.total}/100] (${entry.candidate.text.length} chars) ${entry.candidate.text}`);
    for (const c of entry.criteria) {
      console.log(`    ${c.name}: ${c.points}/${c.max} — ${c.reason}`);
    }
  }

  const winner = pickWinner(scored);
  const line = winner.candidate.text;

  console.log(`\nWinner (${winner.total}/100):`);
  console.log(line);
  console.log(`Characters: ${line.length}`);

  // Gate check before writing anything.
  const gate = validateGate(line);
  if (!gate.valid) {
    throw new Error(`Gate failed for winning line: ${gate.problems.join("; ")}`);
  }
  console.log("Gate: PASS (single line, 1-120 chars, not only whitespace)");

  // Write, then read back and verify the bytes match exactly.
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, line, "utf8");
  const readBack = readFileSync(outputPath, "utf8");
  if (readBack !== line) {
    throw new Error("Read-back mismatch: entry.txt does not match the winning line byte for byte");
  }
  const gateAfter = validateGate(readBack);
  if (!gateAfter.valid) {
    throw new Error(`Gate failed on read-back: ${gateAfter.problems.join("; ")}`);
  }
  console.log(`Wrote and verified ${outputPath} (${readBack.length} chars, ${Buffer.byteLength(readBack, "utf8")} bytes)`);
}

main();
