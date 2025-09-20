const LikedList = () => {
  return (
    <ul className="space-y-4">
      {/* Placeholder for liked items */}
      {[...Array(5)].map((_, index) => (
        <li
          key={index}
          className="p-4 bg-gray-100 rounded-md shadow-md flex justify-between items-center"
        >
          <span>Liked Item {index + 1}</span>
          <button className="px-2 py-1 bg-indigo-600 text-white rounded-md">
            Instant Buy
          </button>
        </li>
      ))}
    </ul>
  );
};

export default LikedList;