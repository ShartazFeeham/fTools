# claude-meter

A small floating Claude icon (macOS and Windows) that shows your **Claude Code usage limits** at a glance:

| chip | meaning |
|------|---------|
| green  | minutes until the 5-hour limit resets (hours of the weekly limit once it is used up) |
| yellow | 5-hour limit used, % |
| red    | weekly limit used, % |

Click the icon for details and reset times. Drag it anywhere. No setup: it finds the Claude Code login already on your machine
(macOS Keychain, or `~/.claude/.credentials.json` on Windows/Linux). Without a login the three numbers show ⚠; click any of them to sign in.

## Install and run

You need [Node.js](https://nodejs.org) 18+ and [Claude Code](https://claude.com/claude-code) signed in once.

```sh
npx -p github:ShartazFeeham/fTools claude-meter up
```

To keep the `claude-meter` command around:

```sh
npm i -g github:ShartazFeeham/fTools   # installs the claude-meter command
claude-meter up
```

## Commands

```
claude-meter up       start the meter (restarts it if running) and start it at every login
claude-meter down     stop it and remove it from login
claude-meter status   usage numbers, Claude Code login check, meter state
claude-meter login    sign in to Claude Code (runs: claude auth login)
```

## How it works

- Every 60 s it asks `https://api.anthropic.com/api/oauth/usage` (the same endpoint Claude Code's `/usage` uses) with your Claude Code access token.
  After a failed check it retries after 30 s.
- Read only: the token is used for that one request, never stored or logged; the refresh token is never touched.
- Start at login: a LaunchAgent on macOS, a `Run` registry key on Windows. macOS shows a one-time "background activity" notice for it.
- If the token has expired it shows ⚠ until Claude Code refreshes it (use Claude Code once) or you run `claude-meter login`.

## Develop

```sh
git clone https://github.com/ShartazFeeham/fTools && cd fTools
npm i && npm test
node claude-meter/bin/cli.js status
```

MIT.
