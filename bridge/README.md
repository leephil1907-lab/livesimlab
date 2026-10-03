# LiveSim Desktop Media Bridge

Local desktop transport boundary for the processed LiveSim video stream.

Pipeline: browser or RTX renderer -> localhost bridge -> native media sink.

The bridge should bind to 127.0.0.1 by default and expose only health, capabilities, session creation, frame transport, and session stop operations. Use a random per-session token, enforce frame-size and frame-rate limits, expire idle sessions, and never log frame bytes or provider credentials.

Mobile clients remain control and preview clients. Desktop is the high-performance media host because native operating-system media integration is required for some external meeting clients.

The first native target is a desktop media sink. Provider-specific SDK adapters must be built only with the provider's current approved SDK and credentials. The browser control plane must never contain provider secrets.
