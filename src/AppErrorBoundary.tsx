import { Component, type ReactNode } from "react";
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    window.dispatchEvent(
      new CustomEvent("club:failed", {
        detail:
          "No pudimos iniciar el campo. Recarga o prueba con la aceleración gráfica activada.",
      }),
    );
  }
  render() {
    if (this.state.failed)
      return (
        <main className="startup-error" role="alert">
          <div className="eyebrow">HOYO EN UNO · GOLF CLUB</div>
          <h1>No pudimos abrir el campo.</h1>
          <p>
            Recarga la página. Si el problema continúa, prueba con un navegador
            actualizado y la aceleración gráfica activada.
          </p>
          <button className="primary" onClick={() => location.reload()}>
            Volver a intentar
          </button>
        </main>
      );
    return this.props.children;
  }
}
