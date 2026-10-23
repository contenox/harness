package modelcontract_test

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/contenox/harness/runtime/modelcontract"
)

type declaredFormatSchema struct {
	FIM []struct {
		ID        string   `json:"id"`
		Operation string   `json:"operation"`
		Version   int      `json:"version"`
		Kind      string   `json:"kind"`
		Prefix    string   `json:"prefix"`
		Suffix    string   `json:"suffix"`
		Middle    string   `json:"middle"`
		Stops     []string `json:"stops"`
	} `json:"fim"`
	NextEdit []struct {
		ID            string   `json:"id"`
		Operation     string   `json:"operation"`
		Version       int      `json:"version"`
		ContextTokens int      `json:"contextTokens"`
		MaxTokens     int      `json:"maxTokens"`
		Stops         []string `json:"stops"`
		TextStops     []string `json:"textStops"`
		Controls      []string `json:"controls"`
	} `json:"nextEdit"`
}

func readDeclaredSchema(t *testing.T) declaredFormatSchema {
	t.Helper()
	data, err := os.ReadFile(modelcontract.CompletionFormatSchemaFile)
	if err != nil {
		t.Fatalf("read the format schema: %v", err)
	}
	var schema declaredFormatSchema
	if err := json.Unmarshal(data, &schema); err != nil {
		t.Fatalf("decode the format schema: %v", err)
	}
	return schema
}

func TestUnit_ResolversAreLoadersOverTheCompletionFormatSchema(t *testing.T) {
	schema := readDeclaredSchema(t)
	if len(schema.FIM) == 0 || len(schema.NextEdit) == 0 {
		t.Fatal("the format schema declares no formats")
	}
	for _, entry := range schema.FIM {
		resolved, err := modelcontract.ResolveFIM(entry.ID)
		if err != nil {
			t.Fatalf("ResolveFIM(%q): %v", entry.ID, err)
		}
		declared := modelcontract.FIMFormat{ID: entry.ID, Version: entry.Version, Kind: entry.Kind,
			Prefix: entry.Prefix, Suffix: entry.Suffix, Middle: entry.Middle, Stops: entry.Stops}
		if !reflect.DeepEqual(resolved, declared) {
			t.Fatalf("ResolveFIM(%q) = %#v, schema declares %#v", entry.ID, resolved, declared)
		}
		if _, err := modelcontract.FIMFingerprint(entry.ID); err != nil {
			t.Fatalf("FIMFingerprint(%q): %v", entry.ID, err)
		}
	}
	for _, entry := range schema.NextEdit {
		resolved, err := modelcontract.ResolveNextEdit(entry.ID)
		if err != nil {
			t.Fatalf("ResolveNextEdit(%q): %v", entry.ID, err)
		}
		declared := modelcontract.NextEditProfile{ID: entry.ID, Version: entry.Version, ContextTokens: entry.ContextTokens,
			MaxTokens: entry.MaxTokens, Stops: entry.Stops, TextStops: entry.TextStops}
		if !reflect.DeepEqual(resolved, declared) {
			t.Fatalf("ResolveNextEdit(%q) = %#v, schema declares %#v", entry.ID, resolved, declared)
		}
		if _, err := modelcontract.NextEditFingerprint(entry.ID); err != nil {
			t.Fatalf("NextEditFingerprint(%q): %v", entry.ID, err)
		}
	}
	if _, err := modelcontract.ResolveFIM("declared-nowhere"); err == nil {
		t.Fatal("a name the schema does not declare resolved to a FIM format")
	}
	if _, err := modelcontract.ResolveNextEdit("declared-nowhere"); err == nil {
		t.Fatal("a format the schema does not declare resolved to a next-edit profile")
	}
}

func TestUnit_NextEditControlTokensAreTheDeclaredPromptControls(t *testing.T) {
	schema := readDeclaredSchema(t)
	for _, entry := range schema.NextEdit {
		version, controls, err := modelcontract.TokenizerCompanionControls("next-edit", entry.ID)
		if err != nil {
			t.Fatalf("TokenizerCompanionControls(next-edit, %q): %v", entry.ID, err)
		}
		if version != entry.Version {
			t.Fatalf("next-edit format %q declares version %d, the companion contract reports %d", entry.ID, entry.Version, version)
		}
		prepared, err := modelcontract.PrepareNextEdit(entry.ID, modelcontract.NextEditInput{Path: "source"})
		if err != nil {
			t.Fatalf("PrepareNextEdit(%q): %v", entry.ID, err)
		}
		var expected []string
		for _, part := range prepared.Parts {
			if part.Control {
				expected = appendUniqueText(expected, part.Text)
			}
		}
		for _, stop := range prepared.Stops {
			expected = appendUniqueText(expected, stop)
		}
		if !reflect.DeepEqual(controls, expected) {
			t.Fatalf("next-edit format %q companion controls %#v do not match the prompt controls %#v", entry.ID, controls, expected)
		}
	}
}

func appendUniqueText(values []string, value string) []string {
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}

func TestUnit_TokenizerCompanionBuilderReadsTheCompletionFormatSchema(t *testing.T) {
	schema := readDeclaredSchema(t)
	python, err := exec.LookPath("python3")
	if err != nil {
		t.Fatalf("the tokenizer companion builder is Python and this check requires python3: %v", err)
	}
	builder, err := filepath.Abs(filepath.Join("..", "..", "..", "scripts", "prepare-openvino-literal-source-tokenizer.py"))
	if err != nil {
		t.Fatalf("resolve the tokenizer companion builder path: %v", err)
	}
	output, err := exec.Command(python, builder, "--dump-formats").Output()
	if err != nil {
		t.Fatalf("run %s --dump-formats: %v", builder, err)
	}
	var dumped struct {
		Schema  string `json:"schema"`
		Formats map[string]struct {
			Kind     string   `json:"kind"`
			Version  int      `json:"version"`
			Controls []string `json:"controls"`
		} `json:"formats"`
	}
	if err := json.Unmarshal(output, &dumped); err != nil {
		t.Fatalf("decode the tokenizer companion builder vocabulary: %v", err)
	}
	declared, err := filepath.Abs(modelcontract.CompletionFormatSchemaFile)
	if err != nil {
		t.Fatalf("resolve the format schema path: %v", err)
	}
	if filepath.Clean(dumped.Schema) != declared {
		t.Fatalf("the tokenizer companion builder reads %q instead of %q", dumped.Schema, declared)
	}
	expected := map[string]struct {
		Kind     string
		Version  int
		Controls []string
	}{}
	for _, entry := range schema.FIM {
		if entry.Kind != "tokens" {
			continue
		}
		expected[entry.ID] = struct {
			Kind     string
			Version  int
			Controls []string
		}{entry.Operation, entry.Version, entry.Stops}
	}
	for _, entry := range schema.NextEdit {
		expected[entry.ID] = struct {
			Kind     string
			Version  int
			Controls []string
		}{entry.Operation, entry.Version, entry.Controls}
	}
	if len(dumped.Formats) != len(expected) {
		t.Fatalf("the tokenizer companion builder serves %d formats, the schema declares %d literal-source formats", len(dumped.Formats), len(expected))
	}
	for format, want := range expected {
		got, found := dumped.Formats[format]
		if !found {
			t.Fatalf("the tokenizer companion builder does not serve declared format %q", format)
		}
		version, controls, err := modelcontract.TokenizerCompanionControls(want.Kind, format)
		if err != nil {
			t.Fatalf("TokenizerCompanionControls(%q, %q): %v", want.Kind, format, err)
		}
		if got.Kind != want.Kind || got.Version != want.Version || version != want.Version || !reflect.DeepEqual(got.Controls, want.Controls) || !reflect.DeepEqual(controls, want.Controls) {
			t.Fatalf("format %q: builder serves %#v, the schema declares %#v, the runtime contract reports version %d controls %#v", format, got, want, version, controls)
		}
	}
}
