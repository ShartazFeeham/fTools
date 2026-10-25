# fTools

Small tools by ShartazFeeham. Each lives in its own folder.

| tool | what it is |
|------|------------|
| [claude-meter](claude-meter/) | floating Claude Code usage meter (5-hour and weekly limits), macOS and Windows |

## Adding a tool

1. Make a folder `<tool>/` with its own `package.json` (name, `bin`, dependencies), code and tests.
2. In the root `package.json` add `"<tool>": "<tool>/bin/cli.js"` to `bin`, add the folder to `files`, and add the tool's dependencies.
3. Add a row to the table above. Users get its command with `npm i -g github:ShartazFeeham/fTools`

## claude-meter

Needs Node.js 18+ and Claude Code signed in once.

```sh
npm i -g github:ShartazFeeham/fTools
claude-meter up
```

Run `claude-meter` alone to list the commands:

```
claude-meter up         start the meter (restarts it if running) and start it at every login
claude-meter down       stop it and remove it from login
claude-meter status     usage numbers, Claude Code login check, meter state
claude-meter login      sign in to Claude Code (claude auth login)
claude-meter uninstall  stop it, remove login item and data, and remove the package
```

The green chip is minutes to the 5-hour reset (hours of the weekly limit once it is used up), yellow is the 5-hour limit used,
red is the weekly limit used (in %). Click the icon for details; drag it anywhere. It finds your Claude Code login by itself
(macOS Keychain, or `~/.claude/.credentials.json` on Windows/Linux); without one the numbers show ⚠ and a click starts sign-in.

How it works: every 60 s (30 s after a failed check) it asks `api.anthropic.com/api/oauth/usage`, the endpoint Claude Code's
`/usage` uses, with your Claude Code access token. Read only: the token is used for that one request and never stored or logged;
the refresh token is never touched. Start at login is a LaunchAgent on macOS and a `Run` registry key on Windows (macOS shows a
one-time "background activity" notice). An expired token shows ⚠ until Claude Code refreshes it or you run `claude-meter login`.

Develop: `git clone https://github.com/ShartazFeeham/fTools && cd fTools && npm i && npm test && node claude-meter/bin/cli.js status`

MIT, see [claude-meter/LICENSE](claude-meter/LICENSE).
