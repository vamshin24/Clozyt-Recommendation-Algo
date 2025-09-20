const CollageGrid = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Placeholder for items */}
      {[...Array(10)].map((_, index) => (
        <div
          key={index}
          className="w-full h-40 bg-gray-200 rounded-md shadow-md"
        ></div>
      ))}
    </div>
  );
};

export default CollageGrid;