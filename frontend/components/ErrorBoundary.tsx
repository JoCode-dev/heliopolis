'use client';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="font-semibold text-[#1F1B2E] mb-1">Une erreur est survenue</p>
            <p className="text-sm text-[#6b6b78] mb-4">Rechargez la page pour continuer.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#E55A35] text-white rounded-xl text-sm font-semibold"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
