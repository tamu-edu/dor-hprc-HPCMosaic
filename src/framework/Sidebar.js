import React, { useState, useEffect } from "react";
import CardConfig from "./CardConfig";
import { MdSearch, MdFilterList, MdGridView, MdViewList } from "react-icons/md";

const Sidebar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [categories, setCategories] = useState({
    all: true,
    analytics: true,
    system: true,
    user: true
  });

  // Categorize components for better organization
  const componentCategories = {
    "Node Utilization": "system",
    "PyVenvManager": "system",
    "Quota Info": "system",
    "User Groups": "user",
    "Accounts": "user",
    "User Jobs": "user",
    "AcknowledgementForm": "user"
  };

  const list = Object.keys(CardConfig);

  // Filter elements based on search and category filters
  const filteredList = list.filter(name => {
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         CardConfig[name].title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         CardConfig[name].description?.toLowerCase().includes(searchTerm.toLowerCase());

    const category = componentCategories[name] || "analytics";
    const matchesCategory = categories.all || categories[category];

    return matchesSearch && matchesCategory;
  });

  // Toggle a category filter
  const toggleCategory = (category) => {
    if (category === "all") {
      // If toggling "all", set all categories to the new value
      const newValue = !categories.all;
      setCategories({
        all: newValue,
        analytics: newValue,
        system: newValue,
        user: newValue
      });
    } else {
      // Otherwise, toggle just the specified category
      setCategories({
        ...categories,
        [category]: !categories[category],
        // If turning on a category, turn off "all"
        all: categories.all && !(!categories[category])
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and filter toolbar */}
      <div className="bg-gray-50 p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-grow mr-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MdSearch className="text-gray-400 text-xl" />
            </div>
            <input
              type="text"
              placeholder="Search elements..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* View toggle: Grid vs List */}
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-l-md ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
              title="Grid view"
            >
              <MdGridView className="text-xl" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-r-md ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-500"}`}
              title="List view"
            >
              <MdViewList className="text-xl" />
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 mr-1 flex items-center">
            <MdFilterList className="mr-1" /> Filter:
          </span>
          {["all", "analytics", "system", "user"].map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                categories[category]
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Elements display area */}
      <div className="relative w-full overflow-y-auto pt-4 pb-8 px-4 flex-grow">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No elements match your search or filters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full justify-items-center">
            {filteredList.map((name, id) => {
              const { cardComponent: CardComponent } = CardConfig[name];
              return (
                <div key={id} className="w-full transform transition-transform hover:scale-105">
                  <CardComponent />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col space-y-4 w-full">
            {filteredList.map((name, id) => {
              const { cardComponent: CardComponent } = CardConfig[name];
              return (
                <div key={id} className="w-full transition-colors hover:bg-blue-50">
                  <CardComponent />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
