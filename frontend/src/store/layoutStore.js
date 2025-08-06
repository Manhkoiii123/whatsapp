import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLayoutStore = create(
  persist(
    (set) => ({
      activeTab: "chats",
      selectedContact: null,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedContact: (contact) => set({ selectedContact: contact }),
    }),
    {
      name: "layout-storage",
      getStorage: () => localStorage,
    }
  )
);

export default useLayoutStore;
