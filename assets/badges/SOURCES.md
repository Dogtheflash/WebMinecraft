# Discord progression badges

Account: `917263515209859102` (`nakarotad`). Verified from the owner's Discord Badge Directory screenshots on 2026-11-13.

| Badge | Current tier | Confirmed total | Tier unlocked |
| --- | --- | --- | --- |
| Game Time | 6 — Tận hiến / Devoted | 327 hours | 2026-09-06 |
| Game Variety | 8 — Người khác biệt / Maverick | 70 games | 2026-08-19 |
| Streaming | 2 — Chim non / Fledgling | 6 hours | 2026-07-30 |
| Account Age | 4 — Nụ chồi / Sapling | Created 2021-12-06T03:57:43.958Z | 2025-12-06 |

Account age and its icon advance automatically from the Discord snowflake, including the fifth anniversary on 2026-12-06. The other three totals are a confirmed snapshot, not live Discord measurements.

## Data source and future updates

Lanyard's public user response currently includes presence and `public_flags`, but does not expose the new activity badge totals. Discord's `/api/v9/users/917263515209859102/badges` returned HTTP 401 without authentication during verification. A user ID is not authorization to read that endpoint.

The site can accept owner-published progress from the existing Lanyard KV response under `kv.discord_badges` (a JSON string). This receiver does **not** create a Discord data collector or activate live synchronization by itself. A trusted publisher must obtain and publish actual totals; no such publisher is configured in this repository.

```json
{
  "version": 1,
  "userId": "917263515209859102",
  "updatedAt": "2026-11-13T07:00:00Z",
  "gameTimeHours": 327,
  "gamesPlayed": 70,
  "streamHours": 6
}
```

When valid newer progress is published, the existing six-second presence refresh updates totals, names and SVGs automatically across all ten tiers. It validates the owner ID, finite nonnegative totals, an integer game count and a recent valid timestamp, and keeps the last confirmed data when the source is missing, stale or invalid. Unknown unlock dates are not invented when a tier changes.

Do not put Discord account tokens, bot tokens or Lanyard API keys in client-side files, this repository or chat messages. The public site only consumes non-secret published totals. It does not call authenticated Discord endpoints or automate the personal Discord account.

## Primary references

- [Discord's announcement of the four new badges](https://discord.com/blog/unlock-level-up-flex-discord-profile-badges-got-an-upgrade)
- [Official badge meanings and tracking rules](https://support.discord.com/hc/en-us/articles/44369363856663-Discord-Profile-Badges-What-Each-Badge-Means)
- [Discord snowflake format](https://docs.discord.com/developers/reference#snowflakes)
- [Lanyard KV documentation](https://github.com/Phineas/lanyard#kv)
- [Discord's policy on automated user accounts](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots)

## Original artwork

These are unmodified SVG files fetched from Discord's official CDN, not redrawn icons. All 40 tier icons are bundled locally so level changes do not depend on a third-party image host. The upstream URLs were located using the [mezotv asset index](https://github.com/mezotv/discord-badges); the artwork itself is served by Discord. Badge names and artwork belong to Discord.

| Local file | Original Discord SVG |
| --- | --- |
| [account-age-1.svg](./account-age-1.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/dda73966211a0c16533f8fcd9f1f27c27a628ef562927270e79df9b9c5e6cb12.svg) |
| [account-age-2.svg](./account-age-2.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/74e1884f930b0d69986f92aeea77d3ff3d3d00c540f386b63e6ebb382d5e927d.svg) |
| [account-age-3.svg](./account-age-3.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/217dab12dcb72d4c95f2863e9dddd5c42003345a001684ea55a736172f32eea1.svg) |
| [account-age-4.svg](./account-age-4.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/26b89419a4f562ab31a1a72eac04833aa1026af937f1d53c088ec258df3db84b.svg) |
| [account-age-5.svg](./account-age-5.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/1db184b6d10a61a37dc30efdc74d587560fac5291c8bb329977e93bb5a312602.svg) |
| [account-age-6.svg](./account-age-6.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/6b0f2ed5be272942eeabea3a0289027d164c7b1ce6a76166d1c928a57db762c5.svg) |
| [account-age-7.svg](./account-age-7.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/c095e3e73591843a22dc979d1fcfe3d6cf6841d1f51387d208d19f8bed01deb7.svg) |
| [account-age-8.svg](./account-age-8.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/867feeff5acd481c80bae557c586718fb5390bbaaa1cbde55fae296a7884e799.svg) |
| [account-age-9.svg](./account-age-9.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/a6f4c487be2aa012f41f1fba40e664f914ede9251f4b967d890ab5c065a29fb7.svg) |
| [account-age-10.svg](./account-age-10.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/1d8caace0299b12bcc469c35ce927e838abd9c645a22fe7c556f4394e57fa79b.svg) |
| [streaming-newcomer.svg](./streaming-newcomer.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/c56b451e3bf04181182c2529e9bd3659e569ea80f582858090007f0752401b38.svg) |
| [streaming-fledgling.svg](./streaming-fledgling.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/2e25ba794f6f371ea0f52eb2d3c8fb2b04094a56f388515e13a9bd6d7949a018.svg) |
| [streaming-breakout.svg](./streaming-breakout.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/4e847b4dca20fbf1c56d3a47cac3c9204f02113c9d5a270ebebdf12909c75848.svg) |
| [streaming-standout.svg](./streaming-standout.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/27d0e6939f13dcf113243fc9eac642b15e9764ad891e06c5ed78d45a17678582.svg) |
| [streaming-trendsetter.svg](./streaming-trendsetter.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/af681483be2035f14b0f2bfe2e25a8944c97149172938888ca1008edbe037aad.svg) |
| [streaming-headliner.svg](./streaming-headliner.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/e69a0c86a476c9782ea1d3e7b5ba308eec3d9d6a3eae6ab8af3180f67d16b468.svg) |
| [streaming-star.svg](./streaming-star.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/06b6206db966635cf626651bdb94eacce5a23ab05dc7f600f7d31aa482b2058c.svg) |
| [streaming-sensation.svg](./streaming-sensation.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/1a3b9120ecd64c342083c37980b225d29ebf4544da6ab546c9268f87904c9dfe.svg) |
| [streaming-visionary.svg](./streaming-visionary.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/85f714b90ed3ceb1e00e1f2069bf3ebd564962fa940c92540061537a045e54ab.svg) |
| [streaming-phenomenon.svg](./streaming-phenomenon.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/61331d04b7a9542b38bfa59583360c0b9b93c6496a04f99c0ab37fa1d83ec58a.svg) |
| [game-time-casual.svg](./game-time-casual.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/b75fcc4dd1c65dfd4169a203e21023453fd6fe853c9b5c1fd839781fda98e80d.svg) |
| [game-time-recreational.svg](./game-time-recreational.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/f0f32cb2a0003475e443b76a7a2baf454356953ecb84195c7a08c3ce2fd95b70.svg) |
| [game-time-dedicated.svg](./game-time-dedicated.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/e0c82f41bcad94a2a52713800fbef7687d0d2c6a6066b09d5e5876156d086e1a.svg) |
| [game-time-committed.svg](./game-time-committed.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/16f2aeb7465c99efce4d67d9333e3ddcf7435d6e60d2f5f93dc0c07bc7c5a69b.svg) |
| [game-time-serious.svg](./game-time-serious.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/ba26e83fa68189b41837184e38706f41c288dd29ffba266035d1a5ad9adbae22.svg) |
| [game-time-devoted.svg](./game-time-devoted.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/851b194288f1913ece6c8d99976519e48210580d6f42d994f21e37801611ad54.svg) |
| [game-time-seasoned.svg](./game-time-seasoned.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/8b10f5c0c30abbd521be5afc2e0dd4ec6da18bfbc689f06d93a51d06577cd84a.svg) |
| [game-time-ironclad.svg](./game-time-ironclad.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/d705628490898f2cc22d669cf8b415bc03fed1ddaf98a2a8cbd97442a509293c.svg) |
| [game-time-unshakeable.svg](./game-time-unshakeable.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/2bddcbc9f9959dab805eb7196c8112ce9dc68b09766c8193ab499b1870e44ac7.svg) |
| [game-time-eternal.svg](./game-time-eternal.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/457ce4e657f0ced23197891cc3d75b7de29cafa065cdb8cbb81060ac0e63b07f.svg) |
| [game-variety-sampler.svg](./game-variety-sampler.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/ed18d5976c01a4ea19f5a13af08f0547582405cbe48b098b0822e352b8e0a822.svg) |
| [game-variety-dabbler.svg](./game-variety-dabbler.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/e450d5279537db06ee47a104af520b884adaa7ffc3ef2627157526bf1c58e840.svg) |
| [game-variety-enthusiast.svg](./game-variety-enthusiast.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/158a9d91b8ca9e96d4afeee38cd640fc51483a8196edb9af0c26e44727acafae.svg) |
| [game-variety-ranger.svg](./game-variety-ranger.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/9e491942070007f64011ae4fc478926b96433698c07621fc43bafdd5efe83912.svg) |
| [game-variety-explorer.svg](./game-variety-explorer.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/e25fc55814262150e154ddb1a2b55fc5ed8ed5ba2ff1a22a33d4a41e651e370a.svg) |
| [game-variety-adventurer.svg](./game-variety-adventurer.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/542d5277e0001ea738d5eb57b247dcab9ce6e0c29493d5892203f6258fde55b9.svg) |
| [game-variety-voyager.svg](./game-variety-voyager.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/082e693cb9ce98b81af618978d449409efc6522b061bc0eac6e88a949fd888c6.svg) |
| [game-variety-maverick.svg](./game-variety-maverick.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/6fc242e9e8259c471a5e4599cd09af5476e622a572ff235883173913bf506103.svg) |
| [game-variety-polymath.svg](./game-variety-polymath.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/be9a4d119b8e0d7fc1df7e5a12081332637cb9c978a90377cb9c930500b2fbe6.svg) |
| [game-variety-universalist.svg](./game-variety-universalist.svg) | [Discord CDN](https://cdn.discordapp.com/assets/content/fcc34d343451505c642f3397cec2669a2de3a4a410fb968f794b3a1a0dcd1728.svg) |

## Verification

Run from the repository root:

```sh
node --check assets/js/script.js
node --test tests/discord-badges.test.cjs
```

Tests cover the confirmed totals, anniversary boundaries, future tier transitions, invalid/wrong-account input, stable rendering across presence refreshes and all 40 local SVG assets.
