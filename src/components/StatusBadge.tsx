export default function StatusBadge({ status }: { status: string }) {
  const fin = status === "FINALIZADO";
  return (
    <span className={`pill ${fin ? "bg-[#e8f6e3] text-[#239b44]" : "bg-[#faf1dc] text-[#d89114]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${fin ? "bg-[#5aab4b]" : "bg-[#d89114]"}`} />
      {fin ? "Finalizado" : "Rascunho"}
    </span>
  );
}
