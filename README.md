# fTools

Small tools by ShartazFeeham. Each lives in its own folder.

| tool | what it is |
|------|------------|
| [claude-meter](claude-meter/) | floating Claude Code usage meter (5-hour and weekly limits), macOS and Windows |

## Adding a tool

1. Make a folder `<tool>/` with its own `package.json` (name `@feeham/<tool>`, `bin`, dependencies), code, tests and a README.
2. Add a row to the table above.
3. Publish it (see "Releasing a tool" below); users install it with `npm i -g @feeham/<tool>`.

## claude-meter

[![npm downloads](https://img.shields.io/npm/dm/@feeham/claude-meter)](https://www.npmjs.com/package/@feeham/claude-meter)

Needs Node.js 18+ and Claude Code signed in once.

```sh
npm i -g @feeham/claude-meter
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

## Releasing a tool

Bump `version` in `<tool>/package.json`, push, then tag and push the tag: `git tag <tool>-v<version> && git push origin <tool>-v<version>`.
The `publish` workflow publishes that tool to npm (trusted publishing, no token). Set it up once per package on npmjs.com:
package Settings, Trusted Publisher, GitHub Actions, user `ShartazFeeham`, repo `fTools`, workflow `publish.yml`.
