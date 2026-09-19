# Pull request

## What this changes

<!-- One paragraph. State the user-visible effect, not the files touched. -->

## Why

<!--
The motivation. If this fixes a bug, explain the MECHANISM, not just the symptom:
what was actually wrong, and why the change makes it right.
-->

## How it was verified

<!--
List what you actually ran. At minimum `npm test`. Real-browser checks matter most,
because the suite cannot reach a browser — see CONTRIBUTING.md → "Manual verification
checklist".
-->

- [ ] `npm run build` run and the regenerated `lib/client.js` committed
- [ ] `npm test` passes (state the count, e.g. "89 passed")
- [ ] Host half still imports: `node --input-type=module -e "import('./lib/index.js')"`
- [ ] For anything visual: checked in a real browser after restarting `dsh web`
- [ ] For the element picker: confirmed the settings modal hides and returns

DSH version tested against: <!-- e.g. 0.1.5-rc.2 -->
OS tested on: <!-- e.g. Windows 11 -->

## Safety review

<!--
Tick these against CONTRIBUTING.md → "Hard rules that protect users". They are not
ceremony: a throwing factory or a PENDING fiber takes the whole web GUI down.
-->

- [ ] New platform seeds, if any, are resolved inside `try` (and the failure path returns a dumb module)
- [ ] No new service was added to `exports.inject` unless its provider is guaranteed to exist
- [ ] New registration calls are wrapped so one failure cannot break the shell
- [ ] Any new host route carries the trust fence (loopback `Host`, cross-site refused, `Origin` compared by hostname)
- [ ] Any new wire value is validated and stays `string | null`
- [ ] No new runtime dependency
- [ ] No DSH CSS-module class name is targeted by a new selector
- [ ] Any DOM node hidden or mutated is reached by a rule provable from structure, with a counterexample test

## Notes for the reviewer

<!--
Anything that needs context: a design decision you are unsure about, a follow-up you
deliberately left out, a manual step that was hard to automate.
-->
