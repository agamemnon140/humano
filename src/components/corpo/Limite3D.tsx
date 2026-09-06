import { Component, type ReactNode } from 'react'

// A stale cached chunk or unsupported GPU must not take down the rest of the app.
export class Limite3D extends Component<{ children: ReactNode; fallback: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() { return { erro: true } }
  render() { return this.state.erro ? this.props.fallback : this.props.children }
}
