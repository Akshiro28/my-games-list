// src/pages/MainLayout.tsx

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import CategorySidebar from '../components/CategorySidebar';
import CardGrid from '../components/CardGrid';
import EditGameSection from '../components/EditGameSection';
import EditCategorySection from '../components/EditCategorySection';
import Navbar from '../components/Navbar';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import axiosAuth from '../axiosAuth';
import type { User } from 'firebase/auth';
import type { Category } from '../components/CategorySidebar';
import type { Card } from '../components/CardGrid';

type MainLayoutProps = {
  username?: string | null;
  readOnly?: boolean;
  externalCards?: Card[] | null;
  externalCategories?: Category[] | null;
  forceTemplateMode?: boolean;
};

function MainLayout({
  username = null,
  readOnly = false,
  externalCards = null,
  externalCategories = null,
  forceTemplateMode = false,
}: MainLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>(externalCategories ?? []);
  const [cards, setCards] = useState<Card[]>(externalCards ?? []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isTemplateMode = !username;

  const [showCategoryEditor, setShowCategoryEditor] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    if (editingCategory) {
      // Delay activating animation class until after component mounts
      requestAnimationFrame(() => setShowCategoryEditor(true));
    } else {
      setShowCategoryEditor(false);
    }
  }, [editingCategory]);

  useEffect(() => {
    if (externalCards && externalCategories) {
      setAuthReady(true);
      return;
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [externalCards, externalCategories]);

  useEffect(() => {
    if (externalCards && externalCategories) return;
    if (!authReady) return;

    if (forceTemplateMode) {
      fetchCardsAndCategories('template');
    } else if (username) {
      fetchCardsAndCategories('profile');
    } else if (user) {
      fetchCardsAndCategories('user');
    } else {
      fetchCardsAndCategories('template');
    }
  }, [username, user, authReady, externalCards, externalCategories, forceTemplateMode]);

  async function fetchCardsAndCategories(mode: 'user' | 'template' | 'profile') {
    try {
      const cardsRes = await axiosAuth.get<Card[]>(
        mode === 'profile'
          ? `/api/cards?username=${username}`
          : '/api/cards?uid=template'
      );
      const categoriesRes = await axiosAuth.get<Category[]>(
        mode === 'profile'
          ? `/api/categories?username=${username}`
          : '/api/categories?uid=template'
      );
      setCards(cardsRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      console.error('[fetchCardsAndCategories] Failed:', err);
    }
  }

  const filteredCards = selectedCategory
    ? cards.filter(card => card.categories?.includes(selectedCategory))
    : cards;

  async function handleEditClick(card: Card) {
    if (readOnly) return;

    if (card._id === '-1' || card._id === '_new') {
      setEditingCard(card);
      setIsNew(true);
    } else {
      try {
        const res = await axiosAuth.get<Card>(`/api/cards/${card._id}`);
        setEditingCard(res.data);
        setIsNew(false);
      } catch (err) {
        console.error('Failed to fetch card details:', err);
      }
    }
  }

  function closeEditSection() {
    setEditingCard(null);
    setIsNew(false);
  }

  function handleSave() {
    fetchCardsAndCategories(isTemplateMode ? 'template' : 'profile');
    closeEditSection();
  }

  async function handleDelete(id: string) {
    if (readOnly) return;

    const toastId = toast.loading('Deleting game entry...');
    try {
      const res = await axiosAuth.delete(`/api/cards/${id}`);
      if (res.status === 200) {
        setCards(prev => prev.filter(card => card._id !== id));
        toast.success('Game deleted!', { id: toastId });
      } else {
        toast.error('Failed to delete game.', { id: toastId });
      }
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('An error occurred while deleting.', { id: toastId });
    }
  }

  function openCategoryEditor() {
    if (!authReady) {
      toast('Loading... Please wait.');
      return;
    }

    const isOwnProfile =
      user &&
      username &&
      userProfile &&
      userProfile.username.trim().toLowerCase() === username.trim().toLowerCase();

    const allowEdit = !readOnly && (isOwnProfile || (!username && user));

    if (!allowEdit) {
      toast('Sign in and start customizing your list!');
      return;
    }

    setEditingCategory(true);
  }

  function closeCategoryEditor() {
    setEditingCategory(false);
  }

  async function handleDeleteCategory(id: string) {
    if (readOnly) return;

    const toastId = toast.loading('Deleting category...');
    try {
      const res = await axiosAuth.delete(`/api/categories/${id}`);
      if (res.status === 200) {
        fetchCardsAndCategories(isTemplateMode ? 'template' : 'profile');
        toast.success('Category deleted!', { id: toastId });
      } else {
        toast.error('Failed to delete category.', { id: toastId });
      }
    } catch (err: any) {
      console.error('Error deleting category:', err);
      if (err.response?.status === 404) {
        toast.error('Category not found on server.', { id: toastId });
      } else {
        toast.error('Error deleting category.', { id: toastId });
      }
    }
  }

  function handleCategorySave(closeAfterSave = true) {
    fetchCardsAndCategories(isTemplateMode ? 'template' : 'profile');
    if (closeAfterSave) {
      closeCategoryEditor();
    }
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user || !authReady) return;

      try {
        const res = await axiosAuth.get('/api/users/me');
        setUserProfile(res.data);
      } catch (err) {
        console.error('[fetchUserProfile] Failed:', err);
      }
    };

    fetchUserProfile();
  }, [user, authReady]);

  if (!authReady && !externalCards && !externalCategories) {
    return null; // or spinner
  }

  return (
    <>
      <Navbar onToggleSidebar={toggleMobileSidebar} />

      <div
        className={`container mx-auto mt-22.5 md:mt-31 flex h-[calc(100vh-186px)] md:h-[calc(100vh-236px)] w-[calc(100%-32px)] overflow-hidden relative main-layout-container ${
          editingCard || editingCategory ? 'editing' : ''
        }`}
      >
        <div className="main-layout flex w-full transition-all duration-800">
          <div className="card-grid">
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddCategoryClick={openCategoryEditor}
              user={user}
              readOnly={readOnly}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobileSidebar={closeMobileSidebar}
            />
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="card-grid absolute top-0 left-0 w-full h-full">
              <CardGrid
                cards={filteredCards}
                onEditClick={handleEditClick}
                onDelete={handleDelete}
                user={user}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>

        {!editingCategory && !readOnly && (
          <div
            className={`edit-section container absolute top-full w-full h-full bg-[var(--background)] transition-all duration-800 ease-in-out ${
              editingCard ? 'editing-active' : 'editing-inactive'
            }`}
          >
            {editingCard && (
              <EditGameSection
                card={editingCard}
                onClose={closeEditSection}
                onSave={handleSave}
                isNew={isNew}
              />
            )}
          </div>
        )}

        <div
          className={`edit-section container absolute top-full w-full h-full transition-all duration-800 ease-in-out ${
            editingCategory && showCategoryEditor ? 'editing-active' : 'editing-inactive'
          } ${editingCategory ? '' : 'pointer-events-none'}`}
          aria-modal="true"
          role="dialog"
        >
          {editingCategory && (
            <EditCategorySection
              onClose={closeCategoryEditor}
              onSave={() => handleCategorySave(false)}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
        </div>
      </div>

      <Toaster
        position="top-center"
        toastOptions={{ duration: 3000 }}
        containerStyle={{ top: '29px' }}
      />
    </>
  );
}

export default MainLayout;
