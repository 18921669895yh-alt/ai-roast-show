# Moments Toxic Review Design

## Goal

Make every visible user-facing surface about reviewing another person's submitted social post, remove the legacy self-roast and duel experience, and make four fire levels materially different in AI output.

## Interaction

- Gentle, familiar, and stage levels select immediately.
- Extreme opens the existing site-style modal with a 100% warning, a content-only safety reminder, and cancel/confirm actions.
- Stage has no confirmation.
- Extreme confirmation traps focus, closes on Escape, restores focus to its radio, and preserves the selected prior level on cancel.

## Content model

- All material refers to another person's post, caption, picture, chat style, outfit, or profile copy.
- Result and report surfaces call the output a review or archive of the submitted post, not a judgment of the uploader.
- Duel, comeback, audience-reaction, and self-roast navigation are removed from the public experience.

## Generation

- Prompt instructions specify four distinct intensity profiles.
- Higher levels require more independent observations and denser satire.
- Prompt forbids duplicate metaphors, repeated claims, repeated titles, and copied source phrasing.
- Every level remains content-only and falls back to a restrained response for real distress.
