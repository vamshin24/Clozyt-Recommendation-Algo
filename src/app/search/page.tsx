import CollageGrid from "../../components/grids/CollageGrid";

const SearchPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <input
        type="text"
        placeholder="Search items..."
        className="w-full p-2 border border-gray-300 rounded-md mb-4"
      />
      <CollageGrid />
    </div>
  );
};

export default SearchPage;