# claude-meter

<img src="https://raw.githubusercontent.com/ShartazFeeham/fTools/main/claude-meter/screenshot.png" alt="claude-meter" width="300">

A small floating Claude icon (macOS and Windows) that shows your **Claude Code usage limits** at a glance.

- green: minutes until the 5-hour limit resets (hours of the weekly limit once it is used up)
- yellow: 5-hour limit used, %
- red: weekly limit used, %

Click the icon for details and reset times; drag it anywhere. No setup: it finds the Claude Code login already on your machine
(macOS Keychain, or `~/.claude/.credentials.json` on Windows/Linux). Without a login the numbers show ⚠; click one to sign in.

## Install

Needs Node.js 18+ and Claude Code signed in once.

```sh
npm i -g @feeham/claude-meter
claude-meter up
```

## Commands

```
claude-meter up         start the meter (restarts it if running) and start it at every login
claude-meter down       stop it and remove it from login
claude-meter status     usage numbers, Claude Code login check, meter state
claude-meter login      sign in to Claude Code (claude auth login)
claude-meter uninstall  stop it, remove login item and data, and remove the package
```

## How it works

Every 60 s (30 s after a failed check) it asks `api.anthropic.com/api/oauth/usage`, the endpoint Claude Code's `/usage` uses, with your
Claude Code access token. Read only: the token is used for that one request and never stored or logged; the refresh token is never touched.
Start at login is a LaunchAgent on macOS and a `Run` registry key on Windows (macOS shows a one-time "background activity" notice).
An expired token shows ⚠ until Claude Code refreshes it or you run `claude-meter login`.

## Develop

```sh
git clone https://github.com/ShartazFeeham/fTools && cd fTools/claude-meter
npm i && npm test
node bin/cli.js status
```

Files: `bin/cli.js` (commands, start at login), `lib.js` (find the login, ask for usage, start sign-in), `main.js` and `meter.html` (the floating window).

## Release

1. Bump `version` in `package.json`, commit and push.
2. `git tag claude-meter-v<version> && git push origin claude-meter-v<version>`. The `publish` workflow in `.github/workflows` publishes it to npm.

One-time setup on npmjs.com (package Settings, Trusted Publisher, GitHub Actions): user `ShartazFeeham`, repository `fTools`, workflow `publish.yml`, and tick "Allow npm publish". No token is stored.

Source and other tools: https://github.com/ShartazFeeham/fTools. Open to contributions. MIT.
