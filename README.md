# LiveSim Lab

A transparent video-call and livestream simulation lab for education and security research.

## Scope

- User-supplied video media for controlled call and livestream research
- Clearly labeled synthetic, pre-recorded, or user-supplied media
- User-configured participant and voice state
- Playback and audit markers
- User-provided synthetic Bitcoin transaction analysis
- Event/timeline logging
- Responsive dark broadcast-console interface

## Safety boundary

This project uses synthetic identities and synthetic Bitcoin data for research. It does not capture credentials, wallets, cameras, microphones, or real transaction signatures, and it does not present simulated media as genuinely live.

Voice cloning is restricted to voices the user owns or is authorized to use. Fish Audio credentials remain server-side and are never stored in the client or repository.

## Input model

LiveSim Lab does not ship with fabricated participants, viewer counts, chat messages, transaction IDs, voice profiles, or pre-approved session actions. Users provide the media, authorized voice, session context, and synthetic transaction data they want to analyze.

## Current UI

The application is developed in Floot and mirrored here for version control.

## License

Add the project's preferred license before public distribution.
