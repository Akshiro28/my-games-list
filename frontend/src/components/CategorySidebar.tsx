import { useState, useRef, useEffect } from 'react';

export type Category = {
  _id: string;
  name: string;
};

type CategorySidebarProps = {
  categories: Category[];
  selectedCategory: string | null;
  setSelectedCategory: (categoryId: string | null) => void;
  onAddCategoryClick: () => void;
  user: any;
  readOnly?: boolean;
  isMobileOpen: boolean;
  onCloseMobileSidebar: () => void;
};

function CategorySidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  onAddCategoryClick,
  user,
  readOnly = false,
  isMobileOpen,
  onCloseMobileSidebar,
}: CategorySidebarProps) {
  const [search, setSearch] = useState('');
  const [topGradientHeight, setTopGradientHeight] = useState<number>(0);
  const [bottomGradientHeight, setBottomGradientHeight] = useState<number>(0);
  const listRef = useRef<HTMLUListElement>(null);

  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const filteredCategories = sortedCategories.filter(category =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleScroll() {
      if (!listRef.current) return;
      const el = listRef.current;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      if (scrollHeight <= clientHeight) {
        setTopGradientHeight(0);
        setBottomGradientHeight(0);
      } else if (scrollTop === 0) {
        setTopGradientHeight(64);
        setBottomGradientHeight(0);
      } else if (scrollTop + clientHeight >= scrollHeight - 1) {
        setTopGradientHeight(0);
        setBottomGradientHeight(64);
      } else {
        setTopGradientHeight(64);
        setBottomGradientHeight(64);
      }
    }

    const current = listRef.current;
    if (current) {
      current.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial
    }

    return () => {
      if (current) current.removeEventListener('scroll', handleScroll);
    };
  }, [filteredCategories]);

  return (
    <div
      className={`
        md:static md:translate-x-0 md:w-auto md:h-auto md:bg-transparent
        fixed top-0 left-0 h-full w-76 bg-[var(--background90)] backdrop-blur-sm z-20 transform transition-transform duration-800
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Close button only visible on mobile */}
      <button
        className="md:hidden absolute top-4 right-4 text-white z-50"
        onClick={onCloseMobileSidebar}
      >
        ✕
      </button>

      <aside className="w-full md:w-64 flex flex-col h-full relative p-4 md:p-0">
        <div className="sticky top-0 bg-[var(--bg)] z-10">
          <h2 className="text-4xl font-semibold mb-5">Categories</h2>

          <div className="flex">
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 mb-6 text-sm md:text-[16px] rounded-md border-2 border-[var(--thin)] focus:outline-none focus:border-[var(--thin-brighter)] placeholder-[var(--thin-brighter)] focus:placeholder-[var(--text-thin)] hover:border-[var(--thin-brighter)] hover:placeholder-[var(--text-thin)] placeholder:italic"
            />

            {user && !readOnly && window.location.pathname !== '/' && (
              <div
                className={`flex items-center justify-center h-[43px] px-3 ms-2 rounded-md text-sm md:text-[16px] font-medium
                  border-[var(--thin)] text-[var(--thin-brighter)] hover:text-[var(--text-thin)] hover:border-[var(--thin-brighter)] cursor-pointer border-2
                `}
                onClick={onAddCategoryClick}
              >
                Edit
              </div>
            )}
          </div>
        </div>

        <ul
          ref={listRef}
          className="space-y-1 overflow-y-auto flex-1 relative"
          style={{ maxHeight: 'calc(100% - 130px)' }}
        >
          {filteredCategories.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-[var(--thin-brighter)] text-center px-4 border-2 border-dashed border-[var(--thin)] rounded-md italic">
              No categories found.
            </div>
          ) : (
            <>
              <li>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-1 rounded hover:bg-[var(--thin-brighter)] md:hover:bg-[var(--thin)] cursor-pointer ${
                    !selectedCategory ? 'bg-[var(--thin-brighter)] md:bg-[var(--thin)]' : ''
                  }`}
                >
                  All
                </button>
              </li>

              {filteredCategories.map((category) => (
                <li key={category._id}>
                  <button
                    onClick={() => setSelectedCategory(category._id)}
                    className={`w-full text-left px-3 py-1 rounded hover:bg-[var(--thin-brighter)] md:hover:bg-[var(--thin)] cursor-pointer ${
                      selectedCategory === category._id ? 'bg-[var(--thin-brighter)] md:bg-[var(--thin)]' : ''
                    }`}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>

        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full category-top-gradient transition-height duration-600 ease-in-out"
          style={{
            background: 'linear-gradient(to top, rgba(28,31,42,1), transparent)',
            height: topGradientHeight,
          }}
        />

        <div
          className="pointer-events-none absolute top-32 left-0 w-full category-bottom-gradient transition-height duration-600 ease-in-out"
          style={{
            background: 'linear-gradient(to bottom, rgba(28,31,42,1), transparent)',
            height: bottomGradientHeight,
          }}
        />
      </aside>
    </div>
  );
}

export default CategorySidebar;
