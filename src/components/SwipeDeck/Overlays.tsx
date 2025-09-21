const Overlays = ({ direction }: { direction: "left" | "right" | null }) => {
  if (!direction) return null;

  const label = direction === "right" ? "Liked" : "Disliked";

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`absolute inset-0 flex items-center justify-center text-white text-6xl font-bold drop-shadow-md pointer-events-none ${
        direction === "right" ? "text-green-500" : "text-red-500"
      }`}
    >
      <span aria-hidden="true">{direction === "right" ? "❤️" : "❌"}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default Overlays;
