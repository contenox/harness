package main

import (
	"log"
	"os"

	"github.com/contenox/harness/libsandbox"
	"github.com/contenox/harness/runtime/contenoxcli"
)

func main() {
	if handled, err := libsandbox.ShimMain(); handled {
		if err != nil {
			log.Fatal(err)
		}
		os.Exit(0)
	}
	contenoxcli.Main()
}
