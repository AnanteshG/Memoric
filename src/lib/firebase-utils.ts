import { db } from './firebase';
import { 
  collection, 
  doc,
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Content operations
export const contentService = {
  // Get user's content
  async getUserContent(userId: string) {
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Add new content
  async addContent(userId: string, contentData: Record<string, unknown>) {
    const contentRef = collection(db, 'content');
    return await addDoc(contentRef, {
      ...contentData,
      userId,
      createdAt: new Date(),
      timestamp: new Date().toISOString(),
    });
  },

  // Delete content
  async deleteContent(contentId: string) {
    const docRef = doc(db, 'content', contentId);
    await deleteDoc(docRef);
  }
};

// Chat operations
export const chatService = {
  // Get chat history
  async getChatHistory(userId: string, contentId?: string, chatLimit = 10) {
    const chatsRef = collection(db, 'chats');
    let q = query(
      chatsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(chatLimit)
    );
    
    if (contentId) {
      q = query(
        chatsRef,
        where('userId', '==', userId),
        where('contentId', '==', contentId),
        orderBy('createdAt', 'desc'),
        limit(chatLimit)
      );
    }
    
    const snapshot = await getDocs(q);
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return history.reverse(); // Return in chronological order
  },

  // Save chat turn
  async saveChatTurn(userId: string, message: string, response: string, contentId?: string) {
    const chatsRef = collection(db, 'chats');
    return await addDoc(chatsRef, {
      userId,
      message,
      response,
      contentId: contentId || null,
      createdAt: new Date(),
      timestamp: new Date().toISOString(),
    });
  }
};
