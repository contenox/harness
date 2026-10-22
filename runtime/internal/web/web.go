// Package web serves the embedded harness React SPA from the contenox binary.
package web

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

//go:embed all:harness/dist
var harnessFiles embed.FS

// HarnessFS returns the embedded harness dist as an io/fs.FS rooted at the dist dir.
func HarnessFS() fs.FS {
	sub, err := fs.Sub(harnessFiles, "harness/dist")
	if err != nil {
		panic("web: failed to sub-FS harness/dist: " + err.Error())
	}
	return sub
}

// SPAHandler serves the harness SPA with an index.html fallback for client-side routes.
func SPAHandler() http.Handler {
	harnessFS := HarnessFS()
	fileServer := http.FileServer(http.FS(harnessFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if f, err := harnessFS.Open(path); err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		fileServer.ServeHTTP(w, r2)
	})
}

// DevProxyHandler proxies harness UI requests to a Vite dev server while the Go
// server remains the browser origin for /api and auth cookies.
func DevProxyHandler(target string) (http.Handler, error) {
	raw := strings.TrimSpace(target)
	if raw == "" {
		return nil, fmt.Errorf("target URL is required")
	}
	targetURL, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("parse target URL: %w", err)
	}
	if targetURL.Scheme != "http" && targetURL.Scheme != "https" {
		return nil, fmt.Errorf("target URL must use http or https")
	}
	if targetURL.Host == "" {
		return nil, fmt.Errorf("target URL must include a host")
	}

	return &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(targetURL)
			pr.Out.Host = pr.In.Host
			pr.SetXForwarded()
		},
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, _ error) {
			http.Error(w, "harness dev proxy unavailable", http.StatusBadGateway)
		},
	}, nil
}
