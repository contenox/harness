//! The scripted-test backend: the enabler every other case in this suite
//! stands on.
//!
//! It is registered like any other backend, it replays a JSON dialog from the
//! path stored as its base URL, and it says so on every surface that names a
//! provider. These cases drive that from outside — `backend add`, `backend
//! list`, `backend show`, `doctor`, `model list`, `beam`, `run`, `acp` — and
//! read the consequences back through the product's own commands.

use contenox_e2e::{Capabilities, CmdOutput, Instance, Script, Table, ToolCall, Turn, Usage};
use serde_json::Value;
use std::time::Duration;

/// A cold `contenox-cli run` compiles its agents before the first model call.
fn patiently() -> Duration {
    Duration::from_secs(240)
}

fn started(label: &str) -> Instance {
    let cx = Instance::named(label).expect("scratch instance");
    cx.init().ok();
    cx
}

/// `contenox-cli backend add` for a dialog already on disk, run raw so a refusal
/// is a value this case can assert on rather than a panic.
fn add_backend(cx: &Instance, name: &str, script: &str) -> CmdOutput {
    cx.run([
        "backend",
        "add",
        name,
        "--type",
        "scripted-test",
        "--script",
        script,
    ])
}

/// The dialog a `run` needs to land: file a result, finish, then answer the
/// loop's last question.
fn reports_and_lands(summary: &str) -> Script {
    Script::new()
        .turn(
            Turn::new()
                .text("Filing what I found.")
                .call(ToolCall::mission_report("result", summary)),
        )
        .turn(Turn::new().call(ToolCall::mission_finish("landed")))
        .turn("Mission finished.")
}

/// A router declared in the workspace: one classifier and two branches. The
/// classifier is a `route` task, which is the only handler that reaches the
/// backend through prompt execution rather than chat.
fn declare_a_router(cx: &Instance) {
    cx.write_file(
        ".contenox/agents/sorter/agent.md",
        "---\nname: sorter\ndescription: Send a request to the branch that should handle it.\n\
         default: docs\n---\nYou sort an incoming request.\n",
    )
    .expect("write the router");
    cx.write_file(
        ".contenox/agents/sorter/code/agent.md",
        "---\nname: code\ndescription: Change code\n---\nYou change code.\n",
    )
    .expect("write the code branch");
    cx.write_file(
        ".contenox/agents/sorter/docs/agent.md",
        "---\nname: docs\ndescription: Change docs\n---\nYou change docs.\n",
    )
    .expect("write the docs branch");
}

/// Both streams of one command, for a failure the product prints on whichever
/// of the two the caller happens to be reading.
fn both_streams(out: &CmdOutput) -> String {
    format!("{}\n{}", out.stdout, out.stderr)
}

/// The captured units of the one run this case made, as `contenox-cli state show
/// --raw` prints them. The table form drops the provider, the model and the
/// finish reason; `--raw` is the operator's command that keeps them.
fn captured_units(cx: &Instance) -> Vec<Value> {
    let requests = cx.state_requests().expect("contenox-cli state list");
    let [request] = requests.as_slice() else {
        panic!("expected one captured run, got {requests:?}");
    };
    let out = cx.run(["state", "show", request.as_str(), "--raw"]);
    serde_json::from_str(&out.stdout).unwrap_or_else(|err| {
        panic!(
            "contenox-cli state show --raw is not JSON ({err}):\n{}",
            out.render()
        )
    })
}

// ---------------------------------------------------------------------------
// It names itself everywhere
// ---------------------------------------------------------------------------

/// The dialog is the backend's endpoint, so losing it is the scripted
/// equivalent of a dead endpoint — and `doctor` reports it as one, naming the
/// file rather than a generic connection error.
#[test]
fn doctor_reports_a_dialog_deleted_after_registration_as_the_backends_error() {
    let cx = started("scripted-doctor-gone");
    let dialog = cx
        .scripted(&Script::new().turn("hello"))
        .expect("scripted backend");
    std::fs::remove_file(&dialog).expect("delete the dialog");

    let out = cx.doctor().ok();
    assert!(
        out.stdout_has("Reachable backends:    0"),
        "a backend whose dialog is gone is not reachable:\n{}",
        out.render()
    );
    assert!(
        out.stdout_has(&format!(
            "Error: scripted-test script \"{}\" cannot be read",
            dialog.display()
        )),
        "the error names the dialog file:\n{}",
        out.render()
    );
}

// ---------------------------------------------------------------------------
// How turns are consumed
// ---------------------------------------------------------------------------

/// Editing the dialog rewinds it. The next call notices the file changed,
/// reloads it and starts again at turn 1 — inside a process that has already
/// consumed turns, which is the only place the behaviour is visible.
#[test]
fn editing_the_dialog_rewinds_it_to_turn_one_inside_a_live_process() {
    let cx = started("scripted-rewind");
    let dialog = cx
        .scripted(&Script::new().route("general").turn("the first answer"))
        .expect("scripted backend");

    let mut acp = cx.acp(["acp"]).expect("spawn the ACP surface");
    acp.initialize().expect("initialize");
    let session = acp.new_session(cx.work()).expect("session/new");

    let first = acp
        .prompt(&session, "what changed?")
        .expect("session/prompt");
    assert_eq!(first.text(), "the first answer");

    // The same file, rewritten under a process that has already read it.
    std::fs::write(
        &dialog,
        Script::new()
            .route("general")
            .turn("the second answer, written while the process was live")
            .to_json(),
    )
    .expect("rewrite the dialog");

    let second = acp
        .prompt(&session, "and now?")
        .expect("a rewound dialog answers again rather than reporting itself exhausted");
    assert_eq!(
        second.text(),
        "the second answer, written while the process was live",
        "the edit rewound the dialog to turn 1"
    );
}

// ---------------------------------------------------------------------------
// Overrides: capabilities, finish reason, raw arguments
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// A gated scripted call is a gated call
// ---------------------------------------------------------------------------

