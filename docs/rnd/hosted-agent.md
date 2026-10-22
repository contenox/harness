---
title: "The hosted agent: a reference deployment"
description: The Contenox engine deployed as a shared service — account files with an access model, live team conversations, approvals any participant can answer, and per-member metering.
---

# The hosted agent: a reference deployment

A team workspace built on the engine: members share the account's files, talk to the same agent in the same conversation, and each turn is charged to whoever sent it. It was built for a team that owns the code and the deployment.

## The problem

An agent in a browser is easy for one person. A team needs more: files that some people can see and others cannot, a conversation several people can watch and steer, an approval that does not wait for one particular person, and a bill that lands on the right member. Each of those is an access or delivery question, and answering them in the web layer would have meant a second copy of the rules.

## The shape

A browser app speaks the Agent Client Protocol to a relay. The relay owns accounts, memberships, pairing, entitlement and metering. For each member it runs an engine in process; the engine holds the conversation, runs tools, asks for approval and calls models through providers the operator declared. The agent is a declaration the operator publishes, not code the relay carries.

Hosting is limited to what has to be shared across machines. Everything else is the engine's own.

## Account files

An account's files are one tenant in the engine's virtual file system. Every active member can view and edit them. A member who manages a file or folder can restrict it to named members or team groups; a restricted node is a boundary, so inside it only grants on the node and its descendants count. Owners and admins manage their account's whole tree.

The browser's file routes, the protocol's file extension and the agent's own file tools all go through the same access list, and all three act as the member. The agent working for a member sees what that member sees, and what it writes belongs to them. The member is resolved on every call, so a removed membership or a changed group applies immediately.

![The agent screen with the account's files beside the conversation and a file open in the preview pane](/lab-hosted-account-files.png)

Typing `@` offers the same tree to the conversation:

![The composer's @ picker listing the account's folders and files](/lab-hosted-mention.png)

## Team conversations

A conversation belongs to the member who started it until they, or an owner or admin, share it with the whole account or one team group. A shared conversation is live: each participant sees the others' messages and the agent's stream as they happen, and every message names its author. Any participant can answer an approval and the first answer wins. While one participant's turn runs, another's send is refused with the name of whoever holds it, and the draft stays in the composer.

![A shared conversation showing its starter, the share scope, the author of each message and a banner naming the participant running the turn](/lab-hosted-team-session.png)

Each turn runs on, and is charged to, the member who sent it. Model and reasoning choices stay each participant's own. Visibility is checked again at every delivery, so unsharing a conversation or removing a member ends their live view and any approval they could have answered.

Tool calls stay in the transcript with their outcomes:

![A transcript with completed read and execute calls, a failed edit, and the agent stopping to ask which of two options to take](/lab-hosted-tool-calls.png)

## Problems it solved

- **One rule for every path into the files.** Because the routes, the protocol extension and the agent's tools share one access list, none of them has a rule of its own to drift.
- **Settings leaking between participants.** A model or reasoning change used to move other participants' controls. Configuration updates are now delivered only to the participant who made them.
- **An approval answered by a transport that cannot ask.** A plain-HTTP transport answered every approval "cancelled" and could beat a browser participant's answer. A transport can now be marked as having no approval surface, and approval requests skip it.
- **Access that outlived the connection.** Visibility is rechecked on every live update, prompt, cancellation and approval answer, not once at connect.
- **Stale reads under SQLite.** A handler that read and then wrote could be left on an old snapshot by a concurrent writer. The handlers now reserve the writer first.
- **A stale approval card.** A card another participant answered stayed on the requester's screen. A finished turn now clears it.
- **A setup step that unverified another role.** Declaring a completion contract for a model also dropped the chat role on the same model, because its verification fingerprint covered the contract. The fingerprint now covers it only for the roles that use it.

Related pages: [the engine under every surface](/docs/rnd/engine/), [the event plane](/docs/rnd/event-plane/), [hooks became tools](/docs/rnd/hooks/), [modeld](/docs/rnd/modeld/).
