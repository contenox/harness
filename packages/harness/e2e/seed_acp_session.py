#!/usr/bin/env python3
"""Seed one ACP session with a scripted exchange.

The SPA's session sidebar is fed by the ACP surface (`session/list`), not by the
CLI's session store, so a session created by `contenox "<prompt>"` is invisible
there. This speaks the protocol to `contenox acp` over stdio the way an editor
does: initialize, session/new in the workspace, one prompt, wait for end_turn.

Usage: seed_acp_session.py <contenox binary> <workspace dir> [workspace id]
"""

import json
import os
import queue
import subprocess
import sys
import threading

PROMPT = "Show me what a seeded session looks like."
TIMEOUT = 45


def main() -> int:
    binary, cwd = sys.argv[1], sys.argv[2]
    # `contenox acp` resolves its workspace from $HOME/.contenox-harness, not the
    # launch directory (serve resolves from the cwd marker), so the caller passes
    # the serve workspace id explicitly; without it the session lands in the
    # default workspace and the SPA sidebar cannot see it.
    extra = ["--workspace-id", sys.argv[3]] if len(sys.argv) > 3 else []
    env = os.environ.copy()
    proc = subprocess.Popen(
        [binary, "acp", "--auto", *extra],
        cwd=cwd,
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        bufsize=1,
    )
    lines: queue.Queue[str] = queue.Queue()

    def pump() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            lines.put(line.rstrip("\n"))

    threading.Thread(target=pump, daemon=True).start()

    def send(payload: dict) -> None:
        assert proc.stdin is not None
        proc.stdin.write(json.dumps(payload) + "\n")
        proc.stdin.flush()

    def await_result(request_id: int) -> dict:
        while True:
            line = lines.get(timeout=TIMEOUT)
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                continue
            if message.get("id") == request_id and "result" in message:
                return message["result"]
            if message.get("id") == request_id and "error" in message:
                raise SystemExit(f"ACP request {request_id} failed: {message['error']}")

    try:
        send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": 1}})
        await_result(1)
        send(
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "session/new",
                "params": {"cwd": cwd, "mcpServers": []},
            }
        )
        session = await_result(2)["sessionId"]
        send(
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "session/prompt",
                "params": {"sessionId": session, "prompt": [{"type": "text", "text": PROMPT}]},
            }
        )
        await_result(3)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
