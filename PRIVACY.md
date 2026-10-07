# Privacy Policy

**WeBWorK Spoiler Guard**
Last updated: October 7, 2026

## Short version

The extension collects nothing, sends nothing, and talks to no server. It only changes how WeBWorK pages are drawn in your own browser.

## What is stored

Your settings, and only your settings:

- which categories to hide (answers, results, scores, solutions)
- whether to clear pre-filled answer boxes and strip reveal parameters
- hide vs. blur mode, and whether the on-page button is shown
- the hostnames you've paused the extension on
- any extra CSS selectors you typed into the Advanced box
- the sites you granted the extension permission to run on

These are kept in `chrome.storage.sync`, which is Chrome's own settings storage for your profile. If you're signed into Chrome, Google syncs it across your devices the same way it syncs bookmarks. It never reaches me or any third party.

## What is not collected

No personal information, no account or login data, no answers, no scores, no grades, no coursework, no browsing history, no page content, no analytics, no telemetry, no crash reports, no advertising identifiers.

The extension makes no network requests of any kind. There is no server behind it.

## Permissions and why they exist

- **storage** — saves the settings listed above.
- **scripting** — registers the content script on WeBWorK installs that don't live under `/webwork2/` or `/webwork/`, after you grant that site in the popup.
- **optional host permissions** — requested one domain at a time, only when you press "Also run on this site", and only for that domain. Nothing is requested up front.

Page access is used solely to hide elements and clear pre-filled inputs on the page in front of you. Nothing read from the page leaves the page.

## Data sharing and sale

None. No data is transmitted, so none can be sold, shared, or used for anything.

## Removing your data

Uninstalling the extension removes its stored settings. You can also clear them from `chrome://extensions` by removing the extension, or revoke a granted site under its "Site access" settings.

## Contact

Open an issue on the GitHub repository.
