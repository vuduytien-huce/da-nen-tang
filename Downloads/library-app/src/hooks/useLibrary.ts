import { useBooks } from './library/useBooks';
import { useBorrows } from './library/useBorrows';
import { useStaff } from './library/useStaff';
import { Book, BorrowRecord } from './library/types';

export { Book, BorrowRecord };

export function useLibrary() {
  const { getBooks, addBook, syncBook } = useBooks();
  const { getMyBorrows, getAllBorrows, borrowBook, returnBook, payFine, approveBorrow, rejectBorrow } = useBorrows();
  const { searchMembers, appointAssistant } = useStaff();

  // Primary Gateway (Standard Pattern)
  return {
    // 1. Core Data Queries (Direct execution)
    books: { 
      list: getBooks, 
      add: addBook 
    },
    borrows: { 
      list: getMyBorrows, 
      listAll: getAllBorrows,
      borrow: borrowBook, 
      return: returnBook,
      approve: approveBorrow,
      reject: rejectBorrow,
      pay: payFine
    },
    staff: { 
      search: searchMembers, 
      appoint: appointAssistant 
    },

    // 2. Legacy Support (Direct hooks for existing components)
    useBooks: getBooks,
    syncBook: syncBook,
    useMyBorrows: getMyBorrows,
    useBorrowBook: () => borrowBook,
    useReturnBook: () => returnBook,
    usePayFine: () => payFine
  };
}
