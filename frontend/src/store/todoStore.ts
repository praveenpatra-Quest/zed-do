import { create } from 'zustand';
import { API_URL } from '@/config';
import { useAuthStore } from './authStore';

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
}

interface TodoState {
  todos: Todo[];
  loading: boolean;
  fetchTodos: () => Promise<void>;
  addTodo: (todo: Partial<Todo>) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  fetchTodos: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/todos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ todos: data });
      }
    } finally {
      set({ loading: false });
    }
  },
  addTodo: async (todo) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const res = await fetch(`${API_URL}/api/todos`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(todo)
    });
    if (res.ok) {
      const newTodo = await res.json();
      set({ todos: [newTodo, ...get().todos] });
    }
  },
  toggleTodo: async (id) => {
    const token = useAuthStore.getState().token;
    const todo = get().todos.find(t => t.id === id);
    if (!token || !todo) return;
    
    const res = await fetch(`${API_URL}/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed: !todo.completed })
    });
    if (res.ok) {
      set({ todos: get().todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t) });
    }
  },
  deleteTodo: async (id) => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    const res = await fetch(`${API_URL}/api/todos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      set({ todos: get().todos.filter(t => t.id !== id) });
    }
  }
}));
