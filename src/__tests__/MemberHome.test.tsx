import { faker } from "@faker-js/faker";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import MemberHome from "../../app/(member)/index";
import { supabase } from "../api/supabase";

// Helper to generate fake book data
const generateFakeBook = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.word.words({ count: { min: 2, max: 5 } }),
  author: faker.person.fullName(),
  isbn: faker.string.numeric(13),
  total_copies: faker.number.int({ min: 5, max: 20 }),
  available_copies: faker.number.int({ min: 1, max: 10 }),
  cover_url: null,
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const mockBooksQuery = (result: Promise<{ data: any; error: any }>) => {
  const orderMock = jest.fn(() => result);
  const selectMock = jest.fn(() => ({ order: orderMock }));
  (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });
};

describe("MemberHome Screen", () => {
  describe("loading state", () => {
    it("should show loading text while fetching books", () => {
      mockBooksQuery(new Promise(() => {}));

      render(<MemberHome />, { wrapper: createWrapper() });
      expect(screen.getByText("Đang tải dữ liệu...")).toBeTruthy();
    });
  });

  describe("book list", () => {
    it("should render book title and author from Supabase", async () => {
      const fakeBook = generateFakeBook();
      mockBooksQuery(Promise.resolve({ data: [fakeBook], error: null }));

      render(<MemberHome />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Card.Title mock renders "title author" as a single Text node
        // Use a regex that matches either just the title or the combined string
        const regex = new RegExp(
          fakeBook.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        );
        const elements = screen.getAllByText(regex);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should render "MƯỢN" borrow button for a book', async () => {
      const fakeBook = generateFakeBook();
      mockBooksQuery(Promise.resolve({ data: [fakeBook], error: null }));

      render(<MemberHome />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("MƯỢN")).toBeTruthy();
      });
    });

    it("should show multiple books from the API", async () => {
      const fakeBook1 = generateFakeBook();
      const fakeBook2 = generateFakeBook();
      mockBooksQuery(
        Promise.resolve({ data: [fakeBook1, fakeBook2], error: null }),
      );

      render(<MemberHome />, { wrapper: createWrapper() });

      await waitFor(() => {
        const borrowButtons = screen.getAllByText("MƯỢN");
        expect(borrowButtons.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should show available quantity in book card", async () => {
      const fakeBook = generateFakeBook({ available_copies: 5 });
      mockBooksQuery(Promise.resolve({ data: [fakeBook], error: null }));

      render(<MemberHome />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("5 có sẵn")).toBeTruthy();
      });
    });
  });

  describe("error handling", () => {
    it("should not crash on Supabase error", () => {
      mockBooksQuery(
        Promise.resolve({ data: null, error: { message: "DB error" } }),
      );

      // Should not throw during render
      expect(() =>
        render(<MemberHome />, { wrapper: createWrapper() }),
      ).not.toThrow();
    });
  });
});
