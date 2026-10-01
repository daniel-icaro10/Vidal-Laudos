"use client";

export default function Toolbar({ id }: { id: string }) {
  return (
    <div className="toolbar">
      <a href={`/laudos/${id}`}>← Voltar ao laudo</a>
      <span style={{ flex: 1 }} />
      <button onClick={() => window.print()}>Imprimir</button>
      <a className="primary" href={`/api/laudos/${id}/pdf`}>Baixar PDF</a>
    </div>
  );
}
