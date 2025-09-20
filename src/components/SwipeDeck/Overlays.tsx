const Overlays = ({ direction }: { direction: "left" | "right" | null }) => {
  if (!direction) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center text-white text-6xl font-bold drop-shadow-md pointer-events-none ${
        direction === "right" ? "text-green-500" : "text-red-500"
      }`}
    >
      {direction === "right" ? "❤️" : "❌"}
    </div>
  );
};

export default Overlays;