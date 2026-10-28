import { Component, type ReactNode } from "react";
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="startup-error" role="alert">
          <div className="eyebrow">MINI GOLF BATTLE</div>
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
