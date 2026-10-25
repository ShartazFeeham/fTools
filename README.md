# fTools

Small tools by ShartazFeeham, one folder each. Open to contributions.

| tool | what it is |
|------|------------|
| [claude-meter](claude-meter/) | floating Claude Code usage meter (5-hour and weekly limits), macOS and Windows |

## claude-meter

[![npm downloads](https://img.shields.io/npm/dm/@feeham/claude-meter)](https://www.npmjs.com/package/@feeham/claude-meter)

```sh
npm i -g @feeham/claude-meter
claude-meter up
```

Needs Node 18+ and Claude Code signed in once. Run `claude-meter` to list the commands (`up`, `down`, `status`, `login`, `uninstall`).

## Releasing a tool

Bump `version` in `<tool>/package.json`, push, then `git tag <tool>-v<version> && git push origin <tool>-v<version>`. GitHub publishes it to npm.
