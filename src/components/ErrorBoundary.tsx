import { Component, type ReactNode } from "react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[Money Vitals] Unhandled error:", error);
    // A new deploy can leave an open tab pointing at code files that no longer exist; reload once to pick up the new version.
    if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(error.message) && !sessionStorage.getItem("mv-reloaded")) {
      sessionStorage.setItem("mv-reloaded", "1");
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-mute">The page hit an unexpected error. Reloading usually fixes it.</p>
          <button onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Reload</button>
        </div>
      </div>
    );
  }
}
