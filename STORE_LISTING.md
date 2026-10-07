# Chrome Web Store submission

Everything the dashboard asks for, in the order it asks. Not part of the extension; this file is just notes to copy from.

Dashboard: https://chrome.google.com/webstore/devconsole
One-time developer registration fee: $5.

---

## 1. Build the package

```sh
./package.sh
```

That writes `dist/webwork-spoiler-guard-<version>.zip` containing only `manifest.json`, `src/`, `icons/`, `LICENSE` and `PRIVACY.md`. Upload that zip under **Package**. Don't zip the parent folder; the manifest has to sit at the top level of the archive.

Bump `"version"` in `manifest.json` for every new upload. The store rejects a re-upload of a version it already has.

---

## 2. Store listing

**Name** (45 char max)

```
WeBWorK Spoiler Guard
```

**Summary** (132 char max)

```
Hides revealed answers, correct/incorrect marks and scores on WeBWorK so you can redo problem sets after the due date.
```

**Description**

```
Once a WeBWorK answer date passes, the site stops being usable for studying. It re-fills every answer box with what you submitted the first time, turns the results table green, and prints the correct answer right under the problem. There's nothing left to solve.

WeBWorK Spoiler Guard blanks all of that out so an old problem set looks fresh again, with a one-click Peek for when you actually want to check your work.

WHAT IT HIDES
• The revealed correct answer, and the Correct Answer / Answer Preview columns
• Correct and incorrect marks: results table, green checks, red Xs, "your answer is correct"
• Scores: overall recorded score, Score / Status / Attempts columns, progress bars
• Solution and hint blocks

It also empties the answer boxes WeBWorK pre-fills from your last submission, and keeps "show correct answers" unchecked and stripped out of links so the server is never asked for the answers in the first place. Anything you type yourself is never cleared.

CONTROLS
• Peek (on-page button, or Alt+Shift+P) reveals everything and puts your old answer back. Press again to re-hide.
• Alt+Shift+H pauses it for one school's site.
• The popup has per-category switches and a Blur mode, where spoilers stay on the page blurred and un-blur when you hover them.

WORKS WITH YOUR SCHOOL
Runs automatically on any URL containing /webwork2/ or /webwork/, which covers nearly every install. If yours lives elsewhere, open the popup and press "Also run on this site" to grant that one domain. If a theme at your school shows something it doesn't know about, you can add your own CSS selector under Advanced.

PRIVACY
No network requests, no analytics, no accounts, no data collection of any kind. Your settings are the only thing stored, and they live in your own Chrome profile. Nothing you do on WeBWorK ever leaves your browser.

This is a study aid. It changes what your browser displays, nothing else. Your scores and submission history on the WeBWorK server are untouched.

Open source: https://github.com/Palingenos/Webwork-Spoiler-Guard
```

**Category:** Education
**Language:** English

---

## 3. Graphic assets

Required:

- **Store icon** — 128x128 PNG. `icons/icon128.png` already matches.
- **Screenshots** — at least 1, up to 5. Must be exactly **1280x800** or 640x400 PNG/JPEG.

Screenshots worth taking:

1. A completed WeBWorK problem with the extension on, blank boxes, no green
2. The same page mid-Peek, everything revealed
3. The toolbar popup with the category switches
4. Blur mode with one spoiler hovered

Take them at 1280x800. On macOS: `Cmd+Shift+4`, then space, then click the window, and crop/pad to size in Preview.

Optional but helps: a 440x280 small promo tile.

Never put a real classmate's name, student ID, or a real grade in a screenshot.

---

## 4. Privacy tab

This is where submissions usually get stuck. Answers:

**Single purpose description**

```
Hides answers, correctness feedback and scores on WeBWorK course pages so students can re-attempt problem sets they have already submitted.
```

**Permission justifications**

| Permission | Justification to paste |
| --- | --- |
| `storage` | Saves the user's own settings: which spoiler categories to hide, hide vs. blur mode, which sites the extension is paused on, and any custom CSS selectors they entered. No other data is stored. |
| `scripting` | Registers the content script on WeBWorK installations hosted at a path other than /webwork2/ or /webwork/, after the user explicitly grants that single site from the popup. |
| Host permissions | The extension must read and restyle the WeBWorK page itself in order to hide revealed answers, correctness marks and scores, and to clear answer boxes WeBWorK pre-filled. Default matches are limited to URLs containing /webwork2/ or /webwork/. Broader access is optional and requested one domain at a time, only when the user presses "Also run on this site". |

**Remote code:** No, the extension does not use remote code. All JavaScript and CSS ships in the package.

**Data usage** — check nothing. Then tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL** — required because the extension requests host permissions. Point it at the raw `PRIVACY.md` on GitHub, or at a GitHub Pages copy:

```
https://github.com/Palingenos/Webwork-Spoiler-Guard/blob/main/PRIVACY.md
```

---

## 5. Trader status (EEA)

The console blocks submission until you answer this. Required of every developer under the EU Digital Services Act, which makes marketplaces identify the traders operating on them.

**Answer: non-trader.** This is free, open source, no payments, no in-app purchases, no ads, and not published on behalf of a business, so the publishing is outside any trade, business, craft or profession. Trader status would require a legal name, phone number and physical address, disclosed to EU consumers.

Google won't decide this for you; the declaration is yours. Re-declare as a trader before ever charging for it, adding in-app purchases, running ads, or publishing under a company.

---

## 6. Distribution

Public, all regions. No ads, no payment. Not primarily directed at children under 13.

---

## Review notes

Expect a few days to a couple of weeks. Extensions that request host permissions get looked at by hand.

Two things that can draw a question, with the honest answer if a reviewer asks:

- **It modifies a site the developer doesn't own.** That's the whole function, and it's cosmetic and local. No requests are made or blocked, nothing is submitted, no grade is altered.
- **It hides educational content.** It hides it *from the person who installed it, on their own machine, at their own request*, so they can re-practice. A Peek button is always one click away.
